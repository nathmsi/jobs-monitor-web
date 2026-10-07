import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

/** `/coach`: CV review and offer matching (sign-in required). */
export class CoachPage extends BasePage {
  readonly heading: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.signInButton = page.getByRole('button', { name: /sign in/i }).last();
  }

  async goto(path = '/coach'): Promise<void> {
    await this.page.goto(path);
    await this.heading.waitFor();
  }
}
