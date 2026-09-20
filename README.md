# The AI Interview Prep Kit

Turns a pasted job description and a company website into a personalised interview preparation kit: company brief, role breakdown, categorised questions, flashcards, and a day-by-day study schedule. You can edit the kit, regenerate one section without losing hand-edits, and practise flashcards with confidence tracking.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS | Preferred in the brief; fast UI for builder/practice |
| Backend | Node.js + Express + TypeScript | Preferred; clear separation of pipeline vs HTTP |
| Database | MongoDB | Preferred; flexible kit documents + session store |
| LLM | Google Gemini (`gemini-2.0-flash`) free tier | Free tier; JSON mode; rate-limit handling in our client |
| Scraping | `fetch` + Cheerio + robots-parser | JS-only (brief: TypeScript/JS only); works for local evaluate fixtures without browsers |

Frontend and backend are separate apps so they deploy independently (Vercel + Render).

## Layout

```
/
  package.json          # npm run evaluate only
  backend/              # Express API + pipeline
  frontend/             # Next.js UI
```

## Setup (local)

```bash
# MongoDB running locally or Atlas URI in backend/.env

cp backend/.env.example backend/.env
# set GEMINI_API_KEY, MONGODB_URI, SESSION_SECRET

cp frontend/.env.example frontend/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000

npm install --prefix backend
npm install --prefix frontend

npm --prefix backend run dev    # :4000
npm --prefix frontend run dev   # :3000
```

### Environment variables

**Backend (`backend/.env`)**

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `MONGODB_URI` | Mongo connection string |
| `SESSION_SECRET` | Cookie session signing secret |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMINI_MODEL` | Model id (default `gemini-2.0-flash`) |
| `FRONTEND_ORIGIN` | CORS + cookie origin (e.g. `http://localhost:3000`) |
| `ALLOW_LOCAL_URLS` | Set `1` only for evaluate against localhost fixtures; omit/0 in production |
| `NODE_ENV` | `production` enables secure cross-site cookies |

**Frontend (`frontend/.env.local`)**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL |

## Batch entry point (mandatory)

Same pipeline as the web app. From a clean clone:

```bash
npm install --prefix backend
cp backend/.env.example backend/.env   # set GEMINI_API_KEY
ALLOW_LOCAL_URLS=1 npm run evaluate -- --input cases.json --output kits.json
```

Input: array of `{ id, jd, company_url, days }`.  
Output: Appendix B shape (`version`, `generated_at`, `kits[]` with `ok` / `failed`). Partial research is still `ok`; `failed` only when no kit could be produced.

## Architecture

1. **Extract** — LLM pulls requirements from the JD only (no invented skills).
2. **Crawl** — fetch homepage, score same-origin links, fetch top candidates; respect robots.txt; skip/report failures.
3. **Discuss** — HN Algolia search for `"{company} interview"` (no Glassdoor scrape).
4. **Brief** — LLM company brief from retrieved pages (honest if empty).
5. **Questions** — separate LLM calls per category (`technical`, `behavioural`, `system-design`, `company-fit`); hiring text shapes prompts when found.
6. **Coverage (code)** — must-have requirements without a question → gap list.
7. **Second pass** — generate missing questions; re-check (max 2 passes).
8. **Flashcards** — LLM from requirements + questions.
9. **Schedule (code)** — allocate across exactly `days`; musts and harder items earlier.

Untrusted JD/page text is wrapped and instructed as data, never as model instructions. Gemini calls are serialised with exponential backoff on 429/TPM limits.

## Generated / edited / pinned state

Questions and flashcards may carry:

- `origin: "generated" | "user"`
- `edited: boolean`

Pinned = `origin === "user"` **or** `edited === true`. Regenerating a question category keeps pinned items and merges new generated ones.

## Schedule allocation

Pure code in `backend/src/schedule.ts`: sort by must-coverage then difficulty, round-robin into N days, ensure every must appears, integer minutes. Not delegated to the model.

## Retrieval sources

- Company site (user-provided URL): homepage + ranked internal links (careers/hiring/about/handbook signals).
- Public discussion: [HN Algolia](https://hn.algolia.com/api) only.
- Respect robots.txt; rate-limit and back off on 429/5xx; reject private/loopback URLs in production (`ALLOW_LOCAL_URLS` for evaluate).

## Creative feature: Weak spots

Practice mode records confidence 1–5 per flashcard. Cards rated 1–2 appear in a **Weak spots** panel so the next study session prioritises what actually hurts. Ordering for the next card: unseen first, then lowest confidence.

