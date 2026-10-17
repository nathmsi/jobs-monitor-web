import { isRecord, type BlockModel, type BlockOf } from "../types";
import { isInternalPath } from "./internalPath";

/** Buttons that open a page: `{ type: "links", links: [{ path, label }] }`. Only addresses inside the site. */
export const linksModel: BlockModel<BlockOf<"links">> = {
  parse(raw) {
    if (!isRecord(raw) || !Array.isArray(raw.links)) return null;
    const buttons = raw.links.flatMap((link) =>
      isRecord(link) && typeof link.path === "string" && typeof link.label === "string" && link.label.trim() !== "" && isInternalPath(link.path)
        ? [{ label: link.label.trim(), action: { type: "navigate" as const, path: link.path } }]
        : [],
    );
    return buttons.length ? { type: "links", buttons } : null;
  },
};
