import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useRegions } from "../../api/hooks";
import { ROLES } from "../../constants/roles";
import type { Filters } from "../../types";
import styles from "./FilterBar.module.css";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function FilterBar({ filters, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const { data: regions } = useRegions();
  const [draft, setDraft] = useState(filters.q);

  const isHe = i18n.language.startsWith("he");
  const commitQuery = (q: string) => {
    setDraft(q);
    onChange({ ...filters, q });
  };

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <form
          className={styles.searchWrap}
          onSubmit={(e) => {
            e.preventDefault();
            onChange({ ...filters, q: draft.trim() });
          }}
        >
          <span className={styles.searchIcon} aria-hidden>
            🔍
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
              onClick={() => commitQuery("")}
              aria-label={t("filters.clear")}
            >
              ✕
            </button>
          )}
        </form>

        <select
          className={styles.region}
          value={filters.region}
          onChange={(e) => onChange({ ...filters, region: e.target.value })}
          aria-label={t("filters.regionLabel")}
        >
          {regions?.map((r) => (
            <option key={r.key} value={r.key}>
              {isHe ? r.label_he : r.label_fr}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.roles}>
        <span className={styles.rolesLabel}>{t("filters.roleLabel")}</span>
        {ROLES.map((role) => {
          const active = filters.q === role.q;
          return (
            <button
              key={role.key}
              type="button"
              className={`${styles.chip} ${active ? styles.chipActive : ""}`}
              aria-pressed={active}
              onClick={() => commitQuery(active ? "" : role.q)}
            >
              {role.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
