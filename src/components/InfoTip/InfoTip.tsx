import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./InfoTip.module.css";

const EDGE = 8;

/**
 * A small "?" that explains something in one or two sentences. It opens on tap
 * or click (hover does not exist on a phone), closes on Escape or a tap
 * elsewhere, and the text is linked to the button for screen readers.
 */
export function InfoTip({ text, className = "" }: { text: string; className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep the bubble inside the screen, whatever side of the page the "?" is on.
  useLayoutEffect(() => {
    if (!open || !bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    const base = rect.left - shift;
    const width = rect.width;
    const max = document.documentElement.clientWidth - EDGE;
    const next = base < EDGE ? EDGE - base : base + width > max ? max - (base + width) : 0;
    if (next !== shift) setShift(next);
  }, [open, shift]);

  return (
    <span ref={wrapRef} className={`${styles.wrap} ${className}`}>
      <button
        type="button"
        className={styles.btn}
        aria-label={t("info.label")}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open && (
        <span
          ref={bubbleRef}
          id={id}
          role="note"
          className={styles.bubble}
          style={{ translate: `${shift}px 0` }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
