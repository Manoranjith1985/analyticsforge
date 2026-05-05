from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid, enum
from ..database import Base


class StoryTheme(str, enum.Enum):
    light = "light"
    dark = "dark"
    corporate = "corporate"
    vibrant = "vibrant"


class DataStory(Base):
    __tablename__ = "data_stories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    theme = Column(String, default=StoryTheme.light)
    is_public = Column(Boolean, default=False)
    share_token = Column(String, unique=True, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class StorySlide(Base):
    __tablename__ = "story_slides"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    story_id = Column(UUID(as_uuid=True), ForeignKey("data_stories.id", ondelete="CASCADE"), nullable=False)
    slide_order = Column(Integer, nullable=False, default=0)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)           # rich text / markdown narrative
    widget_id = Column(UUID(as_uuid=True), ForeignKey("widgets.id"), nullable=True)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=True)
    layout = Column(JSON, nullable=True)             # slide layout config
    annotations = Column(JSON, nullable=True)        # chart annotations
    created_at = Column(DateTime(timezone=True), server_default=func.now())
