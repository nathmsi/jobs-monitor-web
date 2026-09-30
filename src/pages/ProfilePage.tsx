import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useRegionJobs, useRegions, useSources } from "../api/hooks";
import { CVUploadModal } from "../components/CVUploadModal/CVUploadModal";
import { Header } from "../components/Header/Header";
import { JobCard } from "../components/JobCard/JobCard";
import { ProfileEditor } from "../components/ProfileEditor/ProfileEditor";
import { useAuth } from "../lib/auth";
import { useCvs } from "../lib/cvs";
import { matchScore, rankScore } from "../lib/cvAnalysis";
import { usePreferences, type JobPreferences } from "../lib/preferences";
import { useProfile } from "../lib/profile";
import { ROLES } from "../constants/roles";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, enabled, signInWithGoogle, signOut } = useAuth();
  const { profile } = useProfile();
  const { cvs, selectedCv, selectedId, selectCv, addCv } = useCvs();
  const { prefs, savePrefs } = usePreferences();
  const { data: regions } = useRegions();
  const { data: sources } = useSources();
  const { data: jobs } = useRegionJobs("all");

  const [draftPrefs, setDraftPrefs] = useState<JobPreferences>(() => ({
    ...prefs,
    roles: Array.isArray(prefs.roles) ? prefs.roles : [],
    categories: Array.isArray(prefs.categories) ? prefs.categories : [],
  }));
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    document.title = t("profile.pageTitle") + " — Tech Jobs";
  }, [t]);

  const onSavePrefs = async () => {
    await savePrefs(draftPrefs);
    setPrefsSaved(true);
    window.setTimeout(() => setPrefsSaved(false), 2200);
  };

  const togglePrefRole = (key: string) =>
    setDraftPrefs((p) => ({
      ...p,
      roles: p.roles.includes(key) ? p.roles.filter((r) => r !== key) : [...p.roles, key],
    }));

  const togglePrefCategory = (key: string) =>
    setDraftPrefs((p) => ({
      ...p,
      categories: p.categories.includes(key)
        ? p.categories.filter((c) => c !== key)
        : [...p.categories, key],
    }));

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const name =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email ||
    "";
  const avatarUrl =
    ((user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture) as string | undefined) || undefined;
  const [avatarError, setAvatarError] = useState(false);

  const cvText = selectedCv?.text ?? "";
  const hasCv = cvText.trim().length >= 50;
  const hasProfile = !!profile && Array.isArray(profile.skills) && profile.skills.length > 0;

  const onPdf = async (file: File) => {
    setBusyPdf(true);
    setPdfError(null);
    try {
      const { extractPdfText } = await import("../lib/pdf");
      const text = await extractPdfText(file);
      const name = file.name.replace(/\.pdf$/i, "").slice(0, 60) || "CV";
      await addCv(name, text);
      setShowUploadModal(false);
    } catch {
      setPdfError(t("coach.pdfError"));
    } finally {
      setBusyPdf(false);
    }
  };

  const sourceByKey = useMemo(
    () => Object.fromEntries((sources ?? []).map((s) => [s.key, s])),
    [sources],
  );

  const { ranked, matchingCount, topSkills } = useMemo(() => {
    if (!hasProfile || !jobs) {
      return { ranked: [], matchingCount: 0, topSkills: [] as [string, number][] };
    }
    const scored = jobs
      .map((job) => {
        const text = `${job.title} ${job.excerpt} ${job.description ?? ""}`;
        return { job, score: rankScore(text, profile), matched: matchScore(text, profile).matched };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    const demand: Record<string, number> = {};
    for (const r of scored) {
      for (const s of r.matched) demand[s] = (demand[s] ?? 0) + 1;
    }
    const topSkills = Object.entries(demand)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) as [string, number][];

    return { ranked: scored.slice(0, 8), matchingCount: scored.length, topSkills };
  }, [jobs, profile, hasProfile]);

  const maxDemand = topSkills[0]?.[1] ?? 1;

  return (
    <div className={styles.app}>
      <Header />

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>{t("profile.pageTitle")}</h1>
          <p className={styles.lead}>{t("profile.pageLead")}</p>
        </div>

        {/* Account strip */}
        {enabled && (
          <div className={styles.account}>
            {user ? (
              <>
                {avatarUrl && !avatarError ? (
                  <img
                    className={styles.avatar}
                    src={avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className={styles.avatarFallback}>
                    {(name || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <div className={styles.accountInfo}>
                  <span className={styles.accountName}>{name}</span>
                  <span className={styles.accountMail}>{user.email}</span>
                </div>
                <button className={styles.signOut} onClick={() => signOut()}>
                  {t("auth.signOut")}
                </button>
              </>
            ) : (
              <button className={styles.signInBtn} data-testid="sign-in-btn" onClick={() => signInWithGoogle()}>
                {t("auth.signInGoogle")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.grid}>
        {/* ── Left column ── */}
        <section className={styles.col}>

          {/* CV source card */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>{t("coach.nav")}</h2>

            {hasCv ? (
              <div className={styles.cvBar}>
                <div className={styles.cvBarInfo}>
                  <span className={styles.cvDot} />
                  <span className={styles.cvBarName}>{selectedCv?.name ?? "CV"}</span>
                  <span className={styles.cvBarReady}>{t("coach.cvReadyLabel")}</span>
                </div>
                <button className={styles.cvBarChange} onClick={() => setShowUploadModal(true)}>
                  {t("coach.changeCv")}
                </button>
              </div>
            ) : (
              <div className={styles.cvEmpty}>
                <p className={styles.cvEmptyText}>{t("coach.noCv")}</p>
                {user ? (
                  <button className={styles.primaryBtn} onClick={() => setShowUploadModal(true)}>
                    {t("coach.uploadCv")}
                  </button>
                ) : (
                  <button className={styles.primaryBtn} onClick={() => signInWithGoogle()}>
                    {t("auth.signInGoogle")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profile editor card */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>{t("profile.editorTitle")}</h2>
            <ProfileEditor cvText={hasCv ? cvText : undefined} />
          </div>

          {/* Job preferences card */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>{t("profile.prefTitle")}</h2>

            {/* Region */}
            <div className={styles.prefGroup}>
              <div className={styles.prefLabel}>{t("filters.regionLabel")}</div>
              <select
                className={styles.prefSelect}
                value={draftPrefs.region}
                onChange={(e) => setDraftPrefs((p) => ({ ...p, region: e.target.value }))}
              >
                <option value="all">{t("categories.all")}</option>
                {(regions ?? []).map((r) => (
                  <option key={r.key} value={r.key}>{r.label_en}</option>
                ))}
              </select>
            </div>

            {/* Kind */}
            <div className={styles.prefGroup}>
              <div className={styles.prefLabel}>{t("profile.prefKind")}</div>
              <div className={styles.prefChips}>
                {(["all", "company", "agency"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`${styles.prefChip} ${draftPrefs.kind === k ? styles.prefChipOn : ""}`}
                    onClick={() => setDraftPrefs((p) => ({ ...p, kind: k }))}
                  >
                    {t(`profile.kind_${k}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div className={styles.prefGroup}>
              <div className={styles.prefLabel}>{t("profile.roles")}</div>
              <div className={styles.prefChips}>
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={`${styles.prefChip} ${draftPrefs.roles.includes(r.key) ? styles.prefChipOn : ""}`}
                    onClick={() => togglePrefRole(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className={styles.prefGroup}>
              <div className={styles.prefLabel}>{t("profile.prefCategories")}</div>
              <div className={styles.prefChips}>
                {(["security","fintech","data-ai","devtools","hardware","web-ecom","gaming","mobility","health"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.prefChip} ${draftPrefs.categories.includes(c) ? styles.prefChipOn : ""}`}
                    onClick={() => togglePrefCategory(c)}
                  >
                    {t(`categories.${c}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.prefFoot}>
              {prefsSaved && <span className={styles.savedNote}>✓ {t("profile.prefSaved")}</span>}
              <button className={styles.primaryBtn} onClick={onSavePrefs}>
                {t("profile.prefSave")}
              </button>
            </div>
          </div>
        </section>

        {/* ── Right column ── */}
        <aside className={styles.aside}>
          {!hasProfile ? (
            <div className={styles.sectionCard}>
              <p className={styles.empty}>{t("profile.emptyStats")}</p>
            </div>
          ) : (
            <>
              <div className={styles.sectionCard}>
                <div className={styles.statHead}>
                  <span className={styles.statNumber}>{matchingCount}</span>
                  <span className={styles.statLabel}>
                    {t("profile.matchingOffers", { count: matchingCount })}
                  </span>
                </div>
                {topSkills.length > 0 && (
                  <>
                    <div className={styles.blockLabel}>{t("profile.topSkills")}</div>
                    <ul className={styles.demandList}>
                      {topSkills.map(([skill, n]) => (
                        <li key={skill} className={styles.demandRow}>
                          <span className={styles.demandName}>{skill}</span>
                          <span className={styles.demandBar}>
                            <span
                              className={styles.demandFill}
                              style={{ width: `${Math.round((n / maxDemand) * 100)}%` }}
                            />
                          </span>
                          <span className={styles.demandCount}>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className={styles.sectionCard}>
                <div className={styles.recHead}>
                  <h2 className={styles.sectionTitle}>{t("profile.recommended")}</h2>
                  <Link to="/" className={styles.seeAll}>{t("profile.seeAll")}</Link>
                </div>
                {ranked.length === 0 ? (
                  <p className={styles.empty}>{t("forme.noMatch")}</p>
                ) : (
                  <div className={styles.recList}>
                    {ranked.map(({ job }) => (
                      <JobCard
                        key={`${job.source}-${job.external_id}`}
                        job={job}
                        source={sourceByKey[job.source]}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      <footer className={styles.footer}>{t("footer")}</footer>

      <CVUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={onPdf}
        busy={busyPdf}
        error={pdfError}
        existingCvs={cvs}
        selectedCvId={selectedId ?? undefined}
        onSelectCv={selectCv}
      />
    </div>
  );
}
