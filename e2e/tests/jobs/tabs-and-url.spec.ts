import { expect, test } from '../../fixtures';
import { JobsPage } from '../../pages/JobsPage';

test.describe('Jobs · tabs and URL state', () => {
  test('opens on "Tech companies" by default', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.tab('Tech companies')).toHaveAttribute('aria-selected', 'true');
  });

  test('"Staffing agencies" asks for agency offers only', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.tab('Staffing agencies').click();
    await expect.poll(() => api.lastJobsRequest()?.searchParams.get('kind')).toBe('agency');
    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.card('Expired Role')).toBeVisible();
    await expect(page).toHaveURL(/tab=agency/);
  });

  test('the selected tab and sort survive a reload', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.tab('Staffing agencies').click();
    await jobs.sortSelect.selectOption('hot');
    await expect(page).toHaveURL(/sort=hot/);

    await page.reload();
    await jobs.cards.first().waitFor();
    await expect(jobs.tab('Staffing agencies')).toHaveAttribute('aria-selected', 'true');
    await expect(jobs.sortSelect).toHaveValue('hot');
  });

  test('a shared link restores search, tab and region', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open('/?tab=company&q=front&region=tlv');

    await expect(jobs.searchInput).toHaveValue('front');
    await expect(jobs.areaSelect).toHaveValue('tlv');
    await expect(jobs.cards).toHaveCount(1);
    expect(api.jobsRequests[0].searchParams.get('region')).toBe('tlv');
  });

  test('ignores an unknown tab in the URL', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open('/?tab=bogus&sort=bogus');

    await expect(jobs.tab('Tech companies')).toHaveAttribute('aria-selected', 'true');
    await expect(jobs.sortSelect).toHaveValue('recent');
  });

  test('arrow keys move between tabs (WAI-ARIA pattern)', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.tab('Tech companies').focus();
    await page.keyboard.press('ArrowRight');
    await expect(jobs.tab('Staffing agencies')).toHaveAttribute('aria-selected', 'true');
    await expect(jobs.tab('Staffing agencies')).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(jobs.tab('Tech companies')).toHaveAttribute('aria-selected', 'true');
  });

  test('only the selected tab is in the tab order and it controls the panel', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.tab('Tech companies')).toHaveAttribute('tabindex', '0');
    await expect(jobs.tab('Staffing agencies')).toHaveAttribute('tabindex', '-1');
    await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-company');
  });
});
