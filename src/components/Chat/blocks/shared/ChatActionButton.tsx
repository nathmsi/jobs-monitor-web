import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { loadJobPage } from "../../../../pages/lazyPages";
import { useChatContext } from "../../../../providers/chat/useChatContext";
import { hrefOf } from "../../actions/hrefOf";
import { isPlainClick } from "../../actions/isPlainClick";
import type { ChatAction } from "../../actions/types";

interface Props {
  action: ChatAction;
  className: string;
  children: ReactNode;
}

/**
 * The one button of the chat. An action that leads to a page is a real link (it can be opened in a new
 * tab, a screen reader says "link"); one that does not is a button. A plain click goes through `act`,
 * so every action has the same side effects wherever it comes from.
 */
export function ChatActionButton({ action, className, children }: Props) {
  const { act } = useChatContext();
  const href = hrefOf(action);

  if (href === null) {
    return (
      <button type="button" className={className} onClick={() => act(action)}>
        {children}
      </button>
    );
  }

  return (
    <Link
      to={href}
      className={className}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        act(action);
      }}
      // An offer's page is a separate chunk: start loading it when the link is touched.
      onPointerEnter={action.type === "open-offer" ? loadJobPage : undefined}
      onFocus={action.type === "open-offer" ? loadJobPage : undefined}
    >
      {children}
    </Link>
  );
}
