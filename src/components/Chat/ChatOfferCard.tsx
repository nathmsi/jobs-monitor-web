import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useSources } from "../../api/hooks";
import type { ChatOffer } from "../../api/chat";
import { loadJobPage } from "../../pages/lazyPages";
import { useJobFlags } from "../../providers/jobFlags/useJobFlags";
import { parseAiSummary } from "../../utils/aiSummary";
import { jobId } from "../../utils/jobId";
import { jobPath } from "../../utils/slug";
import { Avatar } from "../Avatar/Avatar";
import { Badge } from "../Badge/Badge";
import styles from "./ChatOfferCard.module.css";

interface Props {
  offer: ChatOffer;
  /** Called when the offer is opened (the widget closes itself on small screens). */
  onOpen?: () => void;
}

/** An offer in the chat: company, title, place and one line. The whole card opens the offer page. */
export const ChatOfferCard = memo(function ChatOfferCard({ offer, onOpen }: Props) {
  const { t } = useTranslation();
  const { data: sources } = useSources();
  const { markOpened } = useJobFlags();

  const source = sources?.find((s) => s.key === offer.source);
  const ai = parseAiSummary(offer.ai_summary);
  const place = offer.location.split(",")[0];
  const summary = ai?.headline || offer.excerpt;

  return (
    <article className={styles.card}>
      <div className={styles.company}>
        {source && <Avatar source={source} size={24} />}
        <span className={styles.companyName}>{source?.label ?? offer.source}</span>
        {offer.is_hot && <Badge variant="hot">{t("job.hot")}</Badge>}
      </div>

      <h3 className={styles.title} dir="auto">
        <Link
          to={jobPath(offer)}
          className={styles.link}
          onClick={() => {
            markOpened(jobId(offer.source, offer.external_id));
            onOpen?.();
          }}
          onPointerEnter={loadJobPage}
          onFocus={loadJobPage}
        >
          {offer.title}
        </Link>
      </h3>

      {summary && (
        <p className={styles.summary} dir="auto">
          {summary}
        </p>
      )}

      {(place || ai?.level) && (
        <ul className={styles.tags}>
          {place && <li>{place}</li>}
          {ai?.level && <li>{ai.level}</li>}
        </ul>
      )}
    </article>
  );
});
