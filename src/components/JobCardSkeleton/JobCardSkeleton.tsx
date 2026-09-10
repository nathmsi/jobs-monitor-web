import styles from "./JobCardSkeleton.module.css";

export function JobCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden>
      <div className={styles.head}>
        <span className={`${styles.shimmer} ${styles.id}`} />
        <span className={`${styles.shimmer} ${styles.badge}`} />
      </div>
      <span className={`${styles.shimmer} ${styles.title}`} />
      <span className={`${styles.shimmer} ${styles.line}`} />
      <span className={`${styles.shimmer} ${styles.line}`} />
      <span className={`${styles.shimmer} ${styles.lineShort}`} />
    </div>
  );
}
