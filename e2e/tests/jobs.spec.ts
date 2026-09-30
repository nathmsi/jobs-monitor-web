import { test, expect } from '../fixtures';
import { JobsPagePO } from '../pages/JobsPage';

test.describe('Jobs page', () => {
  test('loads and displays job cards', async ({ page }) => {
    const po = new JobsPagePO(page);
    await po.goto();
    await po.waitForJobs();

    const count = await po.jobCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows job titles from API', async ({ page }) => {
    const po = new JobsPagePO(page);
    await po.goto();
    await po.waitForJobs();

    await expect(page.getByText('Frontend Engineer')).toBeVisible();
    await expect(page.getByText('Backend Developer')).toBeVisible();
  });

  test('expired job shows expired badge', async ({ page }) => {
    const po = new JobsPagePO(page);
    await po.goto();
    await po.waitForJobs();

    const expiredCard = po.jobCardByTitle('Expired Role');
    await expect(expiredCard).toBeVisible();
    await expect(po.expiredBadge(expiredCard)).toBeVisible();
  });

  test('hot job shows hot badge', async ({ page }) => {
    const po = new JobsPagePO(page);
    await po.goto();
    await po.waitForJobs();

    const hotCard = po.jobCardByTitle('Frontend Engineer');
    await expect(hotCard.getByTestId('badge-hot')).toBeVisible();
  });

  test('page title is set', async ({ page }) => {
    const po = new JobsPagePO(page);
    await po.goto();
    await po.waitForJobs();

    await expect(page).toHaveTitle(/Tech Jobs|Jobs/i);
  });

  test('header is visible', async ({ page }) => {
    const po = new JobsPagePO(page);
    await po.goto();
    await po.waitForJobs();

    // Header contains the brand link
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const po = new JobsPagePO(page);
    await po.goto();
    await po.waitForJobs();

    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});
