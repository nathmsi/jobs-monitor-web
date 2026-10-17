import { describe, expect, it } from "vitest";

import type { ChatPage } from "./chatPage";
import { startersFor } from "./chatStarters";

const home: ChatPage = { kind: "home" };

describe("startersFor", () => {
  it("offers the general questions on a page about nothing in particular", () => {
    expect(startersFor(home, false)).toEqual(["backend", "jerusalem", "howto", "advice"]);
    expect(startersFor({ kind: "other" }, false)).toEqual(startersFor(home, false));
  });

  it("on an offer page, asks about that offer first", () => {
    expect(startersFor({ kind: "offer", source: "a", externalId: "1" }, false)).toEqual(["aboutOffer", "similarOffers", "howApply", "backend"]);
  });

  it("puts the question for the page, then the one that uses the CV when it is shared", () => {
    expect(startersFor({ kind: "offer", source: "a", externalId: "1" }, true)).toEqual(["aboutOffer", "fitsMe", "similarOffers", "howApply"]);
    expect(startersFor(home, true)).toEqual(["forMe", "backend", "jerusalem", "howto"]);
  });

  it.each([
    [{ kind: "company", key: "monday" }, "aboutCompany"],
    [{ kind: "technology", tech: "react" }, "whoHires"],
    [{ kind: "coach" }, "cvTips"],
  ] as const)("%j leads with %s", (page, first) => {
    expect(startersFor(page, false)[0]).toBe(first);
  });

  it("never offers more than four, nor the same one twice", () => {
    for (const sharing of [false, true]) {
      const list = startersFor({ kind: "offer", source: "a", externalId: "1" }, sharing);
      expect(list.length).toBeLessThanOrEqual(4);
      expect(new Set(list).size).toBe(list.length);
    }
  });
});
