"""
Connect Pro — Infrastructure Models
Covers: Assets, Probes, Patches, Applications, Servers, Automation Jobs
All tables are project_code aware for multi-tenancy.
"""
from sqlalchemy import Column, String, DateTime, JSON, Boolean, ForeignKey, Integer, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from ..database import Base


# ── Asset Management ──────────────────────────────────────────────────────────
class Asset(Base):
    __tablename__ = "assets"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name           = Column(String(255), nullable=False)
    hostname       = Column(String(255), nullable=True)
    ip_address     = Column(String(50),  nullable=True)
    mac_address    = Column(String(50),  nullable=True)
    asset_type     = Column(String(50),  default="workstation")  # workstation, laptop, server, vm, network
    os_name        = Column(String(100), nullable=True)
    os_version     = Column(String(100), nullable=True)
    os_arch        = Column(String(20),  nullable=True)
    serial_number  = Column(String(100), nullable=True)
    manufacturer   = Column(String(100), nullable=True)
    model          = Column(String(100), nullable=True)
    assigned_user  = Column(String(150), nullable=True)
    department     = Column(String(100), nullable=True)
    location       = Column(String(150), nullable=True)
    status         = Column(String(30),  default="online")   # online, offline, unknown, maintenance
    last_seen      = Column(DateTime(timezone=True), nullable=True)
    tags           = Column(JSON, default=list)
    extra_info     = Column(JSON, default=dict)
    project_code   = Column(String(50),  nullable=False, index=True)
    owner_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


# ── Probe Management ──────────────────────────────────────────────────────────
class Probe(Base):
    __tablename__ = "probes"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id       = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=True)
    probe_key      = Column(String(64),  unique=True, nullable=False)   # unique registration token
    version        = Column(String(20),  default="1.0.0")
    status         = Column(String(30),  default="active")  # active, inactive, error, installing, updating
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    os_name        = Column(String(100), nullable=True)
    ip_address     = Column(String(50),  nullable=True)
    capabilities   = Column(JSON, default=list)    # ["remote_exec", "patch", "monitor", "self_heal"]
    config         = Column(JSON, default=dict)    # probe-level config overrides
    error_message  = Column(Text, nullable=True)
    project_code   = Column(String(50),  nullable=False, index=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


class ProbeCommand(Base):
    """Commands sent to a probe (remote execution log)"""
    __tablename__ = "probe_commands"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    probe_id     = Column(UUID(as_uuid=True), ForeignKey("probes.id", ondelete="CASCADE"), nullable=False)
    command_type = Column(String(50),  nullable=False)   # exec_script, restart_service, install_patch, etc.
    payload      = Column(JSON, default=dict)
    status       = Column(String(30),  default="pending")  # pending, running, success, failed
    result       = Column(Text, nullable=True)
    issued_by    = Column(String(150), nullable=True)
    issued_at    = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    project_code = Column(String(50),  nullable=False, index=True)


# ── Patch Management ──────────────────────────────────────────────────────────
class Patch(Base):
    __tablename__ = "patches"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String(255), nullable=False)
    kb_id           = Column(String(50),  nullable=True)   # Windows KB number
    cve_ids         = Column(JSON, default=list)           # ["CVE-2024-1234"]
    severity        = Column(String(20),  default="medium") # critical, high, medium, low
    category        = Column(String(50),  default="security") # security, feature, driver, definition
    description     = Column(Text, nullable=True)
    vendor          = Column(String(100), nullable=True)
    affected_os     = Column(JSON, default=list)
    release_date    = Column(DateTime(timezone=True), nullable=True)
    size_mb         = Column(Float, nullable=True)
    download_url    = Column(String(500), nullable=True)
    project_code    = Column(String(50),  nullable=False, index=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


class PatchDeployment(Base):
    """Tracks patch deployment to specific assets"""
    __tablename__ = "patch_deployments"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patch_id     = Column(UUID(as_uuid=True), ForeignKey("patches.id", ondelete="CASCADE"), nullable=False)
    asset_id     = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    probe_id     = Column(UUID(as_uuid=True), ForeignKey("probes.id"), nullable=True)
    status       = Column(String(30), default="pending")  # pending, scheduled, installing, installed, failed, ignored
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    installed_at = Column(DateTime(timezone=True), nullable=True)
    error_log    = Column(Text, nullable=True)
    deployed_by  = Column(String(150), nullable=True)
    project_code = Column(String(50),  nullable=False, index=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())


# ── Application Management ────────────────────────────────────────────────────
class Application(Base):
    __tablename__ = "applications"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String(255), nullable=False)
    version         = Column(String(50),  nullable=True)
    vendor          = Column(String(150), nullable=True)
    category        = Column(String(50),  default="business")  # business, security, dev, infra, utility
    description     = Column(Text, nullable=True)
    install_command = Column(Text, nullable=True)
    uninstall_command = Column(Text, nullable=True)
    health_check_cmd  = Column(Text, nullable=True)
    status          = Column(String(30),  default="active")    # active, deprecated, pending
    asset_count     = Column(Integer, default=0)               # denormalized for speed
    tags            = Column(JSON, default=list)
    project_code    = Column(String(50),  nullable=False, index=True)
    owner_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())


