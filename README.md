# The AI Interview Prep Kit

**TRAO_DOCUMENT_TYPE:** ENGINEERING_ASSESSMENT  
**TRAO_ASSESSMENT_ID:** FS-AI-INTERVIEW-01  
**TRAO_AI_USE:** assistive-permitted (Trao 7)

Turns a pasted job description and a company website into a personalised interview preparation kit: company brief, role breakdown, categorised questions, flashcards, and a day-by-day study schedule. You can edit the kit, regenerate one section without losing hand-edits, and practise flashcards with confidence tracking.

---

## Project overview and tech stack

| Layer | Choice | Justification |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 | Matches the brief’s preferred frontend; App Router keeps auth/kit pages simple; Tailwind for a fast functional UI |
| Backend | Node.js + Express 5 + TypeScript (`tsx`) | Preferred stack; clear split between HTTP routes and the generation pipeline |
| Database | MongoDB (Mongoose) + `connect-mongo` sessions | Preferred; flexible kit documents and durable cookie sessions |
| LLM | Google Gemini via `@google/generative-ai` | Free-tier capable; JSON response mode; no paid OpenAI dependency |
| Scraping | `fetch` + Cheerio + `robots-parser` | TypeScript/JS-only as required; no headless browser; works with local evaluate fixtures |
| Validation | Zod | Shared kit schema for API + batch evaluate output |

**No intentional deviations** from the brief’s preferred stack (Next.js, Node/Express/TS, MongoDB, JS-only scraping). Gemini was chosen over other free LLMs for JSON mode and a simple official SDK.

### Layout

```
/
  package.json          # root: npm run evaluate, dev helpers
  README.md             # this document
  backend/              # Express API + research/generation pipeline
  frontend/             # Next.js UI (auth, kits, practice)
```

---

## Setup instructions

### Prerequisites

- Node.js 20+
- MongoDB running locally **or** a MongoDB Atlas URI
- A [Google AI Studio](https://aistudio.google.com/) API key (`GEMINI_API_KEY`)

### Local install and run

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
# Edit backend/.env — set at least:
#   GEMINI_API_KEY=...
#   MONGODB_URI=mongodb://localhost:27017/interview-kit
#   SESSION_SECRET=<long-random-string>
#   FRONTEND_ORIGIN=http://localhost:3000

cp frontend/.env.example frontend/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000

# 2. Install
npm install --prefix backend
npm install --prefix frontend

# 3. Run (two terminals)
npm --prefix backend run dev     # API on http://localhost:4000
npm --prefix frontend run dev    # UI on http://localhost:3000
```

Open `http://localhost:3000`, register, create a kit (JD + company URL + days).

### Environment variables

**Backend (`backend/.env`)**

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `4000`) |
| `MONGODB_URI` | Mongo connection string |
| `SESSION_SECRET` | Cookie session signing secret |
| `GEMINI_API_KEY` | Google AI Studio key (**required**) |
| `GEMINI_MODEL` | Preferred model id (default `gemini-flash-latest`) |
| `FRONTEND_ORIGIN` | CORS + cookie origin (e.g. `http://localhost:3000`) |
| `ALLOW_LOCAL_URLS` | Set `1` only for evaluate against localhost fixtures; omit/`0` in production |
| `NODE_ENV` | `production` enables secure cross-site cookies |

**Frontend (`frontend/.env.local`)**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:4000`) |

### Deployed setup

Suggested split (independent deploys):

1. **MongoDB Atlas** — create a cluster; copy the URI into backend env.
2. **Backend** (Render / Railway / Fly) — root `backend/`, start `npm start`, set all backend env vars, set `FRONTEND_ORIGIN` to the Vercel URL, `NODE_ENV=production`.
3. **Frontend** (Vercel) — root `frontend/`, set `NEXT_PUBLIC_API_URL` to the public backend URL.

After deploy: open the frontend URL, register, and create a kit the same way as local.

### Batch entry point (exact commands)

Same pipeline as the web app. From a **clean clone**:

```bash
npm install --prefix backend
cp backend/.env.example backend/.env
# set GEMINI_API_KEY (and MONGODB_URI is unused by evaluate — pipeline is in-process)

ALLOW_LOCAL_URLS=1 npm run evaluate -- --input cases.json --output kits.json
```

Equivalent:

```bash
ALLOW_LOCAL_URLS=1 npm --prefix backend run evaluate -- --input cases.json --output kits.json
```

**Input** (`cases.json`): JSON array of `{ "id", "jd", "company_url", "days" }`.

**Output** (`kits.json`): Appendix B shape —

```json
{
  "version": "1.0",
  "generated_at": "<ISO-8601>",
  "kits": [
    { "id": "...", "status": "ok", "kit": { ... }, "error": null },
    { "id": "...", "status": "failed", "kit": null, "error": { "code": "...", "message": "..." } }
  ]
}
```

Partial research (e.g. crawl skipped) still yields `status: "ok"` with an honest brief. `failed` only when no kit could be produced.

---

## LLM provider and model

| | |
|---|---|
| **Provider** | Google Generative AI (Gemini) |
| **SDK** | `@google/generative-ai` |
| **Preferred model** | `gemini-flash-latest` (env `GEMINI_MODEL`) |
| **Fallbacks** | On 404/503 the client also tries `gemini-3.7-flash` and `gemini-3.1-flash-lite` |
| **Mode** | JSON (`responseMimeType: application/json`), temperature `0.3` |
| **Resilience** | Global request lock (one call at a time), 60s timeout, exponential backoff on 429/503/quota, model rotation on “no longer available” / high demand |

Free-tier models change often; prefer `gemini-flash-latest` and keep fallbacks in `backend/src/llm/gemini.ts`.

---

## High-level architecture

```
Browser (Next.js)
    │  cookie session (sid)
    ▼
Express API (auth, kits CRUD, regenerate, practice)
    │
    ├── MongoDB  (users, kitdocs, sessions)
    │
    └── Pipeline (also used by `npm run evaluate`)
            extract → crawl → discuss → brief
                 → questions×4 → coverage → gap pass
                 → flashcards → schedule
                        │
                        ▼
                   Gemini JSON
