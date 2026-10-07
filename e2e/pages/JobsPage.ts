import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

type TabName = 'Tech companies' | 'Staffing agencies' | 'My offers' | 'For me';

/** The offers browser at `/`. */
export class JobsPage extends BasePage {
  readonly cards: Locator;
  readonly searchInput: Locator;
  readonly clearSearchButton: Locator;
  readonly areaSelect: Locator;
  readonly sortSelect: Locator;
  readonly hideSeenCheckbox: Locator;
  readonly loadMoreButton: Locator;
  readonly alert: Locator;
  readonly listViewButton: Locator;
  readonly gridViewButton: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    super(page);
    this.cards = page.getByRole('article');
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.clearSearchButton = page.getByRole('button', { name: 'Clear', exact: true });
    this.areaSelect = page.getByRole('combobox', { name: 'Area' });
    this.sortSelect = page.getByRole('combobox', { name: 'Sort' });
    this.hideSeenCheckbox = page.getByRole('checkbox', { name: /hide offers/i });
    this.loadMoreButton = page.getByRole('button', { name: 'Load more' });
    this.alert = page.getByRole('alert');
    this.listViewButton = page.getByRole('button', { name: 'List view' });
    this.gridViewButton = page.getByRole('button', { name: 'Grid view' });
    this.toast = page.getByRole('status').filter({ hasText: /./ });
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    await this.page.getByRole('tablist').waitFor();
  }

  /** Open the page and wait for the first offer card. */
  async open(path = '/'): Promise<void> {
    await this.goto(path);
    await this.cards.first().waitFor();
  }

  card(title: string): Locator {
    return this.cards.filter({ hasText: title });
  }

  tab(name: TabName | RegExp): Locator {
    return this.page.getByRole('tab', { name });
  }

  roleChip(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  /** Save / "Saved" toggle inside a card. */
  saveButton(card: Locator): Locator {
    return card.getByRole('button', { name: /^saved?$/i });
  }

  /** Only shown once the offer is saved. */
  appliedButton(card: Locator): Locator {
    return card.getByRole('button', { name: /^(i applied|applied)$/i });
  }

  activeFilters(): Locator {
    return this.page.getByRole('list', { name: 'Active filters' });
  }

  resultCount(): Locator {
    return this.page.getByRole('status').filter({ hasText: /\d+ offers?/ });
  }

  viewLink(card: Locator): Locator {
    return card.getByRole('link', { name: /view offer/i });
  }

  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
  }

  /** Visible titles in DOM order. */
  async titles(): Promise<string[]> {
    return this.cards.getByRole('heading', { level: 3 }).allTextContents();
  }
}
