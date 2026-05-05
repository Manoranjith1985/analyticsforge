# Deploying AnalyticsForge to Render

Follow these steps to deploy the full app on [render.com](https://render.com).

---

## Prerequisites

- A [Render account](https://render.com) (free tier works for testing)
- Your code pushed to a **GitHub or GitLab repository**
- An OpenAI or Anthropic API key (for AI features)

---

## Step 1 — Push to GitHub

```bash
cd "Analytics Bot"
git init
git add .
git commit -m "Initial AnalyticsForge MVP"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/analyticsforge.git
git push -u origin main
```

---

## Step 2 — Deploy using Render Blueprint (Recommended)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repo
4. Render will detect `render.yaml` and automatically create:
   - ✅ PostgreSQL database (`analyticsforge-db`)
   - ✅ Redis instance (`analyticsforge-redis`)
   - ✅ FastAPI backend (`analyticsforge-backend`)
   - ✅ React frontend (`analyticsforge-frontend`)

---

## Step 3 — Set Secret Environment Variables

After the Blueprint deploys, go to each service and set these manually:

### Backend service (`analyticsforge-backend`) → Environment tab:

| Variable | Value |
|----------|-------|
| `OPENAI_API_KEY` | `sk-...` (your OpenAI key) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` (your Anthropic key) |
| `FRONTEND_URL` | The URL of your deployed frontend (e.g. `https://analyticsforge-frontend.onrender.com`) |

> `SECRET_KEY` and `DATABASE_URL` are auto-set by Render.

---

## Step 4 — Set Frontend Backend URL

In the frontend service (`analyticsforge-frontend`) → Environment tab:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your backend URL, e.g. `https://analyticsforge-backend.onrender.com` |

Then trigger a **Manual Deploy** on the frontend to rebuild with the correct URL.

---

## Step 5 — Done! 🎉

Your app will be live at:
- **Frontend**: `https://analyticsforge-frontend.onrender.com`
- **Backend API docs**: `https://analyticsforge-backend.onrender.com/api/docs`

---

## Manual Service Creation (Alternative to Blueprint)

If you prefer to create services one by one:

### 1. PostgreSQL Database
- New → PostgreSQL
- Name: `analyticsforge-db`
- Plan: Free

### 2. Redis
- New → Redis
- Name: `analyticsforge-redis`
- Plan: Free

### 3. Backend (Web Service)
- New → Web Service → Connect GitHub repo
- **Root Directory**: `backend`
- **Runtime**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/api/health`
- Add env vars: `DATABASE_URL` (from DB), `REDIS_URL` (from Redis), `SECRET_KEY` (generate), `OPENAI_API_KEY`

### 4. Frontend (Web Service)
- New → Web Service → Connect GitHub repo
- **Root Directory**: `frontend`
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npx serve dist -l $PORT`
- Add env var: `VITE_API_URL` = your backend Render URL

---

## Notes on Free Tier

- Free services **spin down after 15 min of inactivity** — first request after sleep takes ~30s
- PostgreSQL free tier has a **90-day limit** — upgrade to Starter ($7/mo) for production
- For production, upgrade backend to **Starter** ($7/mo) for always-on service
