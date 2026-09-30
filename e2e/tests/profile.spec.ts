import { test, expect } from '../fixtures';
import { ProfilePagePO } from '../pages/ProfilePage';

test.describe('Profile page — logged out', () => {
  test('loads without crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const po = new ProfilePagePO(page);
    await po.goto();

    expect(errors).toHaveLength(0);
  });

  test('renders role preference chips', async ({ page }) => {
    const po = new ProfilePagePO(page);
    await po.goto();

    const chipCount = await po.roleChips.count();
    expect(chipCount).toBeGreaterThan(0);
  });

  test('clicking a role chip does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const po = new ProfilePagePO(page);
    await po.goto();

    // Click the first chip (toggle on/off) — used to crash when roles was null
    await po.roleChips.first().click();
    await po.roleChips.first().click();

    expect(errors).toHaveLength(0);
  });

  test('clicking a category chip does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const po = new ProfilePagePO(page);
    await po.goto();

    const categoryChips = page.locator('[class*="prefChip"]');
    // Category chips appear below role chips — click one near the bottom
    const total = await categoryChips.count();
    if (total > 5) {
      await categoryChips.nth(total - 1).click();
    }

    expect(errors).toHaveLength(0);
  });

  test('shows empty stats card when no profile', async ({ page }) => {
    const po = new ProfilePagePO(page);
    await po.goto();

    await expect(po.emptyStatsCard.first()).toBeVisible();
  });

  test('shows sign-in button (not logged in)', async ({ page }) => {
    const po = new ProfilePagePO(page);
    await po.goto();

    await expect(po.signInButton).toBeVisible();
  });

  test('region select is present', async ({ page }) => {
    const po = new ProfilePagePO(page);
    await po.goto();

    await expect(po.regionSelect).toBeVisible();
  });

  test('profile page title is set', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Profile|Profil/i);
  });
});

test.describe('Profile page — crash regression tests', () => {
  test('does not crash when localStorage has null roles', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Inject malformed preferences before page loads
    await page.addInitScript(() => {
      localStorage.setItem(
        'jobPreferences.v1',
        JSON.stringify({ region: 'all', kind: 'all', roles: null, categories: null }),
      );
    });

    const po = new ProfilePagePO(page);
    await po.goto();

    expect(errors).toHaveLength(0);
    // Chips must still render
    const chipCount = await po.roleChips.count();
    expect(chipCount).toBeGreaterThan(0);
  });

  test('does not crash when localStorage has undefined skills in profile', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Inject malformed profile (skills missing) — triggers the old crash
    await page.addInitScript(() => {
      localStorage.setItem(
        'cvProfile.local.v1',
        JSON.stringify({ seniority: 'Senior', roles: ['frontend'] }),
        // Note: skills key is absent — old format that used to crash
      );
    });

    const po = new ProfilePagePO(page);
    await po.goto();

    expect(errors).toHaveLength(0);
  });

  test('does not crash when localStorage profile has roles but no skills array', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.addInitScript(() => {
      localStorage.setItem(
        'cvProfile.local.v1',
        JSON.stringify({ skills: null, roles: null, seniority: 'Mid' }),
      );
    });

    const po = new ProfilePagePO(page);
    await po.goto();

    expect(errors).toHaveLength(0);
  });
});
