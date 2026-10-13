import { expect, test } from '../../fixtures';
import { daysAgo, hoursAgo, makeJob } from '../../fixtures/data';
import { HomePage } from '../../pages/HomePage';
import { JobsPage } from '../../pages/JobsPage';

const JOBS = [
  makeJob({ external_id: 'f1', title: 'Fresh Offer', added_at: hoursAgo(0.005) }),
  makeJob({ external_id: 'f2', title: 'Today Offer', added_at: hoursAgo(5) }),
  makeJob({ external_id: 'f3', title: 'Yesterday Offer', added_at: hoursAgo(30) }),
  makeJob({ external_id: 'f4', title: 'Week Offer', added_at: daysAgo(5) }),
  makeJob({ external_id: 'f5', title: 'Month Offer', added_at: daysAgo(20) }),
  makeJob({ external_id: 'f6', title: 'Unknown Date Offer', added_at: null }),
];

test.describe('Jobs · freshness', () => {
  test.use({ dataset: { jobs: JOBS } });

  test('each card says how long the offer has been online', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.card('Fresh Offer')).toContainText('just now');
    await expect(jobs.card('Today Offer')).toContainText('5 hours ago');
    await expect(jobs.card('Yesterday Offer')).toContainText('yesterday');
    await expect(jobs.card('Week Offer')).toContainText('5 days ago');
    await expect(jobs.card('Month Offer')).toContainText('2 weeks ago');
  });

  test('the age sits next to the place, and is a machine-readable <time>', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const age = jobs.card('Week Offer').locator('time');
    await expect(age).toHaveText('5 days ago');
    await expect(age).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/);
    await expect(jobs.card('Week Offer')).toContainText('Tel Aviv · 5 days ago');
  });

  test('an offer with no known date simply shows no age', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.card('Unknown Date Offer').locator('time')).toHaveCount(0);
    await expect(jobs.card('Unknown Date Offer')).toContainText('Tel Aviv');
  });

  test('"Added" filters offers by how recently they appeared', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await expect(jobs.cards).toHaveCount(6);

    await jobs.postedSelect.selectOption('7d');

    await expect(jobs.cards).toHaveCount(4);
    await expect(jobs.card('Month Offer')).toHaveCount(0);
    await expect(jobs.card('Unknown Date Offer')).toHaveCount(0);
    expect(api.lastJobsRequest()?.searchParams.get('posted')).toBe('7d');
    await expect(page).toHaveURL(/posted=7d/);
  });

  test('the shortest window keeps only today\'s offers', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.postedSelect.selectOption('24h');

    await expect(jobs.cards).toHaveCount(2);
    await expect(jobs.card('Fresh Offer')).toBeVisible();
    await expect(jobs.card('Today Offer')).toBeVisible();
  });

  test('the window shows as a chip that can be removed', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.postedSelect.selectOption('30d');

    await expect(jobs.activeFilters()).toContainText('Last 30 days');
    await page.getByRole('button', { name: 'Remove filter Last 30 days' }).click();

    await expect(jobs.cards).toHaveCount(6);
    await expect(jobs.postedSelect).toHaveValue('');
    await expect(page).not.toHaveURL(/posted=/);
  });

  test('"Clear all" also resets the window', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.postedSelect.selectOption('7d');
    await jobs.search('offer');
    await expect(jobs.activeFilters()).toContainText('Last 7 days');

    await page.getByRole('button', { name: 'Clear all' }).click();

    await expect(jobs.postedSelect).toHaveValue('');
    await expect(jobs.cards).toHaveCount(6);
  });

  test('a shared link keeps the window', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open('/jobs?posted=24h');

    await expect(jobs.postedSelect).toHaveValue('24h');
    await expect(jobs.cards).toHaveCount(2);
    expect(api.jobsRequests[0].searchParams.get('posted')).toBe('24h');
  });

  test('an unknown window in the URL is ignored', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open('/jobs?posted=forever');

    await expect(jobs.postedSelect).toHaveValue('');
    await expect(jobs.cards).toHaveCount(6);
  });

  test('the footer says when the data was last updated', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(page.getByText(/^Updated 12 minutes ago$/)).toBeVisible();
  });

  test('so does the home page, and it stays quiet if the date is unknown', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(page.getByText(/^Updated 12 minutes ago$/)).toBeVisible();

    await page.route('**/api/stats', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: 1, new_this_week: 1, companies: 1, updated_at: null }) }),
    );
    await page.reload();
    await home.heading.waitFor();
    await expect(page.getByText(/^Updated/)).toHaveCount(0);
  });
});

test.describe('Jobs · the "New" badge', () => {
  test.use({
    dataset: {
      jobs: [
        makeJob({ external_id: 'n1', title: 'Brand New Offer', added_at: hoursAgo(5), is_new: true }),
        makeJob({ external_id: 'n2', title: 'Flagged But Old Offer', added_at: daysAgo(4), is_new: true }),
      ],
    },
  });

  test('is kept for offers under 48 hours, so it still means something', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.card('Brand New Offer').getByTestId('badge-new')).toBeVisible();
    await expect(jobs.card('Flagged But Old Offer').getByTestId('badge-new')).toHaveCount(0);
  });
});
