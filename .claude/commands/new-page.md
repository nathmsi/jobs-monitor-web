# New page

Scaffold a new page following project conventions.

## Usage
/new-page <PageName> <route>

Example: /new-page SettingsPage /settings

## Steps
1. Create `src/pages/<PageName>.tsx`:
   - Import `Header` from `../components/Header/Header`
   - Import `useTranslation` and use `t()` for all strings
   - Wrap content in `<div className={styles.app}>` (max-width 1180px)
   - Include `<Header />` at the top, `<footer className={styles.footer}>{t("footer")}</footer>` at the bottom

2. Create `src/pages/<PageName>.module.css`:
   - `.app { max-width: 1180px; margin: 0 auto; padding: 0 1.1rem 4rem; }`
   - `.page { padding: 2rem 0; }`

3. Add the route in `src/App.tsx` (or wherever routes are defined).

4. Add nav translation key `nav.<pageName>` to all three locale files if it appears in the header.

## Template
```tsx
import { useTranslation } from "react-i18next";
import { Header } from "../components/Header/Header";
import styles from "./<PageName>.module.css";

export function <PageName>() {
  const { t } = useTranslation();
  return (
    <div className={styles.app}>
      <Header />
      <div className={styles.page}>
        <h1>{t("<page>.title")}</h1>
      </div>
      <footer className={styles.footer}>{t("footer")}</footer>
    </div>
  );
}
```
