import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Cv } from "./cvs";

/** PDF → text → saved CV, with busy/error state for the upload modal. */
export function useCvUpload(addCv: (name: string, text: string) => Promise<Cv | null>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const { extractPdfText } = await import("./pdf");
      const text = await extractPdfText(file);
      const name = file.name.replace(/\.pdf$/i, "").slice(0, 60) || t("coach.defaultCvName");
      const cv = await addCv(name, text);
      if (!cv) throw new Error("save failed");
      return true;
    } catch {
      setError(t("coach.pdfError"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, upload };
}
