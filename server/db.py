from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URL = os.getenv("MONGO_URI")

client = AsyncIOMotorClient(MONGO_URL)
db = client["musicrecommender"]
users_collection = db["users"]
likes_collection = db["likes"]
history_collection = db["history"]
playlists_collection = db["playlists"]
user_preferences_collection = db["user_preferences"]