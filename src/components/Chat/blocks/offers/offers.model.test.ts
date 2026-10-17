import { describe, expect, it } from "vitest";

import { makeJob } from "../../../../../tests/support/factories";
import { offersModel, toChatOffer } from "./offers.model";

describe("toChatOffer", () => {
  it("keeps what a card needs and drops the long description and the address", () => {
    const offer = toChatOffer(makeJob({ external_id: "1", title: "Dev", description: "x".repeat(5000), url: "https://x" }));
    expect(offer).toMatchObject({ source: "melio", external_id: "1", title: "Dev" });
    expect(offer).not.toHaveProperty("description");
    expect(offer).not.toHaveProperty("url");
  });
});

describe("offersModel", () => {
  const job = makeJob({ external_id: "1", title: "Dev" });

  it("reads the offers of the API", () => {
    const block = offersModel.parse({ type: "offers", offers: [job] });
    expect(block).toMatchObject({ type: "offers", offers: [{ source: "melio", external_id: "1", title: "Dev" }] });
  });

  it("skips an offer without a source, an id or a title, and gives nothing when none is left", () => {
    expect(offersModel.parse({ offers: [job, { title: "no id" }, null, 42] })).toMatchObject({ offers: [{ external_id: "1" }] });
    expect(offersModel.parse({ offers: [{ title: "x" }] })).toBeNull();
    expect(offersModel.parse({ offers: [] })).toBeNull();
  });

  it.each([null, undefined, 42, "x", [], {}, { offers: "no" }])("never throws on %p", (raw) => {
    expect(offersModel.parse(raw)).toBeNull();
  });

  it("tolerates a missing location or excerpt", () => {
    const block = offersModel.parse({ offers: [{ source: "a", external_id: "1", title: "T" }] });
    expect(block?.offers[0]).toMatchObject({ location: "", excerpt: "" });
  });

  it("stands for itself in the conversation as a short note", () => {
    const block = offersModel.parse({ offers: [job, { ...job, external_id: "2" }] })!;
    expect(offersModel.summary?.(block)).toBe("[Showed 2 offers]");
  });
});
