// Role presets (mirror of jobs-monitor-api `shared/domain/roles.ts`).
//
// Each role expands to several keywords matched with OR. `strong` terms
// identify the discipline on their own (react, ios, k8s…) and count anywhere in
// an offer; `title` terms are ambiguous (java, go, test…) and are only reliable
// in a job title, so the API restricts them to it. Labels read the same in
// French and Hebrew (mostly Latin tech terms).
export interface Role {
  key: string;
  label: string;
  /** Discipline-identifying terms: title or description. */
  strong: string[];
  /** Ambiguous terms: only meaningful in a title. */
  title: string[];
  /** Every term (strong + title), e.g. to detect roles in a CV. */
  terms: string[];
}

function role(key: string, label: string, strong: string[], title: string[] = []): Role {
  return { key, label, strong, title, terms: [...strong, ...title] };
}

export const ROLES: Role[] = [
  role("fullstack", "Full Stack", ["full stack", "fullstack"]),
  role(
    "frontend",
    "Frontend",
    ["frontend", "front end", "react", "reactjs", "angular", "angularjs", "vue", "vuejs", "svelte", "next.js", "nextjs", "nuxt"],
    ["html", "css", "javascript", "typescript", "ui developer", "web developer"],
  ),
  role(
    "backend",
    "Backend",
    ["backend", "back end", "node.js", "nodejs", ".net", "asp.net", "dotnet", "c#", "golang", "ruby", "rails", "php", "laravel", "scala", "rust", "spring", "django", "flask", "fastapi", "nestjs"],
    ["node", "python", "java", "go", "kotlin", "server side"],
  ),
  role(
    "mobile",
    "Mobile",
    ["mobile", "ios", "android", "react native", "flutter", "swift", "swiftui", "objective-c", "jetpack compose", "xamarin"],
    ["kotlin", "app developer"],
  ),
  role(
    "data",
    "Data",
    ["data engineer", "data analyst", "data scientist", "etl", "big data", "databricks", "snowflake", "bigquery", "airflow", "dbt", "data warehouse", "power bi", "tableau", "analytics engineer"],
    ["data", "analytics", "sql", "spark", "bi"],
  ),
  role(
    "ai",
    "AI / ML",
    ["machine learning", "deep learning", "nlp", "llm", "computer vision", "generative ai", "genai", "mlops", "pytorch", "tensorflow", "data scientist"],
    ["ai", "ml", "artificial intelligence"],
  ),
  role(
    "devops",
    "DevOps",
    ["devops", "sre", "site reliability", "kubernetes", "k8s", "terraform", "ci/cd", "platform engineer", "helm", "ansible"],
    ["docker", "infrastructure", "platform"],
  ),
  role("cloud", "Cloud", ["aws", "azure", "gcp", "google cloud", "cloud architect", "cloud engineer"], ["cloud"]),
  role(
    "security",
    "Security",
    ["cyber", "appsec", "infosec", "penetration", "pentest", "siem", "security engineer", "security researcher", "security analyst"],
    ["security", "soc"],
  ),
  role(
    "qa",
    "QA",
    ["qa", "quality assurance", "sdet", "test automation", "selenium", "cypress"],
    ["test", "testing", "tester", "automation"],
  ),
  role("salesforce", "Salesforce", ["salesforce", "sfdc", "apex", "lwc"]),
  role("sap", "SAP", ["sap", "abap", "hana", "s/4hana"]),
];

const BY_KEY = new Map(ROLES.map((r) => [r.key, r]));

/** Label of a role key (falls back to the key for unknown ones). */
export function roleLabel(key: string): string {
  return BY_KEY.get(key)?.label ?? key;
}
