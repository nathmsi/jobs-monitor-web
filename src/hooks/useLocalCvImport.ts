import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useProfile } from "../providers/profile/useProfile";
import { analyzeCv } from "../utils/cvAnalysis";

/** A CV shorter than this is not worth analysing (matches the editor's rule). */
export const MIN_CV_LENGTH = 50;

/**
 * Builds the user's profile from a CV **in the browser**: no account, no upload.
 * The PDF is read with pdf.js and the text analysed locally; only the extracted
 * profile (skills, roles…) is saved on this device — never the CV itself.
 */
export function useLocalCvImport() {
  const { t } = useTranslation();
  const { saveProfile } = useProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromText = (raw: string): boolean => {
    const text = raw.trim();
    if (text.length < MIN_CV_LENGTH) {
      setError(t("cvImport.tooShort"));
      return false;
    }
    const profile = analyzeCv(text);
    if (profile.skills.length === 0) {
      setError(t("cvImport.noSkills"));
      return false;
    }
    saveProfile(profile);
    setError(null);
    return true;
  };

  const fromFile = async (file: File): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const { extractPdfText } = await import("../utils/pdf");
      return fromText(await extractPdfText(file));
    } catch {
      setError(t("cvImport.pdfError"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, fromFile, fromText, clearError: () => setError(null) };
}
