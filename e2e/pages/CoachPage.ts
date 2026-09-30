import type { Page, Locator } from '@playwright/test';

export class CoachPagePO {
  readonly page: Page;
  readonly heading: Locator;
  readonly uploadButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.uploadButton = page.getByRole('button', { name: /upload|télécharger|העלה/i });
  }

  async goto() {
    await this.page.goto('/coach');
    await this.heading.waitFor({ state: 'visible', timeout: 10_000 });
  }
}
