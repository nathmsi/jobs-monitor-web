import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { usePageMeta } from "./usePageMeta";

const meta = (selector: string) => document.head.querySelector(selector);

describe("usePageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = '<title>Before</title><meta name="description" content="old" /><link rel="canonical" href="https://x.test/" />';
  });
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("sets the title, description and canonical, and restores them on unmount", () => {
    const { unmount } = renderHook(() => usePageMeta({ title: "Offer", description: "About it", path: "/jobs/a/1" }));

    expect(document.title).toBe("Offer — Tech Jobs");
    expect(meta('meta[name="description"]')?.getAttribute("content")).toBe("About it");
    expect(meta('link[rel="canonical"]')?.getAttribute("href")).toMatch(/\/jobs\/a\/1$/);

    unmount();
    expect(document.title).toBe("Before");
    expect(meta('meta[name="description"]')?.getAttribute("content")).toBe("old");
    expect(meta('link[rel="canonical"]')?.getAttribute("href")).toBe("https://x.test/");
  });

  it("keeps a page out of search results when asked", () => {
    renderHook(() => usePageMeta({ title: "Expired", noindex: true }));
    expect(meta('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,follow");
  });

  it("lets a good page override a noindex left by the server", () => {
    document.head.insertAdjacentHTML("beforeend", '<meta name="robots" content="noindex,follow" />');
    const { unmount } = renderHook(() => usePageMeta({ title: "Good" }));
    expect(meta('meta[name="robots"]')?.getAttribute("content")).toBe("index,follow");
    unmount();
    expect(meta('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,follow");
  });
});
