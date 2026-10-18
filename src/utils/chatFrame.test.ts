import { describe, expect, it } from "vitest";

import {
  clampDockWidth, clampFrame, defaultFrame, detachedFrame, DOCK_MAX_WIDTH, DOCK_MIN_WIDTH, dockWidthFromPointer, EDGE_GAP, isLargeFrame, MIN_HEIGHT, MIN_WIDTH, moveFrame, parseFrame, resizeFrame, toggleSize, TOP_SAFE,
  type Frame, type Viewport,
} from "./chatFrame";

const VP: Viewport = { width: 1280, height: 800 };
const FRAME: Frame = { left: 400, top: 150, width: 500, height: 500 };

describe("clampFrame", () => {
  it("leaves a frame that fits as it is", () => {
    expect(clampFrame(FRAME, VP)).toEqual(FRAME);
  });

  it("keeps the window below the sticky header, and inside the other edges", () => {
    const out = clampFrame({ left: -200, top: -50, width: 500, height: 500 }, VP);
    expect(out.left).toBe(EDGE_GAP);
    expect(out.top).toBe(TOP_SAFE);
    const far = clampFrame({ left: 5000, top: 5000, width: 500, height: 500 }, VP);
    expect(far.left + far.width).toBe(VP.width - EDGE_GAP);
    expect(far.top + far.height).toBe(VP.height - EDGE_GAP);
  });

  it("never lets it get too small or bigger than the screen", () => {
    expect(clampFrame({ ...FRAME, width: 10, height: 10 }, VP)).toMatchObject({ width: MIN_WIDTH, height: MIN_HEIGHT });
    const big = clampFrame({ ...FRAME, width: 9999, height: 9999 }, VP);
    expect(big.width).toBe(VP.width - 2 * EDGE_GAP);
    expect(big.height).toBe(VP.height - TOP_SAFE - EDGE_GAP);
  });

  it("keeps a usable window on a tiny screen too", () => {
    const out = clampFrame(FRAME, { width: 300, height: 300 });
    expect(out.width).toBeGreaterThanOrEqual(MIN_WIDTH);
    expect(out.height).toBeGreaterThanOrEqual(MIN_HEIGHT);
  });
});

describe("defaultFrame", () => {
  it("sits at the bottom right, above the launcher, in two sizes", () => {
    const compact = defaultFrame(VP, "compact");
    const large = defaultFrame(VP, "large");
    expect(compact.left + compact.width).toBe(VP.width - 20);
    expect(compact.top + compact.height).toBe(VP.height - 94);
    expect(large.width).toBeGreaterThan(compact.width);
    expect(large.left + large.width).toBe(VP.width - 20);
  });

  it("fits a short screen: never under the header", () => {
    const f = defaultFrame({ width: 1280, height: 600 }, "large");
    expect(f.top).toBeGreaterThanOrEqual(TOP_SAFE);
  });
});

describe("isLargeFrame", () => {
  it("tells the two default sizes apart", () => {
    expect(isLargeFrame(defaultFrame(VP, "compact"))).toBe(false);
    expect(isLargeFrame(defaultFrame(VP, "large"))).toBe(true);
  });
});

describe("moveFrame", () => {
  it("moves by the drag distance", () => {
    expect(moveFrame(FRAME, -100, 40, VP)).toEqual({ ...FRAME, left: 300, top: 190 });
  });

  it("stops at the screen edges instead of leaving", () => {
    const out = moveFrame(FRAME, -9999, -9999, VP);
    expect(out).toMatchObject({ left: EDGE_GAP, top: TOP_SAFE, width: FRAME.width, height: FRAME.height });
  });
});

describe("resizeFrame", () => {
  it("a west handle moves the left edge only", () => {
    expect(resizeFrame(FRAME, "w", -100, 50, VP)).toEqual({ left: 300, top: 150, width: 600, height: 500 });
  });

  it("an east handle moves the right edge only", () => {
    expect(resizeFrame(FRAME, "e", 80, 50, VP)).toEqual({ left: 400, top: 150, width: 580, height: 500 });
  });

  it("a north handle moves the top edge only, a south handle the bottom one", () => {
    expect(resizeFrame(FRAME, "n", 30, -60, VP)).toEqual({ left: 400, top: 90, width: 500, height: 560 });
    expect(resizeFrame(FRAME, "s", 30, 60, VP)).toEqual({ left: 400, top: 150, width: 500, height: 560 });
  });

  it("a corner moves two edges", () => {
    expect(resizeFrame(FRAME, "nw", -50, -40, VP)).toEqual({ left: 350, top: 110, width: 550, height: 540 });
    expect(resizeFrame(FRAME, "se", 50, 40, VP)).toEqual({ left: 400, top: 150, width: 550, height: 540 });
  });

  it("stops at the minimum size, keeping the opposite edge where it was", () => {
    const out = resizeFrame(FRAME, "w", 9999, 0, VP);
    expect(out.width).toBe(MIN_WIDTH);
    expect(out.left + out.width).toBe(FRAME.left + FRAME.width);
    const up = resizeFrame(FRAME, "s", 0, -9999, VP);
    expect(up.height).toBe(MIN_HEIGHT);
    expect(up.top).toBe(FRAME.top);
  });

  it("stops at the screen edges and under the header", () => {
    expect(resizeFrame(FRAME, "e", 9999, 0, VP).left + resizeFrame(FRAME, "e", 9999, 0, VP).width).toBe(VP.width - EDGE_GAP);
    expect(resizeFrame(FRAME, "n", 0, -9999, VP).top).toBe(TOP_SAFE);
    expect(resizeFrame(FRAME, "w", -9999, 0, VP).left).toBe(EDGE_GAP);
  });
});

