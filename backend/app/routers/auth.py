from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
import pyotp

from app.database.db import get_db
from app.models.models import User
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user, get_processed_profile_pic
from app.services.seed import seed_default_categories_for_user
from app.services.email import generate_otp, send_verification_otp, send_mfa_otp
from datetime import datetime, timedelta

router = APIRouter()


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    otp_code: str | None = None

class Verify2FARequest(BaseModel):
    otp_code: str

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp_code: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", status_code=201)
def register(req: RegisterRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    otp = generate_otp()
    user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
        is_verified=False,
        verification_otp=otp,
        otp_expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed default categories
    seed_default_categories_for_user(db, user.id)

    # Revert to immediate token issuance
    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(
        access_token=token,
        user={
            "id": user.id, 
            "name": user.name, 
            "email": user.email,
            "mfa_preference": user.mfa_preference,
            "totp_enabled": user.totp_enabled,
            "has_seen_onboarding": user.has_seen_onboarding,
            "profile_picture": get_processed_profile_pic(user)
        },
    )




@router.post("/login")
def login(req: LoginRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # MFA Check (Check both flag and preference for safety)
    if user.mfa_preference == "app" or user.totp_enabled:
        if not req.otp_code:
            raise HTTPException(status_code=403, detail="2FA_REQUIRED")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(req.otp_code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(
        access_token=token,
        user={
            "id": user.id, 
            "name": user.name, 
            "email": user.email,
            "mfa_preference": user.mfa_preference,
            "totp_enabled": user.totp_enabled,
            "has_seen_onboarding": user.has_seen_onboarding,
            "profile_picture": get_processed_profile_pic(user)
        },
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id, 
        "name": current_user.name, 
        "email": current_user.email,
        "mfa_preference": current_user.mfa_preference,
        "totp_enabled": current_user.totp_enabled,
        "has_seen_onboarding": current_user.has_seen_onboarding,
        "profile_picture": get_processed_profile_pic(current_user)
    }

@router.post("/2fa/generate")
def generate_2fa(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = pyotp.random_base32()
    user.totp_secret = secret
    user.totp_enabled = False
    db.commit()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="BudgetTracker")
    return {"secret": secret, "uri": uri}

@router.post("/2fa/verify")
def verify_2fa(req: Verify2FARequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA not generated")
    
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(req.otp_code):
        raise HTTPException(status_code=400, detail="Invalid authentication code")
    
    user.totp_enabled = True
    user.mfa_preference = "app"
    db.commit()
    db.refresh(user)
    
    return {
        "message": "App-based 2FA successfully enabled",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "mfa_preference": user.mfa_preference,
            "totp_enabled": user.totp_enabled
        }
    }



@router.post("/2fa/disable")
def disable_2fa(req: Verify2FARequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Force fresh read
    db.refresh(user)
    
    # Check if anything is actually enabled
    if user.mfa_preference == "none" and not user.totp_enabled:
        return {"message": "Already disabled"}

    # Verification required to disable (if a secret exists)
    if user.totp_secret:
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(req.otp_code):
            raise HTTPException(status_code=400, detail="Invalid authentication code")
    
    # Force reset all security flags
    user.mfa_preference = "none"
    user.totp_enabled = False
    user.totp_secret = None
    user.is_verified = True 
    
    db.commit()
    db.refresh(user) # <--- CRITICAL: Refresh after commit
    
    return {
        "message": "2FA successfully disabled",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "mfa_preference": user.mfa_preference,
            "totp_enabled": user.totp_enabled
        }
    }
