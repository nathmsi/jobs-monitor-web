import { Suspense, lazy, useCallback, useState } from "react";

import { useChat } from "../../hooks/useChat";
import { useChatPage } from "../../hooks/useChatPage";
import { useChatPrefs } from "../../hooks/useChatPrefs";
import { useChatShare } from "../../hooks/useChatShare";
import { useChatWindow } from "../../hooks/useChatWindow";
import { ChatProvider } from "../../providers/chat/ChatProvider";
import type { Frame } from "../../utils/chatFrame";
import { ChatLauncher } from "./ChatLauncher";

/** The window is a separate chunk: it downloads when the launcher is touched, not with the page. */
const loadChatPanel = () => import("./window/ChatPanel").then((m) => ({ default: m.ChatPanel }));
const ChatPanel = lazy(loadChatPanel);

/**
 * The assistant on every page. This is where the chat is put together, and nothing is drawn here:
 *   - hooks hold the state: the window (open/closed), the user's choices, what they share, the
 *     page they are on, and the conversation itself;
 *   - ChatProvider hands the page, the configuration and the actions to the blocks;
 *   - the launcher and the window (a lazy chunk) draw it.
 * The conversation and the unsent text live here, so closing the window never loses anything.
 */
export function ChatWidget() {
  const { open, toggle, close, stepAside, launcherRef } = useChatWindow();
  const { prefs, update } = useChatPrefs();
  const share = useChatShare(prefs.share, (on) => update({ share: on }));
  const page = useChatPage();
  const chat = useChat(share.payload, page);
  const [draft, setDraft] = useState("");

  const commitFrame = useCallback((frame: Frame | null) => update({ frame }), [update]);

  return (
    <ChatProvider page={page} sharing={share.payload !== null} send={chat.send} onNavigated={stepAside}>
      {open && (
        <Suspense fallback={null}>
          <ChatPanel
            chat={chat}
            share={share}
            frame={prefs.frame}
            onFrameChange={commitFrame}
            draft={draft}
            onDraftChange={setDraft}
            onClose={close}
          />
        </Suspense>
      )}
      <ChatLauncher ref={launcherRef} open={open} onClick={toggle} onPrefetch={loadChatPanel} />
    </ChatProvider>
  );
}
