from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import base64
import os
import json

from app.database.db import get_db, SessionLocal
from app.models.models import User, SecureFile, VaultCategory, PopcornEntry
from app.services.auth import get_current_user
from app.services.gdrive import GoogleDriveService
from app.schemas import schemas

router = APIRouter()

# In-memory migration status tracking
MIGRATION_STATUS = {} # user_id -> { "total": 0, "current": 0, "status": "idle", "message": "" }

# Initialize GDrive Service
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/vault")

gdrive_service = None
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    gdrive_service = GoogleDriveService(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)

def run_migration(user_id: int, old_token: str, new_token: str, new_root_id: str):
    """Background task to migrate all assets from old drive to new drive."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user: return
        
        MIGRATION_STATUS[user_id]["status"] = "running"
        
        old_service = None
        try:
            old_service = gdrive_service.get_service(old_token)
        except Exception as e:
            print(f"Migration background task: Could not init old service: {e}")
            MIGRATION_STATUS[user_id]["status"] = "error"
            MIGRATION_STATUS[user_id]["message"] = "Authentication failed for old account"
            return

        new_service = gdrive_service.get_service(new_token)
        folder_cache = {}
        
        # 1. Collect all files to migrate
        all_files = db.query(SecureFile).filter(SecureFile.user_id == user_id).all()
        popcorn_entries = db.query(PopcornEntry).filter(PopcornEntry.user_id == user_id, PopcornEntry.gdrive_file_id.isnot(None)).all()
        
        has_profile_pic = user.profile_picture and user.profile_picture.startswith("gdrive://")
        
        total_files = len(all_files) + len(popcorn_entries) + (1 if has_profile_pic else 0)
        MIGRATION_STATUS[user_id]["total"] = total_files
        
        current_count = 0
        
        # --- MIGRATE VAULT FILES ---
        for file in all_files:
            try:
                content = None
                if file.storage_location == "gdrive":
                    content_bytes = gdrive_service.download_file(old_service, file.gdrive_file_id)
                    content = content_bytes.decode('utf-8')
                else:
                    content = file.encrypted_content
                
                if content:
                    folder_name = "Other"
                    if file.category_id:
                        cat = db.query(VaultCategory).filter(VaultCategory.id == file.category_id).first()
                        if cat: folder_name = cat.name
                    elif file.mimetype:
                        if "pdf" in file.mimetype: folder_name = "PDFs"
                        elif "image" in file.mimetype: folder_name = "Images"
                        elif "text" in file.mimetype: folder_name = "Documents"

                    if folder_name not in folder_cache:
                        folder_cache[folder_name] = gdrive_service.get_or_create_folder(new_service, folder_name, new_root_id)
                    
                    new_file_id = gdrive_service.upload_file(new_service, file.filename, content, file.mimetype, folder_cache[folder_name])
                    
                    file.gdrive_file_id = new_file_id
                    file.storage_location = "gdrive"
                    file.encrypted_content = None
                    db.commit()
                
                current_count += 1
                MIGRATION_STATUS[user_id]["current"] = current_count
            except Exception as e:
                print(f"Migration error for vault file {file.id}: {e}")
                current_count += 1 # Continue
                MIGRATION_STATUS[user_id]["current"] = current_count

        # --- MIGRATE PROFILE PIC ---
        if has_profile_pic:
            try:
                old_pic_id = user.profile_picture.replace("gdrive://", "")
                pic_content = gdrive_service.download_file(old_service, old_pic_id)
                pic_meta = old_service.files().get(fileId=old_pic_id, fields='mimeType, name').execute()
                
                profile_folder_id = gdrive_service.get_or_create_folder(new_service, "Profile", new_root_id)
                new_pic_id = gdrive_service.upload_file(new_service, pic_meta.get('name', 'profile_pic'), pic_content, pic_meta.get('mimeType', 'image/jpeg'), profile_folder_id)
                
                user.profile_picture = f"gdrive://{new_pic_id}"
                db.commit()
                current_count += 1
                MIGRATION_STATUS[user_id]["current"] = current_count
            except:
                current_count += 1
                MIGRATION_STATUS[user_id]["current"] = current_count

        # --- MIGRATE POPCORN POSTERS ---
        if popcorn_entries:
            popcorn_folder_id = gdrive_service.get_or_create_folder(new_service, "Popcorn Posters", new_root_id)
            for entry in popcorn_entries:
                try:
                    poster_content = gdrive_service.download_file(old_service, entry.gdrive_file_id)
                    poster_meta = old_service.files().get(fileId=entry.gdrive_file_id, fields='mimeType, name').execute()
                    
                    new_poster_id = gdrive_service.upload_file(new_service, poster_meta.get('name', f"poster_{entry.id}"), poster_content, poster_meta.get('mimeType', 'image/jpeg'), popcorn_folder_id)
                    
                    entry.gdrive_file_id = new_poster_id
                    entry.poster_url = f"/api/popcorn/poster/{new_poster_id}"
                    db.commit()
                    current_count += 1
                    MIGRATION_STATUS[user_id]["current"] = current_count
                except:
                    current_count += 1
                    MIGRATION_STATUS[user_id]["current"] = current_count

        # Reset category IDs
        db.query(VaultCategory).filter(VaultCategory.user_id == user_id).update({"gdrive_folder_id": None})
        db.commit()
        
        MIGRATION_STATUS[user_id]["status"] = "completed"
        MIGRATION_STATUS[user_id]["message"] = f"Successfully migrated {current_count} items."
        
    except Exception as e:
        print(f"Global migration task error: {e}")
        if user_id in MIGRATION_STATUS:
            MIGRATION_STATUS[user_id]["status"] = "error"
            MIGRATION_STATUS[user_id]["message"] = str(e)
    finally:
        db.close()

@router.get("/categories", response_model=List[schemas.VaultCategoryOut])
def get_vault_categories(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(VaultCategory).filter(VaultCategory.user_id == current_user.id).all()

@router.post("/categories", response_model=schemas.VaultCategoryOut)
def create_vault_category(category: schemas.VaultCategoryCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if exists
    existing = db.query(VaultCategory).filter(
        VaultCategory.user_id == current_user.id,
        VaultCategory.name == category.name
    ).first()
    if existing:
        return existing
    
    new_cat = VaultCategory(name=category.name, user_id=current_user.id)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.put("/categories/{cat_id}", response_model=schemas.VaultCategoryOut)
def update_vault_category(cat_id: int, category: schemas.VaultCategoryUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_cat = db.query(VaultCategory).filter(VaultCategory.id == cat_id, VaultCategory.user_id == current_user.id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_cat.name = category.name
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete("/categories/{cat_id}", status_code=204)
def delete_vault_category(cat_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_cat = db.query(VaultCategory).filter(VaultCategory.id == cat_id, VaultCategory.user_id == current_user.id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Nullify files in this category
    db.query(SecureFile).filter(SecureFile.category_id == cat_id).update({"category_id": None})
    
    db.delete(db_cat)
    db.commit()

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

@router.get("/gdrive/migration-status")
def get_migration_status(current_user: User = Depends(get_current_user)):
    status = MIGRATION_STATUS.get(current_user.id, {"status": "idle", "current": 0, "total": 0})
    return status

@router.post("/gdrive/connect")
def connect_gdrive(
    background_tasks: BackgroundTasks,
    code: str = Query(...), 
    migrate: bool = Query(False),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if not gdrive_service:
        raise HTTPException(status_code=503, detail="Google Drive integration is not configured on the server.")
    
    try:
        new_creds = gdrive_service.get_credentials(code)
        new_creds_json = new_creds.to_json()
        new_service = gdrive_service.get_service(new_creds_json)
        
        # Initialize folder structure in NEW account
        new_root_id = gdrive_service.get_or_create_folder(new_service, "Elite Privacy Vault")
        
        old_token = current_user.gdrive_token
        
        # Update user with new account info IMMEDIATELY
        current_user.gdrive_token = new_creds_json
        current_user.gdrive_folder_id = new_root_id
        db.commit()

        if migrate:
            MIGRATION_STATUS[current_user.id] = {
                "total": 0, 
                "current": 0, 
                "status": "pending", 
                "message": "Initializing migration..."
            }
            background_tasks.add_task(run_migration, current_user.id, old_token, new_creds_json, new_root_id)
            return {"message": "Google Drive connected. Migration started in background.", "is_migrating": True}
        
        return {"message": "Google Drive connected successfully.", "is_migrating": False}
    except Exception as e:
        print(f"GDrive connection error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[schemas.VaultFileOut])
def get_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SecureFile).filter(SecureFile.user_id == current_user.id).order_by(SecureFile.created_at.desc()).all()

@router.post("/upload")
async def upload_file(
    filename: str = Form(...),
    mimetype: str = Form(...),
    size: int = Form(...),
    encrypted_content: str = Form(...),
    category_id: Optional[int] = Form(None),
    category_name: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Limit check removed as requested
    # if size > 5 * 1024 * 1024:
    #     raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    # Resolve category
    category = None
    if category_id:
        category = db.query(VaultCategory).filter(VaultCategory.id == category_id, VaultCategory.user_id == current_user.id).first()
    elif category_name:
        # Check if exists, or create
        category = db.query(VaultCategory).filter(VaultCategory.name == category_name, VaultCategory.user_id == current_user.id).first()
        if not category:
            category = VaultCategory(name=category_name, user_id=current_user.id)
            db.add(category)
            db.commit()
            db.refresh(category)

    storage_location = "database"
    gdrive_file_id = None
    stored_content = encrypted_content

    # If GDrive is connected, upload there instead
    if current_user.gdrive_token and current_user.gdrive_folder_id:
        try:
            service = gdrive_service.get_service(current_user.gdrive_token)
            
            # Determine subfolder based on Category or mimetype
            folder_name = "Other"
            if category:
                folder_name = category.name
            elif "pdf" in mimetype:
                folder_name = "PDFs"
            elif "image" in mimetype:
                folder_name = "Images"
            elif "text" in mimetype or "plain" in mimetype:
                folder_name = "Documents"
                
            folder_id = gdrive_service.get_or_create_folder(service, folder_name, current_user.gdrive_folder_id)
            
            # Save folder ID to category if it was missing
            if category and not category.gdrive_folder_id:
                category.gdrive_folder_id = folder_id
                db.commit()

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
        storage_location=storage_location,
        category_id=category.id if category else None
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
