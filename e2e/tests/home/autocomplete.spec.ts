import { expect, test } from '../../fixtures';
import { SEARCH_JOBS, VOCAB } from '../../fixtures/data';
import { HomePage } from '../../pages/HomePage';
import { JobsPage } from '../../pages/JobsPage';

test.describe('Home · autocomplete and popular searches', () => {
  test.use({ dataset: { jobs: SEARCH_JOBS } });

  test('popular searches come from the API, with their number of offers', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.popularLink('Backend')).toContainText('130');
    await expect(home.popularLink('Frontend')).toContainText('66');
    await expect(home.popularLink('React')).toContainText('16');
  });

  test('popular searches follow the data: a different answer, different chips', async ({ page, api }) => {
    api.setPopular([VOCAB.find((e) => e.label === 'Kotlin')!, VOCAB.find((e) => e.label === 'Haifa')!]);
    const home = new HomePage(page);
    await home.goto();

    await expect(home.popular().getByRole('link')).toHaveCount(2);
    await expect(home.popularLink('Kotlin')).toBeVisible();
    await expect(home.popularLink('Mobile')).toHaveCount(0);
  });

  test('a popular role opens /jobs on that role, a popular technology searches for it', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.popularLink('Mobile')).toHaveAttribute('href', '/jobs?role=mobile');
    await expect(home.popularLink('React')).toHaveAttribute('href', '/jobs?q=React');
  });

  test('popular searches disappear when the service is down (nothing is hardcoded)', async ({ page, api }) => {
    api.failSuggestions();
    const home = new HomePage(page);
    await home.goto();

    await expect(home.cards.first()).toBeVisible();
    await expect(home.popular()).toHaveCount(0);
  });

  test('focusing the empty box shows the popular searches', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.searchInput.focus();

    await expect(home.searchInput).toHaveAttribute('aria-expanded', 'true');
    await expect(home.suggestions().getByRole('group', { name: 'Popular' })).toBeVisible();
    await expect(home.suggestion(/^Backend/)).toBeVisible();
  });

  test('typing suggests technologies, roles and companies with their counts', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.searchInput.fill('re');

    await expect(home.suggestion(/^React\s*16$/)).toBeVisible();
    await expect(home.suggestion(/^React Native\s*5$/)).toBeVisible();
    await expect(home.suggestions().getByRole('group', { name: 'Technologies' })).toBeVisible();
  });

  test('"ios" suggests the technology and the Mobile role it belongs to', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.searchInput.fill('ios');

    await expect(home.suggestions().getByRole('group', { name: 'Roles' })).toContainText('Mobile');
    await expect(home.suggestions().getByRole('group', { name: 'Technologies' })).toContainText('iOS');
  });

  test('what is typed is emphasised in the suggestions', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.searchInput.fill('Kub');

    await expect(home.suggestion(/^Kubernetes/).locator('strong')).toHaveText('Kub');
  });

  test('keyboard: arrows move, Enter opens the offers on the chosen role', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.searchInput.fill('mob');
    await expect(home.suggestion(/^Mobile/)).toBeVisible();

    await page.keyboard.press('ArrowDown');
    await expect(home.suggestion(/^Mobile/)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/jobs\?role=mobile/);
    const jobs = new JobsPage(page);
    await expect(jobs.roleChip('Mobile')).toHaveAttribute('aria-pressed', 'true');
    await expect(jobs.cards).toHaveCount(2);
  });

  test('mouse: clicking a technology searches for it', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.searchInput.fill('andr');

    await home.suggestion(/^Android/).click();

    await expect(page).toHaveURL(/\/jobs\?q=Android/);
    await expect(new JobsPage(page).searchInput).toHaveValue('Android');
  });

  test('Escape closes the popup and keeps what was typed; ArrowDown brings it back', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.searchInput.fill('re');
    await expect(home.suggestions()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(home.suggestions()).toBeHidden();
    await expect(home.searchInput).toHaveValue('re');
    await expect(home.searchInput).toHaveAttribute('aria-expanded', 'false');

    await page.keyboard.press('ArrowDown');
    await expect(home.suggestions()).toBeVisible();
  });

  test('clicking elsewhere closes the popup', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.searchInput.fill('re');
    await expect(home.suggestions()).toBeVisible();

    await home.heading.click();

    await expect(home.suggestions()).toBeHidden();
  });

  test('a burst of keystrokes sends few requests, for the final text', async ({ page, api }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.searchInput.pressSequentially('kubernetes', { delay: 15 });
    await expect(home.suggestion(/^Kubernetes/)).toBeVisible();

    const asked = api.suggestRequests.map((u) => u.searchParams.get('q'));
    expect(asked.at(-1)).toBe('kubernetes');
    expect(asked.length).toBeLessThan(6);
  });

  test('nothing matching: no popup, and Enter still searches the text', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.searchInput.fill('zzzz');
    await expect(home.suggestions()).toBeHidden();
    await home.searchInput.press('Enter');

    await expect(page).toHaveURL(/\/jobs\?q=zzzz/);
  });

  test('keeps working when the suggestions service is down', async ({ page, api }) => {
    api.failSuggestions();
    const home = new HomePage(page);
    await home.goto();

    await home.searchInput.fill('react');
    await home.searchInput.press('Enter');

    await expect(page).toHaveURL(/\/jobs\?q=react/);
  });

  test('searches are remembered: next visit offers them, and they can be cleared', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.searchInput.fill('golang');
    await home.searchInput.press('Enter');
    await expect(page).toHaveURL(/\/jobs\?q=golang/);

    await home.goto('/');
    await home.searchInput.focus();
    const recent = home.suggestions().getByRole('group', { name: 'Recent searches' });
    await expect(recent).toContainText('golang');

    await home.suggestions().getByRole('button', { name: 'Clear' }).click();
    await expect(recent).toHaveCount(0);
  });

  test('a recent role is applied as a role', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.searchInput.fill('mob');
    await home.suggestion(/^Mobile/).click();
    await expect(page).toHaveURL(/role=mobile/);

    await home.goto('/');
    await home.searchInput.focus();
    await home.suggestions().getByRole('group', { name: 'Recent searches' }).getByRole('option', { name: 'Mobile' }).click();

    await expect(page).toHaveURL(/\/jobs\?role=mobile/);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the popup fits the screen and its rows are easy to tap', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.searchInput.fill('re');
      await expect(home.suggestion(/^React\s*16$/)).toBeVisible();

      const list = await home.suggestions().boundingBox();
      expect(list!.x).toBeGreaterThanOrEqual(0);
      expect(list!.x + list!.width).toBeLessThanOrEqual(390);
      const row = await home.suggestion(/^React\s*16$/).boundingBox();
      expect(row!.height).toBeGreaterThanOrEqual(44);
    });
  });
});
