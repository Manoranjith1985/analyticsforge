from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .config import settings
from .database import Base, engine
from .routers import (
    auth, datasources, dashboards, reports, ai, analytics,
    collaboration, pipeline, stories, embed, admin, automl, scheduled_reports
)

# Create all DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AnalyticsForge API",
    description="AI-powered Business Intelligence & Analytics Platform — Full BRD Implementation",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
allowed_origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
]

class _SmartCORSMiddleware(CORSMiddleware):
    async def is_allowed_origin(self, origin: str) -> bool:
        if origin.endswith(".onrender.com"):
            return True
        return await super().is_allowed_origin(origin)

app.add_middleware(
    _SmartCORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(datasources.router)
app.include_router(dashboards.router)
app.include_router(reports.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(collaboration.router)
app.include_router(pipeline.router)
app.include_router(stories.router)
app.include_router(embed.router)
app.include_router(admin.router)
app.include_router(automl.router)
app.include_router(scheduled_reports.router)

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "modules": [
            "auth", "datasources", "dashboards", "reports", "ai",
            "analytics", "collaboration", "pipeline", "stories",
            "embed", "admin", "automl", "scheduled_reports"
        ]
    }

# ── Static uploads ────────────────────────────────────────────────────────────
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
