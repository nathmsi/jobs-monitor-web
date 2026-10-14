import { expect, test } from '../../fixtures';
import { makeJob } from '../../fixtures/data';
import { HomePage } from '../../pages/HomePage';
import { JobsPage } from '../../pages/JobsPage';
import { PublicPage } from '../../pages/PublicPages';

const LONG = 'You will build and ship great products with a strong team. '.repeat(6);
/** Stored descriptions are cut at 1,200 characters. */
const CUT = `About the Role ${LONG.repeat(5)}`.slice(0, 1200);

const JOBS = [
  makeJob({
    external_id: 'p1',
    title: 'Senior React Engineer',
    description: `About the Role ${LONG} Requirements: Five years of React. Nice to Have Go.`,
    ai_summary: JSON.stringify({
      headline: 'React platform work',
      stack: ['React', 'TypeScript'],
      level: 'Senior',
      remote: 'Hybrid',
      highlights: ['Own the design system'],
    }),
  }),
  makeJob({ external_id: 'p2', title: 'React Developer', description: LONG }),
  makeJob({ external_id: 'p3', title: 'Old React Role', description: LONG, is_expired: true }),
  makeJob({ external_id: 'p4', title: 'Thin Offer', description: '' }),
  makeJob({ external_id: 'p5', title: 'Cut Offer', description: CUT }),
  makeJob({ external_id: 'm1', source: 'monday', title: 'Backend Developer', description: LONG, location: 'Remote' }),
];

test.describe('Public pages · an offer', () => {
  test.use({ dataset: { jobs: JOBS } });

  test('a card leads to the offer page, which shows what it is and how to apply', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    await jobs.card('Senior React Engineer').getByRole('link', { name: 'Details' }).click();

    const offer = new PublicPage(page);
    await expect(page).toHaveURL(/\/jobs\/melio\/p1\/senior-react-engineer$/);
    await expect(offer.heading).toHaveText('Senior React Engineer');
    await expect(page.getByRole('link', { name: 'Melio' }).first()).toBeVisible();
    await expect(offer.applyLink).toHaveAttribute('href', 'https://example.com/job/p1');
  });

  test('puts the text in sections and shows the key facts', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/p1/senior-react-engineer');
    await offer.heading.waitFor();

    for (const name of ['About the Role', 'Requirements', 'Nice to Have', 'Key points', 'At a glance']) {
      await expect(page.getByRole('heading', { name })).toBeVisible();
    }
    await expect(page.getByText('Own the design system')).toBeVisible();

    const facts = page.getByRole('complementary');
    await expect(facts).toContainText('Company');
    await expect(facts).toContainText('Senior');
    await expect(facts).toContainText('Hybrid');
    await expect(facts).toContainText('Tel Aviv');
  });

  test('skills lead to a search for them', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/p1/senior-react-engineer');
    await offer.heading.waitFor();

    await page.getByRole('link', { name: 'TypeScript' }).click();
    await expect(page).toHaveURL(/\/jobs\?q=TypeScript$/);
  });

  test('says when the stored description was cut and points to the full text', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/p5');
    await offer.heading.waitFor();

    await expect(page.getByText('This description is shortened.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read the full description' })).toHaveAttribute('href', 'https://example.com/job/p5');
  });

  test('shows the other offers of the same company', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/p1/senior-react-engineer');
    await offer.heading.waitFor();

    const more = page.getByRole('region', { name: 'More from Melio' });
    await expect(more.getByRole('article')).not.toHaveCount(0);
    await expect(more).not.toContainText('Senior React Engineer');
  });

  test('sets a canonical link and the title, and lets a good offer be indexed', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/p1/senior-react-engineer');
    await offer.heading.waitFor();

    await expect(page).toHaveTitle('Senior React Engineer · Melio — Tech Jobs');
    await expect(offer.canonical).toHaveAttribute('href', /\/jobs\/melio\/p1\/senior-react-engineer$/);
    // Never left on "noindex", whatever the page that was loaded before said.
    await expect(offer.robots).not.toHaveAttribute('content', /noindex/);
  });

  test('can be saved from its own page', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/p2');
    await offer.heading.waitFor();

    const side = page.getByRole('complementary');
    await side.getByRole('button', { name: 'Save' }).click();
    await expect(side.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('an expired offer says so and stays out of search results', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/p3');
    await offer.heading.waitFor();

    await expect(page.getByText('This offer is probably closed.')).toBeVisible();
    await expect(offer.robots).toHaveAttribute('content', 'noindex,follow');
  });

  test('an offer with almost no text stays out of search results too', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/p4');
    await offer.heading.waitFor();

    await expect(offer.robots).toHaveAttribute('content', 'noindex,follow');
  });

  test('a missing offer explains it and offers a way out', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/nope');

    await expect(page.getByRole('heading', { name: 'We could not find this offer' })).toBeVisible();
    await page.getByRole('link', { name: 'Browse offers' }).click();
    await expect(page).toHaveURL(/\/jobs$/);
  });
});

test.describe('Public pages · a company and a technology', () => {
  test.use({ dataset: { jobs: JOBS } });

  test('a company page lists its open offers and its skills', async ({ page }) => {
    const company = new PublicPage(page);
    await company.goto('/companies/melio');

    await expect(company.heading).toHaveText('Melio');
    await expect(page.getByText(/Company · \d+ open offers/)).toBeVisible();
    await expect(page.getByRole('list').getByText('TypeScript').first()).toBeVisible();
    await expect(company.cards.first()).toBeVisible();
    await expect(company.canonical).toHaveAttribute('href', /\/companies\/melio$/);
  });

  test('an unknown company is a friendly dead end with a button', async ({ page }) => {
    const company = new PublicPage(page);
    await company.goto('/companies/nobody');

    await expect(page.getByText('We could not find this company')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse all offers' }).first()).toBeVisible();
  });

  test('a technology page shows the offers and links to other regions', async ({ page }) => {
    const topic = new PublicPage(page);
    await topic.goto('/tech/react');

    await expect(topic.heading).toHaveText('React jobs in Israel');
    await expect(topic.cards.first()).toBeVisible();
    await page.getByRole('navigation', { name: 'Other regions' }).getByRole('link', { name: 'Tel Aviv' }).click();
    await expect(page).toHaveURL(/\/tech\/react\/tlv$/);
    await expect(topic.heading).toHaveText('React jobs in Tel Aviv');
  });

  test('the home page links to the technology pages', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const browse = page.getByRole('navigation', { name: 'Browse by technology' });
    await browse.getByRole('link', { name: 'React', exact: true }).click();
    await expect(page).toHaveURL(/\/tech\/react$/);
  });
});

test.describe('Public pages · on a phone', () => {
  test.use({ dataset: { jobs: JOBS }, viewport: { width: 390, height: 844 } });

  test('an offer page fits the screen and keeps apply and save within thumb reach', async ({ page }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/melio/p1/senior-react-engineer');
    await offer.heading.waitFor();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const bar = page.getByTestId('job-action-bar');
    await expect(bar).toBeVisible();
    const apply = (await offer.applyLink.boundingBox())!;
    expect(apply.height).toBeGreaterThanOrEqual(44);
    // The bar sits above the phone's bottom navigation, in the lower part of the screen.
    expect(apply.y).toBeGreaterThan(844 * 0.7);
    await expect(offer.bottomNav.root).toBeVisible();
  });
});
