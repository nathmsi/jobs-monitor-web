import { expect, test } from '../../fixtures';
import { SEARCH_JOBS } from '../../fixtures/data';
import { HomePage } from '../../pages/HomePage';
import { JobsPage } from '../../pages/JobsPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { seedStorage, STORAGE_KEYS } from '../../utils/storage';

const PROFILE = {
  skills: ['Swift'], roles: ['mobile'], languages: [], seniority: null, years: null,
  locations: [], titles: [], education: [], certifications: [],
};

test.describe('Navigation · on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, dataset: { jobs: SEARCH_JOBS } });

  test('a bottom bar gives thumb access to the five main places', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.bottomNav.root).toBeVisible();
    for (const name of ['Home', 'Offers', 'For you', /^Saved/, 'Profile']) {
      await expect(jobs.bottomNav.link(name)).toBeVisible();
    }
    await expect(jobs.bottomNav.root.getByRole('link')).toHaveCount(5);
  });

  test('it sits at the bottom edge and its targets are easy to tap', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const nav = (await jobs.bottomNav.root.boundingBox())!;
    expect(Math.round(nav.y + nav.height)).toBe(844);
    for (const name of ['Home', 'Offers', 'For you', 'Profile']) {
      const box = (await jobs.bottomNav.link(name).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('it is not shown on a desktop screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.bottomNav.root).toBeHidden();
  });

  test('the current place is highlighted', async ({ page }) => {
    const jobs = new JobsPage(page);
    const current = async (path: string) => {
      await page.goto(path);
      await expect(jobs.bottomNav.root).toBeVisible();
      return jobs.bottomNav.root.locator('[aria-current="page"]');
    };

    await expect(await current('/')).toHaveText('Home');
    await expect(await current('/jobs')).toHaveText('Offers');
    await expect(await current('/jobs?tab=forme')).toHaveText('For you');
    await expect(await current('/jobs?tab=mine')).toHaveText(/^Saved/);
    await expect(await current('/profile')).toHaveText('My Profile');
  });

  test('"For you" and "Saved" open the matching tab of the offers', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.bottomNav.link('For you').click();
    await expect(page).toHaveURL(/tab=forme/);
    await expect(page.getByRole('tabpanel')).toBeVisible();

    await jobs.bottomNav.link(/^Saved/).click();
    await expect(page).toHaveURL(/tab=mine/);
    await expect(page.getByText('Nothing here yet. Save offers with ★.')).toBeVisible();

    await jobs.bottomNav.link('Offers').click();
    await expect(jobs.cards.first()).toBeVisible();
  });

  test('the tab row no longer overflows: only the two source tabs remain', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.tab('Tech companies')).toBeVisible();
    await expect(jobs.tab('Staffing agencies')).toBeVisible();
    await expect(jobs.tab(/My offers/)).toBeHidden();
    await expect(jobs.tab(/For me/)).toBeHidden();
    const overflow = await page.evaluate(() => {
      const bar = document.querySelector('[role="tablist"]') as HTMLElement;
      return bar.scrollWidth - bar.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('"Saved" shows how many offers you saved', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await expect(jobs.bottomNav.link(/^Saved/)).not.toContainText('1');

    await jobs.saveButton(jobs.cards.first()).click();

    await expect(jobs.bottomNav.link(/^Saved/)).toContainText('1');
  });

  test('the "saved" toast appears above the bottom bar', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.saveButton(jobs.cards.first()).click();

    const toast = (await page.getByText('Offer saved ★').boundingBox())!;
    const nav = (await jobs.bottomNav.root.boundingBox())!;
    expect(toast.y + toast.height).toBeLessThanOrEqual(nav.y);
  });

  test('the page is not hidden behind the bar when scrolled to the end', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const footer = (await page.getByRole('contentinfo').boundingBox())!;
    const nav = (await home.bottomNav.root.boundingBox())!;
    expect(footer.y + footer.height).toBeLessThanOrEqual(nav.y + 1);
  });

  test('"Filters" says how many are active', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    const filters = page.getByRole('button', { name: /^Filters/ });
    await expect(filters).toHaveText('Filters');

    await filters.click();
    await jobs.roleChip('Mobile').click();
    await jobs.postedSelect.selectOption('7d');
    await page.getByRole('button', { name: /^Show \d+ offers?$/ }).click();

    await expect(filters).toHaveText('Filters (2)');
  });

  test('the sheet ends with a button that reports the matching offers and closes it', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await page.getByRole('button', { name: /^Filters/ }).click();

    await jobs.roleChip('Mobile').click();

    const show = page.getByRole('button', { name: 'Show 2 offers' });
    await expect(show).toBeVisible();
    await show.click();
    await expect(show).toBeHidden();
    await expect(jobs.cards).toHaveCount(2);
  });

  test('the toolbar keeps the cards within the screen width', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('on the profile page it keeps working', async ({ page }) => {
    await seedStorage(page, { [STORAGE_KEYS.profile]: PROFILE });
    const profile = new ProfilePage(page);
    await profile.goto();

    await profile.bottomNav.link('For you').click();

    await expect(page).toHaveURL(/tab=forme/);
  });
});
