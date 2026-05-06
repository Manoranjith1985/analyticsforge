from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from ..database import get_db
from ..models.user import User
from ..models.pipeline import DataPipeline, PipelineStep, StepType
from ..models.datasource import DataSource
from ..utils.security import get_current_user
from ..utils.orm_helpers import orm_to_dict
from ..services.data_connector import DataConnectorService
import pandas as pd

router = APIRouter(prefix="/api/pipelines", tags=["Data Pipelines"])


class StepConfig(BaseModel):
    step_type: StepType
    step_order: int
    label: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class PipelineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    steps: Optional[List[StepConfig]] = []

class PipelineResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    is_active: bool
    class Config: from_attributes = True

class RunRequest(BaseModel):
    datasource_id: str
    query: str


@router.get("/", response_model=List[PipelineResponse])
def list_pipelines(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [orm_to_dict(p, ['id','name','description','is_active']) for p in db.query(DataPipeline).filter(DataPipeline.owner_id == current_user.id).all()]


@router.post("/", response_model=PipelineResponse, status_code=201)
def create_pipeline(data: PipelineCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pipeline = DataPipeline(name=data.name, description=data.description, owner_id=current_user.id)
    db.add(pipeline)
    db.flush()
    for step in (data.steps or []):
        db.add(PipelineStep(pipeline_id=pipeline.id, **step.model_dump()))
    db.commit()
    db.refresh(pipeline)
    return orm_to_dict(pipeline, ['id','name','description','is_active'])


@router.get("/{pipeline_id}")
def get_pipeline(pipeline_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pipeline = db.query(DataPipeline).filter(DataPipeline.id == pipeline_id, DataPipeline.owner_id == current_user.id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    steps = db.query(PipelineStep).filter(PipelineStep.pipeline_id == pipeline_id).order_by(PipelineStep.step_order).all()
    return {
        "id": str(pipeline.id), "name": pipeline.name, "description": pipeline.description,
        "steps": [{"id": str(s.id), "step_type": s.step_type, "step_order": s.step_order,
                   "label": s.label, "config": s.config} for s in steps]
    }


@router.delete("/{pipeline_id}", status_code=204)
def delete_pipeline(pipeline_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pipeline = db.query(DataPipeline).filter(DataPipeline.id == pipeline_id, DataPipeline.owner_id == current_user.id).first()
    if pipeline:
        db.delete(pipeline)
        db.commit()


@router.post("/{pipeline_id}/run")
def run_pipeline(
    pipeline_id: str, body: RunRequest,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Execute the pipeline steps on a data source query result."""
    pipeline = db.query(DataPipeline).filter(DataPipeline.id == pipeline_id, DataPipeline.owner_id == current_user.id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    ds = db.query(DataSource).filter(DataSource.id == body.datasource_id, DataSource.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    # Load data
    result = DataConnectorService.connect_and_query(ds.connector_type, ds.connection_config, body.query)
    df = pd.DataFrame(result["rows"], columns=result["columns"])

    steps = db.query(PipelineStep).filter(PipelineStep.pipeline_id == pipeline_id).order_by(PipelineStep.step_order).all()

    # Apply each step
    for step in steps:
        cfg = step.config or {}
        try:
            if step.step_type == StepType.filter:
                col, op, val = cfg.get("column"), cfg.get("operator", "=="), cfg.get("value")
                if col and col in df.columns:
                    if op == "==": df = df[df[col].astype(str) == str(val)]
                    elif op == "!=": df = df[df[col].astype(str) != str(val)]
                    elif op == ">": df = df[pd.to_numeric(df[col], errors="coerce") > float(val)]
                    elif op == "<": df = df[pd.to_numeric(df[col], errors="coerce") < float(val)]
                    elif op == "contains": df = df[df[col].astype(str).str.contains(str(val), na=False)]

            elif step.step_type == StepType.sort:
                col, asc = cfg.get("column"), cfg.get("ascending", True)
                if col and col in df.columns:
                    df = df.sort_values(col, ascending=asc)

            elif step.step_type == StepType.limit:
                n = int(cfg.get("n", 100))
                df = df.head(n)

            elif step.step_type == StepType.rename:
                renames = cfg.get("columns", {})
                df = df.rename(columns=renames)

            elif step.step_type == StepType.aggregate:
                group_cols = cfg.get("group_by", [])
                agg_col = cfg.get("column")
                agg_func = cfg.get("function", "sum")
                if group_cols and agg_col and agg_col in df.columns:
                    df = df.groupby(group_cols, as_index=False)[agg_col].agg(agg_func)

            elif step.step_type == StepType.formula:
                new_col = cfg.get("new_column", "result")
                expr = cfg.get("expression", "")
                if expr:
                    df[new_col] = df.eval(expr, engine="python")

            elif step.step_type == StepType.ai_clean:
                # Basic AI cleaning: fill nulls, strip whitespace, convert types
                df = df.fillna(0 if df.select_dtypes(include="number").shape[1] > 0 else "")
                for col in df.select_dtypes(include="object").columns:
                    df[col] = df[col].str.strip()

        except Exception as e:
            pass  # skip steps that fail and continue

    return {
        "columns": df.columns.tolist(),
        "rows": df.values.tolist(),
        "row_count": len(df),
        "steps_applied": len(steps),
    }
