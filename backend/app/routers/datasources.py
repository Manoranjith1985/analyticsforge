from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
import uuid, os, shutil

from ..database import get_db
from ..models.user import User
from ..models.datasource import DataSource, ConnectorType, SyncFrequency
from ..utils.security import get_current_user
from ..services.data_connector import DataConnectorService

router = APIRouter(prefix="/api/datasources", tags=["Data Sources"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Schemas ──────────────────────────────────────────────────────────────────

class DataSourceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    connector_type: ConnectorType
    connection_config: Dict[str, Any]
    sync_frequency: SyncFrequency = SyncFrequency.manual


class DataSourceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    connector_type: str
    sync_frequency: str
    is_active: bool

    class Config:
        from_attributes = True


class QueryRequest(BaseModel):
    query: str


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[DataSourceResponse])
def list_datasources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(DataSource).filter(DataSource.owner_id == current_user.id).all()


@router.post("/", response_model=DataSourceResponse, status_code=201)
def create_datasource(
    data: DataSourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ds = DataSource(**data.model_dump(), owner_id=current_user.id)
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds


@router.get("/{ds_id}", response_model=DataSourceResponse)
def get_datasource(
    ds_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ds = _get_or_404(ds_id, current_user.id, db)
    return ds


@router.delete("/{ds_id}", status_code=204)
def delete_datasource(
    ds_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ds = _get_or_404(ds_id, current_user.id, db)
    db.delete(ds)
    db.commit()


@router.post("/{ds_id}/query")
def run_query(
    ds_id: str,
    body: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ds = _get_or_404(ds_id, current_user.id, db)
    try:
        result = DataConnectorService.connect_and_query(
            ds.connector_type, ds.connection_config, body.query
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{ds_id}/schema")
def get_schema(
    ds_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ds = _get_or_404(ds_id, current_user.id, db)
    try:
        schema = DataConnectorService.get_schema(ds.connector_type, ds.connection_config)
        return {"schema": schema}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload/csv")
def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a CSV file and create a DataSource for it."""
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    ds = DataSource(
        name=file.filename,
        connector_type=ConnectorType.csv,
        connection_config={"file_path": filepath},
        owner_id=current_user.id,
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return {"id": str(ds.id), "name": ds.name, "message": "CSV uploaded successfully"}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_404(ds_id: str, user_id, db: Session) -> DataSource:
    ds = db.query(DataSource).filter(
        DataSource.id == ds_id,
        DataSource.owner_id == user_id
    ).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    return ds
