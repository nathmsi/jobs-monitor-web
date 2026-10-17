/**
 * Where the user is on the site, as the chat sees it. Read from the address (the same patterns as the
 * routes in App.tsx) and told to the assistant, so "this offer" means the one on screen.
 */
export type ChatPage =
  | { kind: "home" | "offers" | "coach" | "profile" | "other" }
  | { kind: "offer"; source: string; externalId: string }
  | { kind: "company"; key: string }
  | { kind: "technology"; tech: string; region?: string };

export type ChatPageKind = ChatPage["kind"];

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** The page for an address path (`location.pathname`). */
export function pageContext(pathname: string): ChatPage {
  const parts = pathname.split("/").filter(Boolean).map(decode);
  const [first, a, b] = parts;

  if (!first) return { kind: "home" };
  switch (first) {
    case "jobs":
      return a && b ? { kind: "offer", source: a, externalId: b } : { kind: "offers" };
    case "companies":
      return a ? { kind: "company", key: a } : { kind: "other" };
    case "tech":
      return a ? { kind: "technology", tech: a, ...(b ? { region: b } : {}) } : { kind: "other" };
    case "coach":
      return { kind: "coach" };
    case "profile":
      return { kind: "profile" };
    default:
      return { kind: "other" };
  }
}
