from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Boolean, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid, enum
from ..database import Base


class StepType(str, enum.Enum):
    source = "source"
    filter = "filter"
    transform = "transform"
    join = "join"
    aggregate = "aggregate"
    sort = "sort"
    limit = "limit"
    rename = "rename"
    formula = "formula"
    ai_clean = "ai_clean"


class DataPipeline(Base):
    __tablename__ = "data_pipelines"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    output_datasource_id = Column(UUID(as_uuid=True), ForeignKey("datasources.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PipelineStep(Base):
    __tablename__ = "pipeline_steps"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("data_pipelines.id", ondelete="CASCADE"), nullable=False)
    step_type = Column(Enum(StepType), nullable=False)
    step_order = Column(Integer, nullable=False)
    config = Column(JSON, nullable=True)
    label = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
