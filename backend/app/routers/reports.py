from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
import io

from ..database import get_db
from ..models.user import User
from ..models.report import Report, ReportFormat
from ..models.datasource import DataSource
from ..utils.security import get_current_user
from ..services.data_connector import DataConnectorService

router = APIRouter(prefix="/api/reports", tags=["Reports"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    name: str
    description: Optional[str] = None
    datasource_id: Optional[str] = None
    query: Optional[str] = None
    columns_config: Optional[List[Dict]] = None
    filters: Optional[Dict] = None
    format: ReportFormat = ReportFormat.pdf
    schedule_cron: Optional[str] = None
    schedule_emails: Optional[List[str]] = None
    is_scheduled: bool = False


class ReportResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    format: str
    is_scheduled: bool
    schedule_cron: Optional[str]

    class Config:
        from_attributes = True


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ReportResponse])
def list_reports(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Report).filter(Report.owner_id == current_user.id).all()


@router.post("/", response_model=ReportResponse, status_code=201)
def create_report(data: ReportCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    report = Report(**data.model_dump(), owner_id=current_user.id)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_or_404(report_id, current_user.id, db)


@router.delete("/{report_id}", status_code=204)
def delete_report(report_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    report = _get_or_404(report_id, current_user.id, db)
    db.delete(report)
    db.commit()


@router.get("/{report_id}/export")
def export_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run the report query and export as CSV or Excel."""
    report = _get_or_404(report_id, current_user.id, db)
    if not report.datasource_id or not report.query:
        raise HTTPException(status_code=400, detail="Report has no data source or query configured")

    ds = db.query(DataSource).filter(DataSource.id == report.datasource_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    result = DataConnectorService.connect_and_query(ds.connector_type, ds.connection_config, report.query)

    import pandas as pd
    df = pd.DataFrame(result["rows"], columns=result["columns"])

    if report.format == ReportFormat.excel:
        buf = io.BytesIO()
        df.to_excel(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{report.name}.xlsx"'}
        )
    else:  # CSV default
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            io.BytesIO(buf.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{report.name}.csv"'}
        )


def _get_or_404(report_id: str, user_id, db: Session) -> Report:
    r = db.query(Report).filter(Report.id == report_id, Report.owner_id == user_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return r
