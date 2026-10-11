import type { Page } from '@playwright/test';

import { BottomNavComponent } from './components/BottomNavComponent';
import { HeaderComponent } from './components/HeaderComponent';

/** Shared behaviour of every page object. */
export abstract class BasePage {
  readonly header: HeaderComponent;
  readonly bottomNav: BottomNavComponent;

  protected constructor(readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.bottomNav = new BottomNavComponent(page);
  }

  /** Navigate to the page and wait until it is interactive. */
  abstract goto(path?: string): Promise<void>;
}
