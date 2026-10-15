import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { MAX_MESSAGE_CHARS } from "../../utils/chatMessages";
import { PaperclipIcon, SendIcon } from "../Icons/Icons";
import styles from "./ChatComposer.module.css";

interface Props {
  onSend: (text: string) => void;
  /** True while the assistant answers: typing stays possible, sending does not. */
  busy: boolean;
  /** Adds a CV (PDF). Without it, there is no paperclip. */
  onAttach?: (file: File) => void;
  attaching?: boolean;
  /** The text being typed, when the parent keeps it (so closing the window does not lose it). */
  value?: string;
  onChange?: (text: string) => void;
}

/** The message box. Enter sends, Shift+Enter adds a line. Takes the focus when it appears. */
export function ChatComposer({ onSend, busy, onAttach, attaching = false, value, onChange }: Props) {
  const { t } = useTranslation();
  const [own, setOwn] = useState("");
  const text = value ?? own;
  const setText = (next: string) => (onChange ? onChange(next) : setOwn(next));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      {onAttach && (
        <>
          <button
            type="button"
            className={styles.attach}
            onClick={() => fileRef.current?.click()}
            disabled={attaching}
            aria-label={t("chat.attach")}
            title={t("chat.attachHint")}
          >
            <PaperclipIcon size={18} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            data-testid="chat-cv-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onAttach(file);
            }}
          />
        </>
      )}
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
