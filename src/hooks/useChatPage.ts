import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { pageContext, type ChatPage } from "../utils/chatPage";

/** The page the user is on, for the chat. Changes only when the route does, not on every render. */
export function useChatPage(): ChatPage {
  const { pathname } = useLocation();
  return useMemo(() => pageContext(pathname), [pathname]);
}
