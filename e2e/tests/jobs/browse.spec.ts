import { expect, test } from '../../fixtures';
import { makeJob, MOCK_JOBS } from '../../fixtures/data';
import { JobsPage } from '../../pages/JobsPage';
import { readStorage, STORAGE_KEYS } from '../../utils/storage';

test.describe('Jobs · browsing', () => {
  test('lists the company offers returned by the API', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    // The default tab is "Tech companies": the agency offer is not part of it.
    await expect(jobs.cards).toHaveCount(2);
    expect(await jobs.titles()).toEqual(['Frontend Engineer', 'Backend Developer']);
  });

  test('shows the company name from the sources list', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.card('Frontend Engineer')).toContainText('Melio');
    await expect(jobs.card('Backend Developer')).toContainText('monday.com');
  });

  test('flags hot, new and expired offers with badges', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.card('Frontend Engineer').getByTestId('badge-hot')).toBeVisible();
    await expect(jobs.card('Frontend Engineer').getByTestId('badge-new')).toBeVisible();
    await expect(jobs.card('Backend Developer').getByTestId('badge-hot')).toHaveCount(0);

    await jobs.tab('Staffing agencies').click();
    await expect(jobs.card('Expired Role').getByTestId('badge-expired')).toBeVisible();
  });

  test('links each title to the offer page', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.card('Backend Developer').getByRole('link', { name: 'Backend Developer' })).toHaveAttribute(
      'href',
      'https://example.com/job/e2',
    );
  });

  test('sets the document title and a main navigation', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(page).toHaveTitle('Offers — Tech Jobs');
    await expect(jobs.header.nav).toBeVisible();
  });

  test('renders the AI summary when the offer has one', async ({ page, api }) => {
    api.setJobs([
      makeJob({
        external_id: 'ai1',
        title: 'Platform Engineer',
        ai_summary: JSON.stringify({
          headline: 'Platform work at Melio',
          stack: ['Go', 'Kubernetes'],
          level: 'Senior',
          remote: 'Hybrid',
          highlights: ['Equity'],
        }),
      }),
    ]);
    const jobs = new JobsPage(page);
    await jobs.open();

    const card = jobs.card('Platform Engineer');
    await expect(card).toContainText('Platform work at Melio');
    await expect(card).toContainText('Kubernetes');
    await expect(card).toContainText('Senior');
    await expect(card).toContainText('Hybrid');
  });

  test('survives an AI summary without optional fields', async ({ page, api }) => {
    api.setJobs([
      makeJob({
        external_id: 'ai2',
        title: 'Partial Summary Job',
        ai_summary: JSON.stringify({ headline: 'Only a headline', stack: ['React'] }),
      }),
      ...MOCK_JOBS,
    ]);
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.card('Partial Summary Job')).toContainText('Only a headline');
    await expect(jobs.card('Backend Developer')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('ignores an unparsable AI summary and falls back to the excerpt', async ({ page, api }) => {
    api.setJobs([
      makeJob({ external_id: 'ai3', title: 'Broken Summary', excerpt: 'Plain excerpt text', ai_summary: '{nope' }),
    ]);
    const jobs = new JobsPage(page);
    await jobs.open();

    await expect(jobs.card('Broken Summary')).toContainText('Plain excerpt text');
  });

  test('does not log console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    const jobs = new JobsPage(page);
    await jobs.open();

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('remembers the list/grid view across reloads', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await expect(jobs.listViewButton).toHaveAttribute('aria-pressed', 'true');

    await jobs.gridViewButton.click();
    await expect(jobs.gridViewButton).toHaveAttribute('aria-pressed', 'true');
    expect(await readStorage(page, STORAGE_KEYS.viewMode)).toBe('grid');

    await page.reload();
    await jobs.cards.first().waitFor();
    await expect(jobs.gridViewButton).toHaveAttribute('aria-pressed', 'true');
  });
});
