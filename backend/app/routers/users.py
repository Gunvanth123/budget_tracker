from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

from app.database.db import get_db
from app.models.models import User
from app.services.auth import get_current_user, verify_password, hash_password

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
        "profile_picture": user.profile_picture,
        "totp_enabled": user.totp_enabled
    }

@router.put("/profile")
def update_profile(req: ProfileUpdateReq, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if req.name is not None:
        user.name = req.name
    if req.profile_picture is not None:
        user.profile_picture = req.profile_picture
    
    db.commit()
    db.refresh(user)
    return {"message": "Profile updated", "name": user.name}

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
