from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
import pyotp

from app.database.db import get_db
from app.models.models import User
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user
from app.services.seed import seed_default_categories_for_user

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


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed 23 default categories for this new user
    seed_default_categories_for_user(db, user.id)

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(
        access_token=token,
        user={"id": user.id, "name": user.name, "email": user.email},
    )


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.totp_enabled:
        if not req.otp_code:
            raise HTTPException(status_code=403, detail="2FA_REQUIRED")
        
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(req.otp_code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

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
    db.commit()
    return {"message": "2FA successfully enabled"}

@router.post("/2fa/disable")
def disable_2fa(req: Verify2FARequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.totp_enabled:
        return {"message": "Already disabled"}

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(req.otp_code):
        raise HTTPException(status_code=400, detail="Invalid authentication code")

    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return {"message": "2FA successfully disabled"}
