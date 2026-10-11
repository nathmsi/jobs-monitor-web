import { expect, test } from '../../fixtures';
import { ANDROID_JOB, ANGULAR_JOB, IOS_JOB, SEARCH_JOBS } from '../../fixtures/data';
import { JobsPage } from '../../pages/JobsPage';

test.describe('Jobs · autocomplete in the search box', () => {
  test.use({ dataset: { jobs: SEARCH_JOBS } });

  test('picking a role adds it to the filters and empties the box', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.searchInput.fill('mob');
    await jobs.suggestion(/^Mobile/).click();

    await expect(jobs.roleChip('Mobile')).toHaveAttribute('aria-pressed', 'true');
    await expect(jobs.searchInput).toHaveValue('');
    await expect(jobs.cards).toHaveCount(2);
    await expect(jobs.card(IOS_JOB.title)).toBeVisible();
    await expect(jobs.card(ANDROID_JOB.title)).toBeVisible();
    expect(api.lastJobsRequest()?.searchParams.get('role')).toBe('mobile');
    await expect(page).toHaveURL(/role=mobile/);
  });

  test('picking several roles combines them', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.searchInput.fill('mob');
    await jobs.suggestion(/^Mobile/).click();
    await jobs.searchInput.fill('front');
    await jobs.suggestion(/^Frontend/).click();

    await expect(jobs.cards).toHaveCount(3);
    await expect(jobs.card(ANGULAR_JOB.title)).toBeVisible();
    await expect(page).toHaveURL(/role=mobile%2Cfrontend/);
  });

  test('picking a technology searches for it right away', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.searchInput.fill('andr');
    await jobs.suggestion(/^Android/).click();

    await expect(jobs.searchInput).toHaveValue('Android');
    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.card(ANDROID_JOB.title)).toBeVisible();
    expect(api.lastJobsRequest()?.searchParams.get('q')).toBe('Android');
    await expect(jobs.activeFilters()).toContainText('“Android”');
  });

  test('a company can be picked from the suggestions', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.searchInput.fill('mon');
    await expect(jobs.suggestions().getByRole('group', { name: 'Companies' })).toContainText('monday.com');
    await jobs.suggestion(/^monday\.com/).click();

    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.card(ANDROID_JOB.title)).toBeVisible();
  });

  test('keyboard only: type, arrow, Enter', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.searchInput.fill('react');
    await expect(jobs.suggestion(/^React\s/).first()).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(jobs.searchInput).toHaveValue('React');
    await expect(jobs.suggestions()).toBeHidden();
  });

  test('typing still filters the list live, and Enter applies it immediately', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.searchInput.fill('swift');
    await jobs.searchInput.press('Enter');

    await expect.poll(() => api.lastJobsRequest()?.searchParams.get('q')).toBe('swift');
    await expect(jobs.card(IOS_JOB.title)).toBeVisible();
  });

  test('the clear button empties the search and restores the list', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.search('android');
    await expect(jobs.cards).toHaveCount(1);

    await jobs.clearSearchButton.click();

    await expect(jobs.searchInput).toHaveValue('');
    await expect(jobs.cards).toHaveCount(4);
  });

  test('the popup lists what was searched before when the box is empty', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.searchInput.fill('kotlin');
    await jobs.searchInput.press('Enter');

    await jobs.clearSearchButton.click();

    // Clearing leaves the box focused and opens the popup.
    await expect(jobs.suggestions().getByRole('group', { name: 'Recent searches' })).toContainText('kotlin');
    await expect(jobs.suggestions().getByRole('group', { name: 'Popular' })).toBeVisible();
  });

  test('exposes the combobox pattern to assistive technology', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.searchInput).toHaveAttribute('aria-expanded', 'false');
    await jobs.searchInput.fill('re');
    await expect(jobs.searchInput).toHaveAttribute('aria-expanded', 'true');
    await expect(jobs.searchInput).toHaveAttribute('aria-controls', /.+/);

    await page.keyboard.press('ArrowDown');
    const active = await jobs.searchInput.getAttribute('aria-activedescendant');
    await expect(page.locator(`[id="${active}"]`)).toHaveAttribute('aria-selected', 'true');
  });

  test('the offers page keeps working when the suggestions service is down', async ({ page, api }) => {
    api.failSuggestions();
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.search('android');

    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.suggestions()).toBeHidden();
  });
});
