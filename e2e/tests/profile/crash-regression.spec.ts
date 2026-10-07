import { expect, test } from '../../fixtures';
import { ProfilePage } from '../../pages/ProfilePage';

/** Regressions: malformed persisted data used to crash the profile page. */
test.describe('Profile · crash regressions', () => {
  test('does not crash when stored preferences have null lists', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'jobPreferences.v1',
        JSON.stringify({ region: 'all', kind: 'all', roles: null, categories: null }),
      );
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.chip(profile.group('Roles'), 'Frontend').click();

    expect(errors).toEqual([]);
  });

  test('does not crash when the stored profile has undefined skills', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cvProfile.local.v1', JSON.stringify({ roles: ['frontend'], seniority: 'Senior' }));
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const profile = new ProfilePage(page);
    await profile.goto();

    await expect(profile.emptyStats).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('does not crash when the stored profile has no roles array', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cvProfile.local.v1', JSON.stringify({ skills: ['React'], roles: 'frontend' }));
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const profile = new ProfilePage(page);
    await profile.goto();

    await expect(profile.emptyStats).toBeVisible();
    expect(errors).toEqual([]);
  });
});
