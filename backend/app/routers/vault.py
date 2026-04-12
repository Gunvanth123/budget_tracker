from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import base64

from app.database.db import get_db
from app.models.models import User, SecureFile
from app.services.auth import get_current_user

router = APIRouter()

@router.get("/")
def get_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    files = db.query(SecureFile).filter(SecureFile.user_id == current_user.id).order_by(SecureFile.created_at.desc()).all()
    return [{
        "id": f.id,
        "filename": f.filename,
        "mimetype": f.mimetype,
        "size": f.size,
        "created_at": f.created_at
    } for f in files]

@router.post("/upload")
async def upload_file(
    filename: str = Form(...),
    mimetype: str = Form(...),
    size: int = Form(...),
    encrypted_content: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Limit check: 5MB = 5 * 1024 * 1024 bytes
    if size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    new_file = SecureFile(
        user_id=current_user.id,
        filename=filename,
        mimetype=mimetype,
        size=size,
        encrypted_content=encrypted_content
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    return {"message": "File uploaded securely", "id": new_file.id}

@router.get("/{file_id}")
def download_file(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_entry = db.query(SecureFile).filter(SecureFile.id == file_id, SecureFile.user_id == current_user.id).first()
    if not file_entry:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {
        "filename": file_entry.filename,
        "mimetype": file_entry.mimetype,
        "encrypted_content": file_entry.encrypted_content
    }

@router.delete("/{file_id}")
def delete_file(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_entry = db.query(SecureFile).filter(SecureFile.id == file_id, SecureFile.user_id == current_user.id).first()
    if not file_entry:
        raise HTTPException(status_code=404, detail="File not found")
    
    db.delete(file_entry)
    db.commit()
    return {"message": "File deleted"}
