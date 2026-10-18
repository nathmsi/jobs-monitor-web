/** The chat window's rectangle, in CSS pixels from the top-left of the viewport. */
export interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** Which edges a resize handle moves: n/s/e/w, or a corner (nw, ne, sw, se). */
export const HANDLES = ["n", "s", "e", "w", "nw", "ne", "sw", "se"] as const;
export type Handle = (typeof HANDLES)[number];

export const MIN_WIDTH = 340;
export const MIN_HEIGHT = 420;
/** The sticky header is about 60px: the window's own header never goes under it. */
export const TOP_SAFE = 72;
/** Gap kept to the other edges of the screen. */
export const EDGE_GAP = 8;
/** A window at least this wide counts as "enlarged". */
export const LARGE_WIDTH = 600;
/** Where the window sits by default: above the launcher, at the reading end. */
const DEFAULT_RIGHT = 20;
const DEFAULT_BOTTOM = 94;
const COMPACT = { width: 416, height: 608 };
const LARGE = { width: 768, height: 864 };

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max));

/** Keeps a frame on screen, below the header, and no smaller than a usable chat. */
export function clampFrame(frame: Frame, viewport: Viewport): Frame {
  const width = clamp(frame.width, MIN_WIDTH, viewport.width - 2 * EDGE_GAP);
  const height = clamp(frame.height, MIN_HEIGHT, viewport.height - TOP_SAFE - EDGE_GAP);
  return {
    width,
    height,
    left: clamp(frame.left, EDGE_GAP, viewport.width - width - EDGE_GAP),
    top: clamp(frame.top, TOP_SAFE, viewport.height - height - EDGE_GAP),
  };
}

/** The window of a given size, where it opens by default (bottom right, above the launcher). */
export function defaultFrame(viewport: Viewport, size: "compact" | "large"): Frame {
  const base = size === "large" ? LARGE : COMPACT;
  const width = Math.min(base.width, viewport.width - 2 * EDGE_GAP);
  const height = Math.min(base.height, viewport.height - DEFAULT_BOTTOM - TOP_SAFE);
  return clampFrame(
    { width, height, left: viewport.width - DEFAULT_RIGHT - width, top: viewport.height - DEFAULT_BOTTOM - height },
    viewport,
  );
}

export const isLargeFrame = (frame: Frame): boolean => frame.width >= LARGE_WIDTH;

/** Moves the window. */
export function moveFrame(frame: Frame, dx: number, dy: number, viewport: Viewport): Frame {
  return clampFrame({ ...frame, left: frame.left + dx, top: frame.top + dy }, viewport);
}

/**
 * Drags one handle by (dx, dy): the edges it holds move, the opposite ones stay put. The window
 * stops at its minimum size and at the screen edges instead of sliding.
 */
export function resizeFrame(frame: Frame, handle: Handle, dx: number, dy: number, viewport: Viewport): Frame {
  let left = frame.left;
  let top = frame.top;
  let right = frame.left + frame.width;
  let bottom = frame.top + frame.height;

  if (handle.includes("w")) left = clamp(left + dx, EDGE_GAP, right - MIN_WIDTH);
  if (handle.includes("e")) right = clamp(right + dx, left + MIN_WIDTH, viewport.width - EDGE_GAP);
  if (handle.includes("n")) top = clamp(top + dy, TOP_SAFE, bottom - MIN_HEIGHT);
  if (handle.includes("s")) bottom = clamp(bottom + dy, top + MIN_HEIGHT, viewport.height - EDGE_GAP);

  return { left, top, width: right - left, height: bottom - top };
}

/**
 * Enlarge, or bring back to the compact size, keeping the bottom-right corner where it is:
 * the window grows toward the page, like it unfolds from the launcher.
 */
export function toggleSize(frame: Frame, viewport: Viewport): Frame {
  const target = defaultFrame(viewport, isLargeFrame(frame) ? "compact" : "large");
  return clampFrame(
    {
      width: target.width,
      height: target.height,
      left: frame.left + frame.width - target.width,
      top: frame.top + frame.height - target.height,
    },
    viewport,
  );
}

const same = (a: Frame, b: Frame): boolean => a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
export const sameFrame = same;

/** A frame read from storage: four finite numbers, or null. */
export function parseFrame(value: unknown): Frame | null {
  if (typeof value !== "object" || value === null) return null;
  const { left, top, width, height } = value as Record<string, unknown>;
  const numbers = [left, top, width, height];
  if (!numbers.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  return { left: left as number, top: top as number, width: width as number, height: height as number };
}

/* ── Docked: a full-height panel at the end side (right in LTR, left in RTL) that pushes the page ── */

export const DOCK_MIN_WIDTH = 340;
export const DOCK_MAX_WIDTH = 720;
export const DOCK_DEFAULT_WIDTH = 420;
/** The page keeps at least this share of the screen: a chat that eats half of it is a different tool. */
export const DOCK_MAX_SHARE = 0.5;
/** Docking needs room: below this width the window stays floating. */
export const DOCK_MIN_VIEWPORT = 900;

/**
 * The floating window that appears when the user pulls the docked panel off by its header: compact, with
 * its header under the pointer, so the pointer keeps holding it.
 */
export function detachedFrame(pointer: { x: number; y: number }, viewport: Viewport): Frame {
  const size = defaultFrame(viewport, "compact");
  return clampFrame({ width: size.width, height: size.height, left: pointer.x - size.width / 2, top: pointer.y - 24 }, viewport);
}

/** The width of the docked panel, kept between a usable chat and half the screen. */
export function clampDockWidth(width: number, viewportWidth: number): number {
  const max = Math.min(DOCK_MAX_WIDTH, Math.floor(viewportWidth * DOCK_MAX_SHARE));
  return Math.round(Math.min(Math.max(width, DOCK_MIN_WIDTH), Math.max(DOCK_MIN_WIDTH, max)));
}

/** The width that puts the panel's inner edge under the pointer: measured from the end side of the screen. */
export function dockWidthFromPointer(pointerX: number, viewportWidth: number, rtl: boolean): number {
  return clampDockWidth(rtl ? pointerX : viewportWidth - pointerX, viewportWidth);
}
