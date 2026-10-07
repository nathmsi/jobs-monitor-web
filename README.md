# Tech Jobs (jobs-monitor-web)

Frontend for browsing job offers from Israeli tech companies and staffing
agencies, analysing your CV and matching offers to your profile.
React 19 + TypeScript + Vite, react-query, react-router, i18next (EN / FR / HE with RTL).

The API lives in a separate repo: **jobs-monitor-api**. Auth and per-user data
(saved offers, CVs, profile, preferences) use Supabase; everything also works
signed-out, persisted in `localStorage`.

## Features

- Offers browser: whole-word search over title, description, location and company
  (aliases like front-end/k8s; "mobile" finds iOS/Android), several roles at once,
  best-match sorting, active-filter chips with a result count, pagination,
  "hide offers I've seen"; state kept in the URL so views are shareable.
  Search runs in jobs-monitor-api (see its ARCHITECTURE.md).
- Light offer cards: bookmark to save (then mark as applied), per user or per device when signed out.
- **For me**: offers ranked against your CV profile.
- **CV Coach** (sign-in): upload a PDF, get an AI review, find matching offers.
- **Profile**: CV-derived skills/roles, job preferences, appearance (system / light / dark).
- English, French, Hebrew (right-to-left, header always LTR).

## Setup

```bash
pnpm install
cp .env.example .env     # VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
pnpm dev                 # http://localhost:5173
```

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8080` | Base URL of jobs-monitor-api |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | — | Optional. Without them auth is off and the app is localStorage-only |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm preview` | dev server / typecheck + production build / preview |
| `pnpm lint` | oxlint |
| `pnpm test:unit` | Vitest, isolated unit tests (colocated in `src/`) |
| `pnpm test:integration` | Vitest, pages + real providers with mocked network/Supabase |
| `pnpm test:e2e` | Playwright, browser tests per page (`e2e/`) |
| `pnpm test:all` | all of the above tests |

CI (`.github/workflows/ci.yml`): lint → typecheck/build → unit + integration →
Playwright → deploy to Vercel (main only).

## Project structure

```
src/
├── main.tsx · App.tsx          # providers + routes (non-home pages are lazy-loaded)
├── pages/                      # route components: JobsPage, ProfilePage, CoachPage
├── components/<Name>/          # UI; <Name>.tsx + <Name>.module.css (+ test)
├── providers/<name>/           # React context state, one folder each:
│   │                           #   <Name>Context.ts  context + types
│   │                           #   <Name>Provider.tsx  component only
│   │                           #   use<Name>.ts  the hook
│   └── auth · theme · toast · jobFlags · savedJobs · profile · preferences
├── hooks/                      # useCvs, useCvUpload, useDocumentTitle, useJobsUrlState
├── api/                        # HTTP client, react-query hooks, match stream
├── services/supabase.ts        # Supabase client (null when not configured)
├── utils/                      # pure helpers: cvAnalysis, jobText, aiSummary, …
├── constants/ · i18n/ · types.ts · index.css
└── test/                       # test helpers + integration tests (see src/test/README.md)
e2e/                            # Playwright: fixtures, page objects, specs per page (see e2e/README.md)
```

Conventions are in `CLAUDE.md` (strings via `t()`, CSS Modules only, tests required for functional changes).
