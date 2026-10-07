import { expect, test } from '../../fixtures';
import { JobsPage } from '../../pages/JobsPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { readStorage, seedStorage, STORAGE_KEYS } from '../../utils/storage';

interface StoredPrefs {
  region: string;
  kind: string;
  roles: string[];
  categories: string[];
}

test.describe('Profile · job preferences', () => {
  test('lists role, source type and sector chips', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await expect(profile.group('Roles').getByRole('button').first()).toBeVisible();
    await expect(profile.group('Source type').getByRole('button')).toHaveCount(3);
    await expect(profile.group('Sectors').getByRole('button')).toHaveCount(9);
  });

  test('chips toggle on and off', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    const frontend = profile.chip(profile.group('Roles'), 'Frontend');
    await expect(frontend).toHaveAttribute('aria-pressed', 'false');
    await frontend.click();
    await expect(frontend).toHaveAttribute('aria-pressed', 'true');
    await frontend.click();
    await expect(frontend).toHaveAttribute('aria-pressed', 'false');
  });

  test('saving persists the preferences on the device', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await profile.chip(profile.group('Roles'), 'Frontend').click();
    await profile.chip(profile.group('Source type'), 'Agencies').click();
    await profile.chip(profile.group('Sectors'), 'Fintech').click();
    await profile.regionSelect.selectOption('tlv');
    await profile.saveButton.click();

    await expect(profile.savedNote).toBeVisible();
    expect(await readStorage<StoredPrefs>(page, STORAGE_KEYS.preferences)).toEqual({
      region: 'tlv',
      kind: 'agency',
      roles: ['frontend'],
      categories: ['fintech'],
    });
  });

  test('saved preferences are the default filters on the jobs page', async ({ page, api }) => {
    await seedStorage(page, {
      [STORAGE_KEYS.preferences]: { region: 'tlv', kind: 'agency', roles: ['backend'], categories: [] },
    });
    const jobs = new JobsPage(page);
    await jobs.goto();

    await expect(jobs.tab('Staffing agencies')).toHaveAttribute('aria-selected', 'true');
    await expect(jobs.areaSelect).toHaveValue('tlv');
    await expect(jobs.roleChip('Backend')).toHaveAttribute('aria-pressed', 'true');
    const first = api.jobsRequests[0].searchParams;
    expect([first.get('region'), first.get('kind'), first.get('role')]).toEqual(['tlv', 'agency', 'backend']);
  });

  test('stored preferences prefill the form', async ({ page }) => {
    await seedStorage(page, {
      [STORAGE_KEYS.preferences]: { region: 'jerusalem', kind: 'company', roles: ['frontend'], categories: ['gaming'] },
    });
    const profile = new ProfilePage(page);
    await profile.goto();

    await expect(profile.regionSelect).toHaveValue('jerusalem');
    await expect(profile.chip(profile.group('Source type'), 'Companies')).toHaveAttribute('aria-pressed', 'true');
    await expect(profile.chip(profile.group('Roles'), 'Frontend')).toHaveAttribute('aria-pressed', 'true');
    await expect(profile.chip(profile.group('Sectors'), 'Gaming')).toHaveAttribute('aria-pressed', 'true');
  });
});
