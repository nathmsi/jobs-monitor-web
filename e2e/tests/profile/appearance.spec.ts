import { expect, test } from '../../fixtures';
import { ProfilePage } from '../../pages/ProfilePage';
import { readStorage, STORAGE_KEYS } from '../../utils/storage';

test.describe('Profile · appearance', () => {
  test('defaults to the system theme', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await expect(profile.themeOption('System')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });

  test('choosing a theme applies and persists it', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await profile.themeOption('Dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await readStorage(page, STORAGE_KEYS.theme)).toBe('dark');

    await page.reload();
    await profile.heading.waitFor();
    await expect(profile.themeOption('Dark')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
