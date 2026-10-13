import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { MatchedOffer } from "../../api/client";
import { AlertCircleIcon, CheckIcon, ChevronDownIcon, ExternalLinkIcon, SearchIcon, SparkleIcon, StarIcon } from "../Icons/Icons";
import styles from "./MatchResults.module.css";
import { BANDS, type ScoreBand, scoreBand } from "./matchBands";

interface RankedOffer {
  offer: MatchedOffer;
  /** Position in the full list, kept when a filter hides some offers. */
  rank: number;
}

type BandFilter = "all" | ScoreBand;

const FILTERS: readonly BandFilter[] = ["all", ...BANDS];

function OfferLink({ offer, className, children }: { offer: MatchedOffer; className?: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  if (!offer.url) return <>{children}</>;
  return (
    <a className={className} href={offer.url} target="_blank" rel="noopener noreferrer">
      {children}
      <span className={styles.srOnly}> {t("match.results.newTab")}</span>
    </a>
  );
}

const MatchCard = memo(function MatchCard({ offer, rank, featured }: RankedOffer & { featured: boolean }) {
  const { t } = useTranslation();
  const band = scoreBand(offer.score);
  const titleId = `match-${offer.id}`;

  return (
    <li className={`${styles.card} ${featured ? styles.featured : ""}`}>
      <article aria-labelledby={titleId}>
        <div className={styles.head}>
          <div className={`${styles.score} ${styles[`band_${band}`]}`}>
            <span className={styles.scoreValue}>{offer.score}</span>
            <span className={styles.scoreUnit} aria-hidden="true">%</span>
            <span className={styles.srOnly}>{t("match.results.scoreAria", { score: offer.score })}</span>
          </div>

          <div className={styles.meta}>
            <p className={styles.rank}>
              {featured ? (
                <span className={styles.bestTag}>
                  <StarIcon size={14} />
                  {t("match.results.best")}
                </span>
              ) : (
                <span>{t("match.results.rank", { n: rank })}</span>
              )}
              <span className={`${styles.bandTag} ${styles[`band_${band}`]}`}>{t(`match.band.${band}`)}</span>
            </p>
            <h3 id={titleId} className={styles.title}>
              <OfferLink offer={offer} className={styles.titleLink}>
                {offer.title}
              </OfferLink>
            </h3>
            <p className={styles.company}>{offer.company}</p>
          </div>
        </div>

        {offer.reasons.length > 0 ? (
          <div className={styles.block}>
            <h4 className={styles.blockTitle}>{t("match.results.why")}</h4>
            <ul className={styles.list}>
              {offer.reasons.map((r, i) => (
                <li key={i} className={styles.reason}>
                  <CheckIcon size={16} strokeWidth={2.5} className={styles.reasonIcon} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {offer.weak_points.length > 0 ? (
          <details className={styles.check} open={featured}>
            <summary className={styles.checkSummary}>
              <AlertCircleIcon size={16} className={styles.checkIcon} />
              {t("match.results.check")}
              <ChevronDownIcon size={16} className={styles.chevron} />
            </summary>
            <ul className={styles.list}>
              {offer.weak_points.map((w, i) => (
                <li key={i} className={styles.weak}>{w}</li>
              ))}
            </ul>
          </details>
        ) : null}

        {offer.url ? (
          <div className={styles.actions}>
            <OfferLink offer={offer} className={styles.openBtn}>
              {t("match.results.open")}
              <ExternalLinkIcon size={16} />
            </OfferLink>
          </div>
        ) : null}
      </article>
    </li>
  );
});

export function MatchResults({ offers, onAdapt }: { offers: MatchedOffer[]; onAdapt: () => void }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<BandFilter>("all");

  // One pass over the offers: per-band counts and the score total.
  const { counts, average } = useMemo(() => {
    const tally = offers.reduce(
      (acc, o) => {
        acc.counts[scoreBand(o.score)]++;
        acc.total += o.score;
        return acc;
      },
      { counts: { strong: 0, good: 0, stretch: 0 } as Record<ScoreBand, number>, total: 0 },
    );
    return { counts: tally.counts, average: offers.length ? Math.round(tally.total / offers.length) : 0 };
  }, [offers]);

  const ranked = useMemo(() => offers.map((offer, i): RankedOffer => ({ offer, rank: i + 1 })), [offers]);

  const visible = useMemo(
    () => (filter === "all" ? ranked : ranked.filter((r) => scoreBand(r.offer.score) === filter)),
    [ranked, filter],
  );

  if (offers.length === 0) {
    return (
      <div className={styles.empty}>
        <SearchIcon size={40} strokeWidth={1.5} className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>{t("match.results.emptyTitle")}</h3>
        <p>{t("match.results.emptyBody")}</p>
        <p className={styles.hint}>{t("match.results.emptyHint")}</p>
      </div>
    );
  }

  return (
    <section className={styles.container} aria-labelledby="matchResultsTitle">
      <header className={styles.header}>
        <div>
          <h2 id="matchResultsTitle" className={styles.heading}>
            {t("match.results.title")}
          </h2>
          <p className={styles.subtitle}>{t("match.results.subtitle", { count: offers.length })}</p>
        </div>
        <button type="button" className={styles.cvBtn} onClick={onAdapt}>
          <SparkleIcon size={16} />
          {t("match.results.improveCv")}
        </button>
      </header>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>{t("match.results.statBest")}</dt>
          <dd>{offers[0].score}%</dd>
        </div>
        <div className={styles.stat}>
          <dt>{t("match.results.statAverage")}</dt>
          <dd>{average}%</dd>
        </div>
        <div className={styles.stat}>
          <dt>{t("match.results.statStrong")}</dt>
          <dd>{counts.strong}</dd>
        </div>
      </dl>

      <div className={styles.filters} role="group" aria-label={t("match.results.filterAria")}>
        {FILTERS.map((f) => {
          const count = f === "all" ? offers.length : counts[f];
          return (
            <button
              key={f}
              type="button"
              className={`${styles.chip} ${filter === f ? styles.chipOn : ""}`}
              aria-pressed={filter === f}
              disabled={count === 0 && f !== "all"}
              onClick={() => setFilter(f)}
            >
              {t(f === "all" ? "match.results.filterAll" : `match.band.${f}`)}
              <span className={styles.chipCount}>{count}</span>
            </button>
          );
        })}
      </div>

      <ol className={styles.cards}>
        {visible.map(({ offer, rank }) => (
          <MatchCard key={offer.id} offer={offer} rank={rank} featured={rank === 1} />
        ))}
      </ol>
    </section>
  );
}
