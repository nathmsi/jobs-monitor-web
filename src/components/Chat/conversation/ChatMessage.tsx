import { useTranslation } from "react-i18next";

import type { ChatItem } from "../../../utils/chatMessages";
import { ChatBlocks } from "../blocks/ChatBlocks";
import styles from "./ChatMessage.module.css";

interface Props {
  item: ChatItem;
  /** The latest answer, while the assistant waits: its quick replies are shown. */
  active: boolean;
}

/** One turn of the conversation: the text bubble, then the blocks of the answer. */
export function ChatMessage({ item, active }: Props) {
  const { t } = useTranslation();
  const mine = item.role === "user";

  return (
    <div className={`${styles.message} ${mine ? styles.mine : styles.theirs}`}>
      {item.content && (
        <p className={styles.bubble} dir="auto">
          <span className={styles.srOnly}>{mine ? t("chat.you") : t("chat.assistant")}: </span>
          {item.content}
        </p>
      )}
      <ChatBlocks blocks={item.blocks} active={active} />
    </div>
  );
}
