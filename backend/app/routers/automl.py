from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models.user import User
from ..models.datasource import DataSource
from ..utils.security import get_current_user
from ..services.data_connector import DataConnectorService
from ..services.ml_service import AutoMLService

router = APIRouter(prefix="/api/automl", tags=["AutoML"])


class AutoMLRequest(BaseModel):
    datasource_id: str
    query: str
    target_column: str
    feature_columns: Optional[List[str]] = None
    task: Optional[str] = None  # classification | regression | auto


class ClusterRequest(BaseModel):
    datasource_id: str
    query: str
    n_clusters: int = 3
    feature_columns: Optional[List[str]] = None


@router.post("/train")
def train_model(
    body: AutoMLRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run AutoML training on a datasource query result."""
    ds = _get_ds(body.datasource_id, current_user.id, db)
    try:
        data = DataConnectorService.connect_and_query(ds.connector_type, ds.connection_config, body.query)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")

    if body.target_column not in data["columns"]:
        raise HTTPException(status_code=400, detail=f"Target column '{body.target_column}' not found in data")

    try:
        result = AutoMLService.run(
            data=data,
            target_column=body.target_column,
            task=body.task if body.task != "auto" else None,
            feature_columns=body.feature_columns,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AutoML failed: {str(e)}")


@router.post("/cluster")
def cluster_data(
    body: ClusterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run KMeans clustering on a datasource query result."""
    ds = _get_ds(body.datasource_id, current_user.id, db)
    try:
        data = DataConnectorService.connect_and_query(ds.connector_type, ds.connection_config, body.query)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")

    try:
        result = AutoMLService.cluster(
            data=data,
            n_clusters=body.n_clusters,
            feature_columns=body.feature_columns,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")


def _get_ds(ds_id: str, user_id, db: Session) -> DataSource:
    ds = db.query(DataSource).filter(DataSource.id == ds_id, DataSource.owner_id == user_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    return ds
