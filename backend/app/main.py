from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
import os

from .config import settings
from .database import Base, engine
from .routers import (
    auth, datasources, dashboards, reports, ai, analytics,
    collaboration, pipeline, stories, embed, admin, automl, scheduled_reports
)


def _migrate_enum_columns_to_varchar():
    """
    Idempotent startup migration: convert any PostgreSQL ENUM-typed columns
    back to VARCHAR so SQLAlchemy String() columns work correctly.
    This fixes the case where tables were originally created with Enum() columns
    and have not been altered yet.
    """
    migration_sql = """
    DO $$
    DECLARE
        col RECORD;
        alter_cmd TEXT;
    BEGIN
        FOR col IN
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND data_type = 'USER-DEFINED'
              AND udt_name NOT IN ('uuid')
        LOOP
            alter_cmd := format(
                'ALTER TABLE %I ALTER COLUMN %I TYPE VARCHAR USING %I::VARCHAR',
                col.table_name, col.column_name, col.column_name
            );
            EXECUTE alter_cmd;
            RAISE NOTICE 'Converted %.% to VARCHAR', col.table_name, col.column_name;
        END LOOP;
    END $$;
    """
    try:
        with engine.connect() as conn:
            conn.execute(text(migration_sql))
            conn.commit()
    except Exception as e:
        # Log but don't crash — tables may not exist yet
        print(f"[startup migration] warning: {e}")


def _seed_admin_user():
    """
    Ensure the default admin account exists at startup.
    Creates manoumaranjith@gmail.com / Admin123! if not present.
    """
    from sqlalchemy.orm import Session
    from .models.user import User
    from .utils.security import get_password_hash

    ADMIN_EMAIL = "manoumaranjith@gmail.com"
    ADMIN_PASSWORD = "Admin123!"
    ADMIN_NAME = "Mano Ranjith"

    try:
        with Session(engine) as session:
            existing = session.query(User).filter(User.email == ADMIN_EMAIL).first()
            if not existing:
                admin = User(
                    email=ADMIN_EMAIL,
                    full_name=ADMIN_NAME,
                    hashed_password=get_password_hash(ADMIN_PASSWORD),
                    role="admin",
                    is_active=True,
                    is_verified=True,
                )
                session.add(admin)
                session.commit()
                print(f"[startup] Admin user created: {ADMIN_EMAIL}")
            else:
                # Always force role to admin and ensure account is active
                existing.role = "admin"
                existing.is_active = True
                existing.is_verified = True
                existing.full_name = ADMIN_NAME
                session.commit()
                print(f"[startup] Admin user confirmed as admin: {ADMIN_EMAIL}")
    except Exception as e:
        print(f"[startup] Could not seed admin user: {e}")


# ── Run startup tasks ─────────────────────────────────────────────────────────
_migrate_enum_columns_to_varchar()
Base.metadata.create_all(bind=engine)
_seed_admin_user()

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
