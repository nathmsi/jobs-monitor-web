# End-to-end tests (Playwright)

Browser tests of the whole app, one folder per page. They run against the Vite
dev server with the **backend mocked** and **Supabase disabled**, so they are
hermetic, fast and deterministic: no network, no accounts, no shared state.

```bash
pnpm test:e2e                                    # whole suite
pnpm exec playwright test e2e/tests/jobs         # one folder
pnpm exec playwright test -g "pagination"        # by title
pnpm test:e2e:ui                                 # watch / debug UI
```

## Layout

```
e2e/
├── fixtures/
│   ├── index.ts        # `test` / `expect`: auto-installs the API mock, exposes `api`
│   └── data.ts         # typed payloads: makeJob(), FRONTEND_JOB, MOCK_SOURCES, …
├── utils/
│   ├── api-mocks.ts    # stateful fake backend (q, kind, sort, limit/offset, failures)
│   └── storage.ts      # seedStorage / readStorage / STORAGE_KEYS (localStorage)
├── pages/              # Page Objects: *how* to drive a page
│   ├── BasePage.ts
│   ├── components/HeaderComponent.ts
│   ├── JobsPage.ts  ProfilePage.ts  CoachPage.ts
└── tests/              # specs: *what* the app must do, one folder per page
    ├── jobs/           browse · filters · saved-jobs · seen-offers · pagination
    │                   tabs-and-url · for-me · resilience
    ├── profile/        preferences · profile-stats · appearance · crash-regression
    ├── coach/          coach (signed-out experience)
    └── navigation/     routing · i18n-theme
```

## Rules

1. **One behaviour per test.** Name tests as sentences ("saving an offer toggles
   the button and shows a toast"). Each test is independent: it can run alone,
   in any order, in parallel.
2. **Selectors: `getByRole` / `getByLabel` / `data-testid` only.** Never CSS
   classes (they are hashed by CSS Modules). If an element has no accessible
   role or name, fix the component (that is an accessibility win) or add a
   `data-testid`.
3. **No arbitrary sleeps.** Wait on state: web-first assertions
   (`await expect(locator)…`), `expect.poll`, `page.waitForRequest`. Debounced
   search is awaited through the request it produces.
4. **Page Objects hold locators and actions, never assertions.** Specs own the
   `expect`s. Keep POMs thin: a locator or a verb (`open`, `search`,
   `saveButton(card)`).
5. **Data goes through fixtures.** Build offers with `makeJob()`; never inline
   raw JSON in a spec. Change what the API returns with
   `test.use({ dataset: { jobs: [...] } })` (per describe) or `api.setJobs()` /
   `api.failJobs()` (inside a test).
6. **Assert on the contract with the backend** via `api.jobsRequests` /
   `api.lastJobsRequest()` (what query string did the UI send?) in addition to
   what is rendered.
7. **Seed state, don't click through it.** Use `seedStorage(page, {...})`
   before `goto` for stored profile/preferences/saved offers. Read results back
   with `readStorage`.
8. **Default locale is `en-US`, light colour scheme** (playwright.config.ts) —
   assertions use the English strings. Tests about other languages switch
   language through the header.

## Adding a test

1. Find the page folder in `tests/` (or create one plus a Page Object).
2. Import `{ test, expect } from '../../fixtures'`: never from
   `@playwright/test` directly, or the API mock is not installed.
3. Drive the page through its Page Object; add a locator/verb there if missing.
4. Run it alone, then the folder, then `--repeat-each=3` to catch flakiness.

## What is *not* covered here

Signed-in flows (Supabase auth, CV library, AI review/matching) need a session,
so they are covered by the **integration tests** in `src/test/integration/`,
which run the real providers against an in-memory Supabase fake. See
`../src/test/README.md`.
