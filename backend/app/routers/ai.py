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
            {
                "role": "system", 
                "content": (
                    "You are a professional financial advisor integrated into a Budget Tracker app. "
                    "Use the context provided in the prompt to give actionable advice. Keep it concise, friendly, and secure. "
                    "Always refer to currencies in Indian Rupees (INR / ₹) and not US Dollars.\n\n"
                    "CORE CAPABILITIES:\n"
                    "1. ANALYZE: Use the provided JSON context to help user manage budgets.\n"
                    "2. ADD TRANSACTION: If the user wants to record an expense or income, you MUST extract the details and return a JSON action block at the END of your response.\n"
                    "   Format: [ACTION]{\"type\": \"add_transaction\", \"data\": {\"type\": \"expense\"|\"income\", \"amount\": number, \"category_id\": number, \"account_id\": number, \"notes\": \"string\", \"date\": \"ISO_DATE\"}}[/ACTION]\n"
                    "   - Use the category and account lists provided in the user context to find appropriate IDs.\n"
                    "   - If no account is specified, use the one marked 'is_default': true if available, or the first account.\n"
                    "   - If no category is specified, stay in character and ask for it, or pick the most logical one.\n\n"
                    "RESTRICTIONS:\n"
                    "- DO NOT attempt to delete or edit existing records. You only have permission to ADD.\n"
                    "- Keep responses clean and brief as they will be read aloud via TTS."
                )
            },
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
