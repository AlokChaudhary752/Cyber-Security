from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import User
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class UserRegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: str = ""
    role: str = "soc_analyst"


class UserLoginRequest(BaseModel):
    username_or_email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", response_model=TokenResponse)
async def register_user(req: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    stmt = select(User).where((User.email == req.email) | (User.username == req.username))
    result = await db.execute(stmt)
    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists",
        )

    # Hash password & persist
    hashed_pwd = get_password_hash(req.password)
    new_user = User(
        email=req.email,
        username=req.username,
        full_name=req.full_name or req.username,
        hashed_password=hashed_pwd,
        role=req.role,
        last_login=datetime.now(timezone.utc),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token(subject=new_user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "role": new_user.role,
        },
    }


@router.post("/login", response_model=TokenResponse)
async def login_user(req: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    # Allow login with either username or email
    stmt = select(User).where(
        (User.username == req.username_or_email) | (User.email == req.username_or_email)
    )
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token(subject=user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.get("/me")
async def get_current_user_profile(
    user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }
