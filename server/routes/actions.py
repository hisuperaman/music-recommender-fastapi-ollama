from fastapi import APIRouter, Request, Depends
from db import users_collection
from models.user import UserCreate
from fastapi.responses import StreamingResponse
import requests
import json
from routes.auth import manager
import os
from db import likes_collection, history_collection, playlists_collection, user_preferences_collection
from datetime import datetime
from routes.music import get_user_preferences_util
from pydantic import BaseModel


router = APIRouter()


async def save_user_preferences_to_db(email):
    user_history = await history_collection.find({'user_email': email}, projection={'track_name': 1}).sort("played_at", -1).to_list(100)
    liked_songs = await likes_collection.find({'user_email': email}, projection={'track_name': 1}).sort("liked_at", -1).to_list(100)
    
    user_history = [doc['track_name'].strip().lower() for doc in user_history]
    liked_songs = [doc['track_name'].strip().lower() for doc in liked_songs]

    preferences = get_user_preferences_util(user_history+liked_songs)

    await user_preferences_collection.update_one(
        {"user_email": email},
        {"$set": preferences},
        upsert=True
    )


@router.post("/like")
async def toggle_like(data: dict, current_user: dict = Depends(manager)):
    existing = await likes_collection.find_one({
        "user_email": current_user['email'],
        "track_name": data["track_name"].strip().lower(),
        "artists": data["artists"].strip().lower()
    })
    if existing:
        await likes_collection.delete_one({"_id": existing["_id"]})
        return {"msg": "Track unliked"}
    else:
        await likes_collection.insert_one({
            "user_email": current_user['email'],
            "track_name": data["track_name"].strip().lower(),
            "artists": data["artists"].strip().lower(),
            "liked_at": datetime.utcnow()
        })

        await save_user_preferences_to_db(current_user['email'])

        return {"msg": "Track liked"}


@router.get("/likes/{email}")
async def get_likes(email: str):
    likes = await likes_collection.find({"user_email": email}).to_list(100)
    return likes

@router.get("/is-liked")
async def is_liked(email: str, track_name: str, artist: str):
    like = await likes_collection.find_one({
        "user_email": email,
        "track_name": track_name.strip().lower(),
        "artists": artist.strip().lower()
    })
    return {"liked": like is not None}





@router.post("/history")
async def add_or_update_history(data: dict, current_user: dict = Depends(manager)):
    await history_collection.update_one(
        {
            "user_email": current_user['email'],
            "track_name": data["track_name"].strip().lower(),
            "artists": data["artists"].strip().lower()
        },
        {"$set": {"played_at": datetime.utcnow()}},
        upsert=True
    )

    await save_user_preferences_to_db(current_user['email'])

    return {"msg": "History updated"}


@router.get("/history/{email}")
async def get_history(email: str):
    history = await history_collection.find({"user_email": email}).sort("played_at", -1).to_list(100)
    return history




@router.post("/create-and-add-playlist")
async def create_and_add_playlist(data: dict, current_user: dict = Depends(manager)):
    exists = await playlists_collection.find_one({
        "name": data["playlist_name"]
    })
    if exists:
        return {"msg": "Playlist with same name already exists", "error": True}

    await playlists_collection.insert_one({
        "user_email": current_user['email'],
        "name": data["playlist_name"],
        "created_at": datetime.utcnow(),
        "tracks": [{
            "track_name": data["track_name"].strip().lower(),
            "artists": data["artists"].strip().lower(),
            "added_at": datetime.utcnow()
        }]
    })
    return {"msg": "Playlist created"}

@router.post("/playlist/add-track")
async def add_track_to_playlist(data: dict, current_user: dict = Depends(manager)):
    exists = await playlists_collection.find_one({
        "user_email": current_user['email'],
        "name": data["playlist_name"],
        "tracks": {
            "$elemMatch": {
                "track_name": data["track_name"].strip().lower(),
                "artists": data["artists"].strip().lower()
            }
        }
    })
    if exists:
        return {"msg": "Track already in playlist", "error": True}

    await playlists_collection.update_one(
        {
            "name": data["playlist_name"], 
            "user_email": current_user['email'],
        },
        {"$push": {"tracks": {
            "track_name": data["track_name"].strip().lower(),
            "artists": data["artists"].strip().lower(),
            "added_at": datetime.utcnow()
        }}}
    )
    return {"msg": "Track added to playlist"}

@router.post("/playlist/remove-track")
async def remove_track_from_playlist(data: dict, current_user: dict = Depends(manager)):
    result = await playlists_collection.update_one(
        {
            "name": data["playlist_name"],
            "user_email": current_user['email'],
        },
        {
            "$pull": {
                "tracks": {
                    "track_name": data["track_name"].strip().lower(),
                    "artists": data["artists"].strip().lower()
                }
            }
        }
    )

    if result.modified_count == 0:
        return {"msg": "Track not found or already removed", "error": True}

    # Check if playlist is now empty
    playlist = await playlists_collection.find_one({
        "name": data["playlist_name"],
        "user_email": current_user['email'],
    })

    if playlist and not playlist.get("tracks"):
        await playlists_collection.delete_one({
            "name": data["playlist_name"],
            "user_email": current_user['email'],
        })
        return {"msg": "Track removed and playlist deleted (empty)"}

    return {"msg": "Track removed from playlist"}




@router.get("/get-user-preferences")
async def get_user_preferences(current_user: dict = Depends(manager)):
    user_preferences = await user_preferences_collection.find_one({"user_email": current_user['email']}, {'_id': 0})
    user_info = await users_collection.find_one({"email": current_user['email']}, {"_id": 0})

    if user_preferences is None:
        return {
            "user_email": current_user['email'],
            "avg_energy": None,
            "avg_positiveness": None,
            "avg_tempo": None,
            "dominant_emotion": None,
            "favorite_genre": None,
            "full_name": user_info["full_name"]
        }

    user_preferences["full_name"] = user_info["full_name"]
    return user_preferences


class ChangeUserInfo(BaseModel):
    full_name: str

@router.post("/change-user-info")
async def change_user_info(data: ChangeUserInfo, current_user: dict = Depends(manager)):
    await users_collection.update_one(
        {'email': current_user['email']},
        {'$set': {'full_name': data.full_name}}
    )
    return {'message': 'success'}