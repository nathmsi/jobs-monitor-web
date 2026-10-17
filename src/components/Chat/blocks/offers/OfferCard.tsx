import { memo } from "react";
import { useTranslation } from "react-i18next";

import { useSources } from "../../../../api/hooks";
import { parseAiSummary } from "../../../../utils/aiSummary";
import { Avatar } from "../../../Avatar/Avatar";
import { Badge } from "../../../Badge/Badge";
import { ChatActionButton } from "../shared/ChatActionButton";
import type { ChatOffer } from "../types";
import styles from "./OfferCard.module.css";

interface Props {
  offer: ChatOffer;
}

/** An offer in the chat: company, title, place and one line. The whole card opens the offer page. */
export const OfferCard = memo(function OfferCard({ offer }: Props) {
  const { t } = useTranslation();
  const { data: sources } = useSources();

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
        <ChatActionButton
          className={styles.link}
          action={{ type: "open-offer", source: offer.source, externalId: offer.external_id, title: offer.title }}
        >
          {offer.title}
        </ChatActionButton>
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
