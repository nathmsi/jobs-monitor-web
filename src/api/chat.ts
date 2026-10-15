import type { Job } from "../types";
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

/** An offer in the chat: the fields a card needs (the offer page loads the rest). */
export type ChatOffer = Pick<
  Job,
  "source" | "external_id" | "title" | "location" | "excerpt" | "ai_summary" | "is_hot" | "is_expired" | "added_at"
>;

/** A button that opens a page of the site: an internal address, built by the API. */
export interface ChatLink {
  path: string;
  label: string;
}

export interface ChatReply {
  text: string;
  offers: ChatOffer[];
  links: ChatLink[];
  suggestions: string[];
}

export type ChatEvent =
  | { type: "tool_call"; callId: string; name: string }
  | { type: "tool_result"; callId: string; name: string; ok: boolean }
  | { type: "final"; reply: Omit<ChatReply, "offers"> & { offers: Job[] } }
  | { type: "error"; message: string };

/** The cards need little of an offer; keeping only that keeps the stored conversation small. */
export function toChatOffer(job: Job): ChatOffer {
  return {
    source: job.source,
    external_id: job.external_id,
    title: job.title,
    location: job.location,
    excerpt: job.excerpt,
    ai_summary: job.ai_summary,
    is_hot: job.is_hot,
    is_expired: job.is_expired,
    added_at: job.added_at,
  };
}

/** Streams the assistant's progress: search steps, then one `final` event with the reply. */
export async function* streamChat(
  messages: ChatApiMessage[],
  locale: string,
  signal?: AbortSignal,
  shared?: ChatShared | null,
): AsyncGenerator<ChatEvent> {
  const resp = await fetch(`${API}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      locale,
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
  yield* readNdjson<ChatEvent>(resp.body);
}
