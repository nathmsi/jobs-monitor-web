import { describe, expect, it } from "vitest";

import { pageContext } from "./chatPage";

describe("pageContext", () => {
  it.each([
    ["/", { kind: "home" }],
    ["/jobs", { kind: "offers" }],
    ["/jobs/", { kind: "offers" }],
    ["/coach", { kind: "coach" }],
    ["/profile", { kind: "profile" }],
    ["/nowhere", { kind: "other" }],
  ])("%s", (path, page) => {
    expect(pageContext(path)).toEqual(page);
  });

  it("an offer page carries its source and id, with or without the slug", () => {
    expect(pageContext("/jobs/melio/42/senior-backend-engineer")).toEqual({ kind: "offer", source: "melio", externalId: "42" });
    expect(pageContext("/jobs/melio/42")).toEqual({ kind: "offer", source: "melio", externalId: "42" });
  });

  it("decodes what the address encodes", () => {
    expect(pageContext("/jobs/li-check%20point/a%2Fb/dev")).toEqual({ kind: "offer", source: "li-check point", externalId: "a/b" });
    expect(pageContext("/jobs/x/%E0%A4%A")).toEqual({ kind: "offer", source: "x", externalId: "%E0%A4%A" }); // a broken escape is kept as is
  });

  it("a company page and a technology page, with or without a region", () => {
    expect(pageContext("/companies/monday")).toEqual({ kind: "company", key: "monday" });
    expect(pageContext("/tech/react")).toEqual({ kind: "technology", tech: "react" });
    expect(pageContext("/tech/react/jerusalem")).toEqual({ kind: "technology", tech: "react", region: "jerusalem" });
  });

  it("a company or technology route with nothing after it is not a page of one", () => {
    expect(pageContext("/companies")).toEqual({ kind: "other" });
    expect(pageContext("/tech")).toEqual({ kind: "other" });
  });
});
