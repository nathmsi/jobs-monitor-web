import type { Page, Locator } from '@playwright/test';

export class JobsPagePO {
  readonly page: Page;
  readonly jobCards: Locator;
  readonly regionSelect: Locator;
  readonly searchInput: Locator;
  readonly filterBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.jobCards = page.locator('article');
    this.regionSelect = page.getByRole('combobox', { name: /region/i });
    this.searchInput = page.getByRole('searchbox');
    this.filterBar = page.locator('[class*="filterBar"], [class*="filters"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async waitForJobs() {
    await this.jobCards.first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  jobCardByTitle(title: string) {
    return this.page.getByRole('article').filter({ hasText: title });
  }

  expiredBadge(card: Locator) {
    return card.getByTestId('badge-expired');
  }
}
