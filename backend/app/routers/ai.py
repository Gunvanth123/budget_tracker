import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.auth import get_current_user
from app.models.models import User

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str

@router.post("/chat")
async def ai_chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        # Fallback to a placeholder if key is missing during initial setup
        raise HTTPException(status_code=500, detail="AI Service not configured. Please add GROQ_API_KEY to environment variables.")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a professional financial advisor integrated into a Budget Tracker app. Use the context provided in the prompt to give actionable advice. Keep it concise, friendly, and secure."},
            {"role": "user", "content": req.prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 1024
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Groq API error: {response.text}")
            
        data = response.json()
        return {"content": data["choices"][0]["message"]["content"]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
