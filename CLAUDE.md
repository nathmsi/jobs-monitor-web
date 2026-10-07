# Rules

## Strings
- EVERY user-facing string must use `t("key")` from `useTranslation()`. No hardcoded text.
- When adding a key, add it to ALL THREE locale files at once: `src/i18n/locales/en.json`, `he.json`, `fr.json`.

## Styling
- CSS Modules only. One `Foo.module.css` per `Foo.tsx`. No inline `style={{}}` for layout/visuals.
- Use CSS variables: `var(--bg)`, `var(--bg-elevated)`, `var(--text)`, `var(--text-muted)`, `var(--accent)`, `var(--border)`, `var(--border-strong)`. Never hardcode hex colors.
- Every page wrapper: `max-width: 1180px; margin: 0 auto; padding: 0 1.1rem 4rem;`

## Header
- The header has `direction: ltr` — never remove it. It ensures EN/FR/HE always render brand|nav|actions left-to-right.
- No emoji in the nav or header. SVG icons only.
- Language toggle lives in header actions bar only — NOT in the avatar dropdown.

## Components
- Sub-components used only inside one page stay in the same file (not exported). See `ReviewFeature` / `MatchFeature` in `CoachPage.tsx`.
- CV upload: `selectedCvId` prop is `string | undefined`. Always coerce: `selectedCvId={selectedId ?? undefined}`.

## TypeScript
- `strict: true`. No implicit any.
- `string | null` from hooks → `string | undefined` for props: use `value ?? undefined`.
- Run `npm run build` before shipping — catches TS errors that dev mode ignores.

## Structure
- `providers/<name>/` = `<Name>Context.ts` + `<Name>Provider.tsx` (component only) + `use<Name>.ts`. Never export a hook or constant from a provider component file.
- `hooks/` reusable hooks, `utils/` pure functions, `services/` external clients, `api/` backend calls + react-query hooks. No `lib/` and no barrel `index.ts` files.
- Server state (backend, Supabase) goes through react-query; no `setState` inside `useEffect` to mirror it.
- Jobs-page state (filters/tab/sort) lives in the URL via `useJobsUrlState`.

## Tests
- Three levels, see `src/test/README.md` and `e2e/README.md`: unit (colocated, `pnpm test:unit`), integration (`src/test/integration`, `pnpm test:integration`), e2e (`e2e/tests/<page>/`, `pnpm test:e2e`).
- E2E specs import `test`/`expect` from `e2e/fixtures` (never from `@playwright/test`), drive pages through Page Objects, and assert on behaviour.

## Tests e2e (Playwright)
- Tout changement fonctionnel (feature, bugfix, refacto touchant l'UI ou un flux utilisateur) doit s'accompagner d'un test e2e ajouté ou mis à jour dans `e2e/tests/`.
- Avant de finir une tâche, lire les specs concernées, les adapter au changement, puis lancer `npm run test:e2e` et confirmer qu'ils passent.
- Conventions : Page Object Models dans `e2e/pages/`, sélecteurs `getByRole`/`data-testid` uniquement, aucun `sleep` arbitraire, chaque test indépendant et déterministe.
- Une tâche n'est pas terminée tant que `npm run test:e2e` n'est pas vert.
- Les tests unitaires Vitest (`npm run test:unit`) couvrent la logique pure — rester colocalisés dans `src/`.

## Git
- Format: `type(scope): message` — types: feat, fix, refactor, chore
