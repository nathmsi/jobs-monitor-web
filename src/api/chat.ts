import { parseBlocks } from "../components/Chat/blocks/models";
import type { ChatBlock } from "../components/Chat/blocks/types";
import type { ChatPage } from "../utils/chatPage";
import { readNdjson } from "../utils/ndjson";
import { API } from "./client";

/** The CV profile the user chose to share (the CV itself is a separate, optional list). */
export interface ChatApiProfile {
  skills: string[];
  roles: string[];
  languages: string[];
  locations: string[];
  titles: string[];
  seniority: string | null;
  years: number | null;
}

/** A CV the user chose to share: the assistant reads its text only when asked about their CV. */
export interface ChatApiCv {
  id: string;
  name: string;
  text: string;
}

/** What the user lets the assistant see, sent with each question. */
export interface ChatShared {
  profile?: ChatApiProfile | null;
  cvs?: ChatApiCv[];
}

export type ChatRole = "user" | "assistant";

/** What the API receives: the whole conversation, ending with the user's new message. */
export interface ChatApiMessage {
  role: ChatRole;
  content: string;
}

/** What the assistant answers: text, then blocks drawn under it (see components/Chat/blocks). */
export interface ChatReply {
  text: string;
  blocks: ChatBlock[];
}

export type ChatEvent =
  | { type: "tool_call"; callId: string; name: string }
  | { type: "tool_result"; callId: string; name: string; ok: boolean }
  | { type: "final"; reply: ChatReply }
  | { type: "error"; message: string };

type RawEvent = Exclude<ChatEvent, { type: "final" }> | { type: "final"; reply: unknown };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The API before `blocks`: three fixed fields. Kept so this client works with either side deployed first. */
function legacyBlocks(raw: Record<string, unknown>): unknown[] {
  return [
    { type: "offers", offers: raw.offers },
    { type: "links", links: raw.links },
    { type: "suggestions", replies: raw.suggestions },
  ];
}

/** The reply of the API as the app uses it: a block this version does not know, or that is broken, is dropped. */
export function normalizeReply(raw: unknown): ChatReply {
  if (!isRecord(raw)) return { text: "", blocks: [] };
  return {
    text: typeof raw.text === "string" ? raw.text : "",
    blocks: parseBlocks(Array.isArray(raw.blocks) ? raw.blocks : legacyBlocks(raw)),
  };
}

export interface ChatStreamRequest {
  messages: ChatApiMessage[];
  locale: string;
  signal?: AbortSignal;
  /** What the user lets the assistant see of their CV. */
  shared?: ChatShared | null;
  /** Where the user is on the site. */
  page?: ChatPage;
}

/** Streams the assistant's progress: search steps, then one `final` event with the reply. */
export async function* streamChat({ messages, locale, signal, shared, page }: ChatStreamRequest): AsyncGenerator<ChatEvent> {
  const resp = await fetch(`${API}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      locale,
      ...(page ? { page } : {}),
      ...(shared?.profile ? { profile: shared.profile } : {}),
      ...(shared?.cvs?.length ? { cvs: shared.cvs } : {}),
    }),
    signal,
  });

  if (!resp.ok) {
    const detail = await resp.json().catch(() => null);
    throw new Error(detail?.message || `HTTP ${resp.status}`);
  }
  if (!resp.body) throw new Error("No response body");

  for await (const event of readNdjson<RawEvent>(resp.body)) {
    yield event.type === "final" ? { type: "final", reply: normalizeReply(event.reply) } : event;
  }
}
