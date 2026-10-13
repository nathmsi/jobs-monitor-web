import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { BookmarkIcon, SearchIcon, SparkleIcon } from "../Icons/Icons";
import styles from "./FirstVisitTour.module.css";

const STORAGE_KEY = "tourSeen.v1";

const STEPS = [
  { key: "s1", Icon: SearchIcon },
  { key: "s2", Icon: BookmarkIcon },
  { key: "s3", Icon: SparkleIcon },
] as const;

function alreadySeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch { /* ignore */ }
}

/**
 * Three quick steps for a first visit (Search, Save, Improve your CV). It is a
 * small card in the corner, not a modal: nothing is blocked, it can be skipped,
 * and it never comes back once it has been closed.
 */
export function FirstVisitTour() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => !alreadySeen());
  const [step, setStep] = useState(0);

  if (!open) return null;

  const close = () => {
    markSeen();
    setOpen(false);
  };
  const last = step === STEPS.length - 1;
  const { key, Icon } = STEPS[step];

  return (
    <section className={styles.tour} aria-label={t("tour.aria")} data-testid="first-visit-tour">
      <div className={styles.head}>
        <span className={styles.icon}><Icon size={20} /></span>
        <span className={styles.count}>{t("tour.step", { n: step + 1, total: STEPS.length })}</span>
        <button type="button" className={styles.skip} onClick={close}>{t("tour.skip")}</button>
      </div>
      <h2 className={styles.title}>{t(`tour.${key}Title`)}</h2>
      <p className={styles.desc}>{t(`tour.${key}Desc`)}</p>
      <div className={styles.foot}>
        <span className={styles.dots} aria-hidden="true">
          {STEPS.map((s, i) => <span key={s.key} className={i === step ? styles.dotOn : styles.dot} />)}
        </span>
        {last ? (
          <>
            <button type="button" className={styles.ghost} onClick={close}>{t("tour.done")}</button>
            <Link to="/coach" className={styles.next} onClick={close}>{t("tour.tryCoach")}</Link>
          </>
        ) : (
          <button type="button" className={styles.next} onClick={() => setStep((s) => s + 1)}>{t("tour.next")}</button>
        )}
      </div>
    </section>
  );
}
