import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import type { ChatController } from "../../hooks/useChat";
import type { ChatShareController } from "../../hooks/useChatShare";
import type { ChatSize } from "../../utils/chatPrefs";
import { CloseIcon, CollapseIcon, ExpandIcon, PlusIcon } from "../Icons/Icons";
import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";
import { ChatShareBar } from "./ChatShareBar";
import styles from "./ChatPanel.module.css";

const STARTERS = ["backend", "jerusalem", "howto", "advice"] as const;
/** With the CV shared, the first question to ask is the obvious one. */
const CV_STARTER = "forMe";
const KNOWN_STEPS = new Set(["search_offers", "browse_offers", "read_offer", "market_stats", "site_guide"]);

interface Props {
  chat: ChatController;
  onClose: () => void;
  onOpenOffer: () => void;
  share: ChatShareController;
  /** Window size on a desktop (a phone always has the whole screen). */
  size: ChatSize;
  onToggleSize: () => void;
}

/** The conversation window. All the logic lives in `useChat`; this only draws it. */
export function ChatPanel({ chat, onClose, onOpenOffer, share, size, onToggleSize }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const logRef = useRef<HTMLDivElement>(null);
  const { items, status, step, send, retry, reset } = chat;

  // Keep the latest message in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [items.length, status]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const lastAssistant = items.findLast((i) => i.role === "assistant");
  const starters = share.payload ? [CV_STARTER, ...STARTERS.slice(0, 3)] : STARTERS;
  const large = size === "large";
  const stepLabel = t(step && KNOWN_STEPS.has(step) ? `chat.step.${step}` : "chat.thinking");

  return (
    <section className={`${styles.panel} ${large ? styles.large : ""}`} role="dialog" aria-modal="false" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t("chat.title")}
        </h2>
        <div className={styles.actions}>
          <button type="button" className={styles.iconBtn} onClick={reset} disabled={items.length === 0} title={t("chat.newChat")} aria-label={t("chat.newChat")}>
            <PlusIcon size={18} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.sizeBtn}`}
            onClick={onToggleSize}
            aria-pressed={large}
            title={large ? t("chat.collapse") : t("chat.expand")}
            aria-label={large ? t("chat.collapse") : t("chat.expand")}
          >
            {large ? <CollapseIcon size={18} /> : <ExpandIcon size={18} />}
          </button>
          <button type="button" className={styles.iconBtn} onClick={onClose} title={t("chat.close")} aria-label={t("chat.close")}>
            <CloseIcon size={18} />
          </button>
        </div>
      </header>

      <div className={styles.log} ref={logRef} role="log" aria-label={t("chat.log")}>
        {items.length === 0 ? (
          <div className={styles.intro}>
            <p className={styles.introText}>{t("chat.intro")}</p>
            <p className={styles.startersLabel}>{t("chat.startersLabel")}</p>
            <ul className={styles.starters}>
              {starters.map((key) => (
                <li key={key}>
                  <button type="button" className={styles.starter} onClick={() => send(t(`chat.starters.${key}`))}>
                    {t(`chat.starters.${key}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          items.map((item) => (
            <ChatMessage
              key={item.id}
              item={item}
              showSuggestions={item === lastAssistant && status === "idle"}
              onPick={send}
              onOpenOffer={onOpenOffer}
            />
          ))
        )}

        {status === "thinking" && (
          <p className={styles.status} role="status">
            <span className={styles.dots} aria-hidden="true" />
            {stepLabel}
          </p>
        )}

        {status === "error" && (
          <div className={styles.error} role="alert">
            <span>{t("chat.error")}</span>
            <button type="button" className={styles.retry} onClick={retry}>
              {t("chat.retry")}
            </button>
          </div>
        )}
      </div>

      <ChatShareBar share={share} />
      <ChatComposer onSend={send} busy={status === "thinking"} onAttach={share.attach} attaching={share.attaching} />
      <p className={styles.disclaimer}>{t("chat.disclaimer")}</p>
    </section>
  );
}
