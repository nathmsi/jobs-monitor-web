import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { useSavedJobs } from "../../providers/savedJobs/useSavedJobs";
import { AiBadge } from "../AiBadge/AiBadge";
import { BookmarkIcon, BriefcaseIcon, HomeIcon, SparkleIcon, UserIcon } from "../Icons/Icons";
import styles from "./BottomNav.module.css";

type Entry = "home" | "offers" | "coach" | "saved" | "profile";

/** Which entry the current URL belongs to ("Saved" is a tab of /jobs). */
function activeEntry(pathname: string, search: string): Entry | null {
  if (pathname === "/") return "home";
  if (pathname === "/profile") return "profile";
  if (pathname === "/coach") return "coach";
  if (pathname !== "/jobs") return null;
  const tab = new URLSearchParams(search).get("tab");
  return tab === "mine" ? "saved" : "offers";
}

/**
 * Phone-only bottom navigation (hidden above 640px): the five places people go
 * to most, reachable with a thumb. The AI coach sits in the middle, raised and
 * coloured, so it is the easiest thing to reach.
 */
export function BottomNav() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const { items } = useSavedJobs();
  const active = activeEntry(pathname, search);

  const entries: { key: Entry; to: string; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "home", to: "/", label: t("nav.home"), icon: <HomeIcon size={22} /> },
    { key: "offers", to: "/jobs", label: t("nav.offers"), icon: <BriefcaseIcon size={22} /> },
    { key: "coach", to: "/coach", label: t("nav.cvAnalysis"), icon: <SparkleIcon size={22} /> },
    { key: "saved", to: "/jobs?tab=mine", label: t("nav.saved"), icon: <BookmarkIcon size={22} />, count: items.length },
    { key: "profile", to: "/profile", label: t("nav.profile"), icon: <UserIcon size={22} /> },
  ];

  return (
    <nav className={styles.nav} aria-label={t("nav.quick")}>
      {entries.map((e) => (
        <Link
          key={e.key}
          to={e.to}
          className={`${styles.item} ${e.key === "coach" ? styles.ai : ""} ${active === e.key ? styles.active : ""}`}
          aria-current={active === e.key ? "page" : undefined}
          aria-label={e.count ? `${e.label} (${e.count})` : undefined}
        >
          <span className={styles.icon}>
            {e.icon}
            {e.count ? <span className={styles.badge} aria-hidden="true">{e.count}</span> : null}
            {e.key === "coach" && <AiBadge decorative className={styles.aiTag} />}
          </span>
          <span className={styles.label}>{e.label}</span>
        </Link>
      ))}
    </nav>
  );
}
