// Role presets. Each expands to several keywords matched with OR — clicking
// "Frontend" finds React OR Angular OR HTML OR CSS… Labels read the same in
// French and Hebrew (mostly Latin tech terms).
export interface Role {
  key: string;
  label: string;
  terms: string[];
}

export const ROLES: Role[] = [
  {
    key: "fullstack",
    label: "Full Stack",
    terms: ["full stack", "fullstack"],
  },
  {
    key: "frontend",
    label: "Frontend",
    terms: [
      "frontend", "front end", "react", "angular", "vue", "svelte",
      "html", "css", "javascript", "typescript", "next.js",
    ],
  },
  {
    key: "backend",
    label: "Backend",
    terms: [
      "backend", "back end", "node", "nodejs", "node.js", ".net", "c#",
      "python", "java", "go", "golang", "ruby", "php", "scala", "rust",
      "kotlin", "spring",
    ],
  },
  {
    key: "mobile",
    label: "Mobile",
    terms: [
      "mobile", "ios", "android", "react native", "flutter", "swift",
      "kotlin", "objective-c",
    ],
  },
  {
    key: "data",
    label: "Data",
    terms: [
      "data engineer", "data analyst", "analytics", "data scientist",
      "sql", "spark", "etl", "big data", "bi ", "databricks", "snowflake",
    ],
  },
  {
    key: "ai",
    label: "AI / ML",
    terms: [
      "machine learning", "deep learning", " ai ", " ml ", "nlp", "llm",
      "computer vision", "data scientist",
    ],
  },
  {
    key: "devops",
    label: "DevOps",
    terms: [
      "devops", "sre", "site reliability", "kubernetes", "k8s", "docker",
      "terraform", "ci/cd", "platform engineer", "infrastructure",
    ],
  },
  {
    key: "cloud",
    label: "Cloud",
    terms: ["cloud", "aws", "azure", "gcp", "google cloud"],
  },
  {
    key: "security",
    label: "Security",
    terms: [
      "security", "cyber", "appsec", "infosec", "soc ", "penetration",
      "vulnerability",
    ],
  },
  {
    key: "qa",
    label: "QA",
    terms: ["qa", "quality assurance", "automation", "sdet", "test"],
  },
  {
    key: "salesforce",
    label: "Salesforce",
    terms: [
      "salesforce", "sfdc", "apex", "salesforce developer",
      "salesforce admin", "salesforce architect",
    ],
  },
  {
    key: "sap",
    label: "SAP",
    terms: ["sap", "abap", "hana", "s/4hana"],
  },
];
