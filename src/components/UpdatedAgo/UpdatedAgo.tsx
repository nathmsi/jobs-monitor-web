import { useTranslation } from "react-i18next";

import { useStats } from "../../api/hooks";
import { formatAgo } from "../../utils/relativeTime";

/** "Updated 12 minutes ago": how fresh the data is (hidden if unknown). */
export function UpdatedAgo({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { data } = useStats();

  const ago = formatAgo(data?.updated_at, i18n.language, t("time.justNow"));
  if (!ago) return null;

  return (
    <p className={className}>
      {t("freshness.updated")} <time dateTime={data?.updated_at ?? undefined}>{ago}</time>
    </p>
  );
}
