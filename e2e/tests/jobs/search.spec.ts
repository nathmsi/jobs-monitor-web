import { expect, test } from '../../fixtures';
import { ANDROID_JOB, ANGULAR_JOB, DECOY_JOB, IOS_JOB, SEARCH_JOBS } from '../../fixtures/data';
import { JobsPage } from '../../pages/JobsPage';

test.describe('Jobs · search experience', () => {
  test.use({ dataset: { jobs: SEARCH_JOBS } });

  test('"Mobile" finds iOS and Android offers (title or description)', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.roleChip('Mobile').click();

    await expect(jobs.cards).toHaveCount(2);
    await expect(jobs.card(IOS_JOB.title)).toBeVisible();
    await expect(jobs.card(ANDROID_JOB.title)).toBeVisible();
    expect(api.lastJobsRequest()?.searchParams.get('role')).toBe('mobile');
  });

  test('"Frontend" finds an Angular offer through its description', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.roleChip('Frontend').click();

    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.card(ANGULAR_JOB.title)).toBeVisible();
  });

  test('roles can be combined and removed one by one from the chips', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.roleChip('Mobile').click();
    await jobs.roleChip('Frontend').click();
    await expect(jobs.cards).toHaveCount(3);
    expect(api.lastJobsRequest()?.searchParams.get('role')).toBe('mobile,frontend');
    await expect(page).toHaveURL(/role=mobile%2Cfrontend/);

    await page.getByRole('button', { name: 'Remove filter Mobile' }).click();
    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.roleChip('Mobile')).toHaveAttribute('aria-pressed', 'false');
  });

  test('shows the number of results and keeps it in step with the filters', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await expect(jobs.resultCount()).toHaveText('4 offers');

    await jobs.roleChip('Mobile').click();
    await expect(jobs.resultCount()).toHaveText('2 offers');

    await jobs.search('ios');
    await expect(jobs.resultCount()).toHaveText('1 offer');
  });

  test('active filters are listed as chips and "Clear all" resets everything', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.roleChip('Mobile').click();
    await jobs.search('android');
    await expect(jobs.cards).toHaveCount(1);

    await expect(jobs.activeFilters()).toContainText('Mobile');
    await expect(jobs.activeFilters()).toContainText('“android”');

    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(jobs.cards).toHaveCount(4);
    await expect(jobs.searchInput).toHaveValue('');
    await expect(jobs.activeFilters()).toHaveCount(0);
  });

  test('searching by company name finds that company\'s offers', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.search('monday');

    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.card(ANDROID_JOB.title)).toBeVisible();
  });

  test('a word is not found inside another word', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    // "ios" appears inside "scenarios", "radios" and "studios" in the decoy.
    await jobs.search('ios');

    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.card(IOS_JOB.title)).toBeVisible();
    await expect(jobs.card(DECOY_JOB.title)).toHaveCount(0);
  });

  test('results are ranked by relevance as soon as something is searched', async ({ page, api }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await expect(jobs.sortSelect).toHaveValue('recent');

    await jobs.search('engineer');

    await expect(jobs.sortSelect).toHaveValue('relevance');
    await expect.poll(() => api.lastJobsRequest()?.searchParams.get('sort')).toBe('relevance');
    // The default is not stored in the URL; an explicit choice is.
    await expect(page).not.toHaveURL(/sort=/);

    await jobs.sortSelect.selectOption('oldest');
    await expect(page).toHaveURL(/sort=oldest/);
  });

  test('saved role preferences are all applied to the first search', async ({ page, api }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'jobPreferences.v1',
        JSON.stringify({ region: 'all', kind: 'all', roles: ['mobile', 'frontend'], categories: [] }),
      );
    });
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.cards).toHaveCount(3);
    expect(api.jobsRequests[0].searchParams.get('role')).toBe('mobile,frontend');
  });
});

test.describe('Jobs · card', () => {
  test('stays light: summary, a few tags, bookmark and a link', async ({ page, api }) => {
    api.setJobs([
      {
        ...IOS_JOB,
        ai_summary: JSON.stringify({
          headline: 'Own the iOS app',
          stack: ['Swift', 'SwiftUI', 'Combine', 'XCTest', 'Fastlane'],
          level: 'Senior',
          remote: 'Hybrid',
          highlights: ['Equity', 'Gym'],
        }),
      },
    ]);
    const jobs = new JobsPage(page);
    await jobs.open();

    const card = jobs.card(IOS_JOB.title);
    await expect(card.getByRole('button')).toHaveCount(1);
    await expect(card.getByRole('link', { name: /view offer/i })).toBeVisible();
    await expect(card).toContainText('Own the iOS app');
    await expect(card).toContainText('Combine');
    await expect(card).not.toContainText('XCTest');
    await expect(card).not.toContainText('Equity');
  });
});
