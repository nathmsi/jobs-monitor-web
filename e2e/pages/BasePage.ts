import type { Page } from '@playwright/test';

import { HeaderComponent } from './components/HeaderComponent';

/** Shared behaviour of every page object. */
export abstract class BasePage {
  readonly header: HeaderComponent;

  protected constructor(readonly page: Page) {
    this.header = new HeaderComponent(page);
  }

  /** Navigate to the page and wait until it is interactive. */
  abstract goto(path?: string): Promise<void>;
}
