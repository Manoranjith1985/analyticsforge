from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import traceback

from ..database import get_db
from ..models.user import User
from ..utils.security import (
    verify_password, get_password_hash,
    create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_dict(user: User) -> dict:
    """Convert ORM User to a plain dict — avoids UUID / Pydantic serialisation issues."""
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": str(user.role),
        "preferred_language": str(user.preferred_language or "en"),
    }


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: Optional[str] = "analyst"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    preferred_language: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    try:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        role_str = str(data.role) if data.role else "analyst"
        if role_str not in ("admin", "analyst", "viewer"):
            role_str = "analyst"

        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=get_password_hash(data.password),
            role=role_str,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return _user_dict(user)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Registration error: {str(e)} | {traceback.format_exc()}"
        )


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == form.username).first()
        if not user or not verify_password(form.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token({"sub": str(user.id)})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": _user_dict(user),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Login error: {str(e)} | {traceback.format_exc()}"
        )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)


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
    """Test DB connectivity, column types, and list user emails."""
    try:
        from sqlalchemy import text
        pg_ver = db.execute(text("SELECT version()")).fetchone()[0]
        users = db.query(User).all()
        return {
            "db_connected": True,
            "pg_version": pg_ver,
            "user_count": len(users),
            "users": [{"email": u.email, "role": u.role, "active": u.is_active} for u in users],
        }
    except Exception as e:
        return {"db_connected": False, "error": str(e), "trace": traceback.format_exc()}
