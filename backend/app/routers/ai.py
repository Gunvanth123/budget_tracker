import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from app.services.auth import get_current_user
from app.models.models import User, ChatMessage
from app.database.db import get_db
from app.schemas.schemas import ChatMessageOut

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str
    month_year: str

@router.get("/history/{month_year}", response_model=List[ChatMessageOut])
async def get_chat_history(
    month_year: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.month_year == month_year
    ).order_by(ChatMessage.created_at.asc()).all()
    return messages

@router.delete("/history/{month_year}")
async def clear_chat_history(
    month_year: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.month_year == month_year
    ).delete()
    db.commit()
    return {"message": "Chat history cleared"}

@router.post("/chat")
async def ai_chat(
    req: ChatRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI Service not configured. Please add GROQ_API_KEY to environment variables.")

    # 1. Save User Message
    user_msg = ChatMessage(
        user_id=current_user.id,
        role="user",
        content=req.prompt,
        month_year=req.month_year
    )
    db.add(user_msg)
    db.commit()

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Fetch recent history for context (optional, but good for continuity)
    history = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.month_year == req.month_year
    ).order_by(ChatMessage.created_at.desc()).limit(10).all()
    
    chat_messages = [
        {
            "role": "system", 
            "content": (
                "You are a professional financial advisor integrated into a Budget Tracker app. "
                "Always refer to currencies in Indian Rupees (INR / ₹).\n\n"
                "CORE RULES:\n"
                "1. EXTREME BREVITY: Your responses will be read aloud via TTS. Keep responses extremely short (MAX 2 SENTENCES).\n"
                "2. ADD TRANSACTION: If the user wants to record an expense or income, return a JSON action block at the END.\n"
                "   Format: [ACTION]{\"type\": \"add_transaction\", \"data\": {\"type\": \"expense\"|\"income\", \"amount\": number, \"category_id\": number, \"account_id\": number, \"notes\": \"string\", \"date\": \"ISO_DATE\"}}[/ACTION]\n"
                "   - Use the category and account lists provided in context to find IDs.\n"
                "   - If no account, use 'is_default': true.\n"
                "3. NO DELETIONS: DO NOT attempt to delete or edit records.\n"
                "4. STYLE: Friendly, concise, and helpful."
            )
        }
    ]
    
    # Add history in correct order
    for msg in reversed(history):
        chat_messages.append({"role": msg.role, "content": msg.content})

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": chat_messages,
        "temperature": 0.7,
        "max_tokens": 1024
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Groq API error: {response.text}")
            
        data = response.json()
        ai_content = data["choices"][0]["message"]["content"]

        # 2. Save AI Response
        ai_msg = ChatMessage(
            user_id=current_user.id,
            role="assistant",
            content=ai_content,
            month_year=req.month_year
        )
        db.add(ai_msg)
        db.commit()

        return {"content": ai_content}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
