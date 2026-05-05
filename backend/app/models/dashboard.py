from sqlalchemy import Column, String, DateTime, JSON, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from ..database import Base


class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    layout = Column(JSON, nullable=True)       # grid layout config (react-grid-layout)
    theme = Column(String, default="light")
    is_public = Column(Boolean, default=False)
    share_token = Column(String, unique=True, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Widget(Base):
    __tablename__ = "widgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False)
    datasource_id = Column(UUID(as_uuid=True), ForeignKey("datasources.id"), nullable=True)
    title = Column(String, nullable=False)
    chart_type = Column(String, nullable=False)  # bar, line, pie, scatter, table, kpi, map, etc.
    query = Column(String, nullable=True)         # SQL or NoSQL query
    config = Column(JSON, nullable=True)          # axis, colors, filters, aggregation
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    width = Column(Integer, default=4)
    height = Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
