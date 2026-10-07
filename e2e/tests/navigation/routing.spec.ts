import { expect, test } from '../../fixtures';
import { JobsPage } from '../../pages/JobsPage';

test.describe('Navigation', () => {
  test('the header links move between the three pages', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.header.link('CV Analysis').click();
    await expect(page).toHaveURL(/\/coach$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CV Coach');

    await jobs.header.link('My Profile').click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('My profile');

    await jobs.header.link('Offers').click();
    await expect(page).toHaveURL(/\/$/);
    await jobs.cards.first().waitFor();
  });

  test('marks the current page in the navigation', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'My Profile' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('the brand link goes back to the offers', async ({ page }) => {
    await page.goto('/coach');
    await page.getByRole('link', { name: 'Tech Jobs' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('search and filters are still there after visiting another page', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open('/?q=node');
    await expect(jobs.cards).toHaveCount(1);

    await jobs.header.link('My Profile').click();
    await page.goBack();
    await jobs.cards.first().waitFor();
    await expect(jobs.searchInput).toHaveValue('node');
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the hamburger menu opens the mobile navigation', async ({ page }) => {
      const jobs = new JobsPage(page);
      await jobs.open();

      await jobs.header.mobileMenuButton.click();
      const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
      await mobileNav.getByRole('link', { name: 'My Profile' }).click();

      await expect(page).toHaveURL(/\/profile$/);
      await expect(mobileNav).toHaveCount(0);
    });

    test('filters open in a sheet that can be closed', async ({ page }) => {
      const jobs = new JobsPage(page);
      await jobs.open();

      await page.getByRole('button', { name: 'Filters' }).click();
      const close = page.getByRole('button', { name: 'Close', exact: true });
      await expect(close).toBeVisible();
      await close.click();
      await expect(close).toBeHidden();
    });
  });
});