```

- **Frontend** owns UX only; all generation runs on the backend.
- **Web kits** are stored per user with async job progress (`queued` → `researching` → `generating` → `ready` / `failed`).
- **Evaluate** calls `generateKit` directly (no HTTP, no DB) and writes the batch JSON file.

---

## Retrieval approach and sources

| Source | How | Notes |
|---|---|---|
| **Company site** (user URL) | `fetch` homepage → Cheerio extract text/links → score same-origin links (careers, hiring, about, handbook, …) → fetch top pages | Respects `robots.txt`; truncates oversized HTML; skips non-HTML / unsafe hosts |
| **Public discussion** | [HN Algolia](https://hn.algolia.com/api) `search?query="{company} interview"` | No Glassdoor / LinkedIn scrape |
| **Job description** | User paste (trusted as *input*, treated as untrusted *content* for the model) | Wrapped with “UNTRUSTED DATA” delimiters |

**Safety:** `urlGuard` blocks private/loopback/metadata IPs in production. Set `ALLOW_LOCAL_URLS=1` only for local fixture evaluates. Retries with backoff on HTTP 429/5xx.

---

## Research and generation sequence

Orchestrated in `backend/src/pipeline/index.ts`. Progress callbacks update the kit’s `steps[]` for the UI.

| Step | Owner | Responsibility |
|---|---|---|
| **1. Extract** | LLM | Pull title, seniority, location, company, responsibilities, and requirements (`must`/`nice`, `technical`/`behavioural`/`domain`) **only** from the JD — no invented skills |
| **2. Crawl** | Code | Fetch company site pages under robots/size/SSRF rules; return pages + skip reasons |
| **3. Discuss** | Code | Query HN Algolia for public interview threads |
| **4. Brief** | LLM | Factual company summary + “what they do” from retrieved pages; honest fallback if crawl empty |
| **5. Questions** | LLM ×4 | Separate calls for `technical`, `behavioural`, `system-design`, `company-fit`; link each question to `requirement_ids`; hiring text shapes prompts when present |
| **6. Coverage** | Code | List must-have requirement ids with no linked question |
| **7. Coverage pass 2** | LLM + code | Generate gap questions for uncovered musts; re-check (max **2** passes total) |
| **8. Flashcards** | LLM (+ code fallback) | Cards from must-haves / harder questions; if the model returns nothing, one card per must-have is synthesised |
| **9. Schedule** | Code only | Deterministic day allocation (see below) — never delegated to the LLM |
| **10. Validate** | Zod | Ensure schedule refs exist and day count matches `days_available` |

Untrusted JD/page text is never treated as model instructions. Question parsing tolerates alternate JSON shapes and remaps fuzzy `requirement_ids` so empty categories are rarer under flaky free-tier models.

---

## Generated, edited, and pinned state

Questions and flashcards may carry:

| Field | Values | Meaning |
|---|---|---|
| `origin` | `"generated"` \| `"user"` | Created by the pipeline vs added by the user |
| `edited` | `boolean` | User changed the item after generation |

**Pinned** (kept across category regenerate) =

```ts
origin === "user" || edited === true
```

Implemented as `isPinned()` in `backend/src/schema.ts`. Regenerating `questions:<category>` keeps pinned items in that category and merges new generated questions (duplicate prompts skipped).

---

## How the schedule is allocated

Pure code in `backend/src/schedule.ts` (`allocateSchedule`):

1. Sort questions: those covering **must** requirements first, then higher **difficulty**.
2. Distribute into exactly `days` buckets (round-robin if enough questions; otherwise fill remaining days by reuse).
3. Ensure every must-have id appears at least once (append missing coverage to day 1 if needed).
4. Per day: unique `question_ids`, a short `focus` string from dominant category, `minutes = max(15, count × 20)`.
5. Empty question set → still emit `days` placeholder days (read JD / review notes).

Not LLM-generated, so day count and must coverage stay deterministic and testable.

---

## Creative feature: Weak spots

Practice mode records **confidence 1–5** per flashcard (`POST /kits/:id/practice`).

- Cards rated **1–2** appear in a **Weak spots** panel so the next session prioritises real gaps.
- Next-card order: **unseen first**, then **lowest confidence**.

This is product-facing study UX on top of the required kit; it does not change the batch evaluate schema.

---

## Key design decisions, trade-offs, and limitations

**Decisions**

- **Separate web app and batch CLI** sharing one `generateKit` pipeline — one behaviour for graders and users.
- **Serial Gemini lock + model fallbacks** — free tier rate limits and model deprecations (404/503) are common; throughput is sacrificed for reliability.
- **Cheerio crawl, not a browser** — meets JS-only constraint; fails on heavy client-rendered pages (mitigated by JD + HN + honest empty brief).
- **Code for coverage + schedule** — graders can trust must-coverage and day counts without model variance.
- **Pinned = user origin or edited** — regenerate without wiping human work.

**Trade-offs**

| Choice | Upside | Cost |
|---|---|---|
| Serial LLM calls | Fewer TPM failures | Kit generation can take several minutes |
| Truncate large HTML | Survives marketing sites >1MB | May miss deep page content |
| HN-only discussion | Legal/simple | Sparse for many companies |
| Free Gemini | $0 for evaluate | Model ids and capacity change; empty JSON still possible |

**Known limitations**

- SPA-heavy company sites may yield thin crawl text.
- Free-tier Gemini latency/503s can slow or thin question/flashcard batches (retries + fallbacks help but are not guarantees).
- No multi-user sharing; kits are per account.
- Schedule reuses questions when `days > question count`.
- Cross-origin production cookies need `NODE_ENV=production` and a correct `FRONTEND_ORIGIN`.

---

## API surface (reference)

| Method | Path | Notes |
|---|---|---|
| `POST` | `/auth/register`, `/auth/login` | Session cookie |
| `POST` | `/auth/logout` | |
| `GET` | `/auth/me` | |
| `GET`/`POST` | `/kits` | List / create (async generate) |
| `POST` | `/kits/batch` | Multi-create from UI upload |
| `GET`/`PATCH` | `/kits/:id` | Read / save edited kit |
| `POST` | `/kits/:id/regenerate` | `company_brief`, `questions:<cat>`, `schedule` |
| `POST` | `/kits/:id/practice` | `{ flashcard_id, confidence }` |
| `GET` | `/health` | Liveness |
