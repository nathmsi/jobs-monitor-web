import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { MAX_MESSAGE_CHARS } from "../../utils/chatMessages";
import { SendIcon } from "../Icons/Icons";
import styles from "./ChatComposer.module.css";

interface Props {
  onSend: (text: string) => void;
  /** True while the assistant answers: typing stays possible, sending does not. */
  busy: boolean;
}

/** The message box. Enter sends, Shift+Enter adds a line. Takes the focus when it appears. */
export function ChatComposer({ onSend, busy }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const canSend = text.trim().length > 0 && !busy;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    onSend(text);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <textarea
        ref={inputRef}
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={MAX_MESSAGE_CHARS}
        aria-label={t("chat.inputLabel")}
        placeholder={t("chat.placeholder")}
        dir="auto"
      />
      <button type="submit" className={styles.send} disabled={!canSend} aria-label={t("chat.send")}>
        <SendIcon size={18} className={styles.sendIcon} />
      </button>
    </form>
  );
}
