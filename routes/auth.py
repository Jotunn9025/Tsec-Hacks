from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth.dependencies import get_db
from database import SessionLocal
from models.instructor_profile import InstructorProfile
from models.student_profile import StudentProfile
from models.user import User
from models.user_role import UserRole
from schemas.user import UserCreate, UserOut, Token, TokenRefresh
from utils.security import get_password_hash, verify_password, create_access_token, create_refresh_token

# Router for authentication related endpoints
router = APIRouter(prefix="/auth", tags=["auth"])

# Endpoint to register a new user
@router.post("/signup", response_model=UserOut)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if a user with the given email already exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Prevent users from signing up as ADMIN
    if user_in.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot sign up as an administrator"
        )
    
    # Create and save the new user
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        name=user_in.name,
        phone_number=user_in.phone_number,
        role=user_in.role or UserRole.USER
    )
    db.add(new_user)
    db.flush() # Flush to get the user ID for the profile
    
    # Automatically create an instructor profile if they registered as one
    if new_user.role == UserRole.INSTRUCTOR:
        profile = InstructorProfile(user_id=new_user.id)
        db.add(profile)
    # Automatically create a student profile if they registered as a regular user
    elif new_user.role == UserRole.USER:
        profile = StudentProfile(user_id=new_user.id)
        db.add(profile)
    
    db.commit()
    db.refresh(new_user)
    return new_user

# Endpoint to authenticate and receive a token
@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Verify user credentials
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate and return both access and refresh tokens
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token, 
        "token_type": "bearer"
    }

# Endpoint to refresh the access token using a valid refresh token
@router.post("/refresh", response_model=Token)
def refresh_access_token(token_in: TokenRefresh, db: Session = Depends(get_db)):
    from jose import jwt, JWTError
    from config import settings
    
    try:
        # Decode refresh token
        payload = jwt.decode(token_in.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        is_refresh: bool = payload.get("refresh")
        
        if email is None or not is_refresh:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    # Issue new tokens
    new_access_token = create_access_token(data={"sub": user.email, "role": user.role})
    new_refresh_token = create_refresh_token(data={"sub": user.email})
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }
