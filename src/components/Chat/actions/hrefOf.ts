import { jobPath } from "../../../utils/slug";
import type { ChatAction } from "./types";

/** Where an action leads, for those that lead to a page (so the button can be a real link). Null: it does not. */
export function hrefOf(action: ChatAction): string | null {
  switch (action.type) {
    case "navigate":
      return action.path;
    case "open-offer":
      return jobPath({ source: action.source, external_id: action.externalId, title: action.title });
    case "send":
      return null;
  }
}
