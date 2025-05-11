from fastapi import APIRouter, Request, Depends
from db import users_collection
from models.user import UserCreate
from fastapi.responses import StreamingResponse
import requests
import json
from routes.auth import manager
from dotenv import load_dotenv
import os



router = APIRouter()



OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL")

SYSTEM_PROMPT = f"answer in brief short"

@router.post("")
async def chat(req: Request, current_user: dict = Depends(manager)):
    data = await req.json()
    messages = data.get("messages", [])
    
    payload = { 
        "model": "llama3.2",
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + [
            {"role": m["from"], "content": m["text"]} for m in messages
        ],
        "stream": True
    }
    headers = {
        "Content-Type": "application/json"
    }

    def generate():
        with requests.post(f"{OLLAMA_BASE_URL}/api/chat", headers=headers, data=json.dumps(payload), stream=True) as response:
            if response.status_code == 200:
                for chunk in response.iter_content(chunk_size=1024):
                    if chunk:
                        yield chunk.decode("utf-8")
            else:
                print("error:", response.status_code, response.text)
                yield json.dumps({"error": response.status_code, "data": response.text})

    return StreamingResponse(generate(), media_type="application/json")
