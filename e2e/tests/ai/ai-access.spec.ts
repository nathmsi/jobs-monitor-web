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
