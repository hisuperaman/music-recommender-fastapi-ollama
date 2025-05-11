from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    full_name: str
    email: str
    age: str
    avatar: str
    password: str
