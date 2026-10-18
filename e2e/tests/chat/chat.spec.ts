import { expect, test } from '../../fixtures';
import { BACKEND_JOB, FRONTEND_JOB } from '../../fixtures/data';
import { HomePage } from '../../pages/HomePage';
import { JobsPage } from '../../pages/JobsPage';
import { PublicPage } from '../../pages/PublicPages';
import { buildPdf } from '../../utils/pdf';
import { seedStorage, STORAGE_KEYS } from '../../utils/storage';

// The chat opens docked to the side by default (see dock.spec.ts). The specs of this file are about the
// floating window and the conversation, so they start floating.
test.beforeEach(async ({ page }) => {
  await seedStorage(page, { [CHAT_PREFS]: { dock: false } });
});

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

const CHAT_PREFS = 'jobs-monitor.chat.prefs';

const PROFILE = {
  skills: ['React', 'TypeScript', 'Node.js'], roles: ['frontend'], languages: ['English'], seniority: 'Senior', years: 6,
  locations: ['Tel Aviv'], titles: ['Frontend Engineer'], education: [], certifications: [],
};

const CV_LINES = [
  'Jane Doe - Senior Frontend Developer, Tel Aviv',
  'Six years of experience building web applications with React, TypeScript and Redux.',
  'Mobile apps in Swift for iOS. Comfortable with Node.js and PostgreSQL.',
];

test.describe('Chat · bigger window (desktop)', () => {
  test('can be enlarged, and stays that way next time', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    const small = (await home.chat.window.boundingBox())!;

    await home.chat.sizeButton.click();
    await expect.poll(async () => (await home.chat.window.boundingBox())?.width).toBeGreaterThan(small.width + 150);
    await expect(home.chat.sizeButton).toHaveAccessibleName('Reduce the chat');

    await page.reload();
    await home.chat.open();
    await expect.poll(async () => (await home.chat.window.boundingBox())?.width).toBeGreaterThan(small.width + 150);

    await home.chat.sizeButton.click();
    await expect.poll(async () => (await home.chat.window.boundingBox())?.width).toBeLessThan(small.width + 10);
  });

  test('offers sit side by side once enlarged', async ({ page, api }) => {
    api.queueChat({ text: 'Two matches.', offers: [FRONTEND_JOB, BACKEND_JOB] });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await home.chat.sizeButton.click();

    await home.chat.ask('anything');
    await expect(home.chat.offers).toHaveCount(2);
    const [a, b] = await Promise.all([home.chat.offers.nth(0).boundingBox(), home.chat.offers.nth(1).boundingBox()]);
    expect(a && b && Math.abs(a.y - b.y) < 4 && b.x > a.x).toBe(true);
  });
});

const approx = (value: number, expected: number, tolerance = 3) => Math.abs(value - expected) <= tolerance;

