import { test, expect } from '../fixtures';
import { CoachPagePO } from '../pages/CoachPage';

test.describe('Coach page', () => {
  test('loads without crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const po = new CoachPagePO(page);
    await po.goto();

    expect(errors).toHaveLength(0);
  });

  test('renders a heading', async ({ page }) => {
    const po = new CoachPagePO(page);
    await po.goto();

    await expect(po.heading).toBeVisible();
  });

  test('page title is set', async ({ page }) => {
    const po = new CoachPagePO(page);
    await po.goto();

    await expect(page).toHaveTitle(/Coach|coach/i);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const po = new CoachPagePO(page);
    await po.goto();

    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});
