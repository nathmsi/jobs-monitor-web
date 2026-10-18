import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import type { ChatController } from "../../../hooks/useChat";
import { useChatFrame } from "../../../hooks/useChatFrame";
import { useChatKeyboard } from "../../../hooks/useChatKeyboard";
import type { ChatShareController } from "../../../hooks/useChatShare";
import { HANDLES, type Frame } from "../../../utils/chatFrame";
import { CloseIcon, CollapseIcon, ExpandIcon, GripIcon, PlusIcon } from "../../Icons/Icons";
import { useChatContext } from "../../../providers/chat/useChatContext";
import { startersFor } from "../../../utils/chatStarters";
import { ChatComposer } from "../composer/ChatComposer";
import { ChatShareBar } from "../composer/ChatShareBar";
import { ChatMessage } from "../conversation/ChatMessage";
import styles from "./ChatPanel.module.css";

const KNOWN_STEPS = new Set(["search_offers", "browse_offers", "read_offer", "market_stats", "site_guide"]);

interface Props {
  chat: ChatController;
  onClose: () => void;
  share: ChatShareController;
  /** Where the user put the window, and how big (desktop); null = the default place. */
  frame: Frame | null;
  onFrameChange: (frame: Frame | null) => void;
  /** What was typed and not sent: kept by the widget, so closing the window never loses it. */
  draft: string;
  onDraftChange: (text: string) => void;
}

/** The conversation window. All the logic lives in `useChat`; this only draws it. */
export function ChatPanel({ chat, onClose, share, frame, onFrameChange, draft, onDraftChange }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const logRef = useRef<HTMLDivElement>(null);
  const { items, status, step, send, retry, reset } = chat;
  const { panelRef, dragging, large, startMove, startResize, reset: resetFrame, toggle: toggleSize, onKeyDown: onFrameKey } =
    useChatFrame({ frame, onCommit: onFrameChange });

  // Keep the latest message in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [items.length, status]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (onFrameKey(e)) return;
    if (e.key === "Escape") onClose();
  };

  const lastAssistant = items.findLast((i) => i.role === "assistant");
  useChatKeyboard(panelRef);

  // What to suggest depends on the page the user is on and on whether the CV is shared.
  const { page, config } = useChatContext();
  const starters = startersFor(page, config.sharing);
  const stepLabel = t(step && KNOWN_STEPS.has(step) ? `chat.step.${step}` : "chat.thinking");

  return (
    <section
      ref={panelRef}
      data-chat-root=""
      className={`${styles.panel} ${dragging ? styles.dragging : ""}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown"
      onKeyDown={onKeyDown}
    >
      <div className={styles.handles} aria-hidden="true">
        {HANDLES.map((handle) => (
          <span key={handle} data-testid={`chat-resize-${handle}`} className={`${styles.handle} ${styles[`handle_${handle}`]}`} onPointerDown={startResize(handle)} />
        ))}
      </div>

      <header className={styles.header} onPointerDown={startMove} onDoubleClick={(e) => !(e.target as HTMLElement).closest("button") && resetFrame()} title={t("chat.moveHint")}>
        <GripIcon size={14} className={styles.grip} />
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
            onClick={toggleSize}
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
            <p className={styles.introText}>
              <span className={styles.introLong}>{t("chat.intro")}</span>
              <span className={styles.introShort}>{t("chat.introShort")}</span>
            </p>
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
            <ChatMessage key={item.id} item={item} active={item === lastAssistant && status === "idle"} />
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
      <ChatComposer
        onSend={send}
        busy={status === "thinking"}
        onAttach={share.attach}
        attaching={share.attaching}
        value={draft}
        onChange={onDraftChange}
      />
      <p className={styles.disclaimer}>{t("chat.disclaimer")}</p>
    </section>
  );
}
