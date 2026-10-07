# Unit & integration tests (Vitest)

```bash
pnpm test:unit          # fast, isolated: pure logic, hooks, single components
pnpm test:integration   # real providers + real pages, mocked network/Supabase
pnpm test               # both
```

End-to-end browser tests live in `e2e/` (see `e2e/README.md`).

## The three levels

| Level | Where | What is real | What is faked | Use it for |
| --- | --- | --- | --- | --- |
| **Unit** | next to the code (`Foo.test.ts(x)`) | the unit under test | everything it imports | pure functions (`utils/`), hooks, a single component, storage guards |
| **Integration** | `src/test/integration/*.integration.test.tsx` | pages, providers, router, i18n, react-query, hooks | the HTTP client (`mockBackend`) and Supabase (`fakeSupabase`) | user flows inside a page, provider ↔ Supabase behaviour, routing |
| **E2E** | `e2e/tests/<page>/` | the built app in Chromium | the HTTP API (route mocks) | what a user sees end to end, URL/localStorage contract, real browser behaviour |

Rule of thumb: logic without React → unit; "when the user does X on this page
Y happens" → integration; "is the whole thing wired and does it work in a real
browser" → e2e. Don't test the same thing at all three levels.

## Helpers (`src/test/`)

- `setup.ts` — jest-dom matchers, RTL cleanup, `localStorage.clear()` before each
  test, `matchMedia` stub for jsdom. Loaded by `vite.config.ts`.
- `renderWithProviders(ui, { route })` — the provider stack of `main.tsx`
  (query, theme, auth, profile, preferences, saved jobs, job flags, toast,
  `MemoryRouter`). Returns RTL's result plus a `userEvent` instance and the
  `queryClient`. A `data-testid="location"` element shows the current URL.
- `mockBackend({ jobs, sources })` — in-memory implementation of the API client
  that honours `q`, `kind`, `sort`, `limit`/`offset`; returns the spies.
- `fakeSupabase` — in-memory `from(table).select/insert/upsert/delete` with
  `eq/match/order/single/maybeSingle`. `seed()`, `fail(table, op)`, `calls`,
  `reset()`. Mock the module with
  `vi.mock("../../services/supabase", async () => ({ supabase: (await import("../fakeSupabase")).fakeSupabase, supabaseEnabled: true }))`
  and the signed-in user with `vi.mock("…/providers/auth/useAuth")`.
- `factories.ts` — `makeJob`, `makeSource`, `SOURCES`, `REGIONS`, `CV_PROFILE`.

## Conventions

- Query by role/label/text like a user would; avoid test ids and class names.
- `userEvent` (not `fireEvent`); `findBy*`/`waitFor` for anything async. React
  Query notifies observers asynchronously — assert with `waitFor`.
- Create **one `QueryClient` per test** and reuse it across re-renders.
- Supabase is disabled in tests (`env` in `vite.config.ts`): never reach the network.
- Keep tests deterministic: fake timers for debounce, no real sleeps.
