import { useEffect } from "react";

const BRAND = "Tech Jobs";

interface Meta {
  /** Page title, without the brand. */
  title: string;
  description?: string;
  /** Absolute path of this page ("/jobs/melio/e1/…"), used for the canonical link. */
  path?: string;
  /** Keep the page out of search results. */
  noindex?: boolean;
}

function head<T extends Element>(selector: string, create: () => T): T {
  let el = document.head.querySelector<T>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

/** The site's public address, so canonical links match the server-rendered ones. */
function siteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  return (configured || window.location.origin).replace(/\/+$/, "");
}

/** Sets the title, description, canonical and robots tags for a page, and restores them when it unmounts. */
export function usePageMeta({ title, description, path, noindex }: Meta): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} — ${BRAND}`;

    const restores: (() => void)[] = [];
    const setAttr = (el: Element, name: string, value: string) => {
      const before = el.getAttribute(name);
      el.setAttribute(name, value);
      restores.push(() => (before === null ? el.removeAttribute(name) : el.setAttribute(name, before)));
    };

    if (description) {
      const el = head('meta[name="description"]', () => Object.assign(document.createElement("meta"), { name: "description" }));
      setAttr(el, "content", description);
    }
    if (path) {
      const el = head('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }));
      setAttr(el, "href", `${siteUrl()}${path}`);
    }
    // The page itself decides: a "noindex" left by a previous page (or the server) must not stick.
    const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      const el = robots ?? head('meta[name="robots"]', () => Object.assign(document.createElement("meta"), { name: "robots" }));
      setAttr(el, "content", "noindex,follow");
    } else if (robots) {
      setAttr(robots, "content", "index,follow");
    }

    return () => {
      document.title = previousTitle;
      restores.forEach((undo) => undo());
    };
  }, [title, description, path, noindex]);
}
