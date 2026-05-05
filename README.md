# AnalyticsForge 🚀

**AI-powered Business Intelligence & Analytics Platform**

A full-featured analytics platform built to match Zoho Analytics Enterprise capabilities — with AI chat, drag-and-drop dashboards, data connectors, forecasting, and more.

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, Vite, TailwindCSS, Recharts |
| Backend   | Python 3.12, FastAPI, SQLAlchemy  |
| Database  | PostgreSQL 16                     |
| Cache     | Redis 7                           |
| AI        | OpenAI GPT-4o / Anthropic Claude  |
| Deploy    | Docker + Docker Compose           |

---

## Quick Start (Docker)

```bash
# 1. Clone and enter project
cd "Analytics Bot"

# 2. Set up backend environment
cp backend/.env.example backend/.env
# Edit backend/.env — add your OpenAI or Anthropic API key

# 3. Launch everything
docker compose up --build

# App will be at:
#   Frontend → http://localhost:3000
#   Backend API → http://localhost:8000/api/docs
```

---

## Manual / Development Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Run database migrations (auto-created on first start)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api → localhost:8000)
npm run dev
```

Open http://localhost:3000

---

## Features

### ✅ MVP (Implemented)
- **Authentication** — JWT login/register, role-based access (Admin, Analyst, Viewer)
- **Data Sources** — Connect PostgreSQL, MySQL, SQLite, CSV, Excel, REST APIs; drag & drop CSV upload
- **Dashboards** — Create dashboards, add widgets (Bar, Line, Area, Pie, Table, KPI), live data
- **AI Assistant** — Natural language chat, NL→SQL conversion, AI-generated insights, anomaly detection
- **Reports** — Create reports, export to CSV/Excel, scheduled delivery (config)
- **Advanced Analytics** — Time-series forecasting, descriptive statistics
- **Multilingual** — English + Tamil (தமிழ்) support
- **Sharing** — Public dashboard links via share token

### 🔜 Roadmap (Phase 2)
- Google Sheets, BigQuery, Snowflake connectors
- AutoML and custom model training
- Embedded analytics / white-label portal
- Advanced RBAC and row-level security
- Real-time streaming data
- Mobile app (React Native)
- PDF report generation with charts

---

## API Documentation

After starting the backend, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SECRET_KEY` | JWT signing secret (change in prod!) |
| `OPENAI_API_KEY` | OpenAI key (for GPT-4o AI features) |
| `ANTHROPIC_API_KEY` | Anthropic key (for Claude AI features) |
| `FRONTEND_URL` | Frontend URL for CORS |

---

## Project Structure

```
Analytics Bot/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── config.py        # Settings & env vars
│   │   ├── database.py      # SQLAlchemy engine & session
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── routers/         # API route handlers
│   │   ├── services/        # Business logic (AI, data connectors)
│   │   └── utils/           # Security, helpers
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Routes
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable UI components
│   │   ├── services/        # API client (axios)
│   │   └── store/           # Zustand state
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## License

MIT — Built for AnalyticsForge Client Project
