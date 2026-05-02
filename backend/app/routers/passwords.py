from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.db import get_db
from app.models.models import PasswordEntry, PasswordCategory, User, SecureFile
from app.schemas.schemas import (
    PasswordEntryCreate, PasswordEntryOut, MasterPasswordSetup, 
    MasterPasswordVerify, PasswordEntryUpdate,
    PasswordCategoryCreate, PasswordCategoryOut, MasterKeyChangeReq
)
from app.services.auth import get_current_user
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/status")
def get_master_password_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"is_setup": current_user.master_password_hash is not None}

@router.post("/setup")
def setup_master_password(data: MasterPasswordSetup, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.master_password_hash is not None:
        raise HTTPException(status_code=400, detail="Master password already set")
    
    hashed = pwd_context.hash(data.master_password)
    current_user.master_password_hash = hashed
    db.commit()
    return {"message": "Master password configured successfully"}

@router.post("/verify")
def verify_master_password(data: MasterPasswordVerify, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.master_password_hash:
        raise HTTPException(status_code=400, detail="Master password not set up")
        
    if not pwd_context.verify(data.master_password, current_user.master_password_hash):
        raise HTTPException(status_code=401, detail="Invalid master password")
        
    return {"message": "Verified"}

@router.put("/change-master-password")
def change_master_password(data: MasterKeyChangeReq, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.master_password_hash:
        raise HTTPException(status_code=400, detail="Master password not set up")
        
    if not pwd_context.verify(data.current_master_password, current_user.master_password_hash):
        raise HTTPException(status_code=401, detail="Invalid current master password")

    # Transactional update
    try:
        # Update Passwords
        for p in data.reencrypted_passwords:
            db_p = db.query(PasswordEntry).filter(PasswordEntry.id == p.id, PasswordEntry.user_id == current_user.id).first()
            if db_p:
                db_p.encrypted_password = p.encrypted_password
                db_p.backup_codes = p.backup_codes
        
        # Update Secure Files (metadata/db content)
        for f in data.reencrypted_files:
            db_f = db.query(SecureFile).filter(SecureFile.id == f.id, SecureFile.user_id == current_user.id).first()
            if db_f:
                db_f.encrypted_content = f.encrypted_content
        
        # Update Master Password Hash
        current_user.master_password_hash = pwd_context.hash(data.new_master_password)
        
        db.commit()
        return {"message": "Master key changed and all data re-encrypted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update data: {str(e)}")

@router.get("/", response_model=List[PasswordEntryOut])
def get_passwords(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(PasswordEntry).filter(PasswordEntry.user_id == current_user.id).order_by(PasswordEntry.created_at.desc()).all()

@router.post("/", response_model=PasswordEntryOut, status_code=201)
def create_password(entry: PasswordEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_entry = PasswordEntry(**entry.model_dump(), user_id=current_user.id)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.put("/{entry_id}", response_model=PasswordEntryOut)
def update_password(entry_id: int, update_data: PasswordEntryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_entry = db.query(PasswordEntry).filter(PasswordEntry.id == entry_id, PasswordEntry.user_id == current_user.id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(db_entry, field, value)
        
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.delete("/{entry_id}", status_code=204)
def delete_password(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_entry = db.query(PasswordEntry).filter(PasswordEntry.id == entry_id, PasswordEntry.user_id == current_user.id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    db.delete(db_entry)
    db.commit()

# ─── Categories Endpoints ───────────────────────────────────────────────────

@router.get("/categories", response_model=List[PasswordCategoryOut])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(PasswordCategory).filter(PasswordCategory.user_id == current_user.id).all()

@router.post("/categories", response_model=PasswordCategoryOut)
def create_category(cat: PasswordCategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_cat = PasswordCategory(**cat.model_dump(), user_id=current_user.id)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete("/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_cat = db.query(PasswordCategory).filter(PasswordCategory.id == cat_id, PasswordCategory.user_id == current_user.id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Nullify entries in this category before deleting
    db.query(PasswordEntry).filter(PasswordEntry.category_id == cat_id).update({"category_id": None})
    
    db.delete(db_cat)
    db.commit()