class AppInstance(Base):
    """Application installed on a specific asset"""
    __tablename__ = "app_instances"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    asset_id       = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    version        = Column(String(50),  nullable=True)
    status         = Column(String(30),  default="running")  # running, stopped, crashed, unknown
    health         = Column(String(20),  default="healthy")  # healthy, degraded, unhealthy
    cpu_usage      = Column(Float, nullable=True)
    memory_usage   = Column(Float, nullable=True)
    last_checked   = Column(DateTime(timezone=True), nullable=True)
    project_code   = Column(String(50),  nullable=False, index=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


# ── Server Management ─────────────────────────────────────────────────────────
class Server(Base):
    __tablename__ = "servers"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(String(255), nullable=False)
    hostname     = Column(String(255), nullable=True)
    ip_address   = Column(String(50),  nullable=True)
    server_type  = Column(String(50),  default="physical")    # physical, vm, cloud, container
    provider     = Column(String(50),  nullable=True)          # azure, aws, gcp, on-prem
    os_name      = Column(String(100), nullable=True)
    os_version   = Column(String(100), nullable=True)
    environment  = Column(String(30),  default="production")  # production, staging, dev, dr
    role         = Column(String(100), nullable=True)          # web, db, app, cache, lb
    status       = Column(String(30),  default="running")     # running, stopped, rebooting, maintenance, error
    cpu_cores    = Column(Integer, nullable=True)
    ram_gb       = Column(Float, nullable=True)
    disk_gb      = Column(Float, nullable=True)
    # Live metrics (updated by probe heartbeat)
    cpu_pct      = Column(Float, nullable=True)
    ram_pct      = Column(Float, nullable=True)
    disk_pct     = Column(Float, nullable=True)
    uptime_hours = Column(Float, nullable=True)
    last_metrics = Column(DateTime(timezone=True), nullable=True)
    tags         = Column(JSON, default=list)
    project_code = Column(String(50),  nullable=False, index=True)
    asset_id     = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    owner_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())


# ── Infra Automation ──────────────────────────────────────────────────────────
class AutomationRule(Base):
    """Self-healing / automation rules"""
    __tablename__ = "automation_rules"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name           = Column(String(255), nullable=False)
    description    = Column(Text, nullable=True)
    trigger_type   = Column(String(50),  default="manual")  # manual, scheduled, event, threshold
    trigger_config = Column(JSON, default=dict)   # cron, event filter, threshold values
    action_type    = Column(String(50),  nullable=False)     # exec_script, restart_service, patch, notify, reboot
    action_config  = Column(JSON, default=dict)   # script content, service name, patch ids, etc.
    target_type    = Column(String(30),  default="asset")    # asset, server, probe, all
    target_filter  = Column(JSON, default=dict)   # tags, os, environment filters
    is_active      = Column(Boolean, default=True)
    run_count      = Column(Integer, default=0)
    last_run_at    = Column(DateTime(timezone=True), nullable=True)
    last_run_status = Column(String(30), nullable=True)
    project_code   = Column(String(50),  nullable=False, index=True)
    owner_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


class AutomationRun(Base):
    """Execution history for automation rules"""
    __tablename__ = "automation_runs"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id      = Column(UUID(as_uuid=True), ForeignKey("automation_rules.id", ondelete="CASCADE"), nullable=False)
    triggered_by = Column(String(100), nullable=True)   # user email or 'scheduler' or 'event'
    status       = Column(String(30),  default="running")  # running, success, failed, partial
    targets_hit  = Column(Integer, default=0)
    targets_ok   = Column(Integer, default=0)
    targets_fail = Column(Integer, default=0)
    output_log   = Column(Text, nullable=True)
    started_at   = Column(DateTime(timezone=True), server_default=func.now())
    finished_at  = Column(DateTime(timezone=True), nullable=True)
    project_code = Column(String(50),  nullable=False, index=True)