test.describe('Chat · move and resize (desktop)', () => {
  test('the window is dragged by its header and stays where it was put, also after a reload', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    const before = await home.chat.box();

    await home.chat.dragBy(home.chat.header, -300, 20);

    const moved = await home.chat.box();
    expect(approx(moved.x, before.x - 300)).toBe(true);
    expect(approx(moved.y, before.y + 20)).toBe(true);
    expect(approx(moved.width, before.width, 1) && approx(moved.height, before.height, 1)).toBe(true);

    await page.reload();
    await home.chat.open();
    const again = await home.chat.box();
    expect(approx(again.x, moved.x) && approx(again.y, moved.y)).toBe(true);
  });

  test('it cannot be dragged off screen or under the sticky header', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.dragBy(home.chat.header, -3000, -3000);
    const topLeft = await home.chat.box();
    expect(topLeft.x).toBeGreaterThanOrEqual(7);
    expect(topLeft.y).toBeGreaterThanOrEqual(71);
    await expect(home.chat.closeButton).toBeInViewport({ ratio: 1 });

    await home.chat.dragBy(home.chat.header, 4000, 4000);
    const bottomRight = await home.chat.box();
    const viewport = page.viewportSize()!;
    expect(bottomRight.x + bottomRight.width).toBeLessThanOrEqual(viewport.width - 7);
    expect(bottomRight.y + bottomRight.height).toBeLessThanOrEqual(viewport.height - 7);
  });

  test('a handle resizes it from that edge or corner, the opposite one stays put', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    const before = await home.chat.box();

    await home.chat.dragBy(home.chat.handle('w'), -150, 0);
    const wider = await home.chat.box();
    expect(approx(wider.width, before.width + 150)).toBe(true);
    expect(approx(wider.x + wider.width, before.x + before.width)).toBe(true);

    // A corner moves two edges: the south-west one holds the left and bottom edges.
    await home.chat.dragBy(home.chat.handle('sw'), -40, 60);
    const bigger = await home.chat.box();
    expect(approx(bigger.width, wider.width + 40) && approx(bigger.height, wider.height + 60)).toBe(true);
    expect(approx(bigger.x + bigger.width, wider.x + wider.width)).toBe(true);
    expect(approx(bigger.y, wider.y)).toBe(true);
  });

  test('it cannot be made smaller than a usable chat', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.dragBy(home.chat.handle('w'), 2000, 0);
    await home.chat.dragBy(home.chat.handle('s'), 0, -2000);

    const small = await home.chat.box();
    expect(small.width).toBeGreaterThanOrEqual(339);
    expect(small.height).toBeGreaterThanOrEqual(419);
    await expect(home.chat.input).toBeVisible();
    await expect(home.chat.sendButton).toBeInViewport();
  });

  test('without a mouse: Alt+arrows move it, Alt+Shift+arrows resize it', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    const before = await home.chat.box();

    await home.chat.input.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('Alt+ArrowLeft');
    await expect.poll(async () => (await home.chat.box()).x).toBeLessThan(before.x - 40);
    const moved = await home.chat.box();
    expect(approx(moved.x, before.x - 48, 2)).toBe(true);

    for (let i = 0; i < 2; i++) await page.keyboard.press('Alt+Shift+ArrowRight');
    await expect.poll(async () => (await home.chat.box()).width).toBeGreaterThan(moved.width + 20);
    // The text box did not take the arrows as cursor moves, and the chat did not close.
    await expect(home.chat.window).toBeVisible();
  });

  test('double-clicking the header puts it back where it opens', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    const start = await home.chat.box();
    await home.chat.dragBy(home.chat.header, -250, -80);
    await home.chat.dragBy(home.chat.handle('w'), -100, 0);

    await home.chat.header.dblclick();

    await expect.poll(async () => (await home.chat.box()).x).toBeCloseTo(start.x, -1);
    const back = await home.chat.box();
    expect(approx(back.y, start.y) && approx(back.width, start.width)).toBe(true);
  });

  test('a position saved on a bigger screen is brought back inside this one', async ({ page }) => {
    await seedStorage(page, { 'jobs-monitor.chat.prefs': { frame: { left: 5000, top: -300, width: 900, height: 5000 }, share: false, dock: false } });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    const box = await home.chat.box();
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(7);
    expect(box.y).toBeGreaterThanOrEqual(71);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  });

  test('moving it does not move the page behind, nor select its text', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.dragBy(home.chat.header, -200, 40);

    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe('Chat · click outside', () => {
  test('a click on the page closes it, keeping the conversation and the unsent text', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await home.chat.ask('backend developer');
    await expect(home.chat.offers).toHaveCount(1);
    await home.chat.input.fill('half a sentence');

    await home.heading.click();

    await expect(home.chat.window).toHaveCount(0);
    await home.chat.open();
    await expect(home.chat.offers).toHaveCount(1);
    await expect(home.chat.input).toHaveValue('half a sentence');
  });

  test('a click inside the window, or a drag that ends outside it, does not close it', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.header.click();
    await home.chat.input.click();
    await expect(home.chat.window).toBeVisible();

    // The pointer is released over the page: that ends the drag, it is not a click outside.
    await home.chat.dragBy(home.chat.handle('w'), -300, 0);
    await expect(home.chat.window).toBeVisible();
  });

  test('the launcher still opens and closes it, once per click', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await page.getByRole('button', { name: 'Close the chat', expanded: true }).last().click();
    await expect(home.chat.window).toHaveCount(0);
    await home.chat.launcher.click();
    await expect(home.chat.window).toBeVisible();
  });
});

