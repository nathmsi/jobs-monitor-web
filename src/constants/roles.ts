// Quick role presets. Clicking a chip fills the free-text query, which each
// source turns into a native search (Ness/Malam) or a local filter (Matrix).
// Labels are Latin, so they read the same in French and Hebrew.
export interface Role {
  key: string;
  label: string;
  q: string;
}

export const ROLES: Role[] = [
  { key: "fullstack", label: "Full Stack", q: "Full Stack" },
  { key: "frontend", label: "Frontend", q: "Frontend" },
  { key: "backend", label: "Backend", q: "Backend" },
  { key: "devops", label: "DevOps", q: "DevOps" },
  { key: "mobile", label: "Mobile", q: "Mobile" },
  { key: "data", label: "Data / AI", q: "AI" },
];
