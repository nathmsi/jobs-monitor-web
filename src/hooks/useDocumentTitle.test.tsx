import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import i18n from "../i18n";
import { useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("sets '<translated title> — Tech Jobs'", async () => {
    await i18n.changeLanguage("en");
    renderHook(() => useDocumentTitle("nav.offers"));
    expect(document.title).toBe("Offers — Tech Jobs");
  });

  it("updates when the language changes", async () => {
    await i18n.changeLanguage("en");
    renderHook(() => useDocumentTitle("coach.nav"));
    expect(document.title).toBe("CV Coach — Tech Jobs");

    await i18n.changeLanguage("fr");
    await new Promise((r) => setTimeout(r, 0));
    expect(document.title).not.toBe("CV Coach — Tech Jobs");
    expect(document.title.endsWith("— Tech Jobs")).toBe(true);
  });
});
