import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ROLES } from "../../constants/roles";
import { analyzeCv, type CvProfile } from "../../lib/cvAnalysis";
import { useProfile } from "../../lib/profile";
import styles from "./ProfileEditor.module.css";

const SENIORITY_OPTIONS = [
  "Junior",
  "Mid-level",
  "Senior",
  "Lead",
  "Staff",
  "Principal",
  "Architect",
];

/**
 * Full CV / profile editor: paste or drop a CV, analyze it locally, then edit
 * the extracted skills, roles, seniority and languages. Nothing leaves the
 * browser except the profile the user chooses to save (to their own DB row).
 */
export function ProfileEditor() {
  const { t } = useTranslation();
  const { profile, saveProfile, clearProfile } = useProfile();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<CvProfile | null>(profile);
  const [busy, setBusy] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const runAnalyze = (cvText: string) => setDraft(analyzeCv(cvText));

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

  const removeFrom = (key: "titles" | "certifications" | "locations", val: string) =>
    setDraft((d) =>
      d ? { ...d, [key]: (d[key] ?? []).filter((x) => x !== val) } : d,
    );

  const addSkill = () => {
    const s = newSkill.trim();
    if (!s || !draft) return;
    if (!draft.skills.includes(s)) setDraft({ ...draft, skills: [...draft.skills, s] });
    setNewSkill("");
  };

  const toggleRole = (key: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            roles: d.roles.includes(key)
              ? d.roles.filter((r) => r !== key)
              : [...d.roles, key],
          }
        : d,
    );

  const onSave = () => {
    if (!draft) return;
    saveProfile(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className={styles.editor}>
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
            <label className={styles.metaPill}>
              {t("profile.seniority")}:{" "}
              <select
                className={styles.select}
                value={draft.seniority ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, seniority: e.target.value || null })
                }
              >
                <option value="">—</option>
                {SENIORITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {draft.years != null && (
              <span className={styles.metaPill}>
                {t("profile.years")}:{" "}
                <strong>{t("profile.yearsValue", { count: draft.years })}</strong>
              </span>
            )}
            {draft.languages.length > 0 && (
              <span className={styles.metaPill}>
                {t("profile.languages")}: <strong>{draft.languages.join(", ")}</strong>
              </span>
            )}
            {(draft.education ?? []).length > 0 && (
              <span className={styles.metaPill}>
                {t("profile.education")}:{" "}
                <strong>{(draft.education ?? []).join(", ")}</strong>
              </span>
            )}
          </div>

          {(draft.titles ?? []).length > 0 && (
            <>
              <div className={styles.blockLabel}>{t("profile.titles")}</div>
              <div className={styles.chips}>
                {(draft.titles ?? []).map((title) => (
                  <span key={title} className={styles.chip}>
                    {title}
                    <button
                      className={styles.chipX}
                      onClick={() => removeFrom("titles", title)}
                      aria-label={`remove ${title}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}

          <div className={styles.blockLabel}>{t("profile.roles")}</div>
          <div className={styles.chips}>
            {ROLES.map((r) => {
              const active = draft.roles.includes(r.key);
              return (
                <button
                  key={r.key}
                  type="button"
                  className={`${styles.roleChip} ${active ? styles.roleChipOn : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleRole(r.key)}
                >
                  {r.label}
                </button>
              );
            })}
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
            {draft.skills.length === 0 && <span className={styles.muted}>—</span>}
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

          {(draft.certifications ?? []).length > 0 && (
            <>
              <div className={styles.blockLabel}>{t("profile.certifications")}</div>
              <div className={styles.chips}>
                {(draft.certifications ?? []).map((cert) => (
                  <span key={cert} className={styles.chip}>
                    {cert}
                    <button
                      className={styles.chipX}
                      onClick={() => removeFrom("certifications", cert)}
                      aria-label={`remove ${cert}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}

          {(draft.locations ?? []).length > 0 && (
            <>
              <div className={styles.blockLabel}>{t("profile.locations")}</div>
              <div className={styles.chips}>
                {(draft.locations ?? []).map((loc) => (
                  <span key={loc} className={styles.chip}>
                    {loc}
                    <button
                      className={styles.chipX}
                      onClick={() => removeFrom("locations", loc)}
                      aria-label={`remove ${loc}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <footer className={styles.foot}>
        {saved && <span className={styles.savedNote}>✓ {t("profile.saved")}</span>}
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
          onClick={onSave}
        >
          {t("profile.save")}
        </button>
      </footer>
    </div>
  );
}
