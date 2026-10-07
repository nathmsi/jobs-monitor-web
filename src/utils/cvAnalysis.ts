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
  titles: string[]; // job titles / headline detected in the CV
  education: string[]; // degrees (B.Sc, M.Sc, Ph.D, MBA…)
  certifications: string[]; // professional certifications detected
  updatedAt?: string;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Coerce any stored/remote profile into a well-formed CvProfile (every list is
 *  an array). Returns null when the core `skills`/`roles` lists are missing. */
export function normalizeProfile(p: unknown): CvProfile | null {
  if (!p || typeof p !== "object") return null;
  const c = p as Partial<CvProfile>;
  if (!Array.isArray(c.skills) || !Array.isArray(c.roles)) return null;
  return {
    ...c,
    skills: strArray(c.skills),
    roles: strArray(c.roles),
    languages: strArray(c.languages),
    locations: strArray(c.locations),
    titles: strArray(c.titles),
    education: strArray(c.education),
    certifications: strArray(c.certifications),
    seniority: c.seniority ?? null,
    years: c.years ?? null,
  };
}

// Canonical skill -> match terms (lowercased). Kept flat and pragmatic.
const SKILLS: Record<string, string[]> = {
  React: ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs"],
  Angular: ["angular"],
  "Vue.js": ["vue", "vue.js", "vuejs"],
  Svelte: ["svelte"],
  Redux: ["redux"],
  TypeScript: ["typescript"],
  JavaScript: ["javascript", "js", "es6"],
  HTML: ["html", "html5"],
  CSS: ["css", "sass", "scss", "tailwind", "styled-components"],
  "Node.js": ["node", "nodejs", "node.js", "express", "nestjs"],
  ".NET": [".net", "dotnet", "c#", "asp.net"],
  "C/C++": ["c++", "c ", "cpp"],
  Python: ["python", "django", "flask", "fastapi"],
  Java: ["java", "spring", "spring boot"],
  Go: ["golang", "go"],
  Ruby: ["ruby", "rails"],
  PHP: ["php", "laravel"],
  Rust: ["rust"],
  Kotlin: ["kotlin"],
  Scala: ["scala"],
  Swift: ["swift"],
  "React Native": ["react native"],
  Flutter: ["flutter"],
  iOS: ["ios", "objective-c"],
  Android: ["android"],
  SQL: ["sql", "postgres", "postgresql", "mysql", "mssql", "oracle"],
  NoSQL: ["mongodb", "mongo", "dynamodb", "cassandra", "redis"],
  Elasticsearch: ["elasticsearch", "elastic", "opensearch"],
  GraphQL: ["graphql", "apollo"],
  gRPC: ["grpc"],
  Spark: ["spark", "pyspark", "hadoop"],
  ETL: ["etl", "airflow", "dbt"],
  Databricks: ["databricks"],
  Snowflake: ["snowflake"],
  "Machine Learning": ["machine learning", "ml", "scikit", "xgboost", "pandas", "numpy"],
  "Deep Learning": ["deep learning", "pytorch", "tensorflow", "keras"],
  NLP: ["nlp", "llm", "transformers", "langchain"],
  "Computer Vision": ["computer vision", "opencv"],
  Docker: ["docker", "container", "containers"],
  Kubernetes: ["kubernetes", "k8s"],
  Terraform: ["terraform", "ansible", "pulumi"],
  "CI/CD": ["ci/cd", "jenkins", "github actions", "gitlab ci", "circleci", "argocd"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure"],
  GCP: ["gcp", "google cloud"],
  Linux: ["linux", "bash", "shell", "unix"],
  Microservices: ["microservice", "microservices"],
  "REST API": ["rest", "restful", "rest api"],
  Kafka: ["kafka", "rabbitmq"],
  Security: ["security", "cyber", "appsec", "infosec", "penetration"],
  QA: ["qa", "quality assurance", "sdet", "selenium", "cypress", "playwright", "jest"],
  Salesforce: ["salesforce", "apex", "sfdc"],
  SAP: ["sap", "abap", "hana"],
  Git: ["git", "github", "gitlab", "bitbucket"],
  Agile: ["agile", "scrum", "kanban", "jira"],
  Figma: ["figma", "sketch", "adobe xd"],
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

// Checked in order — the explicit level ladder (senior/principal/staff/…) wins
// over "lead"/"architect", which more often appear as role words or in
// certifications ("Solutions Architect") than as the candidate's actual level.
const SENIORITY: [string, string][] = [
  ["Principal", "principal"],
  ["Staff", "staff engineer"],
  ["Senior", "senior"],
  ["Mid-level", "mid-level"],
  ["Junior", "junior"],
  ["Intern", "intern"],
  ["Lead", "lead"],
  ["Architect", "architect"],
];

const IL_LOCATIONS = [
  "jerusalem", "tel aviv", "tel-aviv", "ramat gan", "herzliya", "haifa",
  "petah tikva", "raanana", "ra'anana", "netanya", "rehovot", "beer sheva",
  "yokneam", "givatayim", "holon", "kfar saba", "modiin", "nes ziona",
];

// Canonical job title -> match terms. Ordered from most specific to least so we
// keep the meaningful headline ("Senior Frontend Engineer") over the generic.
const TITLES: Record<string, string[]> = {
  "Full Stack Engineer": ["full stack engineer", "fullstack engineer", "full stack developer"],
  "Frontend Engineer": ["frontend engineer", "front-end engineer", "frontend developer", "front end developer"],
  "Backend Engineer": ["backend engineer", "back-end engineer", "backend developer", "back end developer"],
  "Mobile Developer": ["mobile developer", "mobile engineer"],
  "iOS Developer": ["ios developer", "ios engineer"],
  "Android Developer": ["android developer", "android engineer"],
  "Data Scientist": ["data scientist"],
  "Data Engineer": ["data engineer"],
  "Data Analyst": ["data analyst"],
  "ML Engineer": ["machine learning engineer", "ml engineer", "ai engineer"],
  "DevOps Engineer": ["devops engineer", "devops"],
  "SRE": ["site reliability engineer", "sre"],
  "Cloud Engineer": ["cloud engineer", "cloud architect"],
  "QA Engineer": ["qa engineer", "automation engineer", "sdet", "test engineer"],
  "Security Engineer": ["security engineer", "security researcher"],
  "Solutions Architect": ["solutions architect", "solution architect"],
  "Software Architect": ["software architect", "system architect"],
  "Engineering Manager": ["engineering manager", "r&d manager", "team lead", "tech lead", "team leader"],
  "Product Manager": ["product manager", "product owner"],
  "Software Engineer": ["software engineer", "software developer", "web developer", "programmer"],
};

// Canonical degree -> match terms.
const EDUCATION: Record<string, string[]> = {
  "Ph.D": ["ph.d", "phd", "doctorate", "doctoral"],
  MBA: ["mba"],
  "M.Sc": ["m.sc", "msc", "master of science", "master's", "masters", "m.a."],
  "B.Sc": ["b.sc", "bsc", "bachelor of science", "bachelor's", "bachelors", "b.a.", "undergraduate"],
};

// Canonical certification -> match terms.
const CERTIFICATIONS: Record<string, string[]> = {
  "AWS Certified": ["aws certified", "aws certification", "solutions architect associate"],
  "Azure Certified": ["azure certified", "az-900", "az-104", "az-204"],
  "GCP Certified": ["gcp certified", "google cloud certified"],
  CKA: ["cka", "certified kubernetes administrator"],
  CKAD: ["ckad", "certified kubernetes application developer"],
  CISSP: ["cissp"],
  OSCP: ["oscp"],
  CCNA: ["ccna"],
  PMP: ["pmp"],
  "Scrum Master": ["scrum master", "csm", "psm"],
};

/** Collapse text for tolerant matching (drop punctuation noise, keep spaces). */
function norm(text: string): string {
  return ` ${text.toLowerCase().replace(/[\n\r\t]+/g, " ").replace(/\s+/g, " ")} `;
}

// Word-boundary matcher: a term matches only when it is not glued to another
// alphanumeric run — so "scala" no longer fires on "scalable" and "go" no
// longer fires on "google". Boundaries are only enforced on the sides that
// actually start/end with a word char, so ".net" still matches "asp.net".
const RE_CACHE = new Map<string, RegExp>();
function termRegex(term: string): RegExp {
  const cached = RE_CACHE.get(term);
  if (cached) return cached;
  const t = term.trim();
  const esc = t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const pre = /^[a-z0-9]/i.test(t) ? "(?<![a-z0-9])" : "";
  const post = /[a-z0-9]$/i.test(t) ? "(?![a-z0-9])" : "";
  const re = new RegExp(`${pre}${esc}${post}`, "i");
  RE_CACHE.set(term, re);
  return re;
}

function findTerms(hay: string, terms: string[]): boolean {
  return terms.some((term) => termRegex(term).test(hay));
}

/** Every canonical entry whose terms appear in the text. */
function allMatches(hay: string, dict: Record<string, string[]>): string[] {
  return Object.entries(dict)
    .filter(([, terms]) => findTerms(hay, terms))
    .map(([name]) => name);
}

export function analyzeCv(rawText: string): CvProfile {
  const hay = norm(rawText);

  const skills = allMatches(hay, SKILLS);

  const skillSet = new Set(skills.map((s) => s.toLowerCase()));
  const roles = ROLES.filter(
    (r) => findTerms(hay, r.terms) || r.terms.some((t) => skillSet.has(t.trim())),
  ).map((r) => r.key);

  const languages = allMatches(hay, HUMAN_LANGUAGES);

  const seniority =
    SENIORITY.find(([, term]) => termRegex(term).test(hay))?.[0] ?? null;

  const yearsMatch = hay.match(/(\d{1,2})\s*\+?\s*(?:years|yrs|ans|שנים)/);
  const years = yearsMatch ? Number(yearsMatch[1]) : null;

  const locations = IL_LOCATIONS.filter((c) => termRegex(c).test(hay)).map((c) =>
    c.replace(/\b\w/g, (m) => m.toUpperCase()),
  );

  const titles = allMatches(hay, TITLES);
  const education = allMatches(hay, EDUCATION);
  const certifications = allMatches(hay, CERTIFICATIONS);

  return {
    skills,
    roles,
    languages,
    seniority,
    years,
    locations,
    titles,
    education,
    certifications,
  };
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
  if (!profile || !Array.isArray(profile.skills) || profile.skills.length === 0) return { count: 0, matched: [] };
  const hay = norm(text);
  const matched = profile.skills.filter((name) => {
    const terms = SKILLS[name] ?? [name.toLowerCase()];
    return findTerms(hay, terms);
  });
  return { count: matched.length, matched };
}

/** Does the offer match one of the profile's roles (frontend, full stack…)? */
export function roleMatches(text: string, profile: CvProfile | null): boolean {
  if (!profile || !Array.isArray(profile.roles) || profile.roles.length === 0) return false;
  const hay = norm(text);
  // Whole-word match on the discipline-identifying terms: "ios" must not match
  // "scenarios", and ambiguous words (java, go, test) are left to skill scoring.
  const terms = ROLES.filter((r) => profile.roles.includes(r.key)).flatMap(
    (r) => r.strong,
  );
  return findTerms(hay, terms);
}

/** Overall relevance for ranking: skills matches + a bonus if the role fits. */
export function rankScore(text: string, profile: CvProfile | null): number {
  return matchScore(text, profile).count * 2 + (roleMatches(text, profile) ? 3 : 0);
}
