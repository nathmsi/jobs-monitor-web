import { useContext } from "react";

import { ProfileContext, type ProfileValue } from "./ProfileContext";

export function useProfile(): ProfileValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
