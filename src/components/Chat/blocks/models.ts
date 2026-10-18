import { linksModel } from "./links/links.model";
import { offersModel } from "./offers/offers.model";
import { suggestionsModel } from "./suggestions/suggestions.model";
import { isRecord, type BlockModels, type ChatBlock, type ChatBlockType } from "./types";

/**
 * The registry of block kinds, pure half (see types.ts). The type of this object makes the compiler
 * ask for a model for every kind in `ChatBlock`. The views are in views.tsx.
 */
export const BLOCK_MODELS: BlockModels = {
  offers: offersModel,
  links: linksModel,
  suggestions: suggestionsModel,
};

const isKnown = (type: unknown): type is ChatBlockType => typeof type === "string" && Object.hasOwn(BLOCK_MODELS, type);

/** The blocks of an API answer. A kind this version does not know, or a block that is broken, is skipped. */
export function parseBlocks(raw: unknown): ChatBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!isRecord(item) || !isKnown(item.type)) return [];
    const block = (BLOCK_MODELS[item.type] as { parse(raw: unknown): ChatBlock | null }).parse(item);
    return block ? [block] : [];
  });
}

/** A line for blocks that were sent without text, so the API still knows what the user was shown. */
export function summarizeBlocks(blocks: readonly ChatBlock[]): string {
  return blocks
    .map((block) => (BLOCK_MODELS[block.type] as { summary?(b: ChatBlock): string }).summary?.(block) ?? "")
    .filter(Boolean)
    .join(" ");
}

/** True for a block that only makes sense under the latest answer. */
export function isTransientBlock(block: ChatBlock): boolean {
  return BLOCK_MODELS[block.type].transient === true;
}

/** A stored block: its kind is one this version knows. (Storage is our own write: the shape is trusted.) */
export function isStoredBlock(value: unknown): value is ChatBlock {
  return isRecord(value) && isKnown(value.type);
}
