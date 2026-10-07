import { expect, test } from '../../fixtures';
import { BACKEND_JOB, FRONTEND_JOB, REACT_JOB } from '../../fixtures/data';
import { JobsPage } from '../../pages/JobsPage';
import { seedStorage, STORAGE_KEYS } from '../../utils/storage';

const PROFILE = {
  skills: ['React', 'TypeScript'],
  roles: ['frontend'],
  languages: [],
  seniority: 'Senior',
  years: 5,
  locations: [],
  titles: [],
  education: [],
  certifications: [],
};

test.describe('Jobs · "For me"', () => {
  test.use({ dataset: { jobs: [FRONTEND_JOB, BACKEND_JOB, REACT_JOB] } });

  test('without a profile it invites you to analyse your CV', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.tab('For me').click();
    await expect(page.getByText('Analyze your CV to see the offers that match you.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to CV Coach →' })).toBeVisible();
  });

  test('with a profile it ranks offers that match your skills', async ({ page }) => {
    await seedStorage(page, { [STORAGE_KEYS.profile]: PROFILE });
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.tab('For me').click();
    await expect(page.getByText('2 offers matched to your profile')).toBeVisible();
    await expect(jobs.card('Product Engineer')).toBeVisible();
    await expect(jobs.card('Frontend Engineer')).toBeVisible();
    await expect(jobs.card('Backend Developer')).toHaveCount(0);
  });

  test('the tab shows how many offers match once the profile is known', async ({ page }) => {
    await seedStorage(page, { [STORAGE_KEYS.profile]: PROFILE });
    const jobs = new JobsPage(page);
    await jobs.open();

    await jobs.tab('For me').click();
    await expect(jobs.tab(/For me/)).toContainText('2');
  });

  test('a failing request shows an error and can be retried', async ({ page, api }) => {
    await seedStorage(page, { [STORAGE_KEYS.profile]: PROFILE });
    const jobs = new JobsPage(page);
    await jobs.open();

    api.failJobs('full-set');
    await jobs.tab('For me').click();
    await expect(jobs.alert).toContainText('Could not reach the API.');

    api.recover();
    await jobs.alert.getByRole('button', { name: 'Try again' }).click();
    await expect(jobs.card('Product Engineer')).toBeVisible();
  });
});
