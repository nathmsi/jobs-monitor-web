import { describe, expect, it } from "vitest";

import { companyPath, jobPath, slugify, topicPath } from "./slug";

describe("slugify", () => {
  it("makes lowercase ASCII words joined by dashes", () => {
    expect(slugify("Tel Aviv / Center")).toBe("tel-aviv-center");
    expect(slugify("AI / ML")).toBe("ai-ml");
    expect(slugify("Crème brûlée")).toBe("creme-brulee");
  });

  it("returns an empty string when nothing is usable (e.g. Hebrew only)", () => {
    expect(slugify("מפתח")).toBe("");
  });
});

describe("paths", () => {
  it("builds the offer page with a readable title", () => {
    expect(jobPath({ source: "melio", external_id: "e1", title: "Frontend Engineer" })).toBe(
      "/jobs/melio/e1/frontend-engineer",
    );
  });

  it("drops the title part when it has no usable letters, and encodes ids", () => {
    expect(jobPath({ source: "li-x", external_id: "a/b", title: "מפתח" })).toBe("/jobs/li-x/a%2Fb");
  });

  it("builds company and technology pages", () => {
    expect(companyPath("monday")).toBe("/companies/monday");
    expect(topicPath("react")).toBe("/tech/react");
    expect(topicPath("react", "all")).toBe("/tech/react");
    expect(topicPath("react", "center")).toBe("/tech/react/center");
  });
});
