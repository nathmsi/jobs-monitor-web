import { expect, test } from '../../fixtures';
import { JobsPage } from '../../pages/JobsPage';
import { readStorage, seedStorage, STORAGE_KEYS } from '../../utils/storage';

interface StoredItem {
  source: string;
  external_id: string;
  status: 'saved' | 'applied';
}

test.describe('Jobs · saving and applying (signed out, per device)', () => {
  test('saving an offer toggles the button and shows a toast', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const card = jobs.card('Backend Developer');
    await expect(jobs.saveButton(card)).toHaveAttribute('aria-pressed', 'false');

    await jobs.saveButton(card).click();
    await expect(jobs.saveButton(card)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Offer saved ★')).toBeVisible();
  });

  test('saved offers are counted on the "My offers" tab and persisted', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.saveButton(jobs.card('Backend Developer')).click();
    await expect(jobs.tab(/My offers/)).toContainText('1');

    const stored = await readStorage<StoredItem[]>(page, STORAGE_KEYS.savedJobs);
    expect(stored).toEqual([expect.objectContaining({ external_id: 'e2', status: 'saved' })]);
  });

  test('saved offers survive a reload', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.saveButton(jobs.card('Frontend Engineer')).click();

    await page.reload();
    await jobs.cards.first().waitFor();
    await expect(jobs.saveButton(jobs.card('Frontend Engineer'))).toHaveAttribute('aria-pressed', 'true');
  });

  test('marking an offer as applied shows the badge and a toast', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const card = jobs.card('Backend Developer');
    await jobs.saveButton(card).click();
    await jobs.appliedButton(card).click();

    await expect(card.getByTestId('badge-applied')).toBeVisible();
    await expect(page.getByText('Marked as applied ✓')).toBeVisible();
    await expect(jobs.appliedButton(card)).toHaveAttribute('aria-pressed', 'true');
  });

  test('a card only offers "I applied" once the offer is saved', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const card = jobs.card('Backend Developer');
    await expect(jobs.appliedButton(card)).toHaveCount(0);

    await jobs.saveButton(card).click();
    await expect(jobs.appliedButton(card)).toBeVisible();

    await jobs.saveButton(card).click();
    await expect(jobs.appliedButton(card)).toHaveCount(0);
  });

  test('"My offers" lists saved offers and lets you remove them', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.saveButton(jobs.card('Backend Developer')).click();

    await jobs.tab(/My offers/).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText('Backend Developer');

    await panel.getByRole('button', { name: 'Remove' }).click();
    await expect(panel.getByText('Nothing here yet. Save offers with ★.')).toBeVisible();
  });

  test('"My offers" shows the empty state when nothing is saved', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.tab(/My offers/).click();
    await expect(page.getByText('Nothing here yet. Save offers with ★.')).toBeVisible();
  });

  test('previously stored offers are restored on startup', async ({ page }) => {
    await seedStorage(page, {
      [STORAGE_KEYS.savedJobs]: [
        { source: 'melio', external_id: 'e1', status: 'applied', title: 'Frontend Engineer', company: 'Melio', location: 'Tel Aviv', url: null },
      ],
    });
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.tab(/My offers/)).toContainText('1');
    await expect(jobs.card('Frontend Engineer').getByTestId('badge-applied')).toBeVisible();
  });
});
