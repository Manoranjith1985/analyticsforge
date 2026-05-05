from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Boolean, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid, enum
from ..database import Base


class ReportStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=True)
    cron_expression = Column(String, nullable=False)   # e.g. "0 9 * * 1"
    recipients = Column(JSON, nullable=False)           # list of email addresses
    format = Column(String, default="pdf")              # pdf | excel | csv
    subject_template = Column(String, nullable=True)
    message_template = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    run_count = Column(Integer, default=0)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ReportExecution(Base):
    __tablename__ = "report_executions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheduled_report_id = Column(UUID(as_uuid=True), ForeignKey("scheduled_reports.id", ondelete="CASCADE"))
    status = Column(String, default=ReportStatus.pending)
    error_message = Column(Text, nullable=True)
    recipients_sent = Column(JSON, nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
