# Chat

The job assistant: a launcher on every page, and a window with a conversation. This file says where
things are, how a message travels, and how to add something (a widget, an action, a starter) without
touching the rest.

## Who does what

```
ChatWidget  ──────────────  puts the chat together, draws nothing
 │  hooks: useChatWindow (open/closed, outside click) · useChatPrefs (remembered choices)
 │         useChatShare (CV the user lets the assistant see) · useChatPage (where the user is)
 │         useChat (the conversation)
 │
 ├─ ChatProvider ─────────  gives page + config + `act` to everything below (providers/chat)
 │   ├─ window/ChatPanel ─  the window: header, messages, share bar, composer (lazy chunk)
 │   │    ├─ conversation/ChatMessage ─ text bubble + <ChatBlocks>
 │   │    ├─ composer/ChatShareBar, ChatComposer
 │   │    └─ hooks: useChatFrame (drag, resize, keyboard)
 │   └─ ChatLauncher ─────  the button
 │
 blocks/    what the assistant shows under its text      ← the widget system
 actions/   what a button can do                         ← the action system
```

The rule that keeps it readable: **hooks hold state, `utils/` holds pure logic, components draw.** A
block never touches the router or the conversation: it asks for an *action* and `act` does it.

## How a message travels

```
user types ──► useChat.send ──► api/chat.streamChat ──► POST /api/chat/stream
                                  (messages, locale, page, shared CV)
                                                              │ NDJSON: tool steps… then
                                                              ▼ final { text, blocks:[{type, …}] }
api/chat.normalizeReply ── blocks/models.parseBlocks ──► ChatItem { content, blocks: ChatBlock[] }
     (unknown / broken blocks dropped)                          │ reducer → state → sessionStorage
                                                                ▼
                         ChatMessage ──► ChatBlocks ──► BLOCK_VIEWS[block.type]
                                                                │ button pressed
                                                                ▼
                                   ChatActionButton ──► act(action) ──► runChatAction
                                                          navigate · send · open-offer
```

## Blocks (the widgets)

A block is a piece of the answer drawn under the text. Each kind has two halves, registered in two files:

| | what | where | registry |
|---|---|---|---|
| **model** | reads what the API sent, never throws; a short note for the conversation; "transient"? | `blocks/<kind>/<kind>.model.ts` (pure) | `blocks/models.ts` |
| **view** | draws it, using `ChatActionButton` for buttons | `blocks/<kind>/<Kind>Block.tsx` + `.module.css` | `blocks/views.tsx` |

Both registries are typed by the `ChatBlock` union in `blocks/types.ts`: **forgetting one half does not
compile.** The model half is pure so the data layer (`api/chat`) can use it without loading any view; the
views live in the lazy chunk of the window.

| kind | made of | transient? |
|---|---|---|
| `offers` | cards that open the offer's page | no |
| `links` | buttons to a page of the site, often filtered | no |
| `suggestions` | quick replies that send themselves | yes: only under the latest answer |

### Add a widget (example: a `map` of offers)

1. **API** — a widget in `jobs-monitor-api` (`src/modules/chat/widgets/map/`: a UI tool the model calls
   and a class that builds the block from real data) and one line in `chat.registry.ts`.
2. **Type** — add `| { type: "map"; points: MapPoint[] }` to `ChatBlock` in `blocks/types.ts`. The compiler
   now lists what is missing.
3. **Model** — `blocks/map/map.model.ts`: `parse(raw)` (return `null` for anything unusable), optional
   `summary`, optional `transient`. Register it in `blocks/models.ts`.
4. **View** — `blocks/map/MapBlock.tsx` (+ `.module.css`). Register it in `blocks/views.tsx`. A heavy view
   can be loaded only when a message needs it: wrap it in `lazy()` there.
5. **Test** — a `map.model.test.ts` (shape, bad input), and a line in `blocks.component.test.tsx`.

An older client meeting a kind it does not know skips that block and shows the rest: adding a kind to the
API never breaks the app already deployed.

## Actions (what a button does)

