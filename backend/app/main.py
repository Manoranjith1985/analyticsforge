from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .config import settings
from .database import Base, engine
from .routers import auth, datasources, dashboards, reports, ai, analytics

# Create all DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AnalyticsForge API",
    description="AI-powered Business Intelligence & Analytics Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the configured frontend URL + localhost for dev + all Render preview URLs
allowed_origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
]
# In production allow any *.onrender.com subdomain
if settings.APP_ENV == "production":
    import re
    from starlette.middleware.cors import CORSMiddleware as _CORS

    class _RenderCORSMiddleware(_CORS):
        async def is_allowed_origin(self, origin: str) -> bool:
            if origin.endswith(".onrender.com"):
                return True
            return await super().is_allowed_origin(origin)

    app.add_middleware(
        _RenderCORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
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

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"}


# Serve uploaded files (CSV, Excel, etc.)
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
