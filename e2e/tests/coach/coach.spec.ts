import { expect, test } from '../../fixtures';
import { CoachPage } from '../../pages/CoachPage';

test.describe('Coach · signed out', () => {
  test('shows the sign-in call to action instead of the tools', async ({ page }) => {
    const coach = new CoachPage(page);
    await coach.goto();

    await expect(page.getByRole('heading', { level: 2, name: 'Unlock your career potential' })).toBeVisible();
    await expect(coach.signInButton).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(0);
  });

  test('sets the page title and heading', async ({ page }) => {
    const coach = new CoachPage(page);
    await coach.goto();

    await expect(page).toHaveTitle('CV Coach — Tech Jobs');
    await expect(coach.heading).toHaveText('CV Coach');
  });

  test('does not throw or log console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const coach = new CoachPage(page);
    await coach.goto();

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });
});
