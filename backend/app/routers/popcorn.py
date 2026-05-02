from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import httpx
import json

from app.database.db import get_db
from app.models.models import User, PopcornEntry
from app.services.auth import get_current_user, oauth2_scheme, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from app.services.gdrive import GoogleDriveService
from app.schemas import schemas

router = APIRouter()

# Initialize GDrive Service
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/vault")

gdrive_service = None
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    gdrive_service = GoogleDriveService(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)

@router.get("/", response_model=List[schemas.PopcornEntryOut])
def get_popcorn_entries(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(PopcornEntry).filter(PopcornEntry.user_id == current_user.id).order_by(PopcornEntry.created_at.desc()).all()

@router.post("/")
async def create_popcorn_entry(
    title: str = Form(...),
    category: str = Form(...),
    language: Optional[str] = Form(None),
    rating: Optional[int] = Form(None),
    synopsis: Optional[str] = Form(None),
    reasons_for_liking: Optional[str] = Form(None),
    genres: Optional[str] = Form(None),
    poster: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    poster_url = None
    gdrive_file_id = None

    if poster:
        # If GDrive is connected, upload there
        if current_user.gdrive_token and current_user.gdrive_folder_id and gdrive_service:
            try:
                service = gdrive_service.get_service(current_user.gdrive_token)
                popcorn_folder_id = gdrive_service.get_or_create_folder(service, "Popcorn Posters", current_user.gdrive_folder_id)
                
                content = await poster.read()
                gdrive_file_id = gdrive_service.upload_file(
                    service,
                    f"poster_{title}_{poster.filename}",
                    content,
                    poster.content_type,
                    popcorn_folder_id
                )
                # Store a URL that includes the token for img tag compatibility
                # Or we can just store the gdrive_file_id and let the frontend handle it
                poster_url = f"/api/popcorn/poster/{gdrive_file_id}"
            except Exception as e:
                print(f"Popcorn poster upload to GDrive failed: {e}")
        else:
            # Fallback: we don't have local storage implemented for posters yet in this app's architecture,
            # so we'll just skip it if GDrive isn't connected, as per user requirement.
            # (User said: "else it should add to connect the gdrive for uploading the poster")
            pass

    new_entry = PopcornEntry(
        user_id=current_user.id,
        title=title,
        category=category,
        language=language,
        rating=rating,
        synopsis=synopsis,
        reasons_for_liking=reasons_for_liking,
        genres=genres,
        poster_url=poster_url,
        gdrive_file_id=gdrive_file_id
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@router.get("/poster/{file_id}")
async def get_poster(file_id: str, token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    # Manual token verification for img tags
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        current_user = db.query(User).filter(User.id == int(user_id)).first()
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not current_user.gdrive_token or not gdrive_service:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    
    try:
        service = gdrive_service.get_service(current_user.gdrive_token)
        content = gdrive_service.download_file(service, file_id)
        
        # We need to know the mimetype. GDrive API can give us that.
        file_metadata = service.files().get(fileId=file_id, fields='mimeType').execute()
        mimetype = file_metadata.get('mimeType', 'image/jpeg')
        
        from fastapi.responses import Response
        return Response(content=content, media_type=mimetype)
    except Exception as e:
        print(f"Failed to fetch poster: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch poster from Google Drive")

@router.get("/ai-synopsis")
async def get_ai_synopsis(title: str, category: str):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Service not configured.")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    prompt = f"Provide a brief, engaging synopsis for the {category} titled '{title}'. Keep it under 100 words."
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a helpful movie and show expert. Provide concise and accurate synopses."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 200
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=20.0)
            
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Groq API error: {response.text}")
            
        data = response.json()
        synopsis = data["choices"][0]["message"]["content"]
        return {"synopsis": synopsis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{entry_id}", response_model=schemas.PopcornEntryOut)
async def update_popcorn_entry(
    entry_id: int,
    title: str = Form(...),
    category: str = Form(...),
    language: Optional[str] = Form(None),
    rating: Optional[float] = Form(None),
    synopsis: Optional[str] = Form(None),
    reasons_for_liking: Optional[str] = Form(None),
    genres: Optional[str] = Form(None),
    poster: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entry = db.query(PopcornEntry).filter(PopcornEntry.id == entry_id, PopcornEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    entry.title = title
    entry.category = category
    entry.language = language
    entry.rating = rating
    entry.synopsis = synopsis
    entry.reasons_for_liking = reasons_for_liking
    entry.genres = genres

    if poster:
        if current_user.gdrive_token and current_user.gdrive_folder_id and gdrive_service:
            try:
                # Delete old poster if exists
                if entry.gdrive_file_id:
                    service = gdrive_service.get_service(current_user.gdrive_token)
                    try: gdrive_service.delete_file(service, entry.gdrive_file_id)
                    except: pass

                service = gdrive_service.get_service(current_user.gdrive_token)
                popcorn_folder_id = gdrive_service.get_or_create_folder(service, "Popcorn Posters", current_user.gdrive_folder_id)
                
                content = await poster.read()
                new_file_id = gdrive_service.upload_file(
                    service,
                    f"poster_{title}_{poster.filename}",
                    content,
                    poster.content_type,
                    popcorn_folder_id
                )
                entry.gdrive_file_id = new_file_id
                entry.poster_url = f"/api/popcorn/poster/{new_file_id}"
            except Exception as e:
                print(f"Update poster failed: {e}")

    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/{entry_id}")
def delete_popcorn_entry(entry_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(PopcornEntry).filter(PopcornEntry.id == entry_id, PopcornEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry.gdrive_file_id and current_user.gdrive_token and gdrive_service:
        try:
            service = gdrive_service.get_service(current_user.gdrive_token)
            gdrive_service.delete_file(service, entry.gdrive_file_id)
        except Exception as e:
            print(f"Failed to delete poster from GDrive: {e}")
            
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}
