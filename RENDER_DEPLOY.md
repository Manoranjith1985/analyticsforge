# AnalyticsForge — Render Deployment Guide

## One-click Deploy (Recommended)

1. Push this repo to GitHub (run `push_update.ps1`)
2. Go to https://dashboard.render.com → **New → Blueprint**
3. Connect your GitHub repo `Manoranjith1985/analyticsforge`
4. Render reads `render.yaml` and creates all services automatically
5. Click **Apply**

---

## Environment Variables to Set Manually

After the Blueprint applies, set these env vars in the Render dashboard:

### Backend service (`analyticsforge-backend`):
| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | Your OpenAI key (sk-...) |
| `ANTHROPIC_API_KEY` | Your Anthropic key (optional) |
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_USER` | Your email address |
| `SMTP_PASSWORD` | Your email app password |

### Frontend service (`analyticsforge-frontend`):
| Key | Value |
|-----|-------|
| `VITE_API_URL` | Your backend URL, e.g. `https://analyticsforge-backend.onrender.com` |

> **Important:** After setting `VITE_API_URL`, trigger a manual redeploy of the frontend so the new build picks it up.

---

## Manual Service Setup (Alternative)

### Backend
- New Web Service → **Docker** runtime
- Root Directory: `backend`
- Dockerfile path: `./Dockerfile`
- Health check: `/api/health`
- Add env vars listed above

### Frontend
- New Static Site
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Add `VITE_API_URL` env var

---

## Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in your values
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000  
Backend API docs at http://localhost:8000/api/docs
