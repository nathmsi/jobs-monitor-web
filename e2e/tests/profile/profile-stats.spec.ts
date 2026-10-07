import { expect, test } from '../../fixtures';
import { BACKEND_JOB, FRONTEND_JOB, REACT_JOB } from '../../fixtures/data';
import { ProfilePage } from '../../pages/ProfilePage';
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

test.describe('Profile · stats', () => {
  test('without a profile the stats card is empty', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await expect(profile.emptyStats).toBeVisible();
    // Auth is not configured in the e2e environment: no account strip / sign-in.
    await expect(profile.signInButton).toHaveCount(0);
  });

  test.describe('with a stored profile', () => {
    test.use({ dataset: { jobs: [FRONTEND_JOB, BACKEND_JOB, REACT_JOB] } });

    test('shows how many offers match and the most demanded skills', async ({ page }) => {
      await seedStorage(page, { [STORAGE_KEYS.profile]: PROFILE });
      const profile = new ProfilePage(page);
      await profile.goto();

      await expect(profile.emptyStats).toHaveCount(0);
      await expect(page.getByText('offers match your profile')).toBeVisible();
      await expect(page.getByText('Your most in-demand skills')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Recommended for you' })).toBeVisible();
    });

    test('recommends the matching offers only', async ({ page }) => {
      await seedStorage(page, { [STORAGE_KEYS.profile]: PROFILE });
      const profile = new ProfilePage(page);
      await profile.goto();

      await expect(page.getByRole('article').filter({ hasText: 'Product Engineer' })).toBeVisible();
      await expect(page.getByRole('article').filter({ hasText: 'Backend Developer' })).toHaveCount(0);
    });
  });
});
