import { useMemo, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { useLatestJobs, useSources, useStats } from "../api/hooks";
import { Header } from "../components/Header/Header";
import { SearchIcon } from "../components/Icons/Icons";
import { JobCard } from "../components/JobCard/JobCard";
import { roleLabel } from "../constants/roles";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useProfile } from "../providers/profile/useProfile";
import { loadJobsPage } from "./lazyPages";
import styles from "./HomePage.module.css";

/** Quick entry points into the offers browser (role keys from constants/roles). */
const POPULAR_ROLES = ["mobile", "frontend", "backend", "devops", "data", "ai", "qa"] as const;

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
          <HeroSearch />
          <PopularRoles />
        </section>

        <StatsStrip />
        <LatestOffers />
        <ForYou />
      </main>

      <footer className={styles.footer}>{t("footer")}</footer>
    </div>
  );
}

/** One input, one button. Uncontrolled: nothing re-renders while typing. */
function HeroSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    navigate(q ? `/jobs?q=${encodeURIComponent(q)}` : "/jobs");
  };

  return (
    <form className={styles.search} role="search" onSubmit={onSubmit}>
      <label className={styles.srOnly} htmlFor="home-search">{t("home.searchLabel")}</label>
      <span className={styles.searchIcon} aria-hidden="true"><SearchIcon size={18} /></span>
      <input
        id="home-search"
        name="q"
        type="search"
        className={styles.searchInput}
        placeholder={t("home.searchPlaceholder")}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={200}
      />
      <button type="submit" className={styles.searchBtn} onPointerEnter={loadJobsPage} onFocus={loadJobsPage}>
        {t("home.searchCta")}
      </button>
    </form>
  );
}

function PopularRoles() {
  const { t } = useTranslation();
  return (
    <nav className={styles.popular} aria-label={t("home.popular")}>
      <span className={styles.popularLabel}>{t("home.popular")}</span>
      <ul className={styles.popularList}>
        {POPULAR_ROLES.map((key) => (
          <li key={key}>
            <Link
              to={`/jobs?role=${key}`}
              className={styles.popularChip}
              onPointerEnter={loadJobsPage}
              onFocus={loadJobsPage}
            >
              {roleLabel(key)}
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
          <Link to="/coach" className={styles.door}>
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
