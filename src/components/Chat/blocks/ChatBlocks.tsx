import type { ComponentType } from "react";

import { isTransientBlock } from "./models";
import type { BlockViewProps, ChatBlock } from "./types";
import { BLOCK_VIEWS } from "./views";

interface Props {
  blocks: readonly ChatBlock[];
  /** This is the latest answer and the assistant is waiting: transient blocks (quick replies) are shown. */
  active: boolean;
}

/** One block, drawn by the view registered for its kind. */
function BlockView({ block }: { block: ChatBlock }) {
  // TypeScript cannot follow `block.type` to the view of that same kind: the BlockViews type is the check.
  const View = BLOCK_VIEWS[block.type] as ComponentType<BlockViewProps<ChatBlock>>;
  return <View block={block} />;
}

/** The blocks of one message, in the order the API sent them. */
export function ChatBlocks({ blocks, active }: Props) {
  return (
    <>
      {blocks.map((block, index) =>
        isTransientBlock(block) && !active ? null : <BlockView key={`${block.type}-${index}`} block={block} />,
      )}
    </>
  );
}
