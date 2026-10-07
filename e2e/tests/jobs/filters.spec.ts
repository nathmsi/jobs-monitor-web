import { expect, test } from '../../fixtures';
import { JobsPage } from '../../pages/JobsPage';

test.describe('Jobs · search, filters and sorting', () => {
  test('searching sends the query to the API and narrows the list', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const request = page.waitForRequest((r) => r.url().includes('/api/jobs') && r.url().includes('q=node'));
    await jobs.search('node');
    await request;

    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.card('Backend Developer')).toBeVisible();
    expect(api.lastJobsRequest()?.searchParams.get('q')).toBe('node');
  });

  test('typing a few characters sends a single debounced request', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    const before = api.jobsRequests.length;

    await jobs.searchInput.pressSequentially('front', { delay: 20 });
    await expect(jobs.cards).toHaveCount(1);

    const queried = api.jobsRequests.slice(before).filter((u) => u.searchParams.has('q'));
    expect(queried.map((u) => u.searchParams.get('q'))).toEqual(['front']);
  });

  test('the search is reflected in the URL', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.search('react');
    await expect(page).toHaveURL(/[?&]q=react/);
  });

  test('clearing the search restores the full list', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.search('node');
    await expect(jobs.cards).toHaveCount(1);

    await jobs.clearSearchButton.click();
    await expect(jobs.searchInput).toHaveValue('');
    await expect(jobs.cards).toHaveCount(2);
  });

  test('shows an empty state with a way back when nothing matches', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.search('zzz-no-such-offer');
    await expect(page.getByText('No offers for these filters.')).toBeVisible();
    await expect(jobs.cards).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear', exact: true }).last().click();
    await expect(jobs.cards).toHaveCount(2);
  });

  test('changing the area asks the API for that region', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.areaSelect.selectOption('jerusalem');
    await expect.poll(() => api.lastJobsRequest()?.searchParams.get('region')).toBe('jerusalem');
    await expect(page).toHaveURL(/region=jerusalem/);
  });

  test('picking a role chip filters by that role and toggles off again', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const frontend = jobs.roleChip('Frontend');
    await frontend.click();
    await expect(frontend).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => api.lastJobsRequest()?.searchParams.get('role')).toBe('frontend');

    await frontend.click();
    await expect(frontend).toHaveAttribute('aria-pressed', 'false');
    await expect(page).toHaveURL(/[?&]role=(&|$)/);
  });

  test('sorting by "Hottest" puts hot offers first', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.sortSelect.selectOption('hot');
    await expect.poll(() => api.lastJobsRequest()?.searchParams.get('sort')).toBe('hot');
    expect((await jobs.titles())[0]).toBe('Frontend Engineer');
  });

  test('sorting by "Oldest" reverses the list', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.sortSelect.selectOption('oldest');
    await expect(jobs.cards.first()).toContainText('Backend Developer');
  });

  test('can expand the role list', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const more = page.getByRole('button', { name: /^\+\d+ more$/ });
    await more.click();
    await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible();
  });
});
