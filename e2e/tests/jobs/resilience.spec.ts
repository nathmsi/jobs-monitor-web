import { expect, test } from '../../fixtures';
import { JobsPage } from '../../pages/JobsPage';

test.describe('Jobs · resilience', () => {
  test('shows an alert when the API is down', async ({ page, api }) => {
    api.failJobs();
    const jobs = new JobsPage(page);
    await jobs.goto();

    await expect(jobs.alert).toContainText('Could not reach the API.');
    await expect(jobs.cards).toHaveCount(0);
  });

  test('keeps working with an empty result set', async ({ page, api }) => {
    api.setJobs([]);
    const jobs = new JobsPage(page);
    await jobs.goto();

    await expect(page.getByText('No offers for these filters.')).toBeVisible();
  });

  test('corrupted localStorage does not prevent the page from loading', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('savedJobs.local.v1', '{not json');
      localStorage.setItem('jobFlags.opened.v1', '42');
      localStorage.setItem('jobPreferences.v1', 'null');
      localStorage.setItem('jobsViewMode', 'sideways');
    });
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.cards).toHaveCount(2);
    expect(pageErrors).toEqual([]);
  });
});
