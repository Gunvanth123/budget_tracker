from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

from app.database.db import get_db
from app.models.models import User
from app.services.auth import get_current_user, get_processed_profile_pic, verify_password, hash_password
from app.services.gdrive import GoogleDriveService
import os
import base64

router = APIRouter()

class ProfileUpdateReq(BaseModel):
    name: str | None = None
    profile_picture: str | None = None

class EmailUpdateReq(BaseModel):
    new_email: EmailStr
    password: str

class PasswordUpdateReq(BaseModel):
    current_password: str
    new_password: str

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id, 
        "name": user.name, 
        "email": user.email, 
        "profile_picture": get_processed_profile_pic(user),
        "totp_enabled": user.totp_enabled,
        "has_seen_onboarding": user.has_seen_onboarding
    }

@router.put("/profile")
def update_profile(req: ProfileUpdateReq, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if req.name is not None:
        user.name = req.name
    
    if req.profile_picture is not None:
        # Check if user has GDrive connected
        if user.gdrive_token:
            try:
                gdrive = GoogleDriveService(
                    os.getenv("GOOGLE_CLIENT_ID"),
                    os.getenv("GOOGLE_CLIENT_SECRET"),
                    os.getenv("GOOGLE_REDIRECT_URI")
                )
                service = gdrive.get_service(user.gdrive_token)
                
                # Get or create Profile folder in the main App folder
                # user.gdrive_folder_id is the root App folder
                profile_folder_id = gdrive.get_or_create_folder(service, "Profile", user.gdrive_folder_id)
                
                # Delete old GDrive profile pic if exists
                if user.profile_picture and user.profile_picture.startswith("gdrive://"):
                    try:
                        old_id = user.profile_picture.replace("gdrive://", "")
                        gdrive.delete_file(service, old_id)
                    except: pass

                # Process new profile pic (expected as data:image/png;base64,...)
                header, encoded = req.profile_picture.split(",", 1)
                mimetype = header.split(":")[1].split(";")[0]
                data = base64.b64decode(encoded)
                
                # Upload to GDrive
                file_id = gdrive.upload_file(
                    service, 
                    f"profile_{user.id}_{int(datetime.utcnow().timestamp())}", 
                    data, 
                    mimetype, 
                    profile_folder_id
                )
                
                user.profile_picture = f"gdrive://{file_id}"
            except Exception as e:
                print(f"GDrive upload failed, falling back to local: {e}")
                user.profile_picture = req.profile_picture
        else:
            # Fallback to local storage if GDrive not connected
            user.profile_picture = req.profile_picture
    
    db.commit()
    db.refresh(user)
    
    return {"message": "Profile updated", "name": user.name, "profile_picture": get_processed_profile_pic(user)}

@router.put("/email")
def update_email(req: EmailUpdateReq, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect current password")
    
    # 30-day rate limit check
    if user.last_email_change:
        # Avoid naive datetime warnings by making both timezone naive or aware
        change_diff = datetime.utcnow() - user.last_email_change.replace(tzinfo=None)
        if change_diff < timedelta(days=30):
            days_left = 30 - change_diff.days
            raise HTTPException(status_code=429, detail=f"Email can only be changed once every 30 days. Try again in {days_left} days.")

    existing = db.query(User).filter(User.email == req.new_email).first()
    if existing and existing.id != user.id:
        raise HTTPException(status_code=400, detail="Email is already in use by another account.")

    user.email = req.new_email
    user.last_email_change = datetime.utcnow()
    db.commit()
    return {"message": "Email updated successfully"}

@router.put("/password")
def update_password(req: PasswordUpdateReq, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(req.current_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect current password")
    
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "Password securely updated"}

@router.put("/onboarding")
def mark_onboarding_seen(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user.has_seen_onboarding = True
    db.commit()
    return {"message": "Onboarding completed"}
