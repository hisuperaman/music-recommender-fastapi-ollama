from fastapi import APIRouter, Response, Depends, HTTPException
from db import users_collection
from models.user import UserCreate
from passlib.context import CryptContext
from dotenv import load_dotenv
import os
from fastapi_login import LoginManager
from models.userLogin import UserLogin
from datetime import timedelta

load_dotenv()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

manager = LoginManager(JWT_SECRET_KEY, token_url='/auth/login', use_cookie=True)
manager.cookie_name = "access_token"

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

@router.post("/signup")
async def signup(user: UserCreate):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user.password)
    new_user = {
        "full_name": user.full_name,
        "email": user.email,
        "age": user.age,
        "avatar": user.avatar,
        "password": hashed_password
    }
    
    await users_collection.insert_one(new_user)
    return {"message": "User created successfully"}


@router.post("/login")
async def login(user: UserLogin, response: Response):
    db_user = await users_collection.find_one({"email": user.email})
    
    if db_user is None or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = manager.create_access_token(data={"sub": db_user["email"]}, expires=timedelta(days=7))
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    return {"message": "Logged in successfully", "access_token": access_token}


@manager.user_loader()
async def load_user(email: str):
    return await users_collection.find_one({"email": email})


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@router.get("/verify")
async def verify_user(current_user=Depends(manager)):
    return {
        "full_name": current_user["full_name"],
        "email": current_user["email"],
        "age": current_user["age"],
        "avatar": current_user["avatar"]
        }