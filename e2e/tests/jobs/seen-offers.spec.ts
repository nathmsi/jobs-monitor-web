import { expect, test } from '../../fixtures';
import { JobsPage } from '../../pages/JobsPage';

test.describe('Jobs · seen offers', () => {
  test.beforeEach(async ({ context }) => {
    // Offer links open example.com in a new tab: keep the suite offline.
    await context.route('https://example.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>offer</title>' }),
    );
  });

  test('opening an offer marks it as seen', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();
    const card = jobs.card('Backend Developer');

    const popup = page.waitForEvent('popup');
    await jobs.viewLink(card).click();
    await (await popup).close();

    await expect(card.getByTitle('Seen')).toBeVisible();
  });

  test('"hide offers I\'ve seen" removes opened offers from the list', async ({ page }) => {
    const jobs = new JobsPage(page);
    await jobs.open();

    const popup = page.waitForEvent('popup');
    await jobs.viewLink(jobs.card('Backend Developer')).click();
    await (await popup).close();

    await jobs.hideSeenCheckbox.check();
    await expect(jobs.card('Backend Developer')).toHaveCount(0);
    await expect(jobs.cards).toHaveCount(1);

    await jobs.hideSeenCheckbox.uncheck();
    await expect(jobs.cards).toHaveCount(2);
  });
});
