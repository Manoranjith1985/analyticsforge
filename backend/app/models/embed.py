from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Boolean, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid, enum, secrets
from ..database import Base


class EmbedResourceType(str, enum.Enum):
    dashboard = "dashboard"
    widget = "widget"
    story = "story"
    report = "report"


class EmbedToken(Base):
    __tablename__ = "embed_tokens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String, unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    name = Column(String, nullable=False)
    resource_type = Column(Enum(EmbedResourceType), nullable=False)
    resource_id = Column(UUID(as_uuid=True), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    allowed_domains = Column(JSON, nullable=True)       # list of allowed embed domains
    custom_theme = Column(JSON, nullable=True)           # brand colors, logo, fonts
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
