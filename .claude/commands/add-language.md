# Add language

Add a new language to the app (i18n + UI toggle).

## Usage
/add-language <code> <label> <rtl?>

Example: /add-language es "ES" false
Example (RTL): /add-language ar "AR" true

## Steps
1. Create `src/i18n/locales/<code>.json` — copy `en.json` as base, translate all values.

2. In `src/i18n/index.ts`:
   - `import <code> from "./locales/<code>.json";`
   - Add `<code>` to `SUPPORTED_LANGUAGES` array
   - Add `<code>: { translation: <code> }` to `resources`
   - If RTL: add `"<code>"` to `RTL_LANGUAGES`

3. In all existing locale files (`en.json`, `he.json`, `fr.json`, ...):
   - Add `"<code>": "<LABEL>"` under the `lang` object

4. The header language toggle auto-renders from `SUPPORTED_LANGUAGES` — no other changes needed.

## RTL note
Adding a code to `RTL_LANGUAGES` makes `document.dir = "rtl"` switch automatically.
The header is immune to RTL (it has `direction: ltr`) — no extra work needed there.
