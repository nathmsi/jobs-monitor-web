import { expect, test } from '../../fixtures';
import { SEARCH_JOBS } from '../../fixtures/data';
import { HomePage } from '../../pages/HomePage';
import { JobsPage } from '../../pages/JobsPage';

test.describe('AI coach · easy to find', () => {
  test.use({ dataset: { jobs: SEARCH_JOBS } });

  test('the home page puts two AI cards right under the search', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.aiPromos).toHaveCount(2);
    await expect(page.getByTestId('ai-promo-review')).toContainText('Get your CV analyzed');
    await expect(page.getByTestId('ai-promo-match')).toContainText('Find the 20 jobs made for you');

    const search = (await home.searchButton.boundingBox())!;
    const card = (await page.getByTestId('ai-promo-review').boundingBox())!;
    expect(card.y).toBeGreaterThan(search.y);

    await page.getByTestId('ai-promo-review').click();
    await expect(page).toHaveURL(/\/coach$/);
  });

  test('the header marks the coach with an AI badge', async ({ page }) => {
    const home = new HomePage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await home.goto();

    const link = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: /CV Analysis/ });
    await expect(link.getByTestId('ai-badge')).toBeVisible();
  });

  test('the results end with a nudge towards the AI picks', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const nudge = page.getByTestId('ai-nudge-results');
    await expect(nudge).toBeVisible();
    await nudge.click();
    await expect(page).toHaveURL(/\/coach$/);
  });

  test('"For me" without a profile explains how to switch it on', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.tab('For me').click();

    await expect(page.getByTestId('ai-activate-forme')).toBeVisible();
  });

  test('an empty favorites list points to the AI', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.tab(/My offers/).click();

    await expect(page.getByTestId('ai-nudge-saved')).toContainText('No favorites yet?');
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the AI coach is the raised button of the bottom bar', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      const link = home.bottomNav.link(/CV Analysis/);
      await expect(link.getByTestId('ai-badge')).toBeVisible();
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      await link.click();
      await expect(page).toHaveURL(/\/coach$/);
    });
  });
});

test.describe('CV Coach · understand it before signing in', () => {
  test('shows the three steps and a sample result', async ({ page }) => {
    await page.goto('/coach');

    const how = page.getByTestId('coach-how');
    await expect(how.getByRole('heading', { name: 'How it works' })).toBeVisible();
    await expect(how.getByRole('listitem')).toHaveCount(3);
    await expect(how.getByText('Example', { exact: true })).toBeVisible();
    await expect(how).toContainText('72 / 100');
  });
});

test.describe('Help bubbles', () => {
  test.use({ dataset: { jobs: SEARCH_JOBS }, viewport: { width: 1280, height: 800 } });

  test('a "?" opens a short explanation and closes with Escape or a tap elsewhere', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const tip = page.getByRole('button', { name: 'More info' }).first();
    await tip.click();
    await expect(tip).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('note')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('note')).toHaveCount(0);

    await tip.click();
    await page.getByRole('heading', { level: 1 }).or(page.locator('body')).click({ position: { x: 5, y: 400 } });
    await expect(page.getByRole('note')).toHaveCount(0);
  });

  test('works from the keyboard', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const tip = page.getByRole('button', { name: 'More info' }).first();
    await tip.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('note')).toBeVisible();
  });

  test('explains "For me" and "My offers" next to the tabs', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await page.getByRole('button', { name: 'More info' }).nth(0).click();
    await expect(page.getByRole('note')).toContainText('the ones you saved or applied to');
  });
});

test.describe('First visit tour', () => {
  test.use({ dataset: { jobs: SEARCH_JOBS } });

  test('shows three steps, can be skipped, and never comes back', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const tour = page.getByTestId('first-visit-tour');
    await expect(tour).toBeVisible();
    await expect(tour).toContainText('Step 1 of 3');
    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour).toContainText('Step 2 of 3');

    await tour.getByRole('button', { name: 'Skip' }).click();
    await expect(tour).toHaveCount(0);

    await page.reload();
    await home.heading.waitFor();
    await expect(page.getByTestId('first-visit-tour')).toHaveCount(0);
  });

  test('nothing is blocked while it is open: the search still works', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(page.getByTestId('first-visit-tour')).toBeVisible();

    await home.searchInput.fill('react');
    await home.searchButton.click();
    await expect(page).toHaveURL(/\/jobs\?q=react/);
  });
});

test.describe('Phone search', () => {
  test.use({ dataset: { jobs: SEARCH_JOBS }, viewport: { width: 390, height: 844 } });

  test('a search field sits under the header and filters the offers', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const box = page.getByRole('searchbox', { name: 'Search offers' });
    await expect(box).toBeVisible();
    await box.fill('swift');
    await expect(page).toHaveURL(/q=swift/);
  });

  test('the popular searches scroll sideways in a single row', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const list = home.popular().getByRole('list');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(list).toHaveCSS('flex-wrap', 'nowrap');
  });
});
