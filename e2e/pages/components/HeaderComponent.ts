import type { Locator, Page } from '@playwright/test';

/** The sticky app header, present on every page. */
export class HeaderComponent {
  readonly nav: Locator;
  readonly themeToggle: Locator;
  readonly languageTrigger: Locator;
  readonly mobileMenuButton: Locator;
  readonly signInButton: Locator;

  constructor(private readonly page: Page) {
    this.nav = page.getByRole('navigation', { name: 'Main navigation' });
    this.themeToggle = page.getByRole('button', { name: /switch to (light|dark) theme/i });
    this.languageTrigger = page.getByRole('button', { name: /^(EN|HE|FR)$/ });
    this.mobileMenuButton = page.getByRole('button', { name: 'Menu' });
    this.signInButton = page.getByTestId('sign-in-btn').first();
  }

  link(name: string | RegExp): Locator {
    return this.nav.getByRole('link', { name });
  }

  async chooseLanguage(label: 'EN' | 'HE' | 'FR'): Promise<void> {
    await this.languageTrigger.click();
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }
}
