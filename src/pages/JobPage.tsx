import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { useCompany, useJob, useSources } from "../api/hooks";
import { AiPromo } from "../components/AiPromo/AiPromo";
import { Avatar } from "../components/Avatar/Avatar";
import { Badge } from "../components/Badge/Badge";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { Header } from "../components/Header/Header";
import { AlertCircleIcon, BookmarkIcon, ExternalLinkIcon } from "../components/Icons/Icons";
import { JobCard } from "../components/JobCard/JobCard";
import { usePageMeta } from "../hooks/usePageMeta";
import { useJobFlags } from "../providers/jobFlags/useJobFlags";
import { useSavedJobs } from "../providers/savedJobs/useSavedJobs";
import { useToast } from "../providers/toast/useToast";
import { parseAiSummary } from "../utils/aiSummary";
import { descriptionBlocks, isShortened } from "../utils/descriptionBlocks";
import { errorMessage } from "../utils/errorMessage";
import { isIndexableJob, offerText } from "../utils/indexable";
import { jobId } from "../utils/jobId";
import { formatAgo } from "../utils/relativeTime";
import { companyPath, jobPath } from "../utils/slug";
import styles from "./JobPage.module.css";

/** How many other offers of the same company are shown below. */
const MORE_COUNT = 3;

