# VoteWise — Google Cloud Deployment Guide

> Deploy your AI-powered Election Education Assistant to Google Cloud Run with Gemini API integration.

---

## Prerequisites

Before starting, ensure you have:

- A [Google Cloud account](https://cloud.google.com) with billing enabled
- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed locally
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Node.js 18+](https://nodejs.org) installed (for building the frontend)
- Your Antigravity/Gemini API key ready
- Git installed

---

## Architecture Overview

```
User Browser
    │
    ▼
Cloud Run (Frontend - React/Vite)
    │  POST /api/chat
    ▼
Cloud Run (Backend - FastAPI + Gemini)
    │
    ▼
Gemini 2.0 Flash API (via Antigravity)
```

Both frontend and backend are deployed as separate Cloud Run services.

---

## Step 1 — Initial Google Cloud Setup

### 1.1 Login and set project

```bash
# Authenticate with Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create votewise-app --name="VoteWise"

# Set the active project
gcloud config set project votewise-app

# Enable billing (do this in the Cloud Console UI)
# https://console.cloud.google.com/billing
```

### 1.2 Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 1.3 Create Artifact Registry repository

```bash
gcloud artifacts repositories create votewise-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="VoteWise Docker images"
```

---

## Step 2 — Store API Key in Secret Manager

Never hardcode your API key. Use Google Cloud Secret Manager.

```bash
# Create the secret
echo -n "YOUR_ANTIGRAVITY_API_KEY_HERE" | \
  gcloud secrets create GEMINI_API_KEY \
  --data-file=- \
  --replication-policy=automatic

# Verify it was created
gcloud secrets list
```

---

## Step 3 — Backend Deployment (FastAPI)

### 3.1 Project structure

Ensure your backend folder looks like this:

```
backend/
├── main.py
├── requirements.txt
└── Dockerfile
```

### 3.2 `requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
httpx==0.27.0
pydantic==2.7.0
python-dotenv==1.0.1
```

### 3.3 `Dockerfile` for backend

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 3.4 Build and push backend image

```bash
cd backend

# Configure Docker to use gcloud credentials
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build the image
docker build -t us-central1-docker.pkg.dev/votewise-app/votewise-repo/backend:latest .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/votewise-app/votewise-repo/backend:latest
```

### 3.5 Deploy backend to Cloud Run

```bash
gcloud run deploy votewise-backend \
  --image us-central1-docker.pkg.dev/votewise-app/votewise-repo/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

After deployment, note the **backend service URL** — it will look like:
`https://votewise-backend-xxxxxxxxxx-uc.a.run.app`

---

## Step 4 — Frontend Deployment (React/Vite)

### 4.1 Set the backend URL as environment variable

In your Lovable-generated frontend project root, create a `.env.production` file:

```env
VITE_API_BASE_URL=https://votewise-backend-xxxxxxxxxx-uc.a.run.app
```

Replace the URL with your actual backend Cloud Run URL from Step 3.5.

### 4.2 Build the frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder.

### 4.3 `Dockerfile` for frontend (Nginx)

Create this file in your frontend folder:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### 4.4 `nginx.conf`

Create this file in your frontend folder:

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

### 4.5 Build and push frontend image

```bash
cd frontend

# Build with your backend URL baked in
docker build \
  --build-arg VITE_API_BASE_URL=https://votewise-backend-xxxxxxxxxx-uc.a.run.app \
  -t us-central1-docker.pkg.dev/votewise-app/votewise-repo/frontend:latest .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/votewise-app/votewise-repo/frontend:latest
```

### 4.6 Deploy frontend to Cloud Run

```bash
gcloud run deploy votewise-frontend \
  --image us-central1-docker.pkg.dev/votewise-app/votewise-repo/frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5
```

Your frontend will be live at a URL like:
`https://votewise-frontend-xxxxxxxxxx-uc.a.run.app`

---

## Step 5 — Configure CORS on Backend

In your `main.py`, update CORS to allow your frontend URL:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://votewise-frontend-xxxxxxxxxx-uc.a.run.app",
        "http://localhost:5173",  # for local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Redeploy the backend after this change:

```bash
docker build -t us-central1-docker.pkg.dev/votewise-app/votewise-repo/backend:latest ./backend
docker push us-central1-docker.pkg.dev/votewise-app/votewise-repo/backend:latest

gcloud run deploy votewise-backend \
  --image us-central1-docker.pkg.dev/votewise-app/votewise-repo/backend:latest \
  --region us-central1 \
  --platform managed
```

---

## Step 6 — (Optional) Add a Custom Domain

```bash
# Map a custom domain to your frontend service
gcloud beta run domain-mappings create \
  --service votewise-frontend \
  --domain votewise.yourdomain.com \
  --region us-central1
```

Follow the DNS instructions shown — you'll need to add a CNAME record with your domain registrar.

---

## Step 7 — (Optional) Set Up Cloud Build CI/CD

Create `cloudbuild.yaml` at your repo root for auto-deployment on every push:

```yaml
steps:
  # Build backend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - build
      - -t
      - us-central1-docker.pkg.dev/$PROJECT_ID/votewise-repo/backend:$COMMIT_SHA
      - ./backend

  # Push backend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - push
      - us-central1-docker.pkg.dev/$PROJECT_ID/votewise-repo/backend:$COMMIT_SHA

  # Deploy backend
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - votewise-backend
      - --image
      - us-central1-docker.pkg.dev/$PROJECT_ID/votewise-repo/backend:$COMMIT_SHA
      - --region
      - us-central1
      - --platform
      - managed

  # Build frontend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - build
      - --build-arg
      - VITE_API_BASE_URL=https://votewise-backend-xxxxxxxxxx-uc.a.run.app
      - -t
      - us-central1-docker.pkg.dev/$PROJECT_ID/votewise-repo/frontend:$COMMIT_SHA
      - ./frontend

  # Push frontend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - push
      - us-central1-docker.pkg.dev/$PROJECT_ID/votewise-repo/frontend:$COMMIT_SHA

  # Deploy frontend
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - votewise-frontend
      - --image
      - us-central1-docker.pkg.dev/$PROJECT_ID/votewise-repo/frontend:$COMMIT_SHA
      - --region
      - us-central1
      - --platform
      - managed
```

Connect your GitHub repo in Cloud Build console:
`https://console.cloud.google.com/cloud-build/triggers`

---

## Step 8 — Verify Deployment

### Check service status

```bash
# List all Cloud Run services
gcloud run services list --region us-central1

# View backend logs
gcloud run services logs read votewise-backend --region us-central1

# View frontend logs
gcloud run services logs read votewise-frontend --region us-central1
```

### Test the backend API

```bash
# Replace with your actual backend URL
curl -X POST https://votewise-backend-xxxxxxxxxx-uc.a.run.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I register to vote?", "session_id": "test-123"}'
```

Expected response:
```json
{
  "reply": "To register to vote, you typically need to..."
}
```

---

## Step 9 — LinkedIn Post Checklist

Before posting on LinkedIn, confirm:

- [ ] Frontend URL is live and loads correctly
- [ ] Chat sends and receives AI responses
- [ ] Dark mode toggle works
- [ ] Mobile view looks good (test on phone)
- [ ] Take a screenshot or screen recording of the working app
- [ ] Note your Google Cloud services used (Cloud Run, Secret Manager, Artifact Registry)

**Suggested LinkedIn post structure:**
```
🗳️ Just shipped VoteWise for the GUVI x HCL PromptWars Hackathon!

An AI-powered Election Education Assistant built with:
⚡ Gemini 2.0 Flash (via Antigravity) for intelligent responses
🚀 FastAPI backend deployed on Google Cloud Run
⚛️ React frontend with full accessibility (WCAG 2.1 AA)
🔐 Google Secret Manager for secure API key management

Try it here: [your URL]
GitHub: [your repo]

#Hackathon #GoogleCloud #GeminiAI #GUVI #PromptWars #VoteWise
```

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `CORS error` in browser | Backend CORS not updated | Add frontend URL to `allow_origins` in FastAPI |
| `500 Internal Server Error` | API key not found | Check Secret Manager binding in Cloud Run |
| `Container failed to start` | Wrong port | Ensure app listens on `PORT` env var or `8080` |
| Frontend shows blank page | React Router not configured | Verify `nginx.conf` has `try_files` for SPA routing |
| Image push fails | Docker not authenticated | Run `gcloud auth configure-docker us-central1-docker.pkg.dev` |
| Slow cold starts | Min instances = 0 | Set `--min-instances 1` (incurs small cost) |

---

## Cost Estimate

For a hackathon with low traffic, your costs will be near **$0/month**:

- Cloud Run: Free tier covers 2M requests/month + 360K GB-seconds
- Artifact Registry: First 0.5GB free
- Secret Manager: First 6 active secrets free
- Gemini API (via Antigravity): Depends on your plan

---

*Happy hacking! 🗳️ VoteWise — Understand Your Vote. Shape Your Future.*
