import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { avatarColor, initials } from "../../lib/avatar";
import type { SourceInfo } from "../../types";
import styles from "./SourcesModal.module.css";

interface Props {
  sources: SourceInfo[];
  counts: Record<string, number>;
  onClose: () => void;
}

export function SourcesModal({ sources, counts, onClose }: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const needle = q.trim().toLowerCase();
  const match = (s: SourceInfo) =>
    !needle || s.label.toLowerCase().includes(needle);
  const byCount = (a: SourceInfo, b: SourceInfo) =>
    (counts[b.key] ?? 0) - (counts[a.key] ?? 0);

  const companies = sources.filter((s) => s.kind === "company" && match(s)).sort(byCount);
  const agencies = sources.filter((s) => s.kind === "agency" && match(s)).sort(byCount);

  const renderRow = (s: SourceInfo) => {
    const n = counts[s.key] ?? 0;
    return (
      <li key={s.key} className={styles.row}>
        <span
          className={styles.avatar}
          style={{ backgroundColor: avatarColor(s.key) }}
          aria-hidden
        >
          {initials(s.label)}
        </span>
        <span className={styles.name}>{s.label}</span>
        <span className={n > 0 ? styles.count : styles.countZero}>
          {t("source.offers", { count: n })}
        </span>
        {s.site_url && (
          <a
            className={styles.link}
            href={s.site_url}
            target="_blank"
            rel="noreferrer"
          >
            {t("allCompanies.careers")}
          </a>
        )}
      </li>
    );
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("allCompanies.title")}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <h2 className={styles.title}>{t("allCompanies.title")}</h2>
          <button
            className={styles.close}
            onClick={onClose}
            aria-label={t("allCompanies.close")}
          >
            ✕
          </button>
        </header>

        <input
          className={styles.search}
          type="text"
          value={q}
          autoFocus
          placeholder={t("allCompanies.search")}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className={styles.scroll}>
          {companies.length > 0 && (
            <>
              <h3 className={styles.group}>
                {t("tabs.companies")} <span>{companies.length}</span>
              </h3>
              <ul className={styles.list}>{companies.map(renderRow)}</ul>
            </>
          )}
          {agencies.length > 0 && (
            <>
              <h3 className={styles.group}>
                {t("tabs.agencies")} <span>{agencies.length}</span>
              </h3>
              <ul className={styles.list}>{agencies.map(renderRow)}</ul>
            </>
          )}
          {companies.length === 0 && agencies.length === 0 && (
            <p className={styles.empty}>—</p>
          )}
        </div>
      </div>
    </div>
  );
}
