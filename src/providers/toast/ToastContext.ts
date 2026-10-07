import { createContext } from "react";

export interface ToastValue {
  showToast: (msg: string) => void;
}

/** No-op default so components can render (e.g. in tests) without a provider. */
export const ToastContext = createContext<ToastValue>({ showToast: () => {} });
