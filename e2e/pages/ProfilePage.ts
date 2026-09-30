import type { Page, Locator } from '@playwright/test';

export class ProfilePagePO {
  readonly page: Page;
  readonly roleChips: Locator;
  readonly regionSelect: Locator;
  readonly savePrefsButton: Locator;
  readonly emptyStatsCard: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.roleChips = page.locator('[class*="prefChip"]');
    this.regionSelect = page.locator('[class*="prefSelect"]');
    this.savePrefsButton = page.getByRole('button', { name: /save|enregistrer|שמור/i });
    this.emptyStatsCard = page.locator('[class*="empty"]');
    this.signInButton = page.getByTestId('sign-in-btn').first();
  }

  async goto() {
    await this.page.goto('/profile');
    // Wait for the preferences chips to render (they rely on ROLES constant)
    await this.roleChips.first().waitFor({ state: 'visible', timeout: 10_000 });
  }
}
