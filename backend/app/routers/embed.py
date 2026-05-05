from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime, timedelta
from ..database import get_db
from ..models.user import User
from ..models.embed import EmbedToken, EmbedResourceType
from ..utils.security import get_current_user

router = APIRouter(prefix="/api/embed", tags=["Embedding & White-label"])


class EmbedTokenCreate(BaseModel):
    name: str
    resource_type: EmbedResourceType
    resource_id: str
    allowed_domains: Optional[List[str]] = None
    custom_theme: Optional[Dict[str, Any]] = None
    expires_days: Optional[int] = None

class EmbedTokenResponse(BaseModel):
    id: str
    token: str
    name: str
    resource_type: str
    resource_id: str
    is_active: bool
    view_count: int
    class Config: from_attributes = True


@router.get("/tokens", response_model=List[EmbedTokenResponse])
def list_tokens(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(EmbedToken).filter(EmbedToken.owner_id == current_user.id).all()


@router.post("/tokens", response_model=EmbedTokenResponse, status_code=201)
def create_token(data: EmbedTokenCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    expires_at = None
    if data.expires_days:
        expires_at = datetime.utcnow() + timedelta(days=data.expires_days)
    token = EmbedToken(
        name=data.name,
        resource_type=data.resource_type,
        resource_id=data.resource_id,
        allowed_domains=data.allowed_domains,
        custom_theme=data.custom_theme,
        expires_at=expires_at,
        owner_id=current_user.id,
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


@router.delete("/tokens/{token_id}", status_code=204)
def revoke_token(token_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token = db.query(EmbedToken).filter(EmbedToken.id == token_id, EmbedToken.owner_id == current_user.id).first()
    if token:
        db.delete(token)
        db.commit()


@router.get("/view/{token}")
def view_embedded(token: str, request: Request, db: Session = Depends(get_db)):
    """Public endpoint — validates token and returns embed config."""
    embed = db.query(EmbedToken).filter(EmbedToken.token == token, EmbedToken.is_active == True).first()
    if not embed:
        raise HTTPException(status_code=404, detail="Invalid or expired embed token")
    if embed.expires_at and embed.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Embed token has expired")

    # Check domain allowlist
    origin = request.headers.get("origin", "")
    if embed.allowed_domains:
        if not any(domain in origin for domain in embed.allowed_domains):
            raise HTTPException(status_code=403, detail="Domain not allowed")

    embed.view_count += 1
    db.commit()

    return {
        "resource_type": embed.resource_type,
        "resource_id": str(embed.resource_id),
        "custom_theme": embed.custom_theme,
        "view_count": embed.view_count,
    }


@router.get("/snippet/{token_id}")
def get_embed_snippet(token_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return a ready-to-paste HTML iframe snippet."""
    token = db.query(EmbedToken).filter(EmbedToken.id == token_id, EmbedToken.owner_id == current_user.id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    base_url = "https://analyticsforge-frontend.onrender.com"
    snippet = f'<iframe src="{base_url}/embed/{token.token}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>'
    return {"snippet": snippet, "token": token.token}
