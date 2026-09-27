import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastItem { id: number; message: string; }

interface ToastCtx { showToast: (msg: string) => void; }

const Ctx = createContext<ToastCtx>({ showToast: () => {} });

export function useToast() { return useContext(Ctx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string) => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{
            background: "var(--text)",
            color: "var(--bg)",
            fontSize: "0.875rem",
            fontWeight: 600,
            padding: "0.6rem 1.2rem",
            borderRadius: "999px",
            boxShadow: "0 4px 20px rgba(0,0,0,.2)",
            animation: "toastIn .2s ease",
            whiteSpace: "nowrap",
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </Ctx.Provider>
  );
}
