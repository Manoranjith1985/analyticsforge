from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
import secrets

from ..database import get_db
from ..models.user import User
from ..models.dashboard import Dashboard, Widget
from ..utils.security import get_current_user
from ..utils.orm_helpers import orm_to_dict

router = APIRouter(prefix="/api/dashboards", tags=["Dashboards"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class WidgetCreate(BaseModel):
    title: str
    chart_type: str
    datasource_id: Optional[str] = None
    query: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 3


class WidgetResponse(BaseModel):
    id: str
    title: str
    chart_type: str
    datasource_id: Optional[str]
    query: Optional[str]
    config: Optional[Dict]
    position_x: int
    position_y: int
    width: int
    height: int


class DashboardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    theme: str = "light"


class DashboardResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    theme: str
    is_public: bool
    share_token: Optional[str]
    widgets: List[WidgetResponse] = []


# ── Helpers ───────────────────────────────────────────────────────────────────

WIDGET_FIELDS = ["id", "title", "chart_type", "datasource_id", "query",
                 "config", "position_x", "position_y", "width", "height"]

DASHBOARD_FIELDS = ["id", "name", "description", "theme", "is_public", "share_token"]


def _widget_dict(w: Widget) -> dict:
    return orm_to_dict(w, WIDGET_FIELDS)


def _dashboard_dict(d: Dashboard, widgets: list) -> dict:
    result = orm_to_dict(d, DASHBOARD_FIELDS)
    result["widgets"] = [_widget_dict(w) for w in widgets]
    return result


def _get_or_404(dashboard_id: str, user_id, db: Session) -> Dashboard:
    d = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.owner_id == user_id
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return d


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[DashboardResponse])
def list_dashboards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dashboards = db.query(Dashboard).filter(Dashboard.owner_id == current_user.id).all()
    result = []
    for d in dashboards:
        widgets = db.query(Widget).filter(Widget.dashboard_id == d.id).all()
        result.append(_dashboard_dict(d, widgets))
    return result


@router.post("/", response_model=DashboardResponse, status_code=201)
def create_dashboard(
    data: DashboardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        dashboard = Dashboard(**data.model_dump(), owner_id=current_user.id)
        db.add(dashboard)
        db.commit()
        db.refresh(dashboard)
        return _dashboard_dict(dashboard, [])
    except Exception as e:
        db.rollback()
        import traceback
        raise HTTPException(status_code=500, detail=f"Create dashboard error: {str(e)} | {traceback.format_exc()}")


@router.get("/{dashboard_id}", response_model=DashboardResponse)
def get_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    d = _get_or_404(dashboard_id, current_user.id, db)
    widgets = db.query(Widget).filter(Widget.dashboard_id == d.id).all()
    return _dashboard_dict(d, widgets)


@router.patch("/{dashboard_id}", response_model=DashboardResponse)
def update_dashboard(
    dashboard_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    d = _get_or_404(dashboard_id, current_user.id, db)
    for k, v in data.items():
        if hasattr(d, k) and k not in ("id", "owner_id"):
            setattr(d, k, v)
    db.commit()
    db.refresh(d)
    widgets = db.query(Widget).filter(Widget.dashboard_id == d.id).all()
    return _dashboard_dict(d, widgets)


@router.delete("/{dashboard_id}", status_code=204)
def delete_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    d = _get_or_404(dashboard_id, current_user.id, db)
    db.delete(d)
    db.commit()


@router.post("/{dashboard_id}/share")
def toggle_share(
    dashboard_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    d = _get_or_404(dashboard_id, current_user.id, db)
    if d.is_public:
        d.is_public = False
        d.share_token = None
    else:
        d.is_public = True
        d.share_token = secrets.token_urlsafe(16)
    db.commit()
    return {"is_public": d.is_public, "share_token": d.share_token}


# ── Widget Routes ─────────────────────────────────────────────────────────────

@router.post("/{dashboard_id}/widgets", response_model=WidgetResponse, status_code=201)
def add_widget(
    dashboard_id: str,
    data: WidgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _get_or_404(dashboard_id, current_user.id, db)
    widget = Widget(**data.model_dump(), dashboard_id=dashboard_id)
    db.add(widget)
    db.commit()
    db.refresh(widget)
    return _widget_dict(widget)


@router.patch("/{dashboard_id}/widgets/{widget_id}", response_model=WidgetResponse)
def update_widget(
    dashboard_id: str,
    widget_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _get_or_404(dashboard_id, current_user.id, db)
    widget = db.query(Widget).filter(
        Widget.id == widget_id, Widget.dashboard_id == dashboard_id
    ).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    for k, v in data.items():
        if hasattr(widget, k):
            setattr(widget, k, v)
    db.commit()
    db.refresh(widget)
    return _widget_dict(widget)


@router.delete("/{dashboard_id}/widgets/{widget_id}", status_code=204)
def delete_widget(
    dashboard_id: str,
    widget_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _get_or_404(dashboard_id, current_user.id, db)
    widget = db.query(Widget).filter(
        Widget.id == widget_id, Widget.dashboard_id == dashboard_id
    ).first()
    if widget:
        db.delete(widget)
        db.commit()
