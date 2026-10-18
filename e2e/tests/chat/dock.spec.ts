import { expect, test } from '../../fixtures';
import { HomePage } from '../../pages/HomePage';
import { seedStorage } from '../../utils/storage';

// No seeded preferences here: this is what a visitor who never touched the chat gets.

const bodyPadding = (page: import('@playwright/test').Page, side: 'Left' | 'Right') =>
  page.locator('body').evaluate((el, s) => getComputedStyle(el)[`padding${s}` as 'paddingLeft'], side);

test.describe('Chat · docked to the side by default (desktop)', () => {
  test('opens as a full-height panel at the end of the screen, and the page makes room instead of being covered', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    const viewport = page.viewportSize()!;
    const contentBefore = (await home.heading.boundingBox())!;

    await home.chat.open();

    await expect.poll(async () => (await home.chat.box()).height).toBe(viewport.height);
    const box = await home.chat.box();
    expect(box.x + box.width).toBe(viewport.width);
    expect(box.width).toBe(420);
    expect(box.y).toBe(0);
    // The page was pushed: its content is centred in what is left, not under the chat.
    await expect.poll(() => bodyPadding(page, 'Right')).toBe('420px');
    const contentAfter = (await home.heading.boundingBox())!;
    expect(contentAfter.x + contentAfter.width).toBeLessThanOrEqual(viewport.width - 420);
    expect(contentAfter.x).toBeLessThan(contentBefore.x);
  });

  test('closing it gives the page its room back', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await home.chat.closeButton.click();

    await expect(home.chat.window).toHaveCount(0);
    await expect.poll(() => bodyPadding(page, 'Right')).toBe('0px');
  });

  test('a click on the page does not close it: it is there to be used next to the page', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.heading.click();
    await home.searchInput.click();

    await expect(home.chat.window).toBeVisible();
    await expect(home.chat.undockButton).toBeVisible();
  });

  test('its width changes by dragging the edge toward the page, within limits, and is remembered', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await expect.poll(async () => (await home.chat.box()).width).toBe(420);

    await home.chat.dragBy(home.chat.dockHandle, -120, 0);
    await expect.poll(async () => (await home.chat.box()).width).toBeGreaterThan(520);
    const wider = (await home.chat.box()).width;
    await expect.poll(() => bodyPadding(page, 'Right')).toBe(`${wider}px`); // the page follows (it eases there)

    await home.chat.dragBy(home.chat.dockHandle, -2000, 0);
    await expect.poll(async () => (await home.chat.box()).width).toBe(640); // half of a 1280 screen, no more

    await page.reload();
    await home.chat.open();
    await expect.poll(async () => (await home.chat.box()).width).toBe(640);
  });

  test('Alt+Left widens it and Alt+Right narrows it, without a mouse', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await home.chat.input.focus();

    await page.keyboard.press('Alt+ArrowLeft');
    await expect.poll(async () => (await home.chat.box()).width).toBe(436);
    await page.keyboard.press('Alt+ArrowRight');
    await expect.poll(async () => (await home.chat.box()).width).toBe(420);
  });

  test('the launcher stands next to the panel instead of under it', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await expect.poll(async () => {
      const launcher = await page.getByRole('button', { name: 'Close the chat', expanded: true }).last().boundingBox();
      const panel = await home.chat.box();
      return launcher ? launcher.x + launcher.width <= panel.x : false;
    }).toBe(true);
  });

  test('the conversation and the dock are remembered', async ({ page, api }) => {
    api.queueChat({ text: 'Docked answer.' });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await home.chat.ask('anything');
    await expect(home.chat.message('Docked answer.')).toBeVisible();

    await page.reload();
    await home.chat.open();

    await expect(home.chat.undockButton).toBeVisible();
    await expect(home.chat.message('Docked answer.')).toBeVisible();
  });

  test('a screen too narrow for it has no dock: the window floats', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 800 });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await expect(home.chat.dockButton).toHaveCount(0);
    await expect(home.chat.undockButton).toHaveCount(0);
    expect((await home.chat.box()).height).toBeLessThan(800);
  });
});

test.describe('Chat · taking it off the side (desktop)', () => {
  test('the button floats it, where the window opens by default, and gives the page its room back', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.undockButton.click();

    await expect.poll(() => bodyPadding(page, 'Right')).toBe('0px');
    await expect.poll(async () => (await home.chat.box()).height).toBeLessThan(page.viewportSize()!.height);
    await expect(home.chat.dockButton).toBeVisible();
    // The window is now a floating one: a click on the page closes it again.
    await home.heading.click();
    await expect(home.chat.window).toHaveCount(0);
  });

  test('pulling the header off the side detaches it, and the user keeps dragging it where they want', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.dragBy(home.chat.header, -500, 150);

    await expect.poll(() => bodyPadding(page, 'Right')).toBe('0px'); // the page has its room back
    const box = await home.chat.box();
    expect(box.x).toBeLessThan(1280 - 420 - 100); // it followed the pointer, away from the side
    expect(box.height).toBeLessThan(page.viewportSize()!.height);
    await expect(home.chat.dockButton).toBeVisible();
  });

  test('where it was dropped is remembered, and it stays detached next time', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await home.chat.dragBy(home.chat.header, -500, 100);
    await expect(home.chat.dockButton).toBeVisible();
    const dropped = await home.chat.box();

    await page.reload();
    await home.chat.open();

    await expect(home.chat.dockButton).toBeVisible();
    const again = await home.chat.box();
    expect(Math.abs(again.x - dropped.x) < 3 && Math.abs(again.y - dropped.y) < 3).toBe(true);
  });

  test('a click on the header, without pulling, keeps it docked', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await home.chat.header.click();

    await expect(home.chat.undockButton).toBeVisible();
    expect((await home.chat.box()).height).toBe(page.viewportSize()!.height);
  });

  test('docking it again puts it back on the side', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();
    await home.chat.undockButton.click();

    await home.chat.dockButton.click();

    await expect.poll(async () => (await home.chat.box()).height).toBe(page.viewportSize()!.height);
    await expect.poll(() => bodyPadding(page, 'Right')).toBe('420px');
  });

  test('a visitor who already floated it with the old settings keeps it floating', async ({ page }) => {
    await seedStorage(page, { 'jobs-monitor.chat.prefs': { dock: false, share: false } });
    const home = new HomePage(page);
    await home.goto();
    await home.chat.open();

    await expect(home.chat.dockButton).toBeVisible();
    expect(await bodyPadding(page, 'Right')).toBe('0px');
  });
});

test.describe('Chat · docked, in Hebrew', () => {
  test('the panel is at the left, the end side of a right-to-left page, and the page makes room on that side', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.header.chooseLanguage('HE');
    await page.getByRole('button', { name: 'שאל את ה-AI' }).click();
    const dialog = page.getByRole('dialog', { name: 'עוזר משרות' });
    await expect(dialog).toBeVisible();

    await expect.poll(async () => (await dialog.boundingBox())?.x).toBe(0);
    await expect.poll(() => bodyPadding(page, 'Left')).toBe('420px');
  });
});
