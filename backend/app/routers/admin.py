from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models.user import User, UserRole
from ..models.audit import AuditLog, AuditAction
from ..utils.security import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Administration"])


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    preferred_language: Optional[str] = None


# ── User Management ───────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    skip: int = 0, limit: int = 50,
    admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return [{"id": str(u.id), "email": u.email, "full_name": u.full_name,
             "role": u.role, "is_active": u.is_active, "created_at": str(u.created_at)} for u in users]


@router.patch("/users/{user_id}")
def update_user(
    user_id: str, data: UserUpdate,
    admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.preferred_language is not None:
        user.preferred_language = data.preferred_language
    db.commit()
    _log(db, admin.id, AuditAction.update, "user", str(user_id), f"Updated user {user.email}")
    return {"message": "User updated successfully"}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    _log(db, admin.id, AuditAction.delete, "user", str(user_id), f"Deleted user {user.email}")
    db.delete(user)
    db.commit()


# ── Audit Logs ────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0, limit: int = 100,
    action: Optional[str] = None,
    admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append({
            "id": str(log.id),
            "user": user.email if user else "Unknown",
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_name": log.resource_name,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": str(log.created_at),
        })
    return result


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_platform_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from ..models.dashboard import Dashboard
    from ..models.datasource import DataSource
    from ..models.report import Report
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.is_active == True).count(),
        "total_dashboards": db.query(Dashboard).count(),
        "total_datasources": db.query(DataSource).count(),
        "total_reports": db.query(Report).count(),
        "total_audit_logs": db.query(AuditLog).count(),
    }


def _log(db, user_id, action, resource_type, resource_id, details_str):
    log = AuditLog(user_id=user_id, action=action, resource_type=resource_type,
                   resource_id=resource_id, details={"info": details_str})
    db.add(log)
    db.commit()
