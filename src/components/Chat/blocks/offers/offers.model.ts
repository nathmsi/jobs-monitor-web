import type { Job } from "../../../../types";
import { isRecord, type BlockModel, type BlockOf, type ChatOffer } from "../types";

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

const isOffer = (v: unknown): v is Job =>
  isRecord(v) && typeof v.source === "string" && typeof v.external_id === "string" && typeof v.title === "string";

/** Offers the assistant chose, as the API sends them (`{ type: "offers", offers: Job[] }`). */
export const offersModel: BlockModel<BlockOf<"offers">> = {
  parse(raw) {
    if (!isRecord(raw) || !Array.isArray(raw.offers)) return null;
    const offers = raw.offers.filter(isOffer).map((job) => toChatOffer({ ...job, location: job.location ?? "", excerpt: job.excerpt ?? "" }));
    return offers.length ? { type: "offers", offers } : null;
  },
  // A reply that is only cards is sent back as a note, never as the offers' own text (data from the web).
  summary: (block) => `[Showed ${block.offers.length} offers]`,
};
