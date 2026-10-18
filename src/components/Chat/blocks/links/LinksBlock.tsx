import { useTranslation } from "react-i18next";

import { ArrowIcon } from "../../../Icons/Icons";
import { ChatActionButton } from "../shared/ChatActionButton";
import type { BlockOf, BlockViewProps } from "../types";
import styles from "./LinksBlock.module.css";

/** Buttons that open a page of the site, often already filtered. */
export function LinksBlock({ block }: BlockViewProps<BlockOf<"links">>) {
  const { t } = useTranslation();
  return (
    <ul className={styles.links} aria-label={t("chat.links")}>
      {block.buttons.map(({ label, action }) => (
        <li key={label}>
          <ChatActionButton action={action} className={styles.linkBtn}>
            {label}
            <ArrowIcon size={14} className={styles.arrow} />
          </ChatActionButton>
        </li>
      ))}
    </ul>
  );
}
