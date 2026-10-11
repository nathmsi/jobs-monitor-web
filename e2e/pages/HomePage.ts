import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

/** `/`: the landing page (search entry, live numbers, latest offers). */
export class HomePage extends BasePage {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly stats: Locator;
  readonly cards: Locator;
  readonly seeAllLink: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.searchInput = page.getByRole('searchbox', { name: 'Search offers' });
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });
    this.stats = page.getByRole('term').locator('xpath=..');
    this.cards = page.getByRole('article');
    this.seeAllLink = page.getByRole('link', { name: 'See all offers →' });
    this.alert = page.getByRole('alert');
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    await this.heading.waitFor();
  }

  /** The "Popular" quick links. */
  popularLink(role: string): Locator {
    return this.page.getByRole('navigation', { name: 'Popular' }).getByRole('link', { name: role, exact: true });
  }

  /** One of the live numbers, found by its label ("live offers"). */
  stat(label: string): Locator {
    return this.page.getByRole('term').filter({ hasText: label }).locator('xpath=..');
  }

  door(name: string | RegExp): Locator {
    return this.page.getByRole('link', { name });
  }
}
