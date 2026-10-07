import { test as base } from '@playwright/test';

import { MOCK_JOBS, type MockJob } from './data';
import { mockApi, type ApiMock } from '../utils/api-mocks';

interface Fixtures {
  /** Backend handle; also installs the API mock before every test. */
  api: ApiMock;
  /**
   * Offers served by the mock. Override per file/describe with
   * `test.use({ dataset: { jobs: [...] } })`. (Wrapped in an object because
   * Playwright reads a bare array option as a `[value, options]` tuple.)
   */
  dataset: { jobs: MockJob[] };
}

/**
 * Every spec gets the backend mocked automatically — the suite never talks to
 * a real API. Tests that need to inspect or change the backend request the
 * `api` fixture.
 */
export const test = base.extend<Fixtures>({
  dataset: [{ jobs: MOCK_JOBS }, { option: true }],
  api: [
    async ({ page, dataset }, use) => {
      await use(await mockApi(page, dataset.jobs));
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
