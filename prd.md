# VoteWise — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** April 2026  
**Hackathon:** PromptWars  
**Author:** J Joshua Haniel
**Status:** Active Development

---

## 1. Executive Summary

VoteWise is an AI-powered election education assistant designed to help citizens understand the democratic process. It solves a real, measurable problem: voter confusion about registration deadlines, ballot types, election timelines, and civic procedures. By providing a conversational, non-partisan, accessible interface backed by Gemini 2.0 Flash, VoteWise makes civic knowledge approachable for everyone.

---

## 2. Problem Statement

**The problem:** Millions of eligible voters miss elections or make uninformed choices because navigating election information is unnecessarily complex. Official government websites are often dense, hard to search, and not designed for conversational Q&A.

**Who is affected:**

- First-time voters who don't know where to start
- Recently moved citizens who need to re-register
- Voters confused about mail/absentee ballot options
- Non-native citizens who recently became eligible
- Anyone trying to understand ballot measures or the Electoral College

**What exists today:** Static FAQ pages, PDF guides, and government portals that require users to know what to search for — not helpful for someone who doesn't know what they don't know.

**The gap:** No accessible, conversational, AI-powered tool exists specifically for election education that is non-partisan, WCAG compliant, and works on mobile.

---

## 3. Goals

### Primary Goals

1. Enable any user to get a clear, accurate answer to any election-related question within 30 seconds
2. Reduce voter confusion about registration and participation processes
3. Deliver a fully accessible (WCAG 2.1 AA) experience across all devices

### Hackathon-Specific Goals

1. Score in all six AI code analysis criteria: Code Quality, Security, Efficiency, Testing, Accessibility, Google Services
2. Demonstrate meaningful use of Google Cloud infrastructure (Cloud Run, Secret Manager, Artifact Registry)
3. Deploy a live, functional product at a public URL within the submission window

### Non-Goals (Out of Scope for v1.0)

- Jurisdiction-specific real-time data (deadlines, polling places for a specific address)
- Voter registration completion (linking to external systems)
- Multilingual support beyond English (planned for v2)
- Saving conversation history across sessions
- User accounts or authentication

---

## 4. User Personas

### Persona 1 — First-Time Voter "Priya"

- Age: 19, college student, newly eligible
- Needs: Understand what registration means, how to vote on campus
- Behavior: Mobile-first, uses chat apps, intimidated by government sites
- Success: Registers to vote after a 5-minute VoteWise conversation

### Persona 2 — Recently Relocated "Marcus"

- Age: 34, professional, moved states 3 months ago
- Needs: Know if he needs to re-register, what the deadline is
- Behavior: Desktop user, values concise accurate answers
- Success: Knows exactly what to do before his state's deadline

### Persona 3 — Civic Educator "Ms. Chen"

- Age: 52, high school civics teacher
- Needs: A tool to show students how elections work interactively
- Behavior: Uses projector, needs accessibility and large text support
- Success: Uses VoteWise in a classroom setting without issues

---

## 5. Functional Requirements

### 5.1 Chat Interface (Must Have)

| ID   | Requirement                                         | Priority |
| ---- | --------------------------------------------------- | -------- |
| F-01 | User can type a free-form election question         | P0       |
| F-02 | AI responds within 10 seconds for 95th percentile   | P0       |
| F-03 | Responses are rendered as formatted Markdown        | P0       |
| F-04 | Session UUID is generated on load and persisted     | P0       |
| F-05 | Conversation history is sent with each request      | P0       |
| F-06 | Typing indicator shown while response loads         | P1       |
| F-07 | Send button is disabled during in-flight request    | P1       |
| F-08 | Error toast shown on API failure                    | P1       |
| F-09 | Chat auto-scrolls to latest message                 | P1       |
| F-10 | Enter key submits message (Shift+Enter for newline) | P1       |

### 5.2 Quick Topic Pills (Must Have)

| ID   | Requirement                                           | Priority |
| ---- | ----------------------------------------------------- | -------- |
| F-11 | 6 predefined topic pills displayed above chat input   | P0       |
| F-12 | Clicking a pill auto-fills and submits the chat input | P0       |
| F-13 | Pills are horizontally scrollable on mobile           | P1       |

### 5.3 Election Timeline (Must Have)

| ID   | Requirement                                          | Priority |
| ---- | ---------------------------------------------------- | -------- |
| F-14 | Vertical stepper showing 6 election phases           | P0       |
| F-15 | Each step has icon, title, description, status badge | P1       |
| F-16 | Component is lazy-loaded (React.lazy + Suspense)     | P1       |

### 5.4 FAQ Accordion (Must Have)

| ID   | Requirement                                          | Priority |
| ---- | ---------------------------------------------------- | -------- |
| F-17 | Minimum 5 FAQ items using shadcn Accordion           | P0       |
| F-18 | Items are keyboard navigable (Enter/Space to toggle) | P0       |
| F-19 | Component is lazy-loaded                             | P1       |

### 5.5 Navigation + Theme (Must Have)

| ID   | Requirement                                  | Priority |
| ---- | -------------------------------------------- | -------- |
| F-20 | Dark mode toggle in navbar via shadcn Switch | P0       |
| F-21 | "Start Learning" CTA scrolls to chat section | P1       |

---

## 6. Non-Functional Requirements

### 6.1 Accessibility (WCAG 2.1 AA — Required for Score)

