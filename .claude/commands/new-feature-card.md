# New feature card on CoachPage

Add a new AI feature to the CoachPage dashboard (alongside "Analyse mon CV" and "Trouver des offres").

## Usage
/new-feature-card <featureKey> <icon>

Example: /new-feature-card interviewPrep ◎

## Steps

### 1. Add translation keys (all 3 locale files)
```json
"feature<Key>Title": "...",
"feature<Key>Desc": "...",
"feature<Key>Cta": "...",
```

### 2. Extend the type in `src/pages/CoachPage.tsx`
```ts
type ActiveFeature = "review" | "match" | "<featureKey>" | null;
```

### 3. Add the card to the feature grid (inside `{isReady && !active && ...}` block)
```tsx
<button className={styles.featureCard} onClick={() => setActive("<featureKey>")}>
  <div className={styles.featureIcon}><icon></div>
  <h3 className={styles.featureTitle}>{t("coach.feature<Key>Title")}</h3>
  <p className={styles.featureDesc}>{t("coach.feature<Key>Desc")}</p>
  <span className={styles.featureCta}>{t("coach.feature<Key>Cta")}</span>
</button>
```
Also add the disabled version in the `{!isReady}` block.

### 4. Create a `<Key>Feature` sub-component (file-local, not exported)
Pattern: same as `ReviewFeature` / `MatchFeature` — auto-launch on mount via `useEffect([], run)`, back button calls `onBack()`.

### 5. Render it in the active feature section
```tsx
{active === "<featureKey>" && (
  <KeyFeature cv={cvText} onBack={() => setActive(null)} />
)}
```

### 6. Update featureGrid CSS if needed
Current grid: `grid-template-columns: 1fr 1fr`. For 3 cards consider: `repeat(auto-fill, minmax(280px, 1fr))`.
