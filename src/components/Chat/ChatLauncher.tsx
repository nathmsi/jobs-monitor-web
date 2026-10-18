import type { Ref } from "react";
import { useTranslation } from "react-i18next";

import { ChatIcon, CloseIcon, SparkleIcon } from "../Icons/Icons";
import styles from "./ChatLauncher.module.css";

interface Props {
  open: boolean;
  onClick: () => void;
  /** The window is a separate chunk: the launcher starts loading it when it is touched. */
  onPrefetch: () => void;
  ref: Ref<HTMLButtonElement>;
}

/**
 * The button that opens and closes the chat: a labelled pill on a desktop, a small round button on a
 * phone, and a plain "close" while the window is open. It is part of the chat (`data-chat-root`), so
 * pressing it is never an "outside click".
 */
export function ChatLauncher({ open, onClick, onPrefetch, ref }: Props) {
  const { t } = useTranslation();
  const label = open ? t("chat.close") : t("chat.launcher");

  return (
    <button
      ref={ref}
      data-chat-root=""
      type="button"
      className={`${styles.launcher} ${open ? styles.open : ""}`}
      onClick={onClick}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
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
  );
}
