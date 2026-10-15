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
    this.links = this.window.getByRole('list', { name: 'Open in the site' }).getByRole('link');
    this.offers = this.window.getByRole('list', { name: 'Matching offers' }).getByRole('article');
  }

  async open(): Promise<void> {
    await this.launcher.click();
    await this.input.waitFor();
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
}
