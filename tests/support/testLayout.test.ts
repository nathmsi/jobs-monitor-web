import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import config from "../../vite.config";

/**
 * The layout of the tests is a rule (see tests/README.md), and a rule nobody checks drifts.
 * Every test file must be found by exactly one Vitest project, and sit where its level says.
 */
const ROOT = join(__dirname, "..", "..");
const SKIP = new Set(["node_modules", "dist", "e2e", "coverage", "test-results", "playwright-report", ".git", ".vercel"]);

function testFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) testFiles(path, out);
    else if (/\.test\.tsx?$/.test(name)) out.push(relative(ROOT, path).split(sep).join("/"));
  }
  return out;
}

// The few glob forms the project includes use: a double star and slash (any folders), a star (a name), literal dots.
function globToRegExp(glob: string): RegExp {
  const pattern = glob
    .replace(/\./g, "\\.")
    .replace(/\*\*\//g, "@@ANY-FOLDERS@@")
    .replace(/\*/g, "[^/]*")
    .replace(/@@ANY-FOLDERS@@/g, "(.*/)?");
  return new RegExp(`^${pattern}$`);
}

const files = testFiles(ROOT);
const level = (file: string): string | null => {
  const projects = (config as { test?: { projects?: { test: { name: string; include: string[] } }[] } }).test?.projects ?? [];
  const hits = projects.filter((p) => p.test.include.some((glob) => globToRegExp(glob).test(file)));
  return hits.length === 1 ? hits[0].test.name : null;
};

describe("the layout of the tests", () => {
  it("finds the test files at all", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("every test file is run by exactly one Vitest project (none is silently left out)", () => {
    const orphans = files.filter((f) => level(f) === null);
    expect(orphans).toEqual([]);
  });

  it("a .test.ts is logic (unit), a .test.tsx is React: a component or hook next to its code, or an integration test", () => {
    for (const file of files) {
      expect(level(file), file).toBe(file.endsWith(".tsx") ? (file.startsWith("tests/integration/") ? "integration" : "component") : "unit");
    }
  });

  it("integration tests sit in tests/integration/<feature>/, one folder deep", () => {
    const wrong = files.filter((f) => f.startsWith("tests/integration/") && !/^tests\/integration\/[a-z-]+\/[A-Za-z-]+\.test\.tsx$/.test(f));
    expect(wrong).toEqual([]);
  });

  it("the level is told by the folder and the extension, not by a suffix in the name", () => {
    const suffixed = files.filter((f) => /\.(unit|component|integration|crash|malformed)\.test\.tsx?$/.test(f));
    expect(suffixed).toEqual([]);
  });

  it("a test file is named after what it tests: it has a sibling to test (or lives in tests/)", () => {
    const orphanNames = files.filter((f) => {
      if (f.startsWith("tests/") || f.startsWith("api/")) return false;
      const base = f.replace(/\.test\.tsx?$/, "");
      return !["", ".ts", ".tsx"].some((ext) => {
        try {
          return statSync(join(ROOT, base + ext)).isFile();
        } catch {
          return false;
        }
      });
    });
    // These are tests of an idea that spans files; each is listed on purpose.
    expect(orphanNames).toEqual([]);
  });
});
