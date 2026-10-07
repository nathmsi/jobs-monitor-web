import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useRegions } from "../../api/hooks";
import { ROLES } from "../../constants/roles";
import { regionLabel } from "../../utils/regionLabel";
import { useJobFlags } from "../../providers/jobFlags/useJobFlags";
import { useSavedJobs } from "../../providers/savedJobs/useSavedJobs";
import type { Filters } from "../../types";
import { CloseIcon, SearchIcon } from "../Icons/Icons";
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

  useEffect(() => {
    const q = draft.trim();
    const id = setTimeout(() => {
      onChange((f) => (f.q === q ? f : { ...f, q }));
    }, 250);
    return () => clearTimeout(id);
  }, [draft, onChange]);

  // Adopt external changes to the query (e.g. "clear filters") while rendering.
  const [syncedQ, setSyncedQ] = useState(filters.q);
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    setDraft(filters.q);
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon} aria-hidden="true">
          <SearchIcon size={14} strokeWidth={2.2} />
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
            <CloseIcon size={12} strokeWidth={2.5} />
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
              {regionLabel(r, i18n.language)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>{t("filters.roleLabel")}</div>
        <div className={styles.chips}>
          {(showAllRoles ? ROLES : ROLES.slice(0, ROLES_VISIBLE)).map((role) => {
            const active = filters.roles.includes(role.key);
            return (
              <button
                key={role.key}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                aria-pressed={active}
                onClick={() =>
                  onChange((f) => ({
                    ...f,
                    roles: active ? f.roles.filter((r) => r !== role.key) : [...f.roles, role.key],
                  }))
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
