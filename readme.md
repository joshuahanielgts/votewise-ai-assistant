# VoteWise 🗳️

> **AI-Powered Election Process Education Assistant**  
> Built for the GUVI × HCL PromptWars Hackathon

[![Deploy to Cloud Run](https://img.shields.io/badge/Deploy-Google%20Cloud%20Run-4285f4?logo=google-cloud)](https://cloud.google.com/run)
[![Gemini 2.0 Flash](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-ea4335?logo=google)](https://deepmind.google/technologies/gemini/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-0a7c42)](https://www.w3.org/WAI/WCAG21/quickref/)

---

## What is VoteWise?

VoteWise is an interactive, AI-powered civic education assistant that helps users understand the democratic election process. Ask anything about voter registration, election timelines, the Electoral College, ballot types, or voting rights — and get clear, non-partisan, markdown-formatted answers powered by Gemini 2.0 Flash.

**Live Demo:** `https://votewise-ai-666959845001.us-central1.run.app`  
**API Health:** `https://votewise-ai-666959845001.us-central1.run.app/health`

---

## Google Cloud Services Used

| Service | Purpose | Pricing |
|---------|---------|---------|
| Cloud Run | Backend API + Frontend hosting | Free tier |
| Artifact Registry | Docker image storage | Free tier |
| Secret Manager | API key management | Free tier |
| Cloud Build | CI/CD pipeline | Free tier |
| Cloud Logging | Structured request logs | Free tier |
| Firebase Firestore | Chat session persistence | Free Spark plan |
| Google Analytics 4 | Usage analytics & tracking | Always free |
| Gemini 2.5 Flash | AI responses | Per plan |



## Features

- **Conversational AI chat** — Gemini-powered assistant with session memory and context awareness
- **Quick topic pills** — One-click prompts for the 6 most common election questions
- **Election timeline visualizer** — Vertical stepper showing all phases from registration to certification
- **FAQ accordion** — 5 collapsible commonly asked questions with detailed answers
- **Dark mode** — Full toggle via shadcn Switch, respects system preference
- **WCAG 2.1 AA accessible** — ARIA labels, keyboard navigation, visible focus rings, color contrast compliant
- **Markdown rendering** — All AI responses rendered with `react-markdown`
- **Error handling** — Graceful toast notifications on API failure

---

## Project Structure

```
votewise/
├── src/                       # React + Vite Frontend
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── ChatInterface.tsx   ← main chat component
│   │   ├── QuickPills.tsx
│   │   ├── Timeline.tsx        ← lazy loaded
│   │   └── FAQ.tsx             ← lazy loaded
│   ├── hooks/
│   │   └── useChat.ts          ← API call logic
│   ├── lib/
│   │   └── api.ts              ← fetch wrapper with error handling
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── favicon.ico
├── backend/                   # FastAPI (Python)
│   ├── main.py                ← API entrypoint
│   ├── routes/
│   │   └── chat.py            ← /api/chat endpoint
│   ├── services/
│   │   └── gemini.py          ← Antigravity/Gemini client
│   ├── models/
│   │   └── schemas.py         ← Pydantic request/response models
│   ├── requirements.txt
│   └── Dockerfile
│
├── .env.example               ← Frontend + Backend environment templates
├── nginx.conf
├── Dockerfile                 ← Frontend Dockerfile
├── package.json
├── cloudbuild.yaml            ← CI/CD pipeline
├── GOOGLE_CLOUD_DEPLOY.md     ← Step-by-step deployment guide
├── ANTIGRAVITY_PROMPT.md      ← System prompt + backend spec
├── CLAUDE.md                  ← AI context for Claude Code
├── PRD.md                     ← Product requirements document
├── index.html                 ← Public landing page
└── README.md                  ← This file
```

---

## Quick Start (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 18+
- An Antigravity / Gemini API key

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run
uvicorn main:app --reload --port 8000
```

Backend will be live at: `http://localhost:8000`  
Health check: `GET http://localhost:8000/health`

### Frontend

```bash
# Install dependencies (if not already done)
npm install

# Set environment variables
cp .env.example .env.local
# VITE_API_BASE_URL=http://localhost:8000

# Run dev server
npm run dev
```

Frontend will be live at: `http://localhost:5173`

---

## API Reference

### `POST /api/chat`

Send a message and receive an AI response.

**Request:**

```json
{
  "message": "How do I register to vote?",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "history": [
    { "role": "user", "content": "previous question" },
    { "role": "assistant", "content": "previous answer" }
  ]
}
```

**Response:**

```json
{
  "reply": "## Voter Registration\n\nTo register to vote, you'll need to...",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (4xx/5xx):**

```json
{
  "detail": "AI service error: upstream timeout"
}
```

### `GET /health`

```json
{
  "status": "ok",
  "model": "gemini-2.0-flash"
}
```

---

## Environment Variables

### Backend (`.env`)

| Variable               | Description                         | Required |
| ---------------------- | ----------------------------------- | -------- |
| `GEMINI_API_KEY`       | Antigravity / Gemini API key        | ✅       |
| `ANTIGRAVITY_ENDPOINT` | API endpoint URL                    | ✅       |
| `ALLOWED_ORIGINS`      | Comma-separated CORS origins        | ✅       |
| `MAX_TOKENS`           | Max response tokens (default: 1500) | ❌       |
| `TEMPERATURE`          | Model temperature (default: 0.7)    | ❌       |

### Frontend (`.env.local`)

| Variable            | Description     | Required |
| ------------------- | --------------- | -------- |
| `VITE_API_BASE_URL` | Backend API URL | ✅       |

---

## Deployment

See the full step-by-step guide: [GOOGLE_CLOUD_DEPLOY.md](./GOOGLE_CLOUD_DEPLOY.md)

**Quick summary:**

1. `gcloud projects create votewise-app`
2. Enable Cloud Run, Artifact Registry, Secret Manager
3. Store API key: `gcloud secrets create GEMINI_API_KEY`
4. Build + push backend Docker image
5. `gcloud run deploy votewise-backend`
6. Build + push frontend Docker image with `VITE_API_BASE_URL` build arg
7. `gcloud run deploy votewise-frontend`

---

## Tech Stack

| Layer              | Technology                         |
| ------------------ | ---------------------------------- |
| Frontend Framework | React 18 + TypeScript + Vite       |
| UI Components      | shadcn/ui + Tailwind CSS           |
| AI Model           | Gemini 2.0 Flash (via Antigravity) |
| Backend Framework  | FastAPI (Python 3.11)              |
| Containerization   | Docker                             |
| Deployment         | Google Cloud Run                   |
| Container Registry | Google Artifact Registry           |
| Secret Management  | Google Cloud Secret Manager        |
| CI/CD              | Google Cloud Build                 |
| Markdown Rendering | react-markdown                     |

---

## Scoring Criteria (Hackathon)

This project is evaluated on:

| Criterion           | Implementation                                                        |
| ------------------- | --------------------------------------------------------------------- |
| **Code Quality**    | TypeScript, Pydantic models, clean separation of concerns             |
| **Security**        | API keys in Secret Manager, CORS configured, HTTPS enforced           |
| **Efficiency**      | Gemini Flash model, lazy loading, Nginx caching, min-instance scaling |
| **Testing**         | Unit tests in `/backend/tests/`, component tests in frontend          |
| **Accessibility**   | WCAG 2.1 AA, ARIA labels, keyboard nav, focus management              |
| **Google Services** | Cloud Run + Artifact Registry + Secret Manager + Cloud Build          |

---

## Contributing

This is a hackathon project. If you'd like to extend it:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push and open a PR

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

_VoteWise — Built with ❤️ for civic education | GUVI × HCL PromptWars 2026_
