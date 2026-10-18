# Tests

One rule: **the level of a test is told by its place and its extension, never by a suffix.**

```bash
pnpm test                # unit + component + integration (Vitest, 3 projects)
pnpm test:unit           # logic, no React            ┐
pnpm test:component      # one component or hook      ├ run each alone while you work
pnpm test:integration    # a page or a flow           ┘
pnpm test:e2e            # the real app in Chromium (Playwright, see e2e/README.md)
pnpm test:coverage       # Vitest + a v8 coverage report (coverage/index.html)
pnpm test:all            # everything
```

## Where a test goes

```
src/**/Foo.test.ts         UNIT        a function, a reducer, a model, a hook of pure logic. Next to Foo.ts.
src/**/Foo.test.tsx        COMPONENT   one component or hook with Testing Library. Next to Foo.tsx.
api/**/*.test.ts           UNIT        the Vercel functions.
tests/integration/<feature>/<name>.test.tsx
                           INTEGRATION a page or a user flow: real providers, router, i18n, react-query; the
                                       network (mockBackend) and Supabase (fakeSupabase) are faked.
tests/support/             shared by every level — see below
e2e/tests/<feature>/       E2E         a real browser, the API mocked at the HTTP level (Playwright)
```

Feature folders have the same names everywhere (`chat`, `jobs`, `profile`, `coach`, `home`, `search`,
`account`, `app`), so one subject is easy to follow from a unit test to its e2e spec. For the chat:
`src/components/Chat/**` (models, actions, views), `tests/integration/chat/`, `e2e/tests/chat/`.

| Level | Real | Faked | Use it for |
|---|---|---|---|
| **Unit** `.test.ts` | the unit | everything it imports | pure logic: `utils/`, `api/`, reducers, block models, hooks that need no DOM |
| **Component** `.test.tsx` | the component, Testing Library, jsdom | its hooks/providers when that makes it simpler | one component's states and interactions; a hook with `renderHook` |
| **Integration** | pages, providers, router, i18n, react-query | the HTTP client, Supabase | "when the user does X on this page, Y happens" |
| **E2E** | the built app in Chromium | the HTTP API | is it all wired, in a real browser (URL, storage, layout, drag) |

Rule of thumb: logic without React → unit. One thing on screen → component. A page or a flow → integration.
Is it wired and does it work in a browser → e2e. **Do not test the same thing at all levels.**

## Naming

- A test file is named after what it tests: `JobCard.test.tsx` tests `JobCard`, `aiSummary.test.ts` tests
  `aiSummary.ts`. A test of several things is several files.
- No level in the name (`.component.`, `.integration.`, `.crash.`, `.malformed.`): the folder and the
  extension say it. A special case is a `describe` ("malformed profile data"), not a new file.
- `describe("<what>")` then `it("<what it does, in plain words>")`: `it("stops at the screen edges")`, not
  `it("test 3")`. Say the behaviour, not the implementation.
- Integration: `tests/integration/<feature>/<subject>.test.tsx`, one folder deep.

`tests/support/testLayout.test.ts` checks these rules, and that every test file is run by exactly one
Vitest project: a test in the wrong place fails the build instead of silently not running.

## `tests/support/`

```
support/
  setup.ts                 jest-dom matchers, RTL cleanup, storage cleared before each test, matchMedia stub
  factories.ts             makeJob, makeSource, SOURCES, REGIONS, CV_PROFILE, JOB_DEFAULTS
  render/                  renderWithProviders (the provider stack of main.tsx + MemoryRouter),
                           renderChatPart (a chat block with a spy `act`), openChat, LocationProbe
  mocks/                   apiMock (mockBackend: the API client, honouring q/kind/sort/limit…),
                           fakeSupabase, chatReplies (build the assistant's reply)
  fakeApi/                 matchesRole: the discipline rule, shared with the Playwright fake backend
```

- `renderWithProviders(ui, { route })` returns RTL's result plus `user` (userEvent) and `queryClient`; a
  `data-testid="location"` element shows the current URL.
- `mockBackend({ jobs, sources })` stubs the client (`getJobsPage`, `getJob`, `getCompany`, `getSources`…) and
  returns the spies. `fakeSupabase` is an in-memory `from(table)…`; mock the module with
  `vi.mock("…/services/supabase", async () => ({ supabase: (await import("…/fakeSupabase")).fakeSupabase, supabaseEnabled: true }))`.
- Datasets differ per level on purpose (the browser suite needs more companies and regions): what is
  shared is the **builders** (`JOB_DEFAULTS`) and the **rules** (`matchesAnyRole`), so they cannot drift.

## Conventions

- Test behaviour a user could notice, with `getByRole` / accessible names. `data-testid` only when there is
  no role (an `<output>` that shows the location).
- Never an arbitrary `sleep`: `await screen.findBy…`, `waitFor`, or a deferred promise you release.
- Every test is independent: storage and mocks are reset in `setup.ts` / `beforeEach`. A test that needs an
  order is two tests.
- Mock at the edge (the API client, Supabase, `pdf.js`), not between your own components.
- A bug fix comes with the test that fails without it, at the lowest level that can show the bug.

## Coverage

`pnpm test:coverage` prints a summary and writes `coverage/index.html` (v8, `src/` only). There is no
threshold yet: look at it, then raise the floor as holes close. Rough aims: utils and hooks 90 %,
providers 90 %, components 80 %, pages through integration.
