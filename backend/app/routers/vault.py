from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List
import base64
import os
import json

from app.database.db import get_db
from app.models.models import User, SecureFile
from app.services.auth import get_current_user
from app.services.gdrive import GoogleDriveService

router = APIRouter()

# Initialize GDrive Service
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
# The redirect URI should match what's configured in Google Console
# For local dev, usually http://localhost:5173/vault
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/vault")

gdrive_service = None
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    gdrive_service = GoogleDriveService(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)

@router.get("/status")
def get_vault_status(current_user: User = Depends(get_current_user)):
    return {
        "is_gdrive_connected": current_user.gdrive_token is not None,
        "gdrive_folder_id": current_user.gdrive_folder_id
    }

@router.get("/gdrive/config-status")
def get_gdrive_config_status():
    """Returns whether Google Drive integration is configured on the server."""
    return {"is_configured": gdrive_service is not None}

@router.get("/gdrive/auth-url")
def get_auth_url():
    if not gdrive_service:
        raise HTTPException(status_code=503, detail="Google Drive integration is not configured on the server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.")
    return {"url": gdrive_service.get_auth_url()}

@router.post("/gdrive/connect")
def connect_gdrive(code: str = Query(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not gdrive_service:
        raise HTTPException(status_code=503, detail="Google Drive integration is not configured on the server.")
    
    try:
        creds = gdrive_service.get_credentials(code)
        creds_json = creds.to_json()
        
        # Initialize folder structure
        service = gdrive_service.get_service(creds_json)
        root_folder_id = gdrive_service.get_or_create_folder(service, "Budget Tracker Vault")
        
        current_user.gdrive_token = creds_json
        current_user.gdrive_folder_id = root_folder_id
        db.commit()
        
        return {"message": "Google Drive connected successfully"}
    except Exception as e:
        print(f"GDrive connection error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
def get_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    files = db.query(SecureFile).filter(SecureFile.user_id == current_user.id).order_by(SecureFile.created_at.desc()).all()
    return [{
        "id": f.id,
        "filename": f.filename,
        "mimetype": f.mimetype,
        "size": f.size,
        "storage_location": f.storage_location,
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
    # Limit check: 5MB
    if size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    storage_location = "database"
    gdrive_file_id = None
    stored_content = encrypted_content

    # If GDrive is connected, upload there instead
    if current_user.gdrive_token and current_user.gdrive_folder_id:
        try:
            service = gdrive_service.get_service(current_user.gdrive_token)
            
            # Determine subfolder based on mimetype
            folder_name = "Other"
            if "pdf" in mimetype:
                folder_name = "PDFs"
            elif "image" in mimetype:
                folder_name = "Images"
            elif "text" in mimetype or "plain" in mimetype:
                folder_name = "Documents"
                
            folder_id = gdrive_service.get_or_create_folder(service, folder_name, current_user.gdrive_folder_id)
            
            # Upload to GDrive
            gdrive_file_id = gdrive_service.upload_file(
                service, 
                filename, 
                encrypted_content, 
                mimetype, 
                folder_id
            )
            storage_location = "gdrive"
            stored_content = None # Don't store in DB if in GDrive
        except Exception as e:
            print(f"GDrive upload failed: {e}")
            # Fallback to database storage if GDrive fails
            storage_location = "database"

    new_file = SecureFile(
        user_id=current_user.id,
        filename=filename,
        mimetype=mimetype,
        size=size,
        encrypted_content=stored_content,
        gdrive_file_id=gdrive_file_id,
        storage_location=storage_location
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    return {"message": f"File uploaded to {storage_location}", "id": new_file.id}

@router.get("/{file_id}")
def download_file(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_entry = db.query(SecureFile).filter(SecureFile.id == file_id, SecureFile.user_id == current_user.id).first()
    if not file_entry:
        raise HTTPException(status_code=404, detail="File not found")
    
    content = file_entry.encrypted_content
    
    if file_entry.storage_location == "gdrive":
        if not current_user.gdrive_token:
            raise HTTPException(status_code=400, detail="Google Drive not connected")
        
        try:
            service = gdrive_service.get_service(current_user.gdrive_token)
            content_bytes = gdrive_service.download_file(service, file_entry.gdrive_file_id)
            content = content_bytes.decode('utf-8')
        except Exception as e:
            print(f"GDrive download failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch file from Google Drive")
            
    return {
        "filename": file_entry.filename,
        "mimetype": file_entry.mimetype,
        "encrypted_content": content
    }

@router.delete("/{file_id}")
def delete_file(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_entry = db.query(SecureFile).filter(SecureFile.id == file_id, SecureFile.user_id == current_user.id).first()
    if not file_entry:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file_entry.storage_location == "gdrive" and file_entry.gdrive_file_id:
        try:
            service = gdrive_service.get_service(current_user.gdrive_token)
            gdrive_service.delete_file(service, file_entry.gdrive_file_id)
        except Exception as e:
            print(f"GDrive delete failed: {e}")
            # We continue to delete from DB even if GDrive delete fails (e.g. file already gone)
    
    db.delete(file_entry)
    db.commit()
    return {"message": "File deleted"}
