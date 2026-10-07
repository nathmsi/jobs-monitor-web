import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const BRAND = "Tech Jobs";

/** Sets `document.title` to "<translated page title> — Tech Jobs". */
export function useDocumentTitle(titleKey: string): void {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = `${t(titleKey)} — ${BRAND}`;
  }, [t, titleKey]);
}
