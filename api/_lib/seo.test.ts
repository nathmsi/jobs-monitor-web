import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { Job, SourceInfo } from "../../src/types.js";
import { createHandler, type Res } from "./handler.js";
import { escapeHtml, injectIntoShell, jsonForScript, paragraphs } from "./html.js";
import { jobPostingJsonLd } from "./jsonLd.js";
import { matchRoute } from "./routes.js";
import { buildSitemap } from "./sitemap.js";

const SITE = "https://example.test";
const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <title>Old title</title>
    <meta
      name="description"
      content="Old description"
    />
    <link rel="canonical" href="https://old.test/" />
    <meta property="og:title" content="Old" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const LONG = "Build and ship great products with a strong team. ".repeat(8);
const SOURCE: SourceInfo = {
  key: "melio",
  label: "Melio",
  kind: "company",
  category: "fintech",
  site_url: "https://melio.com",
  auto_fetch: true,
  logo: "https://melio.com/logo.png",
};
const JOB: Job = {
  source: "melio",
  external_id: "e1",
  title: "Frontend Engineer",
  location: "Tel Aviv, Israel",
  excerpt: "short",
  description: LONG,
  ai_summary: JSON.stringify({ headline: "React work", stack: ["React"], level: "Mid", remote: "Remote", highlights: [] }),
  url: "https://example.com/job/e1",
  is_hot: false,
  is_expired: false,
  last_updated: null,
  added_at: "2026-10-01T08:00:00.000Z",
  is_new: false,
};

class FakeRes implements Res {
  statusCode = 0;
  headers: Record<string, string> = {};
  body = "";
  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }
  end(body: string) {
    this.body = body;
  }
}

describe("html helpers", () => {
  it("escapes text, makes paragraphs and keeps JSON safe inside a script", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
    expect(paragraphs("one\n\n two <b>")).toBe("<p>one</p><p>two &lt;b&gt;</p>");
    expect(jsonForScript({ a: "</script>" })).not.toContain("</script>");
  });

  it("puts the page's tags and content into the app shell", () => {
    const html = injectIntoShell(
      SHELL,
      { title: "T <1>", description: "D", canonical: `${SITE}/p`, robots: "noindex,follow", jsonLd: [{ a: 1 }] },
      "<h1>Hi</h1>",
    );
    expect(html).toContain("<title>T &lt;1&gt;</title>");
    expect(html).toContain('<meta name="description" content="D" />');
    expect(html).toContain(`<link rel="canonical" href="${SITE}/p" />`);
    expect(html).toContain('<meta name="robots" content="noindex,follow" />');
    expect(html).toContain('<script type="application/ld+json">{"a":1}</script>');
    expect(html).toContain('<div id="root"><h1>Hi</h1></div>');
    expect(html).not.toContain("Old title");
    // missing tags (twitter, og:description…) are added, not skipped
    expect(html).toContain('property="og:description"');
  });
});

describe("jobPostingJsonLd", () => {
  it("describes a live offer with enough text", () => {
    const ld = jobPostingJsonLd(JOB, SOURCE, `${SITE}/jobs/melio/e1`) as Record<string, unknown>;
    expect(ld["@type"]).toBe("JobPosting");
    expect(ld.title).toBe("Frontend Engineer");
    expect(ld.datePosted).toBe("2026-10-01T08:00:00.000Z");
    expect(ld.hiringOrganization).toMatchObject({ name: "Melio", sameAs: "https://melio.com" });
    expect(ld.jobLocation).toMatchObject({ address: { addressLocality: "Tel Aviv", addressCountry: "IL" } });
    expect(ld.jobLocationType).toBe("TELECOMMUTE");
    expect(ld).not.toHaveProperty("validThrough");
    expect(ld).not.toHaveProperty("employmentType");
  });

  it("is not published for expired offers or offers without a real description", () => {
    expect(jobPostingJsonLd({ ...JOB, is_expired: true }, SOURCE, SITE)).toBeNull();
    expect(jobPostingJsonLd({ ...JOB, description: "", excerpt: "" }, SOURCE, SITE)).toBeNull();
  });

  it("leaves out a vague 'Israel' locality and does not claim remote for hybrid", () => {
    const hybrid = { ...JOB, location: "Israel", ai_summary: JSON.stringify({ headline: "h", stack: [], level: "", remote: "Hybrid", highlights: [] }) };
    const ld = jobPostingJsonLd(hybrid, SOURCE, SITE) as Record<string, unknown>;
    expect(JSON.stringify(ld.jobLocation)).not.toContain("addressLocality");
    expect(ld).not.toHaveProperty("jobLocationType");
  });
});

describe("matchRoute", () => {
  it("recognises the public pages", () => {
    expect(matchRoute("/jobs/melio/e1/frontend-engineer")).toEqual({ type: "job", source: "melio", id: "e1" });
    expect(matchRoute("/jobs/melio/a%2Fb")).toEqual({ type: "job", source: "melio", id: "a/b" });
    expect(matchRoute("/companies/monday")).toEqual({ type: "company", key: "monday" });
    expect(matchRoute("/tech/react")).toEqual({ type: "topic", tech: "react", region: "all" });
    expect(matchRoute("/tech/react/center")).toEqual({ type: "topic", tech: "react", region: "center" });
    expect(matchRoute("/sitemap.xml")).toEqual({ type: "sitemap" });
  });

  it("leaves the app's own pages alone", () => {
    for (const p of ["/", "/jobs", "/coach", "/profile", "/jobs/melio"]) expect(matchRoute(p)).toBeNull();
  });
});

describe("vercel.json rewrites", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { rewrites: { source: string; destination: string }[] };

  /** Applies a rewrite the way Vercel does for these simple `:name` patterns. */
  function rewrite(pathname: string): string | null {
    for (const { source, destination } of config.rewrites) {
      const names: string[] = [];
      const re = new RegExp(`^${source.replace(/:(\w+)/g, (_m, n: string) => (names.push(n), "([^/]+)"))}$`);
      const m = re.exec(pathname);
      if (m) return names.reduce((d, n, i) => d.replace(`:${n}`, m[i + 1]), destination);
    }
    return null;
  }

  it.each([
    ["/jobs/melio/e1/frontend-engineer", "/api/seo?type=job&source=melio&id=e1"],
    ["/jobs/melio/e1", "/api/seo?type=job&source=melio&id=e1"],
    ["/companies/monday", "/api/seo?type=company&key=monday"],
    ["/tech/react", "/api/seo?type=topic&tech=react"],
    ["/tech/react/center", "/api/seo?type=topic&tech=react&region=center"],
    ["/sitemap.xml", "/api/seo?type=sitemap"],
  ])("%s goes to the function", (path, expected) => {
    expect(rewrite(path)).toBe(expected);
  });

  it("agrees with matchRoute and keeps the app's pages on index.html", () => {
    for (const p of ["/jobs/melio/e1/x", "/companies/monday", "/tech/react/center", "/sitemap.xml"]) {
      expect(matchRoute(p)).not.toBeNull();
      expect(rewrite(p)).toMatch(/^\/api\/seo/);
    }
    for (const p of ["/", "/jobs", "/coach", "/profile"]) {
      expect(matchRoute(p)).toBeNull();
      expect(rewrite(p)).toBe("/index.html");
    }
  });
});

describe("buildSitemap", () => {
  it("lists the app pages, topics, companies and offers", () => {
    const xml = buildSitemap(
      {
        jobs: [{ source: "melio", external_id: "e1", title: "Frontend Engineer", lastmod: "2026-10-10T09:00:00Z" }],
        companies: [{ key: "melio", label: "Melio", count: 2 }],
        topics: [{ tech: { slug: "react" }, region: "center", count: 5 }],
      },
      SITE,
    );
    expect(xml).toContain(`<loc>${SITE}/</loc>`);
    expect(xml).toContain(`<loc>${SITE}/tech/react/center</loc>`);
    expect(xml).toContain(`<loc>${SITE}/companies/melio</loc>`);
    expect(xml).toContain(`<loc>${SITE}/jobs/melio/e1/frontend-engineer</loc><lastmod>2026-10-10</lastmod>`);
  });
});

