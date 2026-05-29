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

def clean_user_message(content: str) -> str:
    if not content:
        return ""
    if "USER SAYS:" in content:
        parts = content.split("USER SAYS:", 1)
        sub = parts[1].strip()
        if sub.startswith('"'):
            next_quote = sub.find('"', 1)
            if next_quote != -1:
                return sub[1:next_quote].strip()
        if "TASK:" in sub:
            sub = sub.split("TASK:", 1)[0].strip()
        return sub.strip(' \t\n\r"')
    return content

router = APIRouter()


class ChatRequest(BaseModel):
    prompt: str
    month_year: str
    message: Optional[str] = None

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
    for msg in messages:
        if msg.role == "user" and msg.content:
            msg.content = clean_user_message(msg.content)
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

    # Fetch recent history for context (before adding the current turn)
    history = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.month_year == req.month_year
    ).order_by(ChatMessage.created_at.desc()).limit(10).all()
    
    chat_messages = [
        {
            "role": "system", 
            "content": (
                "You are 'Jav', a highly intelligent, empathetic, and responsive AI assistant integrated into a Budget Tracker app. "
                "Always refer to currencies in Indian Rupees (INR / ₹).\n\n"
                "CORE RULES:\n"
                "1. RESPONSIVENESS: Speak naturally, warm, and conversationally. Avoid robotic phrasing. Be highly responsive and human-like.\n"
                "2. NO DATA MODIFICATIONS: DO NOT attempt to add, delete, or edit database records (e.g. transactions, categories, budgets) directly.\n"
                "3. STYLE: Friendly, professional, and helpful."
            )
        }
    ]
    
    # Add history in correct order
    for msg in reversed(history):
        chat_messages.append({"role": msg.role, "content": msg.content})

    # Append current prompt containing full context
    chat_messages.append({"role": "user", "content": req.prompt})

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

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

        # 1. Save User Message (save the clean message in database history)
        db_message_content = req.message
        if not db_message_content and req.prompt:
            db_message_content = clean_user_message(req.prompt)
                
        user_msg = ChatMessage(
            user_id=current_user.id,
            role="user",
            content=db_message_content,
            month_year=req.month_year
        )
        db.add(user_msg)
        
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

