import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { markForceRefresh } from "../../api/hooks";
import type { RefreshResult, SourceInfo } from "../../types";
import styles from "./SourceLinkRow.module.css";

interface Props {
  source: SourceInfo;
  query: UseQueryResult<RefreshResult, Error>;
}

/** Compact row for a source with no results (or not yet fetched). */
export function SourceLinkRow({ source, query }: Props) {
  const { t } = useTranslation();
  const { data, isFetching, refetch } = query;

  // Fetched and empty vs. on-demand and not loaded yet.
  const note = data ? t("source.empty") : t("source.onDemandShort");

  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.label}>{source.label}</span>
        <span className={styles.note}>{note}</span>
      </div>
      <div className={styles.actions}>
        {source.site_url && (
          <a
            className={styles.link}
            href={source.site_url}
            target="_blank"
            rel="noreferrer"
          >
            {t("source.openSite")}
          </a>
        )}
        <button
          className={styles.btn}
          onClick={() => {
            markForceRefresh(source.key);
            refetch();
          }}
          disabled={isFetching}
        >
          {isFetching ? t("source.loading") : t("source.refresh")}
        </button>
      </div>
    </div>
  );
}
