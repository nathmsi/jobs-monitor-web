import { memo } from "react";
import { useTranslation } from "react-i18next";

import { useRegions } from "../../api/hooks";
import { roleLabel } from "../../constants/roles";
import type { Filters } from "../../types";
import { regionLabel } from "../../utils/regionLabel";
import { CloseIcon } from "../Icons/Icons";
import styles from "./ActiveFilters.module.css";

interface Props {
  filters: Filters;
  /** Number of matching offers, once known. */
  total?: number;
  onChange: (next: (prev: Filters) => Filters) => void;
}

interface Chip {
  id: string;
  label: string;
  remove: (f: Filters) => Filters;
}

/** Result count + one removable chip per active filter + "clear all". */
export const ActiveFilters = memo(function ActiveFilters({ filters, total, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const { data: regions } = useRegions();

  const chips: Chip[] = [];
  const q = filters.q.trim();
  if (q) chips.push({ id: "q", label: `“${q}”`, remove: (f) => ({ ...f, q: "" }) });
  for (const key of filters.roles) {
    chips.push({
      id: `role:${key}`,
      label: roleLabel(key),
      remove: (f) => ({ ...f, roles: f.roles.filter((r) => r !== key) }),
    });
  }
  if (filters.category) {
    chips.push({
      id: "category",
      label: t(`categories.${filters.category}`, { defaultValue: filters.category }),
      remove: (f) => ({ ...f, category: undefined }),
    });
  }
  const region = regions?.find((r) => r.key === filters.region);
  if (filters.region !== "all" && region) {
    chips.push({
      id: "region",
      label: regionLabel(region, i18n.language),
      remove: (f) => ({ ...f, region: "all" }),
    });
  }

  if (chips.length === 0 && total === undefined) return null;

  return (
    <div className={styles.bar}>
      {total !== undefined && (
        <p className={styles.count} role="status" aria-live="polite">
          {t("results.count", { count: total })}
        </p>
      )}
      {chips.length > 0 && (
        <ul className={styles.chips} aria-label={t("filters.active")}>
          {chips.map((chip) => (
            <li key={chip.id} className={styles.chip}>
              <span className={styles.chipLabel}>{chip.label}</span>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => onChange(chip.remove)}
                aria-label={t("filters.remove", { label: chip.label })}
              >
                <CloseIcon size={10} strokeWidth={3} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {chips.length > 1 && (
        <button
          type="button"
          className={styles.clearAll}
          onClick={() =>
            onChange((f) => ({ ...f, q: "", roles: [], category: undefined, region: "all" }))
          }
        >
          {t("filters.clearAll")}
        </button>
      )}
    </div>
  );
});
