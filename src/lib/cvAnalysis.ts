// Local, in-browser CV analysis — no server, no API, the CV never leaves the
// device. Heuristic keyword extraction against a skills dictionary, mapped to
// the app's role presets. Good enough to power match scoring + filters.

import { ROLES } from "../constants/roles";

export interface CvProfile {
  skills: string[]; // canonical skill names found
  roles: string[]; // ROLES keys inferred from the skills/title
  languages: string[]; // human languages
  seniority: string | null;
  years: number | null;
  locations: string[]; // Israeli areas mentioned
  updatedAt?: string;
}

// Canonical skill -> match terms (lowercased). Kept flat and pragmatic.
const SKILLS: Record<string, string[]> = {
  React: ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs"],
  Angular: ["angular"],
  "Vue.js": ["vue", "vue.js", "vuejs"],
  Svelte: ["svelte"],
  TypeScript: ["typescript", "ts"],
  JavaScript: ["javascript", "js "],
  HTML: ["html"],
  CSS: ["css", "sass", "scss", "tailwind"],
  "Node.js": ["node", "nodejs", "node.js"],
  ".NET": [".net", "dotnet", "c#", "asp.net"],
  Python: ["python"],
  Java: ["java "],
  Go: ["golang", " go "],
  Ruby: ["ruby", "rails"],
  PHP: ["php", "laravel"],
  Rust: ["rust"],
  Kotlin: ["kotlin"],
  Scala: ["scala"],
  Swift: ["swift"],
  "React Native": ["react native"],
  Flutter: ["flutter"],
  iOS: ["ios ", "objective-c"],
  Android: ["android"],
  SQL: ["sql", "postgres", "postgresql", "mysql", "mssql"],
  NoSQL: ["mongodb", "mongo", "dynamodb", "cassandra", "redis"],
  GraphQL: ["graphql"],
  Spark: ["spark", "pyspark"],
  ETL: ["etl", "airflow", "dbt"],
  Databricks: ["databricks"],
  Snowflake: ["snowflake"],
  "Machine Learning": ["machine learning", "ml ", "scikit", "xgboost"],
  "Deep Learning": ["deep learning", "pytorch", "tensorflow", "keras"],
  NLP: ["nlp", "llm", "transformers"],
  "Computer Vision": ["computer vision", "opencv"],
  Docker: ["docker", "container"],
  Kubernetes: ["kubernetes", "k8s"],
  Terraform: ["terraform"],
  "CI/CD": ["ci/cd", "jenkins", "github actions", "gitlab ci"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure"],
  GCP: ["gcp", "google cloud"],
  Linux: ["linux", "bash", "shell"],
  Microservices: ["microservice", "microservices"],
  "REST API": ["rest", "restful", "api "],
  Kafka: ["kafka"],
  Security: ["security", "cyber", "appsec", "infosec", "penetration"],
  QA: ["qa", "quality assurance", "sdet", "selenium", "cypress", "playwright"],
  Salesforce: ["salesforce", "apex", "sfdc"],
  SAP: ["sap", "abap", "hana"],
  Git: ["git", "github", "gitlab", "bitbucket"],
  Agile: ["agile", "scrum", "kanban"],
};

const HUMAN_LANGUAGES: Record<string, string[]> = {
  English: ["english", "anglais", "אנגלית"],
  Hebrew: ["hebrew", "hébreu", "עברית"],
  French: ["french", "français", "צרפתית"],
  Russian: ["russian", "russe", "רוסית"],
  Arabic: ["arabic", "arabe", "ערבית"],
  Spanish: ["spanish", "espagnol", "ספרדית"],
  German: ["german", "allemand", "גרמנית"],
};

const SENIORITY: [string, string][] = [
  ["Principal", "principal"],
  ["Staff", "staff engineer"],
  ["Lead", "lead"],
  ["Architect", "architect"],
  ["Senior", "senior"],
  ["Mid-level", "mid-level"],
  ["Junior", "junior"],
  ["Intern", "intern"],
];

const IL_LOCATIONS = [
  "jerusalem", "tel aviv", "tel-aviv", "ramat gan", "herzliya", "haifa",
  "petah tikva", "raanana", "ra'anana", "netanya", "rehovot", "beer sheva",
  "yokneam", "givatayim", "holon", "kfar saba", "modiin", "nes ziona",
];

/** Collapse text for tolerant matching (drop punctuation noise, keep spaces). */
function norm(text: string): string {
  return ` ${text.toLowerCase().replace(/[\n\r\t]+/g, " ").replace(/\s+/g, " ")} `;
}

function findTerms(hay: string, terms: string[]): boolean {
  return terms.some((term) => hay.includes(term));
}

export function analyzeCv(rawText: string): CvProfile {
  const hay = norm(rawText);

  const skills = Object.entries(SKILLS)
    .filter(([, terms]) => findTerms(hay, terms))
    .map(([name]) => name);

  const skillSet = new Set(skills.map((s) => s.toLowerCase()));
  const roles = ROLES.filter(
    (r) => findTerms(hay, r.terms) || r.terms.some((t) => skillSet.has(t)),
  ).map((r) => r.key);

  const languages = Object.entries(HUMAN_LANGUAGES)
    .filter(([, terms]) => findTerms(hay, terms))
    .map(([name]) => name);

  const seniority = SENIORITY.find(([, term]) => hay.includes(term))?.[0] ?? null;

  const yearsMatch = hay.match(/(\d{1,2})\s*\+?\s*(?:years|yrs|ans|שנים)/);
  const years = yearsMatch ? Number(yearsMatch[1]) : null;

  const locations = IL_LOCATIONS.filter((c) => hay.includes(c)).map((c) =>
    c.replace(/\b\w/g, (m) => m.toUpperCase()),
  );

  return { skills, roles, languages, seniority, years, locations };
}

export interface JobMatch {
  count: number; // number of profile skills found in the offer
  matched: string[]; // which skills matched
}

/** Score an offer against a profile: how many of my skills appear in it. */
export function matchScore(
  text: string,
  profile: CvProfile | null,
): JobMatch {
  if (!profile || profile.skills.length === 0) return { count: 0, matched: [] };
  const hay = norm(text);
  const matched = profile.skills.filter((name) => {
    const terms = SKILLS[name] ?? [name.toLowerCase()];
    return findTerms(hay, terms);
  });
  return { count: matched.length, matched };
}
