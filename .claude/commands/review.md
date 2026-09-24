# Code review

Review all changed files against the project rules before shipping.

## Usage
/review

## What to check

Run `git diff main --name-only` to identify changed files, then review each one against this checklist:

### Strings & i18n
- [ ] No hardcoded user-facing strings — every text goes through `t("key")`
- [ ] New translation keys added to ALL THREE files: `en.json`, `he.json`, `fr.json`
- [ ] No missing keys (key used in `.tsx` but not in all locale files)

### Styling
- [ ] CSS Modules only — no `style={{}}` inline props for layout or visuals
- [ ] No hardcoded hex colors — only `var(--bg)`, `var(--text)`, `var(--accent)`, `var(--border)`, etc.
- [ ] Every new page wrapper has `max-width: 1180px; margin: 0 auto; padding: 0 1.1rem 4rem;`
- [ ] One `Foo.module.css` per `Foo.tsx` — no sharing CSS files across components

### Header
- [ ] `direction: ltr` still present on `.header` — never removed
- [ ] No emoji in nav or header — SVG icons only
- [ ] Language toggle only in header actions bar, not in avatar dropdown

### TypeScript
- [ ] No implicit `any`
- [ ] No `string | null` passed where `string | undefined` is expected — coerce with `?? undefined`
- [ ] `npm run build` passes with no errors

### Components
- [ ] Sub-components used only inside one page are file-local (not exported)
- [ ] `CVUploadModal.selectedCvId` receives `string | undefined`, coerced with `selectedId ?? undefined`

### New dependencies (if `package.json` changed)
- [ ] Not already available via React, Vite, or an existing installed package
- [ ] Size checked on bundlephobia.com — flagged if minified+gzipped > 10 kB
- [ ] Tree-shakeable (check "has side effects: false" on bundlephobia)
- [ ] Actively maintained (recent publish, healthy weekly downloads)
- [ ] No polyfills for things modern browsers already support

## Output format
- **[BLOCK]** — must fix before merging (TS errors, hardcoded strings, missing locale keys, broken layout)
- **[WARN]** — should fix (hardcoded color, missing CSS variable, oversized dependency)
- **[NOTE]** — optional improvement (naming, readability)

If nothing to report: "✓ No issues found."
