import { expect, test } from '../../fixtures';
import { makeJobs } from '../../fixtures/data';
import { JobsPage } from '../../pages/JobsPage';

test.describe('Jobs · pagination', () => {
  test.use({ dataset: { jobs: makeJobs(30) } });

  test('loads the first page and reports progress', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.cards).toHaveCount(24);
    await expect(page.getByText('Showing 24 of 30')).toBeVisible();
  });

  test('"Load more" appends the next page then disappears', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.loadMoreButton.click();
    await expect(jobs.cards).toHaveCount(30);
    await expect(jobs.loadMoreButton).toHaveCount(0);
    expect(api.lastJobsRequest()?.searchParams.get('offset')).toBe('24');
  });

  test('changing a filter starts again from the first page', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.loadMoreButton.click();
    await expect(jobs.cards).toHaveCount(30);

    await jobs.search('Bulk Offer 05');
    await expect.poll(() => api.lastJobsRequest()?.searchParams.get('offset')).toBe('0');
    await expect(jobs.cards).toHaveCount(1);
  });
});
