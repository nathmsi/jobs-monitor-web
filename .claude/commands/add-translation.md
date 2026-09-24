# Add translation key

Add a new i18n key to all three locale files simultaneously.

## Usage
/add-translation <key> <en> <fr> <he>

Example: /add-translation coach.newFeature "New feature" "Nouvelle fonctionnalité" "תכונה חדשה"

## Steps
1. Parse the key (dot-notation, e.g. `coach.newFeature`)
2. Insert the value under the correct nested object in:
   - `src/i18n/locales/en.json`
   - `src/i18n/locales/fr.json`
   - `src/i18n/locales/he.json`
3. Confirm the key is reachable with `t("coach.newFeature")` in any component.

## Rules
- Never add a key to only one file — all three at once, always.
- Respect the existing key structure (nested objects, not flat).
- For arrays (e.g. loadingSteps), add as JSON array in all three files.
