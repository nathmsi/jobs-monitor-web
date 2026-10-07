import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ROLES } from "../../constants/roles";
import { analyzeCv, normalizeProfile, type CvProfile } from "../../lib/cvAnalysis";
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

interface ProfileEditorProps {
  /** CV text extracted from the selected CV — used to auto-extract a profile. */
  cvText?: string;
}

export function ProfileEditor({ cvText }: ProfileEditorProps) {
  const { t } = useTranslation();
  const { profile, saveProfile, clearProfile } = useProfile();
  const [draft, setDraft] = useState<CvProfile | null>(() => {
    const existing = normalizeProfile(profile);
    if (existing) return existing;
    // No profile yet: auto-extract one from the selected CV.
    return cvText && cvText.trim().length >= 50 ? analyzeCv(cvText) : null;
  });
  const [newSkill, setNewSkill] = useState("");
  const [saved, setSaved] = useState(false);

  const extract = () => {
    if (cvText && cvText.trim().length >= 50) setDraft(analyzeCv(cvText));
  };

  const removeSkill = (name: string) =>
    setDraft((d) => (d ? { ...d, skills: d.skills.filter((s) => s !== name) } : d));

  const removeFrom = (key: "titles" | "certifications" | "locations", val: string) =>
    setDraft((d) => (d ? { ...d, [key]: (d[key] ?? []).filter((x) => x !== val) } : d));

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

  if (!draft) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyMsg}>{t("profile.emptyEditor")}</p>
        {cvText && cvText.trim().length >= 50 && (
          <button type="button" className={styles.extractBtn} onClick={extract}>
            {t("profile.analyze")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      {/* Re-extract button if a CV is loaded */}
      {cvText && cvText.trim().length >= 50 && (
        <div className={styles.reExtractRow}>
          <button type="button" className={styles.reExtractBtn} onClick={extract}>
            {t("profile.analyze")}
          </button>
          <span className={styles.reExtractHint}>{t("profile.privacy")}</span>
        </div>
      )}

      <div className={styles.metaRow}>
        <label className={styles.metaPill}>
          {t("profile.seniority")}:{" "}
          <select
            className={styles.select}
            value={draft.seniority ?? ""}
            onChange={(e) => setDraft({ ...draft, seniority: e.target.value || null })}
          >
            <option value="">—</option>
            {SENIORITY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
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
        {(draft.education ?? []).length > 0 && (
          <span className={styles.metaPill}>
            {t("profile.education")}: <strong>{(draft.education ?? []).join(", ")}</strong>
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
                <button className={styles.chipX} onClick={() => removeFrom("titles", title)} aria-label={`remove ${title}`}>✕</button>
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
            <button className={styles.chipX} onClick={() => removeSkill(s)} aria-label={`remove ${s}`}>✕</button>
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
        <button className={styles.addBtn} onClick={addSkill}>+</button>
      </div>

      {(draft.certifications ?? []).length > 0 && (
        <>
          <div className={styles.blockLabel}>{t("profile.certifications")}</div>
          <div className={styles.chips}>
            {(draft.certifications ?? []).map((cert) => (
              <span key={cert} className={styles.chip}>
                {cert}
                <button className={styles.chipX} onClick={() => removeFrom("certifications", cert)} aria-label={`remove ${cert}`}>✕</button>
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
                <button className={styles.chipX} onClick={() => removeFrom("locations", loc)} aria-label={`remove ${loc}`}>✕</button>
              </span>
            ))}
          </div>
        </>
      )}

      <footer className={styles.foot}>
        {saved && <span className={styles.savedNote}>✓ {t("profile.saved")}</span>}
        {profile && (
          <button
            className={styles.clearBtn}
            onClick={() => { clearProfile(); setDraft(null); }}
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
