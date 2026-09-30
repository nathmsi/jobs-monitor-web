import styles from "./Badge.module.css";

type Variant = "new" | "hot" | "applied" | "expired";

interface Props {
  variant: Variant;
  children: React.ReactNode;
}

export function Badge({ variant, children }: Props) {
  return <span className={`${styles.badge} ${styles[variant]}`} data-testid={`badge-${variant}`}>{children}</span>;
}
