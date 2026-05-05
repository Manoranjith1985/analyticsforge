from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from ..database import get_db
from ..models.user import User
from ..models.collaboration import Team, TeamMember, DashboardComment, TeamRole
from ..utils.security import get_current_user

router = APIRouter(prefix="/api/collaboration", tags=["Collaboration"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None

class TeamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    class Config: from_attributes = True

class AddMemberRequest(BaseModel):
    email: str
    role: TeamRole = TeamRole.viewer

class CommentCreate(BaseModel):
    content: str
    widget_id: Optional[str] = None
    parent_id: Optional[str] = None

class CommentResponse(BaseModel):
    id: str
    content: str
    author_id: str
    dashboard_id: str
    widget_id: Optional[str]
    is_resolved: bool
    parent_id: Optional[str]
    class Config: from_attributes = True


# ── Teams ─────────────────────────────────────────────────────────────────────

@router.get("/teams", response_model=List[TeamResponse])
def list_teams(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(TeamMember).filter(TeamMember.user_id == current_user.id).all()
    team_ids = [m.team_id for m in memberships]
    return db.query(Team).filter(Team.id.in_(team_ids)).all()


@router.post("/teams", response_model=TeamResponse, status_code=201)
def create_team(data: TeamCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = Team(**data.model_dump(), owner_id=current_user.id)
    db.add(team)
    db.flush()
    member = TeamMember(team_id=team.id, user_id=current_user.id, role=TeamRole.owner)
    db.add(member)
    db.commit()
    db.refresh(team)
    return team


@router.post("/teams/{team_id}/members")
def add_member(
    team_id: str, data: AddMemberRequest,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id, Team.owner_id == current_user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found or you are not the owner")
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with that email not found")
    existing = db.query(TeamMember).filter(TeamMember.team_id == team_id, TeamMember.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
    member = TeamMember(team_id=team_id, user_id=user.id, role=data.role)
    db.add(member)
    db.commit()
    return {"message": f"{user.full_name} added to team as {data.role}"}


@router.get("/teams/{team_id}/members")
def list_members(team_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append({"user_id": str(m.user_id), "name": user.full_name if user else "Unknown",
                        "email": user.email if user else "", "role": m.role})
    return result


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/dashboards/{dashboard_id}/comments", response_model=List[CommentResponse])
def get_comments(dashboard_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(DashboardComment).filter(DashboardComment.dashboard_id == dashboard_id).order_by(DashboardComment.created_at).all()


@router.post("/dashboards/{dashboard_id}/comments", response_model=CommentResponse, status_code=201)
def add_comment(
    dashboard_id: str, data: CommentCreate,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    comment = DashboardComment(
        dashboard_id=dashboard_id, author_id=current_user.id, **data.model_dump()
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.patch("/comments/{comment_id}/resolve")
def resolve_comment(comment_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment = db.query(DashboardComment).filter(
        DashboardComment.id == comment_id, DashboardComment.author_id == current_user.id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.is_resolved = not comment.is_resolved
    db.commit()
    return {"is_resolved": comment.is_resolved}


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment = db.query(DashboardComment).filter(
        DashboardComment.id == comment_id, DashboardComment.author_id == current_user.id
    ).first()
    if comment:
        db.delete(comment)
        db.commit()
