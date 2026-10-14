import { Link } from "react-router-dom";

import styles from "./EmptyState.module.css";

interface Props {
  title?: string;
  text: string;
  actionLabel: string;
  to: string;
}

/** An empty or missing page: one sentence and one button that leads somewhere useful. */
export function EmptyState({ title, text, actionLabel, to }: Props) {
  return (
    <div className={styles.box} role="status">
      {title && <h1 className={styles.title}>{title}</h1>}
      <p className={styles.text}>{text}</p>
      <Link to={to} className={styles.action}>{actionLabel}</Link>
    </div>
  );
}
