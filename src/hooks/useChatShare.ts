import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ChatShared } from "../api/chat";
import { useProfile } from "../providers/profile/useProfile";
import { toChatCvs, toChatProfile } from "../utils/chatProfile";
import { useCvs, type Cv } from "./useCvs";
import { useLocalCvImport } from "./useLocalCvImport";

/** A PDF this big is not a CV; pdf.js would spend long on it. */
export const MAX_CV_FILE_BYTES = 8 * 1024 * 1024;

type Attached = Pick<Cv, "id" | "name" | "text">;

/**
 * What the user lets the assistant see: their CV profile and their CVs (saved ones, and one
 * attached in the chat). A CV attached here is read in the browser, like on the Profile page:
 * its profile is saved on this device, the PDF is never uploaded. What is shared leaves the
 * browser only with a question, and only while the switch is on.
 */
export function useChatShare(enabled: boolean, setEnabled: (on: boolean) => void) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { cvs } = useCvs();
  const { error: importError, fromText, clearError } = useLocalCvImport();

  const [attached, setAttached] = useState<Attached | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const chatProfile = useMemo(() => toChatProfile(profile), [profile]);
  const chatCvs = useMemo(() => toChatCvs(attached ? [attached, ...cvs] : cvs), [attached, cvs]);
  const available = chatProfile !== null || chatCvs.length > 0;

  const payload = useMemo<ChatShared | null>(
    () => (enabled && available ? { profile: chatProfile, cvs: chatCvs } : null),
    [enabled, available, chatProfile, chatCvs],
  );

  const attach = useCallback(
    async (file: File) => {
      clearError();
      setNotice(null);
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setProblem(t("chat.cvNotPdf"));
        return;
      }
      if (file.size > MAX_CV_FILE_BYTES) {
        setProblem(t("chat.cvTooBig"));
        return;
      }
      setProblem(null);
      setAttaching(true);
      try {
        const { extractPdfText } = await import("../utils/pdf");
        const text = await extractPdfText(file);
        if (fromText(text)) {
          setAttached({ id: "attached", name: file.name, text });
          setEnabled(true);
          setNotice(t("chat.cvAdded", { name: file.name }));
        }
      } catch {
        setProblem(t("cvImport.pdfError"));
      } finally {
        setAttaching(false);
      }
    },
    [clearError, fromText, setEnabled, t],
  );

  return {
    available,
    enabled,
    setEnabled,
    payload,
    skillCount: chatProfile?.skills.length ?? 0,
    cvCount: chatCvs.length,
    attach,
    attaching,
    error: problem ?? importError,
    notice,
  };
}

export type ChatShareController = ReturnType<typeof useChatShare>;
