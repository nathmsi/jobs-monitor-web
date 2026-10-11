import { expect, test } from '../../fixtures';
import { ANDROID_JOB, IOS_JOB, SEARCH_JOBS, makeJobs } from '../../fixtures/data';
import { HomePage } from '../../pages/HomePage';
import { JobsPage } from '../../pages/JobsPage';
import { seedStorage, STORAGE_KEYS } from '../../utils/storage';

test.describe('Home', () => {
  test.use({ dataset: { jobs: SEARCH_JOBS } });

  test('introduces the app with a single clear action', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(page).toHaveTitle('Home — Tech Jobs');
    await expect(home.heading).toHaveText('Find your next tech job in Israel');
    await expect(home.searchInput).toBeVisible();
    await expect(home.searchButton).toBeVisible();
    // The page leads with search: no tabs, filters or sorting yet.
    await expect(page.getByRole('tablist')).toHaveCount(0);
    // The search box is the only control.
    await expect(page.getByRole('combobox')).toHaveCount(1);
  });

  test('shows the live numbers from the API', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.stat('live offers')).toContainText('856');
    await expect(home.stat('new this week')).toContainText('42');
    await expect(home.stat('companies')).toContainText('120');
  });

  test('hides the numbers when they cannot be loaded', async ({ page }) => {
    await page.route('**/api/stats', (route) => route.fulfill({ status: 500, body: '{}' }));
    const home = new HomePage(page);
    await home.goto();

    await expect(home.cards.first()).toBeVisible();
    await expect(page.getByRole('term')).toHaveCount(0);
  });

  test('searching opens the offers with that search applied', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.searchInput.fill('ios');
    await home.searchInput.press('Enter');

    await expect(page).toHaveURL(/\/jobs\?q=ios/);
    const jobs = new JobsPage(page);
    await expect(jobs.searchInput).toHaveValue('ios');
    await expect(jobs.cards).toHaveCount(1);
    await expect(jobs.card(IOS_JOB.title)).toBeVisible();
  });

  test('the Search button works too, and an empty search just opens the offers', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.searchButton.click();

    await expect(page).toHaveURL(/\/jobs$/);
  });

  test('a popular role opens the offers filtered on it', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.popularLink('Mobile').click();

    await expect(page).toHaveURL(/\/jobs\?role=mobile/);
    const jobs = new JobsPage(page);
    await expect(jobs.roleChip('Mobile')).toHaveAttribute('aria-pressed', 'true');
    await expect(jobs.cards).toHaveCount(2);
    await expect(jobs.card(ANDROID_JOB.title)).toBeVisible();
  });

  test('previews the latest offers and links to all of them', async ({ page, api }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.cards).toHaveCount(4);
    const request = api.jobsRequests.find((u) => u.searchParams.get('limit') === '6');
    expect(request?.searchParams.get('sort')).toBe('recent');

    await home.seeAllLink.click();
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(new JobsPage(page).tablist()).toBeVisible();
  });

  test('offers can be saved straight from the home page', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.cards.first().getByRole('button', { name: 'Save' }).click();

    await expect(home.cards.first().getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('shows an error with a retry when the latest offers fail to load', async ({ page, api }) => {
    api.failJobs();
    const home = new HomePage(page);
    await home.goto();

    await expect(home.alert).toContainText('Could not load the latest offers.');

    api.recover();
    await home.alert.getByRole('button', { name: 'Try again' }).click();
    await expect(home.cards.first()).toBeVisible();
  });

  test('without a profile it invites you to add your CV (no account) and set preferences', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.door(/Add your CV/)).toHaveAttribute('href', '/profile');
    await expect(home.door(/Set your preferences/)).toHaveAttribute('href', '/profile');
  });

  test('with a profile it offers the personalised list instead', async ({ page }) => {
    await seedStorage(page, {
      [STORAGE_KEYS.profile]: {
        skills: ['Swift'], roles: ['mobile'], languages: [], seniority: null, years: null,
        locations: [], titles: [], education: [], certifications: [],
      },
    });
    const home = new HomePage(page);
    await home.goto();

    await expect(home.door(/Offers that match your profile/)).toHaveAttribute('href', '/jobs?tab=forme');
    await expect(home.door(/Add your CV/)).toHaveCount(0);

    await home.door(/Offers that match your profile/).click();
    await expect(new JobsPage(page).tab('For me')).toHaveAttribute('aria-selected', 'true');
  });

  test('old shared links to the offers keep working', async ({ page }) => {
    await page.goto('/?tab=agency&q=staff&sort=hot');

    await expect(page).toHaveURL(/\/jobs\?tab=agency&q=staff&sort=hot/);
    await new JobsPage(page).tablist().waitFor();
  });

  test('"Home" is highlighted in the navigation', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.header.link('Home')).toHaveAttribute('aria-current', 'page');
    await expect(home.header.link('Offers')).not.toHaveAttribute('aria-current', 'page');
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('fits the screen and keeps search above the fold', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await expect(home.searchInput).toBeInViewport();
      await expect(home.searchButton).toBeInViewport();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});

test.describe('Home · many offers', () => {
  test.use({ dataset: { jobs: makeJobs(30) } });

  test('previews only the six newest', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.cards).toHaveCount(6);
  });
});
