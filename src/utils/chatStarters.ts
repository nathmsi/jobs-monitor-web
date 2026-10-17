import type { ChatPage } from "./chatPage";

/** The questions offered in an empty chat: `chat.starters.<key>` in the locale files. */
export type StarterKey =
  | "forMe" | "fitsMe" | "backend" | "jerusalem" | "howto" | "advice"
  | "aboutOffer" | "similarOffers" | "howApply" | "aboutCompany" | "whoHires" | "cvTips";

const MAX_STARTERS = 4;
const GENERAL: readonly StarterKey[] = ["backend", "jerusalem", "howto", "advice"];

/** What is worth asking here, first the questions about the page, then the general ones. */
function aboutPage(page: ChatPage): StarterKey[] {
  switch (page.kind) {
    case "offer":
      return ["aboutOffer", "similarOffers", "howApply"];
    case "company":
      return ["aboutCompany"];
    case "technology":
      return ["whoHires"];
    case "coach":
      return ["cvTips"];
    default:
      return [];
  }
}

/** The starter questions for this page; with the CV shared, the ones that use it come first. */
export function startersFor(page: ChatPage, sharing: boolean): StarterKey[] {
  const own = aboutPage(page);
  const cv: StarterKey[] = sharing ? [page.kind === "offer" ? "fitsMe" : "forMe"] : [];
  return [...new Set([...own.slice(0, 1), ...cv, ...own.slice(1), ...GENERAL])].slice(0, MAX_STARTERS);
}
