import { useRef } from "react";
import { useTranslation } from "react-i18next";
import styles from "./CVUploadModal.module.css";

export function CVUploadModal({
  open,
  onClose,
  onUpload,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  busy?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>📄 Upload Your CV</h2>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.lead}>Upload a PDF of your CV to get started</p>

          {error && <div className={styles.error}>⚠ {error}</div>}

          <div
            className={styles.dropzone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type === "application/pdf") {
                onUpload(file);
              }
            }}
            onClick={() => fileRef.current?.click()}
          >
            <div className={styles.dropzoneIcon}>📑</div>
            <div className={styles.dropzoneText}>Drag and drop your PDF here</div>
            <div className={styles.dropzoneOr}>or</div>
            <button className={styles.browseBtn} disabled={busy}>
              {busy ? t("coach.library.adding") : "Browse files"}
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />

          <p className={styles.hint}>Supported formats: PDF only · Max 10MB</p>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
