# New component

Scaffold a new shared component following project conventions.

## Usage
/new-component <ComponentName>

Example: /new-component JobCard

## Steps
1. Create `src/components/<ComponentName>/<ComponentName>.tsx`
2. Create `src/components/<ComponentName>/<ComponentName>.module.css`
3. Export the component (named export, not default)

## Rules
- Use `useTranslation()` for any user-visible text
- Use CSS Modules (`styles.className`) — no inline styles, no Tailwind
- Use CSS variables for all colors: `var(--text)`, `var(--bg-elevated)`, `var(--accent)`, etc.
- No default exports

## Template
```tsx
// src/components/<ComponentName>/<ComponentName>.tsx
import { useTranslation } from "react-i18next";
import styles from "./<ComponentName>.module.css";

interface <ComponentName>Props {
  // ...
}

export function <ComponentName>({ ... }: <ComponentName>Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.root}>
      {/* ... */}
    </div>
  );
}
```

```css
/* src/components/<ComponentName>/<ComponentName>.module.css */
.root {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
}
```
