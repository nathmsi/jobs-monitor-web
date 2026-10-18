import type { Locator, Page } from '@playwright/test';

/** The job assistant: a launcher on every page, and its conversation window. */
export class ChatComponent {
  readonly launcher: Locator;
  readonly window: Locator;
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly closeButton: Locator;
  readonly newChatButton: Locator;
  readonly status: Locator;
  readonly error: Locator;
  readonly retryButton: Locator;
  readonly offers: Locator;
  readonly links: Locator;
  readonly shareSwitch: Locator;
  readonly sizeButton: Locator;
  readonly cvInput: Locator;
  readonly header: Locator;

  constructor(private readonly page: Page) {
    this.launcher = page.getByRole('button', { name: 'Ask AI' });
    this.window = page.getByRole('dialog', { name: 'Job assistant' });
    this.input = this.window.getByRole('textbox', { name: 'Your message' });
    this.sendButton = this.window.getByRole('button', { name: 'Send' });
    this.closeButton = this.window.getByRole('button', { name: 'Close the chat' });
    this.newChatButton = this.window.getByRole('button', { name: 'New chat' });
    this.status = this.window.getByRole('status');
    this.error = this.window.getByRole('alert');
    this.retryButton = this.window.getByRole('button', { name: 'Try again' });
    this.shareSwitch = this.window.getByRole('switch', { name: /Use my CV/ });
    this.sizeButton = this.window.getByRole('button', { name: /^(Enlarge|Reduce) the chat$/ });
    this.header = this.window.getByRole('heading', { name: 'Job assistant' });
    this.cvInput = this.window.getByTestId('chat-cv-input');
    this.links = this.window.getByRole('list', { name: 'Open in the site' }).getByRole('link');
    this.offers = this.window.getByRole('list', { name: 'Matching offers' }).getByRole('article');
  }

  async open(): Promise<void> {
    await this.launcher.click();
    await this.input.waitFor();
    // Measure once the entrance animation is over, not while the window is still sliding in.
    await this.window.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  }

  async ask(text: string): Promise<void> {
    await this.input.fill(text);
    await this.input.press('Enter');
  }

  /** A quick reply or a starter question. */
  choice(name: string | RegExp): Locator {
    return this.window.getByRole('button', { name });
  }

  message(text: string | RegExp): Locator {
    return this.window.getByText(text);
  }

  offerLink(title: string | RegExp): Locator {
    return this.window.getByRole('link', { name: title });
  }

  /** A resize handle: n, s, e, w, nw, ne, sw, se. */
  handle(side: string): Locator {
    return this.page.getByTestId(`chat-resize-${side}`);
  }

  /** The window's rectangle (the page's own, so it is what the user sees). */
  async box(): Promise<{ x: number; y: number; width: number; height: number }> {
    const box = await this.window.boundingBox();
    if (!box) throw new Error('the chat window is not on screen');
    return box;
  }

  /** Press on the middle of `target`, move by (dx, dy) with the mouse, release. */
  async dragBy(target: Locator, dx: number, dy: number): Promise<void> {
    const box = await target.boundingBox();
    if (!box) throw new Error('nothing to drag');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + dx, y + dy, { steps: 8 });
    await this.page.mouse.up();
  }
}
