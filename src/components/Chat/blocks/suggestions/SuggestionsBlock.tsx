import { ChatActionButton } from "../shared/ChatActionButton";
import type { BlockOf, BlockViewProps } from "../types";
import styles from "./SuggestionsBlock.module.css";

/** Quick replies: one tap sends the answer. */
export function SuggestionsBlock({ block }: BlockViewProps<BlockOf<"suggestions">>) {
  return (
    <ul className={styles.chips}>
      {block.buttons.map(({ label, action }) => (
        <li key={label}>
          <ChatActionButton action={action} className={styles.chip}>
            {label}
          </ChatActionButton>
        </li>
      ))}
    </ul>
  );
}
