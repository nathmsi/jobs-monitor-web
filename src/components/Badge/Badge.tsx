import styles from "./Badge.module.css";

type Variant = "new" | "hot";

interface Props {
  variant: Variant;
  children: React.ReactNode;
}

export function Badge({ variant, children }: Props) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}
