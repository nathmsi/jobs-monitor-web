import { jobId } from "../../../utils/jobId";
import { hrefOf } from "./hrefOf";
import type { ChatAction, ChatActionType } from "./types";

/** What the actions need from the app: given by the provider, so the actions know no hook. */
export interface ActionDeps {
  /** Go to a page of the site. */
  navigate: (path: string) => void;
  /** Send a message to the assistant. */
  send: (text: string) => void;
  /** The offer was opened from the chat (it is then shown as seen). */
  markOpened: (id: string) => void;
  /** The chat just sent the user to a page: on a phone it steps aside. */
  afterNavigate: () => void;
}

type Handlers = { [K in ChatActionType]: (action: Extract<ChatAction, { type: K }>, deps: ActionDeps) => void };

/** One handler per action: a new action that has none does not compile. */
const HANDLERS: Handlers = {
  navigate: (action, deps) => {
    deps.navigate(action.path);
    deps.afterNavigate();
  },
  send: (action, deps) => deps.send(action.text),
  "open-offer": (action, deps) => {
    deps.markOpened(jobId(action.source, action.externalId));
    deps.navigate(hrefOf(action) ?? "/jobs");
    deps.afterNavigate();
  },
};

export function runChatAction(action: ChatAction, deps: ActionDeps): void {
  // TypeScript cannot follow `action.type` to its own handler: the Handlers type above is the check.
  (HANDLERS[action.type] as (a: ChatAction, d: ActionDeps) => void)(action, deps);
}
