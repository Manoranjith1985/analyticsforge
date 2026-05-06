from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import secrets
from ..database import get_db
from ..models.user import User
from ..models.story import DataStory, StorySlide, StoryTheme
from ..utils.security import get_current_user
from ..utils.orm_helpers import orm_to_dict

router = APIRouter(prefix="/api/stories", tags=["Data Stories"])

STORY_FIELDS = ["id", "title", "description", "theme", "is_public", "share_token"]

def _story_dict(s):
    return orm_to_dict(s, STORY_FIELDS)

class SlideCreate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    widget_id: Optional[str] = None
    dashboard_id: Optional[str] = None
    slide_order: int = 0
    layout: Optional[Dict[str, Any]] = None
    annotations: Optional[Dict[str, Any]] = None

class StoryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    theme: StoryTheme = StoryTheme.light
    slides: Optional[List[SlideCreate]] = []

class StoryResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    theme: str
    is_public: bool
    share_token: Optional[str]

@router.get("/", response_model=List[StoryResponse])
def list_stories(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [_story_dict(s) for s in db.query(DataStory).filter(DataStory.owner_id == current_user.id).all()]

@router.post("/", response_model=StoryResponse, status_code=201)
def create_story(data: StoryCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        story = DataStory(title=data.title, description=data.description, theme=data.theme, owner_id=current_user.id)
        db.add(story)
        db.flush()
        for slide in (data.slides or []):
            db.add(StorySlide(story_id=story.id, **slide.model_dump()))
        db.commit()
        db.refresh(story)
        return _story_dict(story)
    except Exception as e:
        db.rollback()
        import traceback
        raise HTTPException(status_code=500, detail=f"Create story error: {str(e)} | {traceback.format_exc()}")

@router.get("/{story_id}")
def get_story(story_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(DataStory).filter(DataStory.id == story_id, DataStory.owner_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    slides = db.query(StorySlide).filter(StorySlide.story_id == story_id).order_by(StorySlide.slide_order).all()
    return {**_story_dict(story), "slides": [{"id": str(s.id), "title": s.title, "content": s.content,
            "widget_id": str(s.widget_id) if s.widget_id else None, "slide_order": s.slide_order,
            "layout": s.layout, "annotations": s.annotations} for s in slides]}

@router.post("/{story_id}/slides", status_code=201)
def add_slide(story_id: str, data: SlideCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(DataStory).filter(DataStory.id == story_id, DataStory.owner_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    slide = StorySlide(story_id=story_id, **data.model_dump())
    db.add(slide)
    db.commit()
    db.refresh(slide)
    return {"id": str(slide.id), "slide_order": slide.slide_order}

@router.delete("/{story_id}/slides/{slide_id}", status_code=204)
def delete_slide(story_id: str, slide_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    slide = db.query(StorySlide).filter(StorySlide.id == slide_id, StorySlide.story_id == story_id).first()
    if slide:
        db.delete(slide)
        db.commit()

@router.post("/{story_id}/share")
def toggle_share(story_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(DataStory).filter(DataStory.id == story_id, DataStory.owner_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    story.is_public = not story.is_public
    story.share_token = secrets.token_urlsafe(16) if story.is_public else None
    db.commit()
    return {"is_public": story.is_public, "share_token": story.share_token}

@router.delete("/{story_id}", status_code=204)
def delete_story(story_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(DataStory).filter(DataStory.id == story_id, DataStory.owner_id == current_user.id).first()
    if story:
        db.delete(story)
        db.commit()
