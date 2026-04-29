# CLAUDE.md — VoteWise Project Context

This file gives Claude Code full context about the VoteWise project architecture, conventions, and known issues so every session starts informed.

---

## Project Overview

**VoteWise** is an AI-powered election education assistant.

- **Frontend:** React 18 + TypeScript + Vite, built with Lovable, deployed to Google Cloud Run
- **Backend:** FastAPI (Python 3.11), using Antigravity to call Gemini 2.0 Flash, deployed to Google Cloud Run
- **Chat endpoint:** `POST /api/chat` — takes `{message, session_id, history[]}`, returns `{reply, session_id}`
- **Health endpoint:** `GET /health` — returns `{status: "ok", model: "gemini-2.0-flash"}`

---

## Directory Layout

```
votewise/
├── frontend/src/
│   ├── components/ChatInterface.tsx   ← main chat UI
│   ├── components/QuickPills.tsx      ← topic shortcut pills
│   ├── components/Timeline.tsx        ← election timeline (lazy)
│   ├── components/FAQ.tsx             ← accordion FAQ (lazy)
│   ├── hooks/useChat.ts               ← chat state + API calls
│   └── lib/api.ts                     ← fetch wrapper
├── backend/
│   ├── main.py                        ← FastAPI app + CORS
│   ├── routes/chat.py                 ← /api/chat + /health
│   ├── services/gemini.py             ← Antigravity client
│   └── models/schemas.py             ← Pydantic models
```

---

## Critical Rules — Read Before Editing Anything

### Environment Variables

**Frontend** reads from `VITE_` prefixed vars:

```
VITE_API_BASE_URL=https://votewise-backend-xxxxxxxxxx-uc.a.run.app
```

Accessing `process.env.*` in Vite will be `undefined`. Always use `import.meta.env.VITE_*`.

**Backend** reads from:

```
GEMINI_API_KEY        # injected by Cloud Run from Secret Manager
ANTIGRAVITY_ENDPOINT  # the Antigravity API base URL
ALLOWED_ORIGINS       # comma-separated CORS origins
```

### CORS — This Is the #1 Integration Issue

CORS is configured in `backend/main.py`. Every time you add a new frontend URL (local dev, Cloud Run URL, custom domain), it MUST be added to `ALLOWED_ORIGINS`. The env var is comma-split:

```python
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, ...)
```

After changing CORS, rebuild and redeploy the backend.

### API Request Shape

The frontend's `lib/api.ts` sends:

```typescript
{
  message: string,
  session_id: string,       // UUID generated once on app load
  history: Message[]        // [{role: "user"|"assistant", content: string}]
}
```

The backend's Pydantic model in `models/schemas.py` must match exactly. Any field name mismatch causes a 422 Unprocessable Entity.

### Antigravity Client

`services/gemini.py` wraps Antigravity. Key things to know:

- Auth header: `Authorization: Bearer {GEMINI_API_KEY}`
- The model string is: `gemini-2.0-flash` (not `gemini-2.0-flash-exp`, not `gemini-flash`)
- Response path: `data["choices"][0]["message"]["content"]`
- Timeout is set to 30 seconds — do not lower this

### React Markdown

AI responses contain Markdown. They MUST be rendered with `react-markdown`, not `dangerouslySetInnerHTML`. The component is already configured in `ChatInterface.tsx`.

### Session ID

A UUID is generated with `crypto.randomUUID()` on app mount and stored in `useState`. It is included in every API request so the backend can (optionally) correlate messages. It resets on page reload — this is intentional.

---

## Known Issues and Fixes

### Issue 1: 422 Unprocessable Entity from `/api/chat`

**Cause:** The `history` field is sent as `undefined` instead of `[]` when the chat is empty.  
**Fix:** In `lib/api.ts`, always default history to `[]`:

```typescript
history: messages ?? [];
```

### Issue 2: CORS preflight fails in production

**Cause:** Frontend Cloud Run URL not in `ALLOWED_ORIGINS`.  
**Fix:** Set `ALLOWED_ORIGINS` env var on backend Cloud Run service, include the exact frontend URL (no trailing slash).

### Issue 3: `import.meta.env.VITE_API_BASE_URL` is `undefined` in production

**Cause:** Vite bakes env vars at build time. If `VITE_API_BASE_URL` isn't set during `npm run build`, it's empty.  
**Fix:** Pass it as a `--build-arg` in Docker: `docker build --build-arg VITE_API_BASE_URL=https://...`

### Issue 4: Antigravity returns 401

**Cause:** Secret Manager binding missing or wrong secret name.  
**Fix:** Verify with `gcloud run services describe votewise-backend --region us-central1` — look for `--set-secrets` in the config.

### Issue 5: Chat input submits on Enter but also adds newline

**Cause:** `onKeyDown` handler missing `e.preventDefault()`.  
**Fix:** In `ChatInterface.tsx`:

```typescript
if (e.key === "Enter" && !e.shiftKey) {
  e.preventDefault();
  handleSend();
}
```

---

## Testing

### Backend

```bash
cd backend
pytest tests/ -v
```

Key test files:

- `tests/test_chat.py` — tests `/api/chat` with mocked Antigravity response
- `tests/test_health.py` — tests `/health` endpoint

### Frontend

```bash
cd frontend
npm run test
```

---

## Deployment Checklist

Before deploying, verify:

- [ ] `VITE_API_BASE_URL` points to the correct backend Cloud Run URL
- [ ] Backend `ALLOWED_ORIGINS` includes the frontend Cloud Run URL
- [ ] `GEMINI_API_KEY` secret exists in Secret Manager
- [ ] Backend Cloud Run service has `--set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest`
- [ ] Both Docker images are under 10MB compressed (hackathon requirement for GitHub repo)
- [ ] `GET /health` returns 200 OK before testing chat

---

## Style Conventions

### TypeScript (Frontend)

- Use `interface` for object shapes, `type` for unions
- No `any` — use `unknown` and narrow
- All async functions in `useChat.ts` have try/catch
- Components use functional style with hooks only

### Python (Backend)

- Pydantic v2 models — use `model_validator` not `root_validator`
- All routes are in `routes/` — `main.py` only does app setup and middleware
- Use `async def` for all route handlers
- Log with `import logging; logger = logging.getLogger(__name__)`

---

## Useful Commands

```bash
# Check backend logs in production
gcloud run services logs read votewise-backend --region us-central1 --limit 50

# Update a single env var without full redeploy
gcloud run services update votewise-backend \
  --set-env-vars ALLOWED_ORIGINS="https://new-url.a.run.app" \
  --region us-central1

# Tail logs during testing
gcloud run services logs tail votewise-backend --region us-central1

# Force redeploy with latest image
gcloud run deploy votewise-backend \
  --image us-central1-docker.pkg.dev/votewise-app/votewise-repo/backend:latest \
  --region us-central1
```

---

_Last updated: April 2026 | GUVI × HCL PromptWars Hackathon_
