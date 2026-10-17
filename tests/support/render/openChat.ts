import { screen } from "@testing-library/react";

import type { renderWithProviders } from "./renderWithProviders";

/** Opens the chat from its launcher and returns the window (it is a lazy chunk: it arrives a moment later). */
export async function openChat(ui: ReturnType<typeof renderWithProviders>) {
  await ui.user.click(screen.getByRole("button", { name: "Ask AI" }));
  return screen.findByRole("dialog", { name: "Job assistant" });
}
