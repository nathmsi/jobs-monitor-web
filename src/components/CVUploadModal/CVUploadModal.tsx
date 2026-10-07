import { useRef } from "react";
import { useTranslation } from "react-i18next";
import styles from "./CVUploadModal.module.css";

export function CVUploadModal({
  open,
  onClose,
  onUpload,
  busy,
  error,
  existingCvs,
  selectedCvId,
  onSelectCv,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  busy?: boolean;
  error?: string | null;
  existingCvs?: Array<{ id: string; name: string }>;
  selectedCvId?: string;
  onSelectCv?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("cvModal.title")}</h2>
          <button className={styles.closeBtn} onClick={onClose} title={t("cvModal.close")} aria-label={t("cvModal.close")}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {existingCvs && existingCvs.length > 0 && (
            <div className={styles.existing}>
              <label className={styles.existingLabel} htmlFor="cvModalSelect">
                {t("cvModal.selectExisting")}
              </label>
              <select
                id="cvModalSelect"
                className={styles.existingSelect}
                value={selectedCvId ?? ""}
                onChange={(e) => {
                  onSelectCv?.(e.target.value);
                  onClose();
                }}
              >
                <option value="">{t("cvModal.choose")}</option>
                {existingCvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.uploadHeading}>
            {existingCvs && existingCvs.length > 0 ? t("cvModal.orUpload") : t("cvModal.uploadStart")}
          </div>

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
            <div className={styles.dropzoneText}>{t("cvModal.drop")}</div>
            <div className={styles.dropzoneOr}>{t("cvModal.or")}</div>
            <button className={styles.browseBtn} disabled={busy}>
              {busy ? t("coach.library.adding") : t("cvModal.browse")}
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

          <p className={styles.hint}>{t("cvModal.formats")}</p>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={busy}>
            {t("cvModal.cancel")}
          </button>
        </div>
      </div>
    </>
  );
}
