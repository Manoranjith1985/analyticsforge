from sqlalchemy import Column, String, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from ..database import Base


class ReportFormat(str, enum.Enum):
    pdf = "pdf"
    excel = "excel"
    csv = "csv"


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    datasource_id = Column(UUID(as_uuid=True), ForeignKey("datasources.id"), nullable=True)
    query = Column(String, nullable=True)
    columns_config = Column(JSON, nullable=True)
    filters = Column(JSON, nullable=True)
    format = Column(String, default=ReportFormat.pdf)
    schedule_cron = Column(String, nullable=True)   # e.g. "0 9 * * 1" = every Monday 9am
    schedule_emails = Column(JSON, nullable=True)   # list of email recipients
    is_scheduled = Column(Boolean, default=False)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
