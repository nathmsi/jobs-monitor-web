import { useContext } from "react";

import { ToastContext, type ToastValue } from "./ToastContext";

export function useToast(): ToastValue {
  return useContext(ToastContext);
}