describe("toggleSize", () => {
  it("enlarges toward the page, keeping the bottom-right corner", () => {
    const small = defaultFrame(VP, "compact");
    const big = toggleSize(small, VP);
    expect(isLargeFrame(big)).toBe(true);
    expect(big.left + big.width).toBe(small.left + small.width);
    expect(big.top + big.height).toBe(small.top + small.height);
  });

  it("brings an enlarged window back to compact, the same way", () => {
    const big = defaultFrame(VP, "large");
    const small = toggleSize(big, VP);
    expect(isLargeFrame(small)).toBe(false);
    expect(small.left + small.width).toBe(big.left + big.width);
  });

  it("works from a window the user moved or resized", () => {
    const moved: Frame = { left: 100, top: 200, width: 400, height: 450 };
    const big = toggleSize(moved, VP);
    expect(isLargeFrame(big)).toBe(true);
    expect(big.left).toBeGreaterThanOrEqual(EDGE_GAP);
    expect(big.top).toBeGreaterThanOrEqual(TOP_SAFE);
  });
});

describe("parseFrame", () => {
  it("reads four finite numbers", () => {
    expect(parseFrame({ left: 1, top: 2, width: 3, height: 4 })).toEqual({ left: 1, top: 2, width: 3, height: 4 });
  });

  it.each([null, undefined, 42, "x", {}, { left: 1, top: 2, width: 3 }, { left: "1", top: 2, width: 3, height: 4 }, { left: NaN, top: 2, width: 3, height: 4 }])(
    "refuses %p",
    (value) => {
      expect(parseFrame(value)).toBeNull();
    },
  );
});

describe("clampDockWidth", () => {
  it("leaves a width that fits as it is", () => {
    expect(clampDockWidth(450, 1440)).toBe(450);
  });

  it("is never narrower than a usable chat, nor wider than the cap", () => {
    expect(clampDockWidth(50, 1440)).toBe(DOCK_MIN_WIDTH);
    expect(clampDockWidth(5000, 3000)).toBe(DOCK_MAX_WIDTH);
  });

  it("never takes more than half of the screen", () => {
    expect(clampDockWidth(700, 1000)).toBe(500);
  });

  it("on a screen so small that half is under the minimum, keeps the minimum", () => {
    expect(clampDockWidth(500, 600)).toBe(DOCK_MIN_WIDTH);
  });

  it("is a whole number of pixels", () => {
    expect(Number.isInteger(clampDockWidth(433.7, 1440))).toBe(true);
  });
});

describe("dockWidthFromPointer", () => {
  it("measures from the end side: at the right in LTR, at the left in RTL", () => {
    expect(dockWidthFromPointer(1000, 1440, false)).toBe(440);
    expect(dockWidthFromPointer(440, 1440, true)).toBe(440);
  });

  it("stops at the limits whatever the pointer does", () => {
    expect(dockWidthFromPointer(1430, 1440, false)).toBe(DOCK_MIN_WIDTH);
    expect(dockWidthFromPointer(0, 1440, false)).toBe(720);
    expect(dockWidthFromPointer(-500, 1440, false)).toBe(720);
  });
});

describe("detachedFrame", () => {
  it("is a compact window with its header under the pointer, so the pointer keeps holding it", () => {
    const f = detachedFrame({ x: 900, y: 100 }, VP);
    expect(f.width).toBe(defaultFrame(VP, "compact").width);
    expect(f.left + f.width / 2).toBe(900);
    expect(f.top).toBe(76);
  });

  it("stays on screen and below the header when the pointer is near an edge", () => {
    const corner = detachedFrame({ x: 5, y: 5 }, VP);
    expect(corner.left).toBeGreaterThanOrEqual(EDGE_GAP);
    expect(corner.top).toBeGreaterThanOrEqual(TOP_SAFE);
    const far = detachedFrame({ x: VP.width, y: VP.height }, VP);
    expect(far.left + far.width).toBeLessThanOrEqual(VP.width - EDGE_GAP);
    expect(far.top + far.height).toBeLessThanOrEqual(VP.height - EDGE_GAP);
  });
});
