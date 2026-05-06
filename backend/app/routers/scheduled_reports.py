from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models.user import User
from ..models.scheduled_report import ScheduledReport, ReportExecution, ReportStatus
from ..models.datasource import DataSource
from ..models.report import Report
from ..utils.security import get_current_user
from ..utils.orm_helpers import orm_to_dict
from ..services.data_connector import DataConnectorService
from ..services.export_service import ExportService
from ..services.email_service import EmailService

router = APIRouter(prefix="/api/scheduled-reports", tags=["Scheduled Reports"])
email_service = EmailService()

SR_FIELDS = ["id", "name", "cron_expression", "format", "is_active", "run_count"]

def _sr_dict(sr):
    return orm_to_dict(sr, SR_FIELDS)

class ScheduledReportCreate(BaseModel):
    name: str
    report_id: Optional[str] = None
    dashboard_id: Optional[str] = None
    cron_expression: str = "0 9 * * 1"
    recipients: List[str]
    format: str = "pdf"
    subject_template: Optional[str] = None
    message_template: Optional[str] = None

class ScheduledReportResponse(BaseModel):
    id: str
    name: str
    cron_expression: str
    format: str
    is_active: bool
    run_count: int

@router.get("/", response_model=List[ScheduledReportResponse])
def list_scheduled(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [_sr_dict(sr) for sr in db.query(ScheduledReport).filter(ScheduledReport.owner_id == current_user.id).all()]

@router.post("/", response_model=ScheduledReportResponse, status_code=201)
def create_scheduled(data: ScheduledReportCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        sr = ScheduledReport(**data.model_dump(), owner_id=current_user.id)
        db.add(sr)
        db.commit()
        db.refresh(sr)
        return _sr_dict(sr)
    except Exception as e:
        db.rollback()
        import traceback
        raise HTTPException(status_code=500, detail=f"Create scheduled report error: {str(e)} | {traceback.format_exc()}")

@router.patch("/{sr_id}/toggle")
def toggle_active(sr_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sr = _get_or_404(sr_id, current_user.id, db)
    sr.is_active = not sr.is_active
    db.commit()
    return {"is_active": sr.is_active}

@router.delete("/{sr_id}", status_code=204)
def delete_scheduled(sr_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(_get_or_404(sr_id, current_user.id, db))
    db.commit()

@router.post("/{sr_id}/run-now")
def run_now(sr_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sr = _get_or_404(sr_id, current_user.id, db)
    execution = ReportExecution(scheduled_report_id=sr.id, status=ReportStatus.running)
    db.add(execution)
    db.commit()
    try:
        report = db.query(Report).filter(Report.id == sr.report_id).first() if sr.report_id else None
        if not report or not report.datasource_id:
            raise ValueError("Report has no data source configured")
        ds = db.query(DataSource).filter(DataSource.id == report.datasource_id).first()
        data = DataConnectorService.connect_and_query(ds.connector_type, ds.connection_config, report.query or "SELECT 1")
        if sr.format == "excel":
            file_bytes = ExportService.to_excel(data, sheet_name=sr.name)
            filename = f"{sr.name}.xlsx"
        elif sr.format == "csv":
            file_bytes = ExportService.to_csv(data)
            filename = f"{sr.name}.csv"
        else:
            file_bytes = ExportService.to_pdf(sr.name, data)
            filename = f"{sr.name}.pdf"
        sent = email_service.send_report(sr.recipients, sr.name, file_bytes, filename, sr.format)
        execution.status = ReportStatus.success
        execution.recipients_sent = sr.recipients
        sr.run_count = (sr.run_count or 0) + 1
        db.commit()
        return {"status": "success", "sent_to": sr.recipients, "email_delivered": sent, "format": sr.format}
    except Exception as e:
        execution.status = ReportStatus.failed
        execution.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@router.get("/{sr_id}/executions")
def get_executions(sr_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(sr_id, current_user.id, db)
    execs = db.query(ReportExecution).filter(ReportExecution.scheduled_report_id == sr_id).order_by(ReportExecution.executed_at.desc()).limit(20).all()
    return [{"id": str(e.id), "status": e.status, "error": e.error_message, "executed_at": str(e.executed_at)} for e in execs]

def _get_or_404(sr_id, user_id, db):
    sr = db.query(ScheduledReport).filter(ScheduledReport.id == sr_id, ScheduledReport.owner_id == user_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    return sr
