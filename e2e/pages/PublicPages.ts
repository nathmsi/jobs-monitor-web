import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

/** `/jobs/:source/:id`, `/companies/:key` and `/tech/:tech`: the public, crawlable pages. */
export class PublicPage extends BasePage {
  readonly heading: Locator;
  readonly cards: Locator;
  readonly applyLink: Locator;
  readonly canonical: Locator;
  readonly robots: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.cards = page.getByRole('article');
    this.applyLink = page.getByRole('link', { name: /^Apply/ });
    this.canonical = page.locator('link[rel="canonical"]');
    this.robots = page.locator('meta[name="robots"]');
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }
}
