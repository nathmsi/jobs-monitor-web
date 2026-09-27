import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SourceInfo } from "../../types";
import { Avatar } from "../Avatar/Avatar";
import styles from "./SourcesModal.module.css";

interface Props {
  sources: SourceInfo[];
  onClose: () => void;
}

export function SourcesModal({ sources, onClose }: Props) {
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

  const companies = sources.filter((s) => s.kind === "company" && match(s));
  const agencies = sources.filter((s) => s.kind === "agency" && match(s));

  const renderRow = (s: SourceInfo) => {
    return (
      <li key={s.key} className={styles.row}>
        <Avatar source={s} size={30} />
        <span className={styles.name}>{s.label}</span>
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
