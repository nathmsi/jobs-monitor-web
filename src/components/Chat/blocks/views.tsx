import { LinksBlock } from "./links/LinksBlock";
import { OffersBlock } from "./offers/OffersBlock";
import { SuggestionsBlock } from "./suggestions/SuggestionsBlock";
import type { BlockViews } from "./types";

/**
 * The registry of block kinds, drawing half (see types.ts; the pure half is models.ts). The type
 * of this object makes the compiler ask for a view for every kind in `ChatBlock`.
 *
 * A heavy view (a chart, a map) can be loaded only when a message needs it:
 * `offers: lazy(() => import("./offers/OffersBlock").then((m) => ({ default: m.OffersBlock })))`
 * and a <Suspense> around the blocks. These three are small: they are loaded with the window.
 */
export const BLOCK_VIEWS: BlockViews = {
  offers: OffersBlock,
  links: LinksBlock,
  suggestions: SuggestionsBlock,
};
