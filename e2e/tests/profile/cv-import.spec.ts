import { expect, test } from '../../fixtures';
import { FRONTEND_JOB, makeJob, REACT_JOB } from '../../fixtures/data';
import { JobsPage } from '../../pages/JobsPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { buildPdf } from '../../utils/pdf';
import { readStorage, STORAGE_KEYS } from '../../utils/storage';

const CV_TEXT = [
  'Jane Doe - Senior Frontend Developer, Tel Aviv',
  'Six years of experience building web applications with React, TypeScript and Redux.',
  'Mobile apps in Swift for iOS. Comfortable with Node.js and PostgreSQL.',
  'B.Sc in Computer Science. Languages: English, Hebrew.',
].join('\n');

interface StoredProfile {
  skills: string[];
  roles: string[];
}

test.describe('Profile · add a CV without an account', () => {
  test('is offered to signed-out visitors, with the privacy promise', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await expect(page.getByText(/no account needed/i)).toBeVisible();
    await expect(page.getByLabel('Paste the text of your CV')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose a PDF' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyse my CV' })).toBeDisabled();
  });

  test('pasting the text builds the profile on this device', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await page.getByLabel('Paste the text of your CV').fill(CV_TEXT);
    await page.getByRole('button', { name: 'Analyse my CV' }).click();

    await expect(page.getByText(/Profile ready: \d+ skills found/)).toBeVisible();
    await expect(profile.emptyStats).toHaveCount(0);

    const stored = await readStorage<StoredProfile>(page, STORAGE_KEYS.profile);
    expect(stored?.skills).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Swift']));
    expect(stored?.roles).toEqual(expect.arrayContaining(['frontend', 'mobile']));
  });

  test('the profile editor shows the extracted skills right away', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await page.getByLabel('Paste the text of your CV').fill(CV_TEXT);
    await page.getByRole('button', { name: 'Analyse my CV' }).click();

    // Redux only appears once the editor lists the extracted skills.
    await expect(page.getByText('Redux').first()).toBeVisible();
    await expect(page.getByText('TypeScript').first()).toBeVisible();
  });

  test('the CV itself never leaves the browser and is never stored', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (r) => {
      if (r.method() !== 'GET') posts.push(`${r.url()} ${r.postData() ?? ''}`);
    });
    const profile = new ProfilePage(page);
    await profile.goto();

    await page.getByLabel('Paste the text of your CV').fill(CV_TEXT);
    await page.getByRole('button', { name: 'Analyse my CV' }).click();
    await expect(page.getByText(/Profile ready/)).toBeVisible();

    expect(posts.filter((p) => p.includes('Jane Doe'))).toEqual([]);
    const everything = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(everything).not.toContain('Jane Doe');
  });

  test('a PDF is read in the browser too', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await page.getByTestId('cv-file-input').setInputFiles({
      name: 'cv.pdf',
      mimeType: 'application/pdf',
      buffer: buildPdf(CV_TEXT.split('\n')),
    });

    await expect(page.getByText(/Profile ready: \d+ skills found/)).toBeVisible();
    const stored = await readStorage<StoredProfile>(page, STORAGE_KEYS.profile);
    expect(stored?.skills).toEqual(expect.arrayContaining(['React', 'TypeScript']));
  });

  test('an unreadable PDF explains what to do and keeps the form', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await page.getByTestId('cv-file-input').setInputFiles({
      name: 'broken.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('this is not a pdf'),
    });

    await expect(page.getByRole('alert')).toContainText('Could not read this PDF');
    await expect(page.getByLabel('Paste the text of your CV')).toBeVisible();
    expect(await readStorage(page, STORAGE_KEYS.profile)).toBeNull();
  });

  test('text that is too short is refused', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await page.getByLabel('Paste the text of your CV').fill('React developer');
    await page.getByRole('button', { name: 'Analyse my CV' }).click();

    await expect(page.getByRole('alert')).toContainText('too short');
    expect(await readStorage(page, STORAGE_KEYS.profile)).toBeNull();
  });

  test('text without any technical skill is refused with a hint', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await page.getByLabel('Paste the text of your CV').fill('I enjoy gardening, cooking and long walks in the countryside every weekend.');
    await page.getByRole('button', { name: 'Analyse my CV' }).click();

    await expect(page.getByRole('alert')).toContainText('could not find any technical skill');
    expect(await readStorage(page, STORAGE_KEYS.profile)).toBeNull();
  });

  test('the error disappears when you edit the text', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();
    await page.getByLabel('Paste the text of your CV').fill('React');
    await page.getByRole('button', { name: 'Analyse my CV' }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    await page.getByLabel('Paste the text of your CV').fill(CV_TEXT);

    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('a CV can be replaced, or the replacement cancelled', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();
    await page.getByLabel('Paste the text of your CV').fill(CV_TEXT);
    await page.getByRole('button', { name: 'Analyse my CV' }).click();
    await expect(page.getByText(/Profile ready/)).toBeVisible();

    await page.getByRole('button', { name: 'Replace my CV' }).click();
    await expect(page.getByLabel('Paste the text of your CV')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText(/Profile ready/)).toBeVisible();

    await page.getByRole('button', { name: 'Replace my CV' }).click();
    await page.getByLabel('Paste the text of your CV').fill('Python engineer with Django, Docker and Kubernetes experience on AWS for many years.');
    await page.getByRole('button', { name: 'Analyse my CV' }).click();

    const stored = await readStorage<StoredProfile>(page, STORAGE_KEYS.profile);
    expect(stored?.skills).toEqual(expect.arrayContaining(['Python', 'Docker']));
    expect(stored?.skills).not.toContain('React');
  });

  test('the profile survives a reload', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();
    await page.getByLabel('Paste the text of your CV').fill(CV_TEXT);
    await page.getByRole('button', { name: 'Analyse my CV' }).click();
    await expect(page.getByText(/Profile ready/)).toBeVisible();

    await page.reload();

    await expect(page.getByText(/Profile ready/)).toBeVisible();
    await expect(profile.emptyStats).toHaveCount(0);
  });

  test('signing in stays optional: only a hint, no wall', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    // Auth is not configured in this environment, so no sign-in prompt appears at all.
    await expect(page.getByLabel('Paste the text of your CV')).toBeEnabled();
    await expect(page.getByText('Sign in to use your CVs')).toHaveCount(0);
  });

  test.describe('and then', () => {
    test.use({
      dataset: {
        jobs: [FRONTEND_JOB, REACT_JOB, makeJob({ external_id: 'acc', title: 'Accountant', description: 'Excel and payroll' })],
      },
    });

    test('"For me" ranks offers against the new profile, with no account', async ({ page }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await page.getByLabel('Paste the text of your CV').fill(CV_TEXT);
      await page.getByRole('button', { name: 'Analyse my CV' }).click();
      await expect(page.getByText(/Profile ready/)).toBeVisible();

      const jobs = new JobsPage(page);
      await jobs.goto();
      await jobs.tab(/For me/).click();

      await expect(jobs.card('Product Engineer')).toBeVisible();
      await expect(jobs.card('Frontend Engineer')).toBeVisible();
      await expect(jobs.card('Accountant')).toHaveCount(0);
    });

    test('the profile page then recommends offers and shows skills in demand', async ({ page }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await page.getByLabel('Paste the text of your CV').fill(CV_TEXT);
      await page.getByRole('button', { name: 'Analyse my CV' }).click();

      await expect(page.getByText('offers match your profile').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Recommended for you' })).toBeVisible();
    });
  });
});
