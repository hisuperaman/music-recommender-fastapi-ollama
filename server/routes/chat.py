from fastapi import APIRouter, Request, Depends
from db import users_collection
from models.user import UserCreate
from fastapi.responses import StreamingResponse
import requests
import json
from routes.auth import manager
from dotenv import load_dotenv
import os

from chat_recommender import stream_response


router = APIRouter()

# OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL")

@router.post("")
async def chat(req: Request, current_user: dict = Depends(manager)):
    data = await req.json()
    message = data.get("message", '')

    return StreamingResponse(stream_response(message, current_user['email']), media_type="text/plain")