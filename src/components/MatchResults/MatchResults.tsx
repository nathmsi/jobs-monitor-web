import type { MatchedOffer } from "../../api/client";
import styles from "./MatchResults.module.css";

export function MatchResults({
  offers,
  onAdapt,
}: {
  offers: MatchedOffer[];
  onAdapt: () => void;
}) {
  if (offers.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🔍</div>
        <h3>No perfect matches found</h3>
        <p>The agent searched hard but couldn't find offers matching your profile.</p>
        <p className={styles.hint}>Try widening your filters or updating your CV</p>
      </div>
    );
  }

  const topOffer = offers[0];
  const others = offers.slice(1);

  return (
    <div className={styles.container}>
      {/* AI Badge */}
      <div className={styles.aiBadge}>
        <span>🤖 Powered by AI Job Scout</span>
      </div>

      {/* Headline */}
      <div className={styles.headline}>
        <h2 className={styles.title}>
          ✨ Perfect Matches for You • <span className={styles.highlight}>{offers.length}</span> Jobs
        </h2>
        <p className={styles.subtitle}>Our AI analyzed your CV and found the best-fit opportunities ranked by match score</p>
      </div>

      {/* Top Result - Hero Card */}
      {topOffer && (
        <div className={styles.heroSection}>
          <div className={styles.heroCard}>
            <div className={styles.heroScore}>
              <span className={styles.scoreValue}>{topOffer.score}</span>
              <span className={styles.scoreLabel}>% Match</span>
            </div>
            <div className={styles.heroContent}>
              <div className={styles.heroTitle}>{topOffer.title}</div>
              <div className={styles.heroCompany}>{topOffer.company}</div>

              {topOffer.reasons && topOffer.reasons.length > 0 && (
                <div className={styles.heroReasons}>
                  <div className={styles.reasonsLabel}>✓ Why it fits:</div>
                  <ul className={styles.reasonsList}>
                    {topOffer.reasons.slice(0, 2).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.heroActions}>
                <button className={styles.primaryBtn} onClick={onAdapt}>
                  💡 Adapt my CV for this role
                </button>
                {topOffer.url && (
                  <a className={styles.secondaryBtn} href={topOffer.url} target="_blank" rel="noreferrer">
                    Open offer →
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className={styles.heroBadge}>
            <span>🏆</span>
            <span>Top Match</span>
          </div>
        </div>
      )}

      {/* Other Results */}
      {others.length > 0 && (
        <div className={styles.othersSection}>
          <h3 className={styles.othersTitle}>Also recommended for you</h3>
          <div className={styles.offersGrid}>
            {others.map((offer) => (
              <div key={offer.id} className={styles.offerCard}>
                <div className={styles.offerHeader}>
                  <div className={styles.offerScore}>{offer.score}%</div>
                  <div className={styles.offerMeta}>
                    <div className={styles.offerTitle}>{offer.title}</div>
                    <div className={styles.offerCompany}>{offer.company}</div>
                  </div>
                </div>

                {offer.reasons && offer.reasons.length > 0 && (
                  <div className={styles.offerReasons}>
                    <div className={styles.reasonTag}>{offer.reasons[0]}</div>
                    {offer.reasons.length > 1 && (
                      <div className={styles.reasonTag}>+{offer.reasons.length - 1} more</div>
                    )}
                  </div>
                )}

                <div className={styles.offerFooter}>
                  <button className={styles.adaptBtn} onClick={onAdapt}>
                    💡 Adapt
                  </button>
                  {offer.url && (
                    <a className={styles.viewBtn} href={offer.url} target="_blank" rel="noreferrer">
                      View →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{offers.length}</div>
          <div className={styles.statLabel}>Matches found</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{Math.round(offers.reduce((a, o) => a + o.score, 0) / offers.length)}</div>
          <div className={styles.statLabel}>Average score</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{topOffer?.score || 0}</div>
          <div className={styles.statLabel}>Best match</div>
        </div>
      </div>
    </div>
  );
}
