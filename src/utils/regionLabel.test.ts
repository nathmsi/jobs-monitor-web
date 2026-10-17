import { describe, expect, it } from "vitest";

import { regionLabel } from "./regionLabel";

describe("regionLabel", () => {
  const r = { key: "tlv", label_en: "Tel Aviv", label_he: "תל אביב", label_fr: "Tel-Aviv" };
  it("picks the label of the active language", () => {
    expect(regionLabel(r, "he")).toBe("תל אביב");
    expect(regionLabel(r, "fr-FR")).toBe("Tel-Aviv");
    expect(regionLabel(r, "en")).toBe("Tel Aviv");
  });
  it("falls back to English when French is missing", () => {
    expect(regionLabel({ ...r, label_fr: undefined }, "fr")).toBe("Tel Aviv");
  });
});
