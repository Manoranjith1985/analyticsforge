from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict

from ..database import get_db
from ..models.user import User
from ..models.datasource import DataSource
from ..utils.security import get_current_user
from ..services.ai_service import AIService
from ..services.data_connector import DataConnectorService

router = APIRouter(prefix="/api/ai", tags=["AI Analytics"])

ai_service = AIService()


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class AskRequest(BaseModel):
    question: str
    datasource_id: Optional[str] = None
    messages: Optional[List[ChatMessage]] = None


class InsightRequest(BaseModel):
    datasource_id: str
    query: str
    question: Optional[str] = None


class NLToSQLRequest(BaseModel):
    datasource_id: str
    question: str


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/chat")
async def ai_chat(
    body: AskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """General AI chat — conversational BI assistant."""
    messages = [m.model_dump() for m in (body.messages or [])]
    messages.append({"role": "user", "content": body.question})
    response = await ai_service.chat(messages, language=current_user.preferred_language)
    return {"response": response}


@router.post("/nl-to-sql")
async def nl_to_sql(
    body: NLToSQLRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convert a natural language question to SQL for a given data source."""
    ds = db.query(DataSource).filter(
        DataSource.id == body.datasource_id,
        DataSource.owner_id == current_user.id
    ).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    schema = DataConnectorService.get_schema(ds.connector_type, ds.connection_config)
    sql = await ai_service.natural_language_to_sql(
        body.question, schema, language=current_user.preferred_language
    )
    return {"sql": sql, "question": body.question}


@router.post("/insights")
async def generate_insights(
    body: InsightRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run a query and generate AI-powered insights from the result."""
    ds = db.query(DataSource).filter(
        DataSource.id == body.datasource_id,
        DataSource.owner_id == current_user.id
    ).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    try:
        result = DataConnectorService.connect_and_query(
            ds.connector_type, ds.connection_config, body.query
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")

    # Summarise data for the LLM
    columns = result.get("columns", [])
    rows = result.get("rows", [])[:20]  # cap at 20 rows for the prompt
    data_summary = f"Columns: {', '.join(columns)}\nSample rows:\n"
    for row in rows:
        data_summary += str(row) + "\n"
    data_summary += f"\nTotal rows: {result.get('row_count', 'unknown')}"

    insights = await ai_service.generate_insights(
        data_summary, body.question, language=current_user.preferred_language
    )
    return {
        "insights": insights,
        "data": result,
    }


@router.post("/anomaly-detect")
async def detect_anomalies(
    body: InsightRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detect anomalies in a dataset using AI."""
    ds = db.query(DataSource).filter(
        DataSource.id == body.datasource_id,
        DataSource.owner_id == current_user.id
    ).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    result = DataConnectorService.connect_and_query(
        ds.connector_type, ds.connection_config, body.query
    )
    rows = result.get("rows", [])[:50]
    columns = result.get("columns", [])
    data_summary = f"Columns: {', '.join(columns)}\nData:\n" + "\n".join(str(r) for r in rows)

    prompt_question = "Identify any anomalies, outliers, or unusual patterns in this dataset. Be specific about which rows/values are anomalous and why."
    insights = await ai_service.generate_insights(
        data_summary, prompt_question, language=current_user.preferred_language
    )
    return {"anomalies": insights, "data": result}
