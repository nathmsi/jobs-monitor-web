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
          {existingCvs && existingCvs.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                Or select existing CV
              </label>
              <select
                value={selectedCvId ?? ""}
                onChange={(e) => {
                  onSelectCv?.(e.target.value);
                  onClose();
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--card)",
                  color: "var(--text)",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                }}
              >
                <option value="">Choose a CV...</option>
                {existingCvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ textAlign: "center", margin: "1rem 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {existingCvs && existingCvs.length > 0 ? "Or upload a new one" : "Upload a PDF of your CV to get started"}
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
