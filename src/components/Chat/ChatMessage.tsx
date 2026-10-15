import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { internalLinks } from "../../utils/chatLinks";
import type { ChatItem } from "../../utils/chatMessages";
import { ArrowIcon } from "../Icons/Icons";
import { ChatOfferCard } from "./ChatOfferCard";
import styles from "./ChatMessage.module.css";

interface Props {
  item: ChatItem;
  /** Quick replies are only offered under the latest assistant message. */
  showSuggestions: boolean;
  onPick: (text: string) => void;
  onOpenOffer?: () => void;
}

/** One turn of the conversation: the bubble, then the offers as cards, then the quick replies. */
export function ChatMessage({ item, showSuggestions, onPick, onOpenOffer }: Props) {
  const { t } = useTranslation();
  const mine = item.role === "user";
  const offers = item.offers ?? [];
  const links = internalLinks(item.links);
  const suggestions = showSuggestions ? (item.suggestions ?? []) : [];

  return (
    <div className={`${styles.message} ${mine ? styles.mine : styles.theirs}`}>
      {item.content && (
        <p className={styles.bubble} dir="auto">
          <span className={styles.srOnly}>{mine ? t("chat.you") : t("chat.assistant")}: </span>
          {item.content}
        </p>
      )}

      {offers.length > 0 && (
        <ul className={styles.offers} aria-label={t("chat.offers")}>
          {offers.map((offer) => (
            <li key={`${offer.source}/${offer.external_id}`}>
              <ChatOfferCard offer={offer} onOpen={onOpenOffer} />
            </li>
          ))}
        </ul>
      )}

      {links.length > 0 && (
        <ul className={styles.links} aria-label={t("chat.links")}>
          {links.map((link) => (
            <li key={link.path}>
              <Link to={link.path} className={styles.linkBtn} onClick={onOpenOffer}>
                {link.label}
                <ArrowIcon size={14} className={styles.arrow} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {suggestions.length > 0 && (
        <ul className={styles.chips}>
          {suggestions.map((text) => (
            <li key={text}>
              <button type="button" className={styles.chip} onClick={() => onPick(text)}>
                {text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
