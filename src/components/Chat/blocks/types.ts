import type { ComponentType } from "react";

import type { ChatButton } from "../actions/types";
import type { Job } from "../../../types";

/** An offer in the chat: the fields a card needs (the offer page loads the rest). */
export type ChatOffer = Pick<
  Job,
  "source" | "external_id" | "title" | "location" | "excerpt" | "ai_summary" | "is_hot" | "is_expired" | "added_at"
>;

/**
 * A piece of the assistant's answer drawn under its text. The API sends them as `blocks`; each
 * kind has a MODEL (reads it, pure) and a VIEW (draws it). To add a kind: a variant here, a model
 * in blocks/models.ts, a view in blocks/views.tsx, and its widget in the API. A kind missing from
 * either registry does not compile.
 */
export type ChatBlock =
  | { type: "offers"; offers: ChatOffer[] }
  /** Buttons that open a page of the site. */
  | { type: "links"; buttons: ChatButton[] }
  /** Quick replies: pressing one sends it as the user's message. */
  | { type: "suggestions"; buttons: ChatButton[] };

export type ChatBlockType = ChatBlock["type"];
export type BlockOf<K extends ChatBlockType> = Extract<ChatBlock, { type: K }>;

/** The pure half of a block kind: no React, so the data layer can use it without loading any view. */
export interface BlockModel<B extends ChatBlock> {
  /** Reads what the API sent. Null when it is unusable (wrong shape, nothing to show): never throws. */
  parse(raw: unknown): B | null;
  /** A short text standing for this block when the conversation is sent back to the API. */
  summary?(block: B): string;
  /** Only meaningful under the latest answer, while the assistant waits (quick replies). */
  transient?: boolean;
}
export type BlockModels = { [K in ChatBlockType]: BlockModel<BlockOf<K>> };

/** What every view receives. */
export interface BlockViewProps<B extends ChatBlock> {
  block: B;
}
export type BlockViews = { [K in ChatBlockType]: ComponentType<BlockViewProps<BlockOf<K>>> };

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
