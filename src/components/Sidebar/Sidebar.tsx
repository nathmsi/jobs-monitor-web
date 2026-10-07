import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useRegions } from "../../api/hooks";
import { ROLES } from "../../constants/roles";
import { useJobFlags } from "../../lib/jobFlags";
import { useSavedJobs } from "../../lib/savedJobs";
import type { Filters } from "../../types";
import styles from "./Sidebar.module.css";

interface Props {
  filters: Filters;
  /** Same contract as a React state setter, so the debounced search update
   *  never overwrites filters changed in the meantime. */
  onChange: (next: Filters | ((prev: Filters) => Filters)) => void;
}

const ROLES_VISIBLE = 8;

export function Sidebar({ filters, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const { data: regions } = useRegions();
  const { hideSeen, setHideSeen } = useJobFlags();
  const { appliedCount } = useSavedJobs();
  const [draft, setDraft] = useState(filters.q);
  const [showAllRoles, setShowAllRoles] = useState(false);

  const isHe = i18n.language.startsWith("he");

  useEffect(() => {
    const q = draft.trim();
    const id = setTimeout(() => {
      onChange((f) => (f.q === q ? f : { ...f, q }));
    }, 250);
    return () => clearTimeout(id);
  }, [draft, onChange]);

  useEffect(() => setDraft(filters.q), [filters.q]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          className={styles.search}
          type="text"
          value={draft}
          placeholder={t("filters.searchPlaceholder")}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={t("filters.searchPlaceholder")}
        />
        {draft && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              setDraft("");
              onChange({ ...filters, q: "" });
            }}
            aria-label={t("filters.clear")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.label}>{t("filters.regionLabel")}</div>
        <select
          className={styles.region}
          value={filters.region}
          onChange={(e) => onChange({ ...filters, region: e.target.value })}
          aria-label={t("filters.regionLabel")}
        >
          {regions?.map((r) => (
            <option key={r.key} value={r.key}>
              {isHe ? r.label_he : (r.label_en ?? r.label_fr)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>{t("filters.roleLabel")}</div>
        <div className={styles.chips}>
          {(showAllRoles ? ROLES : ROLES.slice(0, ROLES_VISIBLE)).map((role) => {
            const active = filters.role === role.key;
            return (
              <button
                key={role.key}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                aria-pressed={active}
                onClick={() =>
                  onChange({ ...filters, role: active ? undefined : role.key })
                }
              >
                {role.label}
              </button>
            );
          })}
          {ROLES.length > ROLES_VISIBLE && (
            <button
              type="button"
              className={styles.chipMore}
              onClick={() => setShowAllRoles((v) => !v)}
            >
              {showAllRoles
                ? t("filters.showLess")
                : t("filters.showMore", { count: ROLES.length - ROLES_VISIBLE })}
            </button>
          )}
        </div>
      </div>

      <div className={styles.prefs}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={hideSeen}
            onChange={(e) => setHideSeen(e.target.checked)}
          />
          {t("filters.hideSeen")}
        </label>
        {appliedCount > 0 && (
          <span className={styles.applied}>
            {t("filters.appliedCount", { count: appliedCount })}
          </span>
        )}
      </div>
    </aside>
  );
}