`actions/types.ts` lists them: `navigate` (open a page), `send` (send a message), `open-offer` (open an
offer, mark it seen). A button is `{ label, action }`. `ChatActionButton` draws a real link when the action
leads to a page (new tab works, screen readers say "link") and a button otherwise; a plain click goes
through `act`, so every action has the same side effects from any block.

**Add an action:** a variant in `ChatAction`; a handler in `actions/runAction.ts` (the `Handlers` type
makes a missing one a compile error); `hrefOf` if it leads to a page; a test in `runAction.test.ts`.

## What the chat knows (`providers/chat`)

`useChatContext()` gives any part of the chat:

- `page` — where the user is (`home`, `offers`, `offer {source, externalId}`, `company`, `technology`,
  `coach`, `profile`), read from the address by `utils/chatPage.ts`. It is sent with every question, so
  "this offer" means the one on screen, and it picks the starter questions (`utils/chatStarters.ts`).
- `config` — `sharing` (the CV is shared) and `locale`.
- `act(action)` — see above.

**Add a starter question:** a key in `StarterKey`, the rule in `startersFor`, the text in the three locale
files (`chat.starters.<key>`), a line in `chatStarters.test.ts`.
**Teach the chat about a new page:** a case in `pageContext`; the API's `ChatPageKind` and `pageSection`.

## State and storage

| what | where | kept |
|---|---|---|
| conversation | `useChat` → `chatReducer` | `sessionStorage` `jobs-monitor.chat.v2` (this tab) |
| window position/size, "use my CV" | `useChatPrefs` → `utils/chatPrefs` | `localStorage` `jobs-monitor.chat.prefs` |
| text typed, not sent | `ChatWidget` state | until the tab closes (closing the window keeps it) |
| CV the user attached | `useChatShare` (memory) + profile on the device | the PDF is never uploaded |

## The window (desktop)

**Docked by default**: a full-height panel at the end side of the screen (right in LTR, left in RTL) that
*pushes the page* instead of covering it. While docked, `useChatDockLayout` writes `data-chat-dock` and
`--chat-dock-width` on `<html>`; `index.css` turns that into `padding-inline-end` on the body, and the launcher
moves next to the panel. A click on the page does not close it: it is there to be used with the page.

- **Width:** drag the edge toward the page (limits: 340px, half the screen, 720px), or Alt+Left / Alt+Right.
- **Take it off the side:** pull the header (a drag of 8px or more) and it detaches and follows the pointer,
  or press the float button. The floating window is then draggable and resizable as below, and remembered.
- **Dock again:** the dock button. The choice, the width and the floating position are remembered
  (`useChatPrefs`); a user who floated it before the dock existed keeps it floating.
- **Not enough room** (a desktop narrower than 900px): it floats whatever was chosen, and docks again when the
  screen is wide enough (`useChatDock` + `useMediaQuery`). A phone has its own full-screen sheet.

**Floating:** `utils/chatFrame.ts` is pure geometry (clamp, move, resize by a handle, enlarge, detach, dock width)
and `hooks/useChatFrame.ts` runs the gestures, writing `--chat-*` CSS variables straight to the element (no React
render per pixel). Not drag-only: Alt+arrows move, Alt+Shift+arrows resize, the enlarge button, double-click on
the header resets. A click outside closes a floating window (`useChatWindow`); anything of the chat carries
`data-chat-root`.

## Tests

| level | what |
|---|---|
| unit, next to the code | models, actions, `chatPage`, `chatStarters`, `chatFrame`, reducer, storage, `normalizeReply` |
| component | `blocks/ChatBlocks.test.tsx` (each view, with a spy `act`), `ChatComposer`, `ChatProvider` |
| hooks | `useChat`, `useChatWindow`, `useChatPrefs` |
| integration | `tests/integration/chat/` (conversation, sharing the CV, the window; mocked API) |
| e2e | `e2e/tests/chat/` (real browser: drag, resize, outside click, page awareness, CV) |

Helpers: `tests/support/mocks/chatReplies.ts` (build a reply), `tests/support/render/renderChatPart.tsx` (a block with a spy `act`), `tests/support/render/openChat.ts`.
