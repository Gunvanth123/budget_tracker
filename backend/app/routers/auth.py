from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
import pyotp

from app.database.db import get_db
from app.models.models import User
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user
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
def register(req: RegisterRequest, db: Session = Depends(get_db)):
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

    # Send verification email
    sent = send_verification_otp(user.email, otp)
    
    return {
        "message": "Registration successful! Please verify your email.",
        "email": user.email,
        "email_sent": sent
    }

@router.post("/verify-email")
def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.verification_otp != req.otp_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if user.otp_expires_at and user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired")
    
    user.is_verified = True
    user.verification_otp = None
    db.commit()
    
    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(
        access_token=token,
        user={"id": user.id, "name": user.name, "email": user.email},
    )

@router.post("/resend-verification")
def resend_verification(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp = generate_otp()
    user.verification_otp = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    send_verification_otp(user.email, otp)
    return {"message": "New verification code sent"}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="EMAIL_NOT_VERIFIED")

    # MFA Check
    if user.mfa_preference == "app":
        if not req.otp_code:
            raise HTTPException(status_code=403, detail="2FA_REQUIRED")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(req.otp_code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")
    
    elif user.mfa_preference == "email":
        if not req.otp_code:
            # Generate and send Email OTP
            otp = generate_otp()
            user.verification_otp = otp
            user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
            db.commit()
            send_mfa_otp(user.email, otp)
            raise HTTPException(status_code=403, detail="2FA_REQUIRED")
        
        if user.verification_otp != req.otp_code:
            raise HTTPException(status_code=401, detail="Invalid security code")
        if user.otp_expires_at and user.otp_expires_at < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Security code expired")
        
        # Clear code after use
        user.verification_otp = None
        db.commit()

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(
        access_token=token,
        user={"id": user.id, "name": user.name, "email": user.email},
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email}

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
    return {"message": "App-based 2FA successfully enabled"}

@router.post("/2fa/enable-email")
def enable_email_2fa(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.mfa_preference = "email"
    db.commit()
    return {"message": "Email-based 2FA successfully enabled"}

@router.post("/2fa/disable")
def disable_2fa(req: Verify2FARequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.mfa_preference == "none":
        return {"message": "Already disabled"}

    # Verification required to disable
    if user.mfa_preference == "app":
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(req.otp_code):
            raise HTTPException(status_code=400, detail="Invalid authentication code")
    
    user.mfa_preference = "none"
    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return {"message": "2FA successfully disabled"}
