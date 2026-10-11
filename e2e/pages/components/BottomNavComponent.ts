import type { Locator, Page } from '@playwright/test';

/** The phone-only bottom navigation. */
export class BottomNavComponent {
  readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('navigation', { name: 'Quick navigation' });
  }

  link(name: string | RegExp): Locator {
    return this.root.getByRole('link', { name });
  }
}