- All interactive elements have `aria-label` or `aria-labelledby`
- Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- Full keyboard navigation: Tab, Enter, Space, Escape
- Visible focus rings on all focusable elements
- All images have descriptive `alt` text
- Chat input has `role="textbox"` and `aria-label`
- Dynamic content updates announced via `aria-live="polite"`
- No color-only information encoding

### 6.2 Performance

- Time to First Contentful Paint (FCP): < 2s on 4G
- Chat response latency (p95): < 10s end-to-end
- Lighthouse Performance score: ≥ 80
- Bundle size: < 500KB gzipped

### 6.3 Security

- No API keys in frontend code or source repository
- API keys stored in Google Cloud Secret Manager
- CORS restricted to known frontend origin(s) in production
- HTTPS enforced on all endpoints (Cloud Run provides this)
- No sensitive user data stored or logged
- Input sanitized before sending to Gemini

### 6.4 Reliability

- Health check endpoint: `GET /health` returns 200 OK
- Backend handles Antigravity/Gemini timeouts with graceful error response
- Frontend shows user-friendly error messages on all failure modes
- Retry logic: 1 automatic retry on network timeout

---

## 7. API Contract

### `POST /api/chat`

```
Request Headers:
  Content-Type: application/json

Request Body:
  {
    "message": string,         // max 2000 chars
    "session_id": string,      // UUIDv4
    "history": [               // max 20 items
      {
        "role": "user" | "assistant",
        "content": string
      }
    ]
  }

Success Response (200):
  {
    "reply": string,           // Markdown-formatted response
    "session_id": string
  }

Error Response (4xx/5xx):
  {
    "detail": string
  }
```

### `GET /health`

```
Success Response (200):
  {
    "status": "ok",
    "model": "gemini-2.0-flash"
  }
```

---

## 8. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Browser                         │
│  React SPA (Vite + TypeScript + shadcn/ui + Tailwind)   │
└──────────────────────────┬──────────────────────────────┘
                           │ POST /api/chat
                           │ (VITE_API_BASE_URL)
┌──────────────────────────▼──────────────────────────────┐
│              Google Cloud Run — Backend                  │
│              FastAPI (Python 3.11)                       │
│              /api/chat    /health                        │
└──────────────────────────┬──────────────────────────────┘
                           │ Bearer token from Secret Manager
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Antigravity API (Gemini 2.0 Flash)          │
│              System prompt: civic education              │
└─────────────────────────────────────────────────────────┘

Supporting GCP Services:
  ├── Artifact Registry  — Docker image storage
  ├── Secret Manager     — GEMINI_API_KEY
  └── Cloud Build        — CI/CD on GitHub push
```

---

## 9. Acceptance Criteria

The product is considered shippable when all of the following pass:

### Functional

- [ ] User can type a question and receive an AI response
- [ ] Quick pills auto-submit when clicked
- [ ] Dark mode toggle works without page reload
- [ ] Election timeline renders all 6 phases
- [ ] FAQ accordion expands/collapses correctly
- [ ] Error toast appears when API is unreachable

### Technical

- [ ] `GET /health` returns 200 OK on deployed backend
- [ ] CORS: no CORS errors in browser console for deployed frontend → backend calls
- [ ] `VITE_API_BASE_URL` correctly points to Cloud Run backend URL
- [ ] No API keys visible in frontend bundle (check with `grep -r "GEMINI" dist/`)
- [ ] Both services deployed to Cloud Run and publicly accessible

### Accessibility

- [ ] All interactive elements reachable by Tab key
- [ ] Chat can be used entirely without a mouse
- [ ] No accessibility errors in axe DevTools scan
- [ ] Focus ring visible on all focused elements

### Performance

- [ ] Lighthouse Performance ≥ 80
- [ ] Lighthouse Accessibility ≥ 95
- [ ] No console errors in production build

---

## 10. Risks and Mitigations

| Risk                                    | Likelihood | Impact | Mitigation                                                                     |
| --------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------ |
| Antigravity API outage                  | Low        | High   | Error toast + retry logic; fallback message                                    |
| CORS misconfiguration breaks production | High       | High   | Documented in CLAUDE.md; tested in CI                                          |
| Gemini response latency > 10s           | Medium     | Medium | 30s timeout; typing indicator keeps UX comfortable                             |
| Frontend build missing VITE env var     | High       | High   | Docker build-arg documented; checked in deploy checklist                       |
| GitHub repo > 10MB (hackathon limit)    | Low        | High   | `.dockerignore` excludes `node_modules`; `.gitignore` excludes build artifacts |

---

## 11. Success Metrics

For the hackathon submission:

| Metric                     | Target                |
| -------------------------- | --------------------- |
| AI Code Analysis Score     | ≥ 80%                 |
| Accessibility (Lighthouse) | ≥ 95                  |
| Performance (Lighthouse)   | ≥ 80                  |
| Google Services used       | ≥ 3 distinct services |
| API response success rate  | ≥ 99% during demo     |
| Time for first AI response | < 5s                  |

---

## 12. Timeline

| Milestone                     | Target                        |
| ----------------------------- | ----------------------------- |
| Lovable frontend generation   | Day 1                         |
| Antigravity backend setup     | Day 1                         |
| Local integration working     | Day 2                         |
| Google Cloud deployment       | Day 3                         |
| Accessibility audit + fixes   | Day 4                         |
| Final testing + LinkedIn post | Day 5                         |
| **Submission deadline**       | **03 May 2026, 11:59 PM IST** |

---

_VoteWise PRD v1.0 — GUVI × HCL PromptWars Hackathon 2026_