/** One offer on its own page: what it is, who posts it, the key facts, and a clear way to apply. */
export function JobPage() {
  const { t, i18n } = useTranslation();
  const { source = "", externalId = "" } = useParams();
  const { showToast } = useToast();
  const { markOpened } = useJobFlags();
  const { statusOf, setStatus } = useSavedJobs();
  const { data: sources } = useSources();
  const query = useJob(source, externalId);
  const job = query.data;
  const companyData = useCompany(source, Boolean(job) && !job?.is_expired);

  const company = useMemo(() => sources?.find((s) => s.key === source), [sources, source]);
  const ai = useMemo(() => parseAiSummary(job?.ai_summary), [job?.ai_summary]);
  const text = job ? offerText(job) : "";
  const blocks = useMemo(() => descriptionBlocks(text), [text]);
  const indexable = job ? isIndexableJob(job) : false;
  const more = (companyData.data?.jobs ?? [])
    .filter((j) => j.external_id !== externalId)
    .slice(0, MORE_COUNT);

  usePageMeta({
    title: job ? `${job.title}${company ? ` · ${company.label}` : ""}` : t("job.page.notFoundTitle"),
    description: job ? (ai?.headline || text.slice(0, 155)) : undefined,
    path: job ? jobPath(job) : undefined,
    noindex: !indexable,
  });

  const notFound = query.isError && /HTTP 404/.test(String(query.error));
  const saved = job ? statusOf(job.source, job.external_id) !== undefined : false;
  const companyName = company?.label ?? job?.source ?? source;
  const mode = ai?.remote === "Remote" ? t("job.page.remote") : ai?.remote === "Hybrid" ? t("job.page.hybrid") : ai?.remote ? t("job.page.onsite") : "";
  const place = job?.location.split(",")[0] ?? "";
  const posted = job ? formatAgo(job.added_at, i18n.language, t("time.justNow")) : "";
  const checked = job?.last_updated ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(job.last_updated)) : "";

  const toggleSave = async () => {
    if (!job) return;
    if (!(await setStatus(job, saved ? null : "saved", company?.label))) showToast(t("job.saveError"));
    else if (!saved) showToast(t("job.savedToast"));
  };

  const applyLink = (label: string) => job?.url ? (
    <a
      className={styles.apply}
      href={job.url}
      target="_blank"
      rel="noreferrer"
      onClick={() => markOpened(jobId(job.source, job.external_id))}
    >
      {label}
      <ExternalLinkIcon size={16} />
    </a>
  ) : null;

  const saveButton = (
    <button
      type="button"
      className={`${styles.save} ${saved ? styles.saveOn : ""}`}
      aria-pressed={saved}
      onClick={toggleSave}
    >
      <BookmarkIcon size={18} filled={saved} />
      <span>{saved ? t("job.saved") : t("job.save")}</span>
    </button>
  );

  const facts: [string, string][] = job
    ? ([
        [t("job.page.factCompany"), companyName],
        [t("job.page.factType"), company ? (company.kind === "agency" ? t("job.page.kindAgency") : t("job.page.kindCompany")) : ""],
        [t("job.page.factLocation"), job.location],
        [t("job.page.factLevel"), ai?.level ?? ""],
        [t("job.page.factMode"), mode],
        [t("job.page.factPosted"), posted],
        [t("job.page.factChecked"), checked],
      ] as [string, string][]).filter(([, value]) => value)
    : [];

  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        <nav className={styles.crumbs} aria-label={t("job.page.back")}>
          <Link to="/jobs" className={styles.back}>{t("job.page.back")}</Link>
        </nav>

        {query.isPending && <div className={styles.skeleton} aria-busy="true" />}

        {notFound && (
          <EmptyState
            title={t("job.page.notFoundTitle")}
            text={t("job.page.notFoundText")}
            actionLabel={t("job.page.browse")}
            to="/jobs"
          />
        )}

        {query.isError && !notFound && (
          <div className={styles.error} role="alert">
            <p>{errorMessage(query.error)}</p>
            <button type="button" className={styles.retry} onClick={() => query.refetch()}>{t("error.tryAgain")}</button>
          </div>
        )}

        {job && (
          <>
            <header className={styles.hero}>
              <div className={styles.company}>
                {company && <Avatar source={company} size={48} />}
                <div className={styles.companyText}>
                  <span className={styles.postedBy}>{t("job.page.postedBy")}</span>
                  <Link to={companyPath(job.source)} className={styles.companyName}>{companyName}</Link>
                </div>
                <div className={styles.badges}>
                  {job.is_expired && (
                    <Badge variant="expired"><AlertCircleIcon size={9} strokeWidth={2.5} />{t("job.expired")}</Badge>
                  )}
                  {job.is_hot && <Badge variant="hot">{t("job.hot")}</Badge>}
                </div>
              </div>

              <h1 className={styles.title} dir="auto">{job.title}</h1>

              <ul className={styles.chips}>
                {place && <li className={styles.chip}>{place}</li>}
                {ai?.level && <li className={styles.chip}>{ai.level}</li>}
                {mode && <li className={styles.chip}>{mode}</li>}
                {posted && <li className={styles.chip}><time dateTime={job.added_at ?? undefined}>{posted}</time></li>}
              </ul>
            </header>

            <div className={styles.grid}>
              <article className={styles.content}>
                {job.is_expired && <p className={styles.notice} role="status">{t("job.page.expired")}</p>}

                {ai && ai.highlights.length > 0 && (
                  <section className={styles.highlights} aria-labelledby="job-key-points">
                    <h2 id="job-key-points" className={styles.h2}>{t("job.page.keyPoints")}</h2>
                    <ul>
                      {ai.highlights.map((h) => <li key={h}>{h}</li>)}
                    </ul>
                  </section>
                )}

                <div className={styles.description} dir="auto">
                  {blocks.length > 0 ? (
                    blocks.map((b, i) =>
                      b.type === "heading" ? (
                        <h2 key={i} className={styles.h2}>{b.text}</h2>
                      ) : (
                        <p key={i}>{b.text}</p>
                      ),
                    )
                  ) : (
                    <p>{ai?.headline ?? t("job.page.noDescription")}</p>
                  )}
                </div>

                {isShortened(text) && job.url && (
                  <p className={styles.shortened}>
                    {t("job.page.shortened")}{" "}
                    <a href={job.url} target="_blank" rel="noreferrer" onClick={() => markOpened(jobId(job.source, job.external_id))}>
                      {t("job.page.readFull")}
                    </a>
                  </p>
                )}

                {ai && ai.stack.length > 0 && (
                  <section aria-labelledby="job-skills">
                    <h2 id="job-skills" className={styles.h2}>{t("job.page.skillsTitle")}</h2>
                    <ul className={styles.skills}>
                      {ai.stack.map((s) => (
                        <li key={s}><Link to={`/jobs?q=${encodeURIComponent(s)}`} className={styles.skill}>{s}</Link></li>
                      ))}
                    </ul>
                  </section>
                )}

                {!job.is_expired && (
                  <div className={styles.ai}>
                    <AiPromo
                      variant="banner"
                      title={t("ai.nudge.saved.title")}
                      description={t("ai.nudge.saved.desc")}
                      cta={t("ai.nudge.saved.cta")}
                      testId="ai-nudge-job"
                    />
                  </div>
                )}
              </article>

              <aside className={styles.side} aria-label={t("job.page.factsTitle")}>
                <div className={styles.sideCard}>
                  <div className={styles.sideActions}>
                    {applyLink(t("job.page.apply"))}
                    {saveButton}
                  </div>
                  <h2 className={styles.h2}>{t("job.page.factsTitle")}</h2>
                  <dl className={styles.facts}>
                    {facts.map(([label, value]) => (
                      <div key={label} className={styles.fact}>
                        <dt>{label}</dt>
                        <dd dir="auto">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </aside>
            </div>

            {more.length > 0 && companyData.data && (
              <section className={styles.more} aria-labelledby="job-more">
                <h2 id="job-more" className={styles.h2}>{t("job.page.moreTitle", { company: companyName })}</h2>
                <ul className={styles.moreList}>
                  {more.map((j) => (
                    <li key={`${j.source}-${j.external_id}`}>
                      <JobCard job={j} source={companyData.data.source} />
                    </li>
                  ))}
                </ul>
                <Link to={companyPath(job.source)} className={styles.seeAll}>
                  {t("job.page.seeAll", { count: companyData.data.total })}
                </Link>
              </section>
            )}

            <div className={styles.bar} data-testid="job-action-bar">
              {saveButton}
              {applyLink(t("job.page.applyShort"))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
