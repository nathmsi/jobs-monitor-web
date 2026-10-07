import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

/** `/profile`: account, CV profile editor, job preferences, stats. */
export class ProfilePage extends BasePage {
  readonly heading: Locator;
  readonly signInButton: Locator;
  readonly regionSelect: Locator;
  readonly saveButton: Locator;
  readonly savedNote: Locator;
  readonly emptyStats: Locator;
  readonly themeGroup: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.signInButton = page.getByTestId('sign-in-btn').first();
    this.regionSelect = page.getByRole('combobox', { name: 'Area' });
    this.saveButton = page.getByRole('button', { name: 'Save preferences' });
    this.savedNote = page.getByText('Preferences saved');
    this.emptyStats = page.getByTestId('profile-empty-stats');
    this.themeGroup = page.getByRole('radiogroup');
  }

  async goto(path = '/profile'): Promise<void> {
    await this.page.goto(path);
    await this.heading.waitFor();
  }

  group(name: 'Roles' | 'Source type' | 'Sectors'): Locator {
    return this.page.getByRole('group', { name });
  }

  chip(group: Locator, name: string | RegExp): Locator {
    return group.getByRole('button', { name });
  }

  themeOption(name: 'System' | 'Light' | 'Dark'): Locator {
    return this.themeGroup.getByRole('radio', { name });
  }
}
