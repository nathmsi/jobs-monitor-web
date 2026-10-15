import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import "../../i18n";
import { ChatComposer } from "./ChatComposer";

function setup(busy = false) {
  const onSend = vi.fn();
  render(<ChatComposer onSend={onSend} busy={busy} />);
  return { onSend, input: screen.getByRole("textbox", { name: "Your message" }), send: screen.getByRole("button", { name: "Send" }), user: userEvent.setup() };
}

describe("ChatComposer", () => {
  it("takes the focus when it appears", () => {
    expect(setup().input).toHaveFocus();
  });

  it("cannot send an empty message", async () => {
    const { send, input, user, onSend } = setup();
    expect(send).toBeDisabled();
    await user.type(input, "   {Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("Enter sends the message and empties the box", async () => {
    const { input, user, onSend } = setup();
    await user.type(input, "backend jobs{Enter}");
    expect(onSend).toHaveBeenCalledWith("backend jobs");
    expect(input).toHaveValue("");
  });

  it("Shift+Enter adds a line instead of sending", async () => {
    const { input, user, onSend } = setup();
    await user.type(input, "one{Shift>}{Enter}{/Shift}two");
    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue("one\ntwo");
  });

  it("the button sends too", async () => {
    const { input, send, user, onSend } = setup();
    await user.type(input, "hello");
    await user.click(send);
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("lets the user type while the assistant answers, but not send", async () => {
    const { input, send, user, onSend } = setup(true);
    await user.type(input, "next question{Enter}");
    expect(input).toHaveValue("next question");
    expect(send).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
