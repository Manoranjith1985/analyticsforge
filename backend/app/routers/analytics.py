"""
Analytics Router — Predictive Forecasting & Statistical Analysis
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np

from ..database import get_db
from ..models.user import User
from ..models.datasource import DataSource
from ..utils.security import get_current_user
from ..services.data_connector import DataConnectorService

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


class ForecastRequest(BaseModel):
    datasource_id: str
    query: str
    date_column: str
    value_column: str
    periods: int = 12


class StatRequest(BaseModel):
    datasource_id: str
    query: str
    column: str


@router.post("/forecast")
def run_forecast(
    body: ForecastRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Simple time-series forecasting using linear regression."""
    ds = _get_ds(body.datasource_id, current_user.id, db)
    result = DataConnectorService.connect_and_query(ds.connector_type, ds.connection_config, body.query)

    df = pd.DataFrame(result["rows"], columns=result["columns"])
    if body.date_column not in df.columns or body.value_column not in df.columns:
        raise HTTPException(status_code=400, detail="Specified columns not found in data")

    df[body.date_column] = pd.to_datetime(df[body.date_column], errors="coerce")
    df = df.dropna(subset=[body.date_column, body.value_column])
    df = df.sort_values(body.date_column)
    df["ordinal"] = df[body.date_column].map(lambda d: d.toordinal())

    x = df["ordinal"].values.reshape(-1, 1)
    y = df[body.value_column].astype(float).values

    from sklearn.linear_model import LinearRegression
    model = LinearRegression().fit(x, y)

    last_date = df[body.date_column].max()
    freq = pd.infer_freq(df[body.date_column]) or "MS"
    future_dates = pd.date_range(start=last_date, periods=body.periods + 1, freq=freq)[1:]
    future_ordinals = np.array([d.toordinal() for d in future_dates]).reshape(-1, 1)
    predictions = model.predict(future_ordinals).tolist()

    return {
        "historical": df[[body.date_column, body.value_column]].to_dict(orient="records"),
        "forecast": [
            {"date": str(d.date()), "predicted": round(p, 2)}
            for d, p in zip(future_dates, predictions)
        ],
    }


@router.post("/stats")
def descriptive_stats(
    body: StatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return descriptive statistics for a numeric column."""
    ds = _get_ds(body.datasource_id, current_user.id, db)
    result = DataConnectorService.connect_and_query(ds.connector_type, ds.connection_config, body.query)
    df = pd.DataFrame(result["rows"], columns=result["columns"])

    if body.column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{body.column}' not found")

    series = pd.to_numeric(df[body.column], errors="coerce").dropna()
    stats = {
        "count": int(series.count()),
        "mean": round(float(series.mean()), 4),
        "median": round(float(series.median()), 4),
        "std": round(float(series.std()), 4),
        "min": round(float(series.min()), 4),
        "max": round(float(series.max()), 4),
        "q25": round(float(series.quantile(0.25)), 4),
        "q75": round(float(series.quantile(0.75)), 4),
    }
    return stats


def _get_ds(ds_id: str, user_id, db: Session) -> DataSource:
    ds = db.query(DataSource).filter(DataSource.id == ds_id, DataSource.owner_id == user_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    return ds
