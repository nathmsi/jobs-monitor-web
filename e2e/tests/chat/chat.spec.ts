import { expect, test } from '../../fixtures';
import { BACKEND_JOB, FRONTEND_JOB } from '../../fixtures/data';
import { HomePage } from '../../pages/HomePage';
import { JobsPage } from '../../pages/JobsPage';
import { PublicPage } from '../../pages/PublicPages';

test.describe('Chat · the job assistant', () => {
  test('is one tap away on every page and opens with an intro and starter questions', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.chat.launcher).toBeVisible();

    await home.chat.open();
    await expect(home.chat.window).toContainText('Ask me anything');
    await expect(home.chat.choice('Backend jobs in Tel Aviv')).toBeVisible();

    const jobs = new JobsPage(page);
    await jobs.open();
    await expect(jobs.chat.launcher).toBeVisible();
  });

  test('the launcher is a labelled button, easy to see and to hit', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.chat.launcher).toHaveText('Ask AI');
    const box = await home.chat.launcher.boundingBox();
    expect(box && box.height >= 48 && box.width > box.height).toBe(true);
    await expect(home.chat.launcher).toHaveAttribute('aria-expanded', 'false');

    await home.chat.open();
    // Open, it is a round close button and keeps a 48px target.
    await expect(home.chat.closeButton).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close the chat', expanded: true })).toBeVisible();
  });

  test('answers a question with offers as cards that open the normal offer page', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.ask('backend developer');

    await expect(home.chat.message('I found 1 matching offers.')).toBeVisible();
    await expect(home.chat.offers).toHaveCount(1);
    await home.chat.offerLink('Backend Developer').click();

    const offer = new PublicPage(page);
    await expect(page).toHaveURL(/\/jobs\/monday\/e2\/backend-developer$/);
    await expect(offer.heading).toHaveText('Backend Developer');
  });

  test('asks what is missing, with quick replies, and remembers the conversation', async ({ page, api }) => {
    api.queueChat(
      { text: 'Which role are you looking for?', suggestions: ['Backend', 'Frontend'] },
      { text: 'Here is a frontend match.', offers: [FRONTEND_JOB], steps: ['search_offers'] },
    );
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.ask('I need a job');
    await home.chat.choice('Frontend').click();

    await expect(home.chat.offers).toHaveCount(1);
    expect(api.chatRequests.at(-1)?.messages).toEqual([
      { role: 'user', content: 'I need a job' },
      { role: 'assistant', content: 'Which role are you looking for?' },
      { role: 'user', content: 'Frontend' },
    ]);
    // The old quick replies are gone once answered.
    await expect(home.chat.choice('Backend')).toHaveCount(0);
  });

  test('a how-to answer comes with buttons that open the right page, already filtered', async ({ page, api }) => {
    api.queueChat({
      text: '1. Open the offers page. 2. Choose a region.',
      steps: ['site_guide'],
      links: [{ path: '/jobs?region=jerusalem&role=backend', label: 'Backend in Jerusalem' }],
    });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.choice('How do I use this site?').click();
    await expect(home.chat.message(/Choose a region/)).toBeVisible();
    await home.chat.links.filter({ hasText: 'Backend in Jerusalem' }).click();

    await expect(page).toHaveURL(/\/jobs\?region=jerusalem&role=backend/);
    expect(api.chatRequests[0].messages[0].content).toBe('How do I use this site?');
  });

  test('shows what the assistant is doing while it searches', async ({ page }) => {
    await page.route('**/api/chat/stream', async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson',
        body: JSON.stringify({ type: 'final', reply: { text: 'Done.', offers: [], suggestions: [] } }) + '\n',
      });
    });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.ask('anything');

    await expect(home.chat.status).toBeVisible();
    await expect(home.chat.sendButton).toBeDisabled();
    await expect(home.chat.message('Done.')).toBeVisible();
    await expect(home.chat.status).toHaveCount(0);
  });

  test('on failure it says so and retry asks again without repeating the question', async ({ page, api }) => {
    api.queueChat('error', { text: 'Back online.' });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.ask('backend');
    await expect(home.chat.error).toContainText('Something went wrong');

    await home.chat.retryButton.click();

    await expect(home.chat.message('Back online.')).toBeVisible();
    await expect(home.chat.error).toHaveCount(0);
    await expect(home.chat.window.getByText('You: backend')).toHaveCount(1);
    expect(api.chatRequests).toHaveLength(2);
  });

  test('keeps the conversation after a reload, and a new chat forgets it', async ({ page, api }) => {
    api.queueChat({ text: 'Two good ones.', offers: [FRONTEND_JOB, BACKEND_JOB] });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await home.chat.ask('anything');
    await expect(home.chat.offers).toHaveCount(2);

    await page.reload();
    await home.chat.open();
    await expect(home.chat.message('Two good ones.')).toBeVisible();
    await expect(home.chat.offers).toHaveCount(2);

    await home.chat.newChatButton.click();
    await expect(home.chat.window).toContainText('Ask me anything');
    await page.reload();
    await home.chat.open();
    await expect(home.chat.message('Two good ones.')).toHaveCount(0);
  });

  test('Escape closes it and the launcher takes the focus back', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await page.keyboard.press('Escape');

    await expect(home.chat.window).toHaveCount(0);
    await expect(home.chat.launcher).toBeFocused();
  });

  test('says so when nothing matches, instead of showing cards', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.ask('zzzz nothing matches');

    await expect(home.chat.message('I found nothing for that.')).toBeVisible();
    await expect(home.chat.offers).toHaveCount(0);
  });
});

test.describe('Chat · on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the launcher sits above the bottom bar, the window takes the screen, and opening an offer steps aside', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const launcher = await home.chat.launcher.boundingBox();
    const nav = await home.bottomNav.root.boundingBox();
    expect(launcher && nav && launcher.y + launcher.height <= nav.y).toBe(true);

    await home.chat.open();
    // Its title and close button are not hidden behind the sticky header.
    await expect(home.chat.closeButton).toBeInViewport({ ratio: 1 });
    const top = await home.chat.window.evaluate((el) => document.elementFromPoint(el.getBoundingClientRect().left + 20, 20)?.closest('[role="dialog"]') !== null);
    expect(top).toBe(true);
    // Wait out the entrance animation, then it covers the whole screen.
    await expect.poll(async () => home.chat.window.boundingBox()).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });

    await home.chat.ask('frontend');
    await home.chat.offerLink('Frontend Engineer').click();

    await expect(page).toHaveURL(/\/jobs\/melio\/e1\//);
    await expect(home.chat.window).toHaveCount(0);
  });
});

test.describe('Chat · in Hebrew', () => {
  test('is translated and laid out right-to-left', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.header.chooseLanguage('HE');

    await page.getByRole('button', { name: 'שאל את ה-AI' }).click();
    const dialog = page.getByRole('dialog', { name: 'עוזר משרות' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('direction', 'rtl');
    // The window sits at the reading end of the page: the left side in RTL.
    const box = await dialog.boundingBox();
    expect(box && box.x < 100).toBe(true);
  });
});
