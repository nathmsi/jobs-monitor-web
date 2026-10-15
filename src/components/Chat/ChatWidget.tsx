import { Suspense, lazy, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useChat } from "../../hooks/useChat";
import { useChatPrefs } from "../../hooks/useChatPrefs";
import { useChatShare } from "../../hooks/useChatShare";
import { ChatIcon, CloseIcon, SparkleIcon } from "../Icons/Icons";
import styles from "./ChatWidget.module.css";

/** The panel is a separate chunk: it downloads when the launcher is touched, not with the page. */
const loadChatPanel = () => import("./ChatPanel").then((m) => ({ default: m.ChatPanel }));
const ChatPanel = lazy(loadChatPanel);

const SMALL_SCREEN = "(max-width: 640px)";

/**
 * The assistant on every page: a launcher, and the conversation window when it is open.
 * The conversation lives here, so closing the window never loses an answer on its way.
 */
export function ChatWidget() {
  const { t } = useTranslation();
  const { prefs, update } = useChatPrefs();
  const share = useChatShare(prefs.share, (share) => update({ share }));
  const chat = useChat(share.payload);
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  // On a phone the window covers the page: open an offer and the chat steps aside.
  const onOpenOffer = useCallback(() => {
    if (window.matchMedia(SMALL_SCREEN).matches) setOpen(false);
  }, []);

  const label = open ? t("chat.close") : t("chat.launcher");

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <ChatPanel
            chat={chat}
            share={share}
            size={prefs.size}
            onToggleSize={() => update({ size: prefs.size === "large" ? "compact" : "large" })}
            onClose={close}
            onOpenOffer={onOpenOffer}
          />
        </Suspense>
      )}
      <button
        ref={launcherRef}
        type="button"
        className={`${styles.launcher} ${open ? styles.open : ""}`}
        onClick={() => setOpen((o) => !o)}
        onPointerEnter={loadChatPanel}
        onFocus={loadChatPanel}
        aria-expanded={open}
        aria-label={open ? label : undefined}
        title={open ? label : t("chat.launcherHint")}
      >
        {open ? (
          <CloseIcon size={22} />
        ) : (
          <>
            <ChatIcon size={22} className={styles.icon} />
            <span className={styles.label}>{label}</span>
            <span className={styles.spark} aria-hidden="true">
              <SparkleIcon size={12} />
            </span>
          </>
        )}
      </button>
    </>
  );
}
