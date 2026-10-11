import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useRegions } from "../../api/hooks";
import { ROLES } from "../../constants/roles";
import { regionLabel } from "../../utils/regionLabel";
import { useJobFlags } from "../../providers/jobFlags/useJobFlags";
import { useSavedJobs } from "../../providers/savedJobs/useSavedJobs";
import type { Filters, Posted } from "../../types";
import type { Suggestion } from "../../api/client";
import { SearchBox } from "../SearchBox/SearchBox";
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

  /** Search the typed text right away (Enter, clear, recent search). */
  const applySearch = useCallback(
    (text: string) => {
      setDraft(text);
      onChange((f) => (f.q === text ? f : { ...f, q: text }));
    },
    [onChange],
  );

  /** A role is added to the role filters; anything else becomes the search text. */
  const pickSuggestion = useCallback(
    (s: Suggestion) => {
      if (s.type === "role") {
        setDraft("");
        onChange((f) => ({
          ...f,
          q: "",
          roles: f.roles.includes(s.value) ? f.roles : [...f.roles, s.value],
        }));
      } else {
        applySearch(s.value);
      }
    },
    [onChange, applySearch],
  );

  return (
    <aside className={styles.sidebar}>
      <SearchBox
        id="jobs-search"
        value={draft}
        onValueChange={setDraft}
        onSubmit={applySearch}
        onPick={pickSuggestion}
        label={t("filters.searchPlaceholder")}
        placeholder={t("filters.searchPlaceholder")}
        clearLabel={t("filters.clear")}
      />

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
        <label className={styles.label} htmlFor="filter-posted">{t("filters.postedLabel")}</label>
        <select
          id="filter-posted"
          className={styles.region}
          value={filters.posted ?? ""}
          onChange={(e) => {
            const posted = (e.target.value || undefined) as Posted | undefined;
            onChange((f) => ({ ...f, posted }));
          }}
        >
          <option value="">{t("posted.any")}</option>
          <option value="24h">{t("posted.24h")}</option>
          <option value="7d">{t("posted.7d")}</option>
          <option value="30d">{t("posted.30d")}</option>
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
