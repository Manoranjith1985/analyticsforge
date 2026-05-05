from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.sql import func
import uuid, enum
from ..database import Base


class AuditAction(str, enum.Enum):
    login = "login"
    logout = "logout"
    create = "create"
    update = "update"
    delete = "delete"
    export = "export"
    share = "share"
    query = "query"
    ai_request = "ai_request"


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=True)       # dashboard, datasource, report, etc.
    resource_id = Column(String, nullable=True)
    resource_name = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
