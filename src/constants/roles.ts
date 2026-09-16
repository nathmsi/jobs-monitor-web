// Quick role/keyword presets. Clicking a chip fills the free-text query,
// matched (space/hyphen-insensitive) against job title + excerpt.
// Labels are mostly Latin, so they read the same in French and Hebrew.
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
  { key: "data", label: "Data", q: "Data" },
  { key: "ai", label: "AI / ML", q: "AI" },
  { key: "qa", label: "QA", q: "QA" },
  { key: "cloud", label: "Cloud", q: "Cloud" },
  { key: "security", label: "Security", q: "Security" },
  { key: "salesforce", label: "Salesforce", q: "Salesforce" },
  { key: "sap", label: "SAP", q: "SAP" },
  { key: "react", label: "React", q: "React" },
  { key: "dotnet", label: ".NET", q: ".NET" },
];
