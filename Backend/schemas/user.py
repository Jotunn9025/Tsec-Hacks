from pydantic import BaseModel, EmailStr
from typing import Optional
from models.user_role import UserRole

# Shared attributes for User schemas
class UserBase(BaseModel):
    email: EmailStr

# Schema for creating a new user (signup)
class UserCreate(UserBase):
    password: str
    name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[UserRole] = UserRole.USER

# Schema for returning user data (response)
class UserOut(UserBase):
    id: int
    name: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool
    role: UserRole

    class Config:
        from_attributes = True

# Schema for the JWT token response
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenRefresh(BaseModel):
    refresh_token: str

# Schema for data stored within the JWT token
class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None
