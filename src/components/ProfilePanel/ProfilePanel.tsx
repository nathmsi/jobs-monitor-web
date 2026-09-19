import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { analyzeCv, type CvProfile } from "../../lib/cvAnalysis";
import { useProfile } from "../../lib/profile";
import styles from "./ProfilePanel.module.css";

interface Props {
  onClose: () => void;
}

export function ProfilePanel({ onClose }: Props) {
  const { t } = useTranslation();
  const { profile, saveProfile, clearProfile } = useProfile();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<CvProfile | null>(profile);
  const [busy, setBusy] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const runAnalyze = (cvText: string) => {
    const result = analyzeCv(cvText);
    setDraft(result);
  };

  const onPdf = async (file: File) => {
    setBusy(true);
    try {
      const { extractPdfText } = await import("../../lib/pdf");
      const extracted = await extractPdfText(file);
      setText(extracted);
      runAnalyze(extracted);
    } catch {
      /* ignore parse errors */
    } finally {
      setBusy(false);
    }
  };

  const removeSkill = (name: string) =>
    setDraft((d) => (d ? { ...d, skills: d.skills.filter((s) => s !== name) } : d));

  const addSkill = () => {
    const s = newSkill.trim();
    if (!s || !draft) return;
    if (!draft.skills.includes(s)) setDraft({ ...draft, skills: [...draft.skills, s] });
    setNewSkill("");
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <h2 className={styles.title}>{t("profile.title")}</h2>
          <button className={styles.close} onClick={onClose} aria-label={t("profile.close")}>
            ✕
          </button>
        </header>

        <p className={styles.privacy}>🔒 {t("profile.privacy")}</p>

        <div
          className={styles.dropzone}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f && f.type === "application/pdf") onPdf(f);
          }}
        >
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("profile.placeholder")}
          />
          <div className={styles.dropRow}>
            <button
              type="button"
              className={styles.fileBtn}
              onClick={() => fileRef.current?.click()}
            >
              📄 {t("profile.dropPdf")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPdf(f);
              }}
            />
            <button
              type="button"
              className={styles.analyzeBtn}
              disabled={busy || text.trim().length < 20}
              onClick={() => runAnalyze(text)}
            >
              {busy ? t("profile.analyzing") : t("profile.analyze")}
            </button>
          </div>
        </div>

        {draft && (
          <div className={styles.result}>
            <div className={styles.metaRow}>
              {draft.seniority && (
                <span className={styles.metaPill}>
                  {t("profile.seniority")}: <strong>{draft.seniority}</strong>
                </span>
              )}
              {draft.years != null && (
                <span className={styles.metaPill}>
                  {t("profile.years")}: <strong>{t("profile.yearsValue", { count: draft.years })}</strong>
                </span>
              )}
              {draft.languages.length > 0 && (
                <span className={styles.metaPill}>
                  {t("profile.languages")}: <strong>{draft.languages.join(", ")}</strong>
                </span>
              )}
            </div>

            <div className={styles.blockLabel}>
              {t("profile.skills")} ({draft.skills.length})
            </div>
            <div className={styles.chips}>
              {draft.skills.map((s) => (
                <span key={s} className={styles.chip}>
                  {s}
                  <button
                    className={styles.chipX}
                    onClick={() => removeSkill(s)}
                    aria-label={`remove ${s}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              {draft.skills.length === 0 && (
                <span className={styles.muted}>—</span>
              )}
            </div>
            <div className={styles.addRow}>
              <input
                className={styles.addInput}
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill()}
                placeholder={t("profile.addSkill")}
              />
              <button className={styles.addBtn} onClick={addSkill}>
                +
              </button>
            </div>
          </div>
        )}

        <footer className={styles.foot}>
          {profile && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                clearProfile();
                setDraft(null);
                setText("");
              }}
            >
              {t("profile.clear")}
            </button>
          )}
          <button
            className={styles.saveBtn}
            disabled={!draft || draft.skills.length === 0}
            onClick={() => {
              if (draft) saveProfile(draft);
              onClose();
            }}
          >
            {t("profile.save")}
          </button>
        </footer>
      </div>
    </div>
  );
}
