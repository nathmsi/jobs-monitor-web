import { isRecord, type BlockModel, type BlockOf } from "../types";

/** Quick replies: `{ type: "suggestions", replies: ["Backend", ...] }`. Each one sends itself as the user's message. */
export const suggestionsModel: BlockModel<BlockOf<"suggestions">> = {
  parse(raw) {
    if (!isRecord(raw) || !Array.isArray(raw.replies)) return null;
    const texts = [...new Set(raw.replies.filter((r): r is string => typeof r === "string").map((r) => r.trim()).filter(Boolean))];
    return texts.length ? { type: "suggestions", buttons: texts.map((text) => ({ label: text, action: { type: "send" as const, text } })) } : null;
  },
  transient: true,
};
