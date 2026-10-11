import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import type { Suggestion } from "../api/client";
import { useLatestJobs, usePopularSearches, useSources, useStats } from "../api/hooks";
import { Header } from "../components/Header/Header";
import { JobCard } from "../components/JobCard/JobCard";
import { UpdatedAgo } from "../components/UpdatedAgo/UpdatedAgo";
import { SearchBox } from "../components/SearchBox/SearchBox";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useProfile } from "../providers/profile/useProfile";
import { loadJobsPage } from "./lazyPages";
import styles from "./HomePage.module.css";

/** How many popular searches the home page shows. */
const POPULAR_COUNT = 8;

const LATEST_COUNT = 6;

export function HomePage() {
  const { t } = useTranslation();
  useDocumentTitle("nav.home");

  return (
    <div className={styles.app}>
      <Header />

      <main>
        <section className={styles.hero} aria-labelledby="home-title">
          <p className={styles.eyebrow}>{t("home.eyebrow")}</p>
          <h1 id="home-title" className={styles.title}>{t("home.title")}</h1>
          <p className={styles.lead}>{t("home.lead")}</p>
          <div className={styles.heroSearch}><HeroSearch /></div>
          <PopularSearches />
        </section>

        <StatsStrip />
        <LatestOffers />
        <ForYou />
      </main>

      <footer className={styles.footer}>
        {t("footer")}
        <UpdatedAgo className={styles.updated} />
      </footer>
    </div>
  );
}

/** Where a suggestion leads in the offers browser. */
function suggestionHref(s: Pick<Suggestion, "type" | "value">): string {
  return s.type === "role"
    ? `/jobs?role=${encodeURIComponent(s.value)}`
    : `/jobs?q=${encodeURIComponent(s.value)}`;
}

/** One input with autocomplete, one button. */
function HeroSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const search = useCallback(
    (text: string) => navigate(text ? `/jobs?q=${encodeURIComponent(text)}` : "/jobs"),
    [navigate],
  );
  const pick = useCallback((s: Suggestion) => navigate(suggestionHref(s)), [navigate]);

  return (
    <SearchBox
      id="home-search"
      variant="hero"
      value={value}
      onValueChange={setValue}
      onSubmit={search}
      onPick={pick}
      label={t("home.searchLabel")}
      placeholder={t("home.searchPlaceholder")}
      submitLabel={t("home.searchCta")}
      onSubmitIntent={loadJobsPage}
    />
  );
}

/** What people search for most, straight from the API (nothing hardcoded). */
function PopularSearches() {
  const { t } = useTranslation();
  const popular = usePopularSearches(POPULAR_COUNT);

  if (popular.isError || (popular.isSuccess && popular.data.length === 0)) return null;

  return (
    <nav className={styles.popular} aria-label={t("home.popular")}>
      <span className={styles.popularLabel}>{t("home.popular")}</span>
      <ul className={styles.popularList} aria-busy={popular.isPending}>
        {popular.isPending
          ? Array.from({ length: POPULAR_COUNT }, (_, i) => (
              <li key={i} className={styles.popularSkeleton} aria-hidden="true" />
            ))
          : popular.data.map((s) => (
              <li key={`${s.type}:${s.value}`}>
                <Link
                  to={suggestionHref(s)}
                  className={styles.popularChip}
                  onPointerEnter={loadJobsPage}
                  onFocus={loadJobsPage}
                >
                  {s.label}
                  <span className={styles.popularCount}>{s.count}</span>
                </Link>
              </li>
            ))}
      </ul>
    </nav>
  );
}

/** Three live numbers. Space is reserved while loading; hidden if unavailable. */
function StatsStrip() {
  const { t, i18n } = useTranslation();
  const { data, isPending } = useStats();
  const format = useMemo(() => new Intl.NumberFormat(i18n.language).format, [i18n.language]);

  if (!isPending && !data) return null;

  const items = [
    { key: "offers", value: data?.total, label: t("home.statsOffers") },
    { key: "new", value: data?.new_this_week, label: t("home.statsNew") },
    { key: "companies", value: data?.companies, label: t("home.statsCompanies") },
  ];

  return (
    <dl className={styles.stats} aria-label={t("home.statsLabel")} aria-busy={isPending}>
      {items.map((item) => (
        <div key={item.key} className={styles.stat}>
          <dt className={styles.statLabel}>{item.label}</dt>
          <dd className={styles.statValue}>
            {item.value === undefined ? <span className={styles.statSkeleton} aria-hidden="true" /> : format(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The newest offers, as a teaser for the offers browser. */
function LatestOffers() {
  const { t } = useTranslation();
  const latest = useLatestJobs(LATEST_COUNT);
  const { data: sources } = useSources();
  const sourceByKey = useMemo(
    () => Object.fromEntries((sources ?? []).map((s) => [s.key, s])),
    [sources],
  );

  return (
    <section className={styles.section} aria-labelledby="latest-title">
      <div className={styles.sectionHead}>
        <h2 id="latest-title" className={styles.sectionTitle}>{t("home.latestTitle")}</h2>
        <Link to="/jobs" className={styles.seeAll} onPointerEnter={loadJobsPage} onFocus={loadJobsPage}>
          {t("home.seeAll")}
        </Link>
      </div>

      {latest.isError ? (
        <div className={styles.error} role="alert">
          <p>{t("home.loadError")}</p>
          <button type="button" className={styles.retry} onClick={() => latest.refetch()}>
            {t("error.tryAgain")}
          </button>
        </div>
      ) : (
        <div className={styles.offers} aria-busy={latest.isPending}>
          {latest.isPending
            ? Array.from({ length: LATEST_COUNT }, (_, i) => <div key={i} className={styles.offerSkeleton} />)
            : latest.data.map((job) => (
                <JobCard key={`${job.source}-${job.external_id}`} job={job} source={sourceByKey[job.source]} />
              ))}
        </div>
      )}
    </section>
  );
}

/** Two doors into the personalised features (CV coach / preferences). */
function ForYou() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const hasProfile = Array.isArray(profile?.skills) && profile.skills.length > 0;

  return (
    <section className={styles.section} aria-labelledby="foryou-title">
      <h2 id="foryou-title" className={styles.sectionTitle}>{t("home.forYouTitle")}</h2>
      <div className={styles.doors}>
        {hasProfile ? (
          <Link to="/jobs?tab=forme" className={styles.door} onPointerEnter={loadJobsPage} onFocus={loadJobsPage}>
            <h3 className={styles.doorTitle}>{t("home.matchTitle")}</h3>
            <p className={styles.doorDesc}>{t("home.matchDesc")}</p>
            <span className={styles.doorCta}>{t("home.matchCta")}</span>
          </Link>
        ) : (
          <Link to="/profile" className={styles.door}>
            <h3 className={styles.doorTitle}>{t("home.cvTitle")}</h3>
            <p className={styles.doorDesc}>{t("home.cvDesc")}</p>
            <span className={styles.doorCta}>{t("home.cvCta")}</span>
          </Link>
        )}
        <Link to="/profile" className={styles.door}>
          <h3 className={styles.doorTitle}>{t("home.prefsTitle")}</h3>
          <p className={styles.doorDesc}>{t("home.prefsDesc")}</p>
          <span className={styles.doorCta}>{t("home.prefsCta")}</span>
        </Link>
      </div>
    </section>
  );
}
