import { expect, test } from '../../fixtures';
import { JobsPage } from '../../pages/JobsPage';
import { readStorage, STORAGE_KEYS } from '../../utils/storage';

test.describe('Language and theme', () => {
  test('English is the default and the page is left-to-right', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  test('switching to French translates the interface', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.header.chooseLanguage('FR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(jobs.tab(/Entreprises tech/i)).toBeVisible();
    expect(await readStorage(page, STORAGE_KEYS.language)).toBe('fr');
  });

  test('switching to Hebrew makes the page right-to-left but keeps the header LTR', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.header.chooseLanguage('HE');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('header').first()).toHaveCSS('direction', 'ltr');
  });

  test('the chosen language is remembered after a reload', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.header.chooseLanguage('FR');

    await page.reload();
    await jobs.cards.first().waitFor();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('the header theme button toggles dark mode and is remembered', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await page.emulateMedia({ colorScheme: 'light' });
    await jobs.header.themeToggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await jobs.cards.first().waitFor();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