test.describe('Chat · it knows where I am', () => {
  test('on an offer page it asks about that offer, and tells the assistant which one', async ({ page, api }) => {
    const offer = new PublicPage(page);
    await offer.goto('/jobs/monday/e2/backend-developer');
    await offer.heading.waitFor();
    await offer.chat.open();

    await expect(offer.chat.choice('Tell me about this offer')).toBeVisible();
    await expect(offer.chat.choice('How do I apply to this offer?')).toBeVisible();
    await offer.chat.choice('Tell me about this offer').click();

    await expect.poll(() => api.chatRequests.length).toBe(1);
    expect(api.chatRequests[0].page).toEqual({ kind: 'offer', source: 'monday', externalId: 'e2' });
  });

  test('the page of the moment is sent, not the one where the chat was opened', async ({ page, api }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await home.chat.ask('hello');
    await expect.poll(() => api.chatRequests.length).toBe(1);
    expect(api.chatRequests[0].page).toEqual({ kind: 'home' });

    // Go to another page inside the app (the click is outside the chat: it closes), reopen it, ask again.
    await home.header.link('Offers').click();
    await expect(page).toHaveURL(/\/jobs/);
    await home.chat.open();
    await home.chat.ask('and here?');
    await expect.poll(() => api.chatRequests.length).toBe(2);
    expect(api.chatRequests[1].page).toEqual({ kind: 'offers' });
  });

  test('on a page about nothing in particular it offers the general questions', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await expect(home.chat.choice('Backend jobs in Tel Aviv')).toBeVisible();
    await expect(home.chat.choice('How do I use this site?')).toBeVisible();
    await expect(home.chat.choice('Tell me about this offer')).toHaveCount(0);
  });
});

test.describe('Chat · using my CV', () => {
  test('the assistant sees nothing until the user switches it on, then gets the profile', async ({ page, api }) => {
    await seedStorage(page, { [STORAGE_KEYS.profile]: PROFILE });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await expect(home.chat.shareSwitch).toHaveAttribute('aria-checked', 'false');
    await home.chat.ask('hello');
    await expect(home.chat.message(/found/)).toBeVisible();
    expect(api.chatRequests[0].profile).toBeUndefined();

    await home.chat.shareSwitch.click();
    await home.chat.newChatButton.click();
    await home.chat.choice('Find offers that fit my CV').click();
    await expect.poll(() => api.chatRequests.length).toBe(2);
    expect(api.chatRequests[1].profile).toMatchObject({ skills: ['React', 'TypeScript', 'Node.js'], roles: ['frontend'], seniority: 'Senior' });
    expect(api.chatRequests[1].profile).not.toHaveProperty('education');
  });

  test('a PDF added with the paperclip is read in the browser and shared as text, never as a file', async ({ page, api }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(`${r.method()} ${r.url()} ${r.headers()['content-type'] ?? ''}`));
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.cvInput.setInputFiles({ name: 'Jane_CV.pdf', mimeType: 'application/pdf', buffer: buildPdf(CV_LINES) });

    await expect(home.chat.window.getByText(/CV added: Jane_CV.pdf/)).toBeVisible();
    await expect(home.chat.shareSwitch).toHaveAttribute('aria-checked', 'true');
    await home.chat.ask('what is missing in my CV?');
    await expect.poll(() => api.chatRequests.length).toBe(1);

    const sent = api.chatRequests[0];
    expect(sent.cvs).toHaveLength(1);
    expect(sent.cvs?.[0]).toMatchObject({ id: 'attached', name: 'Jane_CV.pdf' });
    expect(sent.cvs?.[0].text).toContain('React, TypeScript and Redux');
    expect(sent.profile?.skills).toEqual(expect.arrayContaining(['React', 'TypeScript']));
    // Nothing but JSON goes out: the PDF itself is never uploaded.
    expect(requests.some((r) => /multipart|application\/pdf/.test(r))).toBe(false);
  });

  test('a file that is not a PDF is refused with a message', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.cvInput.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });

    await expect(home.chat.error).toContainText('choose a PDF');
    await expect(home.chat.shareSwitch).toHaveCount(0);
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
    // A phone has the whole screen: there is nothing to enlarge.
    await expect(home.chat.sizeButton).toBeHidden();
    await expect(home.chat.handle('w')).toBeHidden();
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

test.describe('Chat · on a touch phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('opening it does not raise the keyboard: the window is readable first, the box is tapped when wanted', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await expect(home.chat.input).not.toBeFocused();
    await expect(home.chat.window).toContainText('Ask me anything');

    await home.chat.input.tap();
    await expect(home.chat.input).toBeFocused();
  });

  test('says less: three questions, no long introduction, and the message box in sight', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    const questions = home.chat.window.locator('li').filter({ has: page.getByRole('button', { name: /Backend jobs|Jobs in Jerusalem|How do I use|prepare for/ }) });
    await expect(questions.locator(':visible')).toHaveCount(3);
    await expect(home.chat.window.getByText('Ask me anything: offers, how the site works, career advice.')).toBeVisible();
    await expect(home.chat.window.getByText(/I can find offers \(by role/)).toBeHidden();
    await expect(home.chat.input).toBeInViewport({ ratio: 1 });
    await expect(home.chat.sendButton).toBeInViewport({ ratio: 1 });
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
