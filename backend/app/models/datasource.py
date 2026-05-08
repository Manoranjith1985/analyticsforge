from sqlalchemy import Column, String, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from ..database import Base


class ConnectorType(str, enum.Enum):
    postgresql = "postgresql"
    mysql = "mysql"
    sqlite = "sqlite"
    csv = "csv"
    excel = "excel"
    google_sheets = "google_sheets"
    rest_api = "rest_api"
    bigquery = "bigquery"
    s3 = "s3"
    mongodb = "mongodb"
    jira = "jira"
    servicenow = "servicenow"
    servicedesk_plus = "servicedesk_plus"


class SyncFrequency(str, enum.Enum):
    manual = "manual"
    hourly = "hourly"
    daily = "daily"
    weekly = "weekly"


class DataSource(Base):
    __tablename__ = "datasources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    connector_type = Column(String, nullable=False)
    connection_config = Column(JSON, nullable=False)  # encrypted connection params
    sync_frequency = Column(String, default=SyncFrequency.manual)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    schema_info = Column(JSON, nullable=True)  # cached table/column schema
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