describe("createHandler", () => {
  const fakeFetch = (routes: Record<string, unknown | number>): typeof fetch =>
    (async (input: string | URL | Request) => {
      const path = String(input).replace("http://api.test", "");
      const hit = routes[path];
      if (hit === undefined) return new Response("{}", { status: 404 });
      if (typeof hit === "number") return new Response("{}", { status: hit });
      return new Response(JSON.stringify(hit), { status: 200 });
    }) as typeof fetch;

  const handlerWith = (routes: Record<string, unknown | number>) =>
    createHandler({ apiBase: "http://api.test", siteUrl: SITE, getShell: async () => SHELL, fetchImpl: fakeFetch(routes) });

  it("renders an offer page with its JSON-LD", async () => {
    const res = new FakeRes();
    await handlerWith({ "/api/jobs/melio/e1": JOB, "/api/sources": [SOURCE] })({ url: "/jobs/melio/e1/x", query: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toContain("s-maxage");
    expect(res.body).toContain("<title>Frontend Engineer · Melio — Tech Jobs</title>");
    expect(res.body).toContain('"@type":"JobPosting"');
    expect(res.body).toContain("<h1>Frontend Engineer</h1>");
    expect(res.body).not.toContain("noindex");
  });

  it("uses the rewritten query on Vercel", async () => {
    const res = new FakeRes();
    await handlerWith({ "/api/jobs/melio/e1": JOB, "/api/sources": [SOURCE] })(
      { url: "/api/seo?type=job&source=melio&id=e1", query: { type: "job", source: "melio", id: "e1" } },
      res,
    );
    expect(res.body).toContain("<h1>Frontend Engineer</h1>");
  });

  it("keeps an expired offer out of search results, without JSON-LD", async () => {
    const res = new FakeRes();
    await handlerWith({ "/api/jobs/melio/e1": { ...JOB, is_expired: true }, "/api/sources": [SOURCE] })({ url: "/jobs/melio/e1", query: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('content="noindex,follow"');
    expect(res.body).not.toContain("application/ld+json");
    expect(res.body).toContain("probably closed");
  });

  it("answers 404 with the app for an unknown offer", async () => {
    const res = new FakeRes();
    await handlerWith({})({ url: "/jobs/melio/nope", query: {} }, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain("noindex");
    expect(res.body).toContain('<div id="root">');
  });

  it("serves the plain app when the API is down, so visitors still get the page", async () => {
    const res = new FakeRes();
    await handlerWith({ "/api/jobs/melio/e1": 500 })({ url: "/jobs/melio/e1", query: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(SHELL);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("renders a company and a topic", async () => {
    const company = { source: SOURCE, total: 1, jobs: [JOB], top_skills: [{ skill: "React", count: 1 }] };
    const topic = {
      tech: { slug: "react", label: "React", value: "React", type: "skill" },
      region: { key: "center", label_en: "Tel Aviv / Center", label_fr: "", label_he: "" },
      total: 4,
      jobs: [JOB],
    };
    const a = new FakeRes();
    await handlerWith({ "/api/seo/company/melio": company })({ url: "/companies/melio", query: {} }, a);
    expect(a.body).toContain("Melio jobs — Tech Jobs");

    const b = new FakeRes();
    await handlerWith({
      "/api/seo/topic?tech=react&region=center": topic,
      "/api/regions": [{ key: "all", label_en: "All Israel" }, { key: "center", label_en: "Tel Aviv / Center" }],
      "/api/sources": [SOURCE],
    })({ url: "/tech/react/center", query: {} }, b);
    expect(b.body).toContain("React jobs in Tel Aviv / Center");
    expect(b.body).toContain('href="/tech/react"');
  });

  it("serves the sitemap as XML", async () => {
    const res = new FakeRes();
    await handlerWith({ "/api/seo/index": { jobs: [], companies: [], topics: [] } })({ url: "/sitemap.xml", query: {} }, res);
    expect(res.headers["content-type"]).toContain("application/xml");
    expect(res.body).toContain("<urlset");
  });
});
