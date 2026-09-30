import { test as base } from '@playwright/test';
import { mockApi } from '../utils/api-mocks';

/** Extended fixture that auto-mocks all API calls before each test. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await mockApi(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
