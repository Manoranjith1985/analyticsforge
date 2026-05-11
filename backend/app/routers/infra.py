"""
Connect Pro — Infra Management Routers
Covers: Assets, Probes, Patches, Applications, Servers, Automation
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from ..database import get_db
from ..utils.security import get_current_user
from ..models.user import User
from ..models.infra import (
    Asset, Probe, ProbeCommand, Patch, PatchDeployment,
    Application, AppInstance, Server, AutomationRule, AutomationRun
)

router = APIRouter(prefix="/api/infra", tags=["Infrastructure"])

# ─── helpers ─────────────────────────────────────────────────────────────────
def _project(user: User) -> str:
    """Extract project_code from user — fall back to email domain."""
    return getattr(user, "project_code", None) or user.email.split("@")[-1]

def _row(obj) -> dict:
    d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    for k, v in d.items():
        if isinstance(v, uuid.UUID):
            d[k] = str(v)
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


# ═══════════════════════════════════════════════════════════════════════════════
#  ASSETS
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/assets")
def list_assets(
    status: Optional[str] = None,
    asset_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pc = _project(user)
    q = db.query(Asset).filter(Asset.project_code == pc)
    if status:     q = q.filter(Asset.status == status)
    if asset_type: q = q.filter(Asset.asset_type == asset_type)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Asset.name.ilike(like) | Asset.hostname.ilike(like) |
            Asset.ip_address.ilike(like) | Asset.assigned_user.ilike(like)
        )
    assets = q.order_by(Asset.created_at.desc()).all()
    return [_row(a) for a in assets]


@router.get("/assets/stats")
def asset_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    total   = db.query(Asset).filter(Asset.project_code == pc).count()
    online  = db.query(Asset).filter(Asset.project_code == pc, Asset.status == "online").count()
    offline = db.query(Asset).filter(Asset.project_code == pc, Asset.status == "offline").count()
    unknown = db.query(Asset).filter(Asset.project_code == pc, Asset.status == "unknown").count()
    by_type = db.query(Asset.asset_type, sqlfunc.count(Asset.id)).filter(Asset.project_code == pc).group_by(Asset.asset_type).all()
    return {
        "total": total, "online": online,
        "offline": offline, "unknown": unknown,
        "by_type": {t: c for t, c in by_type},
    }


@router.post("/assets", status_code=201)
def create_asset(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    asset = Asset(**{k: v for k, v in body.items() if k in Asset.__table__.columns.keys()})
    asset.project_code = pc
    db.add(asset); db.commit(); db.refresh(asset)
    return _row(asset)


@router.get("/assets/{asset_id}")
def get_asset(asset_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.project_code == pc).first()
    if not asset: raise HTTPException(404, "Asset not found")
    return _row(asset)


@router.patch("/assets/{asset_id}")
def update_asset(asset_id: str, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.project_code == pc).first()
    if not asset: raise HTTPException(404, "Asset not found")
    for k, v in body.items():
        if hasattr(asset, k): setattr(asset, k, v)
    db.commit(); db.refresh(asset)
    return _row(asset)


@router.delete("/assets/{asset_id}", status_code=204)
def delete_asset(asset_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.project_code == pc).first()
    if not asset: raise HTTPException(404, "Asset not found")
    db.delete(asset); db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  PROBES
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/probes")
def list_probes(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pc = _project(user)
    q = db.query(Probe).filter(Probe.project_code == pc)
    if status: q = q.filter(Probe.status == status)
    return [_row(p) for p in q.order_by(Probe.created_at.desc()).all()]


@router.get("/probes/stats")
def probe_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    total    = db.query(Probe).filter(Probe.project_code == pc).count()
    active   = db.query(Probe).filter(Probe.project_code == pc, Probe.status == "active").count()
    inactive = db.query(Probe).filter(Probe.project_code == pc, Probe.status == "inactive").count()
    error    = db.query(Probe).filter(Probe.project_code == pc, Probe.status == "error").count()
    return {"total": total, "active": active, "inactive": inactive, "error": error}


@router.post("/probes", status_code=201)
def create_probe(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    probe = Probe(**{k: v for k, v in body.items() if k in Probe.__table__.columns.keys()})
    probe.project_code = pc
    if not probe.probe_key:
        probe.probe_key = str(uuid.uuid4()).replace("-", "")[:32]
    db.add(probe); db.commit(); db.refresh(probe)
    return _row(probe)


@router.patch("/probes/{probe_id}")
def update_probe(probe_id: str, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    probe = db.query(Probe).filter(Probe.id == probe_id, Probe.project_code == pc).first()
    if not probe: raise HTTPException(404, "Probe not found")
    for k, v in body.items():
        if hasattr(probe, k): setattr(probe, k, v)
    db.commit(); db.refresh(probe)
    return _row(probe)


@router.post("/probes/{probe_id}/command", status_code=201)
def send_command(probe_id: str, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    probe = db.query(Probe).filter(Probe.id == probe_id, Probe.project_code == pc).first()
    if not probe: raise HTTPException(404, "Probe not found")
    cmd = ProbeCommand(
        probe_id=probe_id,
        command_type=body.get("command_type", "exec_script"),
        payload=body.get("payload", {}),
        issued_by=user.email,
        project_code=pc,
    )
    db.add(cmd); db.commit(); db.refresh(cmd)
    return _row(cmd)


@router.get("/probes/{probe_id}/commands")
def get_probe_commands(probe_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    cmds = db.query(ProbeCommand).filter(ProbeCommand.probe_id == probe_id, ProbeCommand.project_code == pc).order_by(ProbeCommand.issued_at.desc()).limit(50).all()
    return [_row(c) for c in cmds]


@router.delete("/probes/{probe_id}", status_code=204)
def delete_probe(probe_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    probe = db.query(Probe).filter(Probe.id == probe_id, Probe.project_code == pc).first()
    if not probe: raise HTTPException(404)
    db.delete(probe); db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  PATCHES
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/patches")
def list_patches(
    severity: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pc = _project(user)
    q = db.query(Patch).filter(Patch.project_code == pc)
    if severity: q = q.filter(Patch.severity == severity)
    if category: q = q.filter(Patch.category == category)
    return [_row(p) for p in q.order_by(Patch.created_at.desc()).all()]


@router.get("/patches/stats")
def patch_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    total    = db.query(Patch).filter(Patch.project_code == pc).count()
    critical = db.query(Patch).filter(Patch.project_code == pc, Patch.severity == "critical").count()
    high     = db.query(Patch).filter(Patch.project_code == pc, Patch.severity == "high").count()
    installed = db.query(PatchDeployment).filter(PatchDeployment.project_code == pc, PatchDeployment.status == "installed").count()
    pending   = db.query(PatchDeployment).filter(PatchDeployment.project_code == pc, PatchDeployment.status == "pending").count()
    failed    = db.query(PatchDeployment).filter(PatchDeployment.project_code == pc, PatchDeployment.status == "failed").count()
    return {"total": total, "critical": critical, "high": high, "installed": installed, "pending": pending, "failed": failed}


@router.post("/patches", status_code=201)
def create_patch(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    patch = Patch(**{k: v for k, v in body.items() if k in Patch.__table__.columns.keys()})
    patch.project_code = pc
    db.add(patch); db.commit(); db.refresh(patch)
    return _row(patch)


@router.get("/patches/deployments")
def list_deployments(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pc = _project(user)
    q = db.query(PatchDeployment).filter(PatchDeployment.project_code == pc)
    if status: q = q.filter(PatchDeployment.status == status)
    return [_row(d) for d in q.order_by(PatchDeployment.created_at.desc()).limit(200).all()]


@router.post("/patches/{patch_id}/deploy", status_code=201)
def deploy_patch(patch_id: str, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    patch = db.query(Patch).filter(Patch.id == patch_id, Patch.project_code == pc).first()
    if not patch: raise HTTPException(404, "Patch not found")
    asset_ids = body.get("asset_ids", [])
    deployments = []
    for aid in asset_ids:
        dep = PatchDeployment(
            patch_id=patch_id, asset_id=aid,
            status="scheduled" if body.get("scheduled_at") else "pending",
            deployed_by=user.email, project_code=pc,
        )
        if body.get("scheduled_at"):
            dep.scheduled_at = datetime.fromisoformat(body["scheduled_at"])
        db.add(dep)
        deployments.append(dep)
    db.commit()
    return {"deployed": len(deployments), "patch": patch.name}


@router.patch("/patches/deployments/{dep_id}")
def update_deployment(dep_id: str, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    dep = db.query(PatchDeployment).filter(PatchDeployment.id == dep_id, PatchDeployment.project_code == pc).first()
    if not dep: raise HTTPException(404)
    for k, v in body.items():
        if hasattr(dep, k): setattr(dep, k, v)
    if body.get("status") == "installed":
        dep.installed_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(dep)
    return _row(dep)


# ═══════════════════════════════════════════════════════════════════════════════
#  APPLICATIONS
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/applications")
def list_applications(
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pc = _project(user)
    q = db.query(Application).filter(Application.project_code == pc)
    if status:   q = q.filter(Application.status == status)
    if category: q = q.filter(Application.category == category)
    return [_row(a) for a in q.order_by(Application.name).all()]


@router.post("/applications", status_code=201)
def create_application(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    app = Application(**{k: v for k, v in body.items() if k in Application.__table__.columns.keys()})
    app.project_code = pc
    app.owner_id = user.id
    db.add(app); db.commit(); db.refresh(app)
    return _row(app)


@router.patch("/applications/{app_id}")
def update_application(app_id: str, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    app = db.query(Application).filter(Application.id == app_id, Application.project_code == pc).first()
    if not app: raise HTTPException(404)
    for k, v in body.items():
        if hasattr(app, k): setattr(app, k, v)
    db.commit(); db.refresh(app)
    return _row(app)


@router.delete("/applications/{app_id}", status_code=204)
def delete_application(app_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    app = db.query(Application).filter(Application.id == app_id, Application.project_code == pc).first()
    if not app: raise HTTPException(404)
    db.delete(app); db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  SERVERS
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/servers")
def list_servers(
    status: Optional[str] = None,
    environment: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pc = _project(user)
    q = db.query(Server).filter(Server.project_code == pc)
    if status:      q = q.filter(Server.status == status)
    if environment: q = q.filter(Server.environment == environment)
    return [_row(s) for s in q.order_by(Server.name).all()]


@router.get("/servers/stats")
def server_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    total   = db.query(Server).filter(Server.project_code == pc).count()
    running = db.query(Server).filter(Server.project_code == pc, Server.status == "running").count()
    stopped = db.query(Server).filter(Server.project_code == pc, Server.status == "stopped").count()
    error   = db.query(Server).filter(Server.project_code == pc, Server.status == "error").count()
    return {"total": total, "running": running, "stopped": stopped, "error": error}


@router.post("/servers", status_code=201)
def create_server(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    srv = Server(**{k: v for k, v in body.items() if k in Server.__table__.columns.keys()})
    srv.project_code = pc
    srv.owner_id = user.id
    db.add(srv); db.commit(); db.refresh(srv)
    return _row(srv)


@router.patch("/servers/{server_id}")
def update_server(server_id: str, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    srv = db.query(Server).filter(Server.id == server_id, Server.project_code == pc).first()
    if not srv: raise HTTPException(404)
    for k, v in body.items():
        if hasattr(srv, k): setattr(srv, k, v)
    db.commit(); db.refresh(srv)
    return _row(srv)


@router.delete("/servers/{server_id}", status_code=204)
def delete_server(server_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    srv = db.query(Server).filter(Server.id == server_id, Server.project_code == pc).first()
    if not srv: raise HTTPException(404)
    db.delete(srv); db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  AUTOMATION
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/automation/rules")
def list_rules(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    rules = db.query(AutomationRule).filter(AutomationRule.project_code == pc).order_by(AutomationRule.created_at.desc()).all()
    return [_row(r) for r in rules]


@router.post("/automation/rules", status_code=201)
def create_rule(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    rule = AutomationRule(**{k: v for k, v in body.items() if k in AutomationRule.__table__.columns.keys()})
    rule.project_code = pc
    rule.owner_id = user.id
    db.add(rule); db.commit(); db.refresh(rule)
    return _row(rule)


@router.patch("/automation/rules/{rule_id}")
def update_rule(rule_id: str, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id, AutomationRule.project_code == pc).first()
    if not rule: raise HTTPException(404)
    for k, v in body.items():
        if hasattr(rule, k): setattr(rule, k, v)
    db.commit(); db.refresh(rule)
    return _row(rule)


@router.delete("/automation/rules/{rule_id}", status_code=204)
def delete_rule(rule_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id, AutomationRule.project_code == pc).first()
    if not rule: raise HTTPException(404)
    db.delete(rule); db.commit()


@router.post("/automation/rules/{rule_id}/run", status_code=201)
def run_rule(rule_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id, AutomationRule.project_code == pc).first()
    if not rule: raise HTTPException(404)
    run = AutomationRun(
        rule_id=rule_id,
        triggered_by=user.email,
        status="running",
        project_code=pc,
    )
    db.add(run)
    rule.run_count = (rule.run_count or 0) + 1
    rule.last_run_at = datetime.now(timezone.utc)
    rule.last_run_status = "running"
    db.commit(); db.refresh(run)
    return _row(run)


@router.get("/automation/runs")
def list_runs(
    rule_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pc = _project(user)
    q = db.query(AutomationRun).filter(AutomationRun.project_code == pc)
    if rule_id: q = q.filter(AutomationRun.rule_id == rule_id)
    return [_row(r) for r in q.order_by(AutomationRun.started_at.desc()).limit(100).all()]


@router.get("/automation/stats")
def automation_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pc = _project(user)
    total_rules   = db.query(AutomationRule).filter(AutomationRule.project_code == pc).count()
    active_rules  = db.query(AutomationRule).filter(AutomationRule.project_code == pc, AutomationRule.is_active == True).count()
    total_runs    = db.query(AutomationRun).filter(AutomationRun.project_code == pc).count()
    success_runs  = db.query(AutomationRun).filter(AutomationRun.project_code == pc, AutomationRun.status == "success").count()
    failed_runs   = db.query(AutomationRun).filter(AutomationRun.project_code == pc, AutomationRun.status == "failed").count()
    return {
        "total_rules": total_rules, "active_rules": active_rules,
        "total_runs": total_runs, "success_runs": success_runs, "failed_runs": failed_runs,
    }
