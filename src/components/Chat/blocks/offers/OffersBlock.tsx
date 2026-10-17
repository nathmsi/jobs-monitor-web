import { useTranslation } from "react-i18next";

import type { BlockOf, BlockViewProps } from "../types";
import { OfferCard } from "./OfferCard";
import styles from "./OffersBlock.module.css";

/** The offers the assistant chose, as cards that open the normal offer page. */
export function OffersBlock({ block }: BlockViewProps<BlockOf<"offers">>) {
  const { t } = useTranslation();
  return (
    <ul className={styles.offers} aria-label={t("chat.offers")}>
      {block.offers.map((offer) => (
        <li key={`${offer.source}/${offer.external_id}`}>
          <OfferCard offer={offer} />
        </li>
      ))}
    </ul>
  );
}
