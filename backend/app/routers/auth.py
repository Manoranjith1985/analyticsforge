from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

from ..database import get_db
from ..models.user import User, UserRole
from ..utils.security import (
    verify_password, get_password_hash,
    create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: Optional[UserRole] = UserRole.analyst


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    preferred_language: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    import traceback
    try:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=get_password_hash(data.password),
            role=data.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/language")
def update_language(
    language: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if language not in ("en", "ta"):
        raise HTTPException(status_code=400, detail="Unsupported language. Use 'en' or 'ta'.")
    current_user.preferred_language = language
    db.commit()
    return {"message": f"Language updated to {language}"}


@router.get("/debug", tags=["Debug"])
def debug_db(db: Session = Depends(get_db)):
    """Test DB connectivity and return table info."""
    import traceback
    try:
        from sqlalchemy import text
        result = db.execute(text("SELECT version()")).fetchone()
        user_count = db.query(User).count()
        return {
            "db_connected": True,
            "pg_version": result[0] if result else "unknown",
            "user_count": user_count,
        }
    except Exception as e:
        return {"db_connected": False, "error": str(e), "trace": traceback.format_exc()}
