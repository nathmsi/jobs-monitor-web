import { Link } from "react-router-dom";

import { AiBadge } from "../AiBadge/AiBadge";
import { SparkleIcon } from "../Icons/Icons";
import { loadCoachPage } from "../../pages/lazyPages";
import styles from "./AiPromo.module.css";

interface Props {
  title: string;
  description: string;
  cta: string;
  to?: string;
  /** "banner": slim one-line nudge for under results and empty states. */
  variant?: "card" | "banner";
  testId?: string;
}

/**
 * The AI coach's door: one look, one tap. Used as a pair of cards on the home
 * page and as a slim banner under results / in empty states.
 */
export function AiPromo({ title, description, cta, to = "/coach", variant = "card", testId }: Props) {
  return (
    <Link
      to={to}
      className={`${styles.promo} ${variant === "banner" ? styles.banner : ""}`}
      data-testid={testId ?? "ai-promo"}
      onPointerEnter={loadCoachPage}
      onFocus={loadCoachPage}
    >
      <span className={styles.icon}><SparkleIcon size={variant === "banner" ? 18 : 22} /></span>
      <span className={styles.body}>
        <span className={styles.head}>
          <span className={styles.title}>{title}</span>
          <AiBadge />
        </span>
        <span className={styles.desc}>{description}</span>
      </span>
      <span className={styles.cta}>
        {cta}
        <span className={styles.arrow} aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
