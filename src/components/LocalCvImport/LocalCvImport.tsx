import { useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";

import { useLocalCvImport } from "../../hooks/useLocalCvImport";
import { DocumentIcon } from "../Icons/Icons";
import styles from "./LocalCvImport.module.css";

interface Props {
  /** A profile already exists: show it as done, with a way to replace it. */
  hasProfile: boolean;
  skillCount: number;
  /** Called after a CV was analysed and the profile saved. */
  onImported?: () => void;
  /** Sign-in is optional: offered as a way to keep CVs across devices. */
  onSignIn?: () => void;
}

/**
 * Add a CV without an account: drop a PDF or paste the text. Everything is
 * analysed in the browser. Shown on the profile page for signed-out visitors.
 */
export function LocalCvImport({ hasProfile, skillCount, onImported, onSignIn }: Props) {
  const { t } = useTranslation();
  const { busy, error, fromFile, fromText, clearError } = useLocalCvImport();
  const [editing, setEditing] = useState(!hasProfile);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const done = (ok: boolean) => {
    if (!ok) return;
    setText("");
    setEditing(false);
    onImported?.();
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") done(await fromFile(file));
  };

  if (!editing) {
    return (
      <div className={styles.done}>
        <div className={styles.doneInfo}>
          <span className={styles.dot} aria-hidden="true" />
          <span>{t("cvImport.done", { count: skillCount })}</span>
        </div>
        <button type="button" className={styles.link} onClick={() => setEditing(true)}>
          {t("cvImport.replace")}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.box}>
      <p className={styles.privacy}>{t("cvImport.privacy")}</p>

      <div
        className={`${styles.drop} ${dragging ? styles.dropActive : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <DocumentIcon size={22} strokeWidth={1.7} />
        <span className={styles.dropText}>{t("cvImport.drop")}</span>
        <button type="button" className={styles.browse} disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? t("cvImport.reading") : t("cvImport.browse")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          hidden
          data-testid="cv-file-input"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) done(await fromFile(file));
          }}
        />
      </div>

      <div className={styles.or}>{t("cvImport.or")}</div>

      <label className={styles.label} htmlFor="cv-paste">{t("cvImport.pasteLabel")}</label>
      <textarea
        id="cv-paste"
        className={styles.textarea}
        value={text}
        rows={6}
        placeholder={t("cvImport.pastePlaceholder")}
        onChange={(e) => {
          setText(e.target.value);
          if (error) clearError();
        }}
      />

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={busy || !text.trim()} onClick={() => done(fromText(text))}>
          {t("cvImport.analyze")}
        </button>
        {hasProfile && (
          <button type="button" className={styles.link} onClick={() => setEditing(false)}>
            {t("cvImport.cancel")}
          </button>
        )}
        {onSignIn && (
          <button type="button" className={styles.link} onClick={onSignIn}>
            {t("cvImport.signInHint")}
          </button>
        )}
      </div>
    </div>
  );
}
