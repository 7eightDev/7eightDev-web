/**
 * jsdom `window.matchMedia` mock — singleton shared by every presentation test.
 *
 * Installed automatically at test startup via `setupFilesAfterEnv`
 * (`jest.config.presentation.js` → this file), so `window.matchMedia` is always
 * the mock below even in tests that never import this module explicitly.
 *
 * It resolves `(min-width: Npx)` / `(max-width: Npx)` / `(prefers-color-scheme: …)`
 * / `(prefers-reduced-motion: …)` queries against an internal simulated viewport
 * width. Default width is 1280 (desktop), taken from `DEVICE_PROFILES` in
 * `presentation/lib/breakpoints.ts` so the canonical matrix is never duplicated.
 * Any other media feature evaluates to `false` (fail-safe); `""` / `all` → true.
 *
 * ## Public API
 * - `setViewport(width)` — simulate a live resize: recomputes `matches` on every
 *   outstanding query and dispatches a `change` MediaQueryListEvent (type
 *   `"change"`, `media`, `matches`, `oldMatches`) to each registered listener for
 *   which the value actually flipped (mirrors real browsers: no event when the
 *   result does not change). Supports `addEventListener`/`removeEventListener`,
 *   the deprecated `addListener`/`removeListener` and the `onchange` property.
 *   Also keeps `window.innerWidth` in sync and fires a `window` `resize` event.
 * - `cleanupMatchMediaMock()` — restore default width, drop every live query and
 *   listener; call it in `afterEach` (alias `cleanupMock`) to avoid residues.
 * - `getCurrentWidth()` — read the simulated width for assertions.
 *
 * This mock is the foundation for every MS-2.x responsive component test
 * (AdminHeader, LeadTable, Sheet, LeadFilterBar…): use `setViewport` /
 * `renderAt` (see ./set-viewport.ts) instead of forking pixel values.
 */
import { DEVICE_PROFILES } from "@/presentation/lib/breakpoints";

export const DEFAULT_VIEWPORT_WIDTH = DEVICE_PROFILES.desktop;

type ChangeListener = (event: MediaQueryListEvent) => void;
type StoredListener = EventListenerOrEventListenerObject;

const instances = new Set<MediaQueryListMock>();
let currentWidth: number = DEFAULT_VIEWPORT_WIDTH;

/** Evaluate a single media query against the simulated viewport width. */
function evaluateMediaQuery(media: string): boolean {
  const query = media.trim();
  if (query === "") {
    return true;
  }
  if (/(^|\s)all(\s|$|,)/.test(query)) {
    return true;
  }
  const minWidth = /\(\s*min-width:\s*([\d.]+)px\s*\)/.exec(query);
  if (minWidth) {
    return currentWidth >= Number(minWidth[1]);
  }
  const maxWidth = /\(\s*max-width:\s*([\d.]+)px\s*\)/.exec(query);
  if (maxWidth) {
    return currentWidth <= Number(maxWidth[1]);
  }
  if (query.includes("prefers-color-scheme: dark")) {
    return false;
  }
  if (query.includes("prefers-color-scheme")) {
    return true;
  }
  if (query.includes("prefers-reduced-motion: reduce")) {
    return false;
  }
  if (query.includes("prefers-reduced-motion")) {
    return true;
  }
  return false;
}

class MediaQueryListMock {
  readonly media: string;
  matches: boolean;
  onchange: ChangeListener | null = null;
  private readonly changeListeners = new Set<StoredListener>();

  constructor(media: string) {
    this.media = media;
    this.matches = evaluateMediaQuery(media);
  }

  addListener(listener: StoredListener): void {
    this.changeListeners.add(listener);
  }

  removeListener(listener: StoredListener): void {
    this.changeListeners.delete(listener);
  }

  addEventListener(type: string, listener: StoredListener): void {
    if (type === "change") {
      this.changeListeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: StoredListener): void {
    if (type === "change") {
      this.changeListeners.delete(listener);
    }
  }

  dispatchEvent(): boolean {
    // Kept for API compatibility with MediaQueryList. No-op: notifications are
    // pushed by setViewport.
    return true;
  }

  /** Recompute matches and dispatch a `change` event when the value flipped. */
  reload(): void {
    const oldMatches = this.matches;
    this.matches = evaluateMediaQuery(this.media);
    if (this.matches === oldMatches) {
      return;
    }
    const event = {
      type: "change",
      media: this.media,
      matches: this.matches,
      oldMatches,
    } as unknown as MediaQueryListEvent;
    this.changeListeners.forEach((listener) => {
      if (typeof listener === "function") {
        listener(event as unknown as Event);
      } else {
        listener.handleEvent(event as unknown as Event);
      }
    });
    if (typeof this.onchange === "function") {
      this.onchange(event);
    }
  }
}

function matchMediaMock(query: string): MediaQueryListMock {
  const instance = new MediaQueryListMock(query);
  instances.add(instance);
  return instance;
}

function overrideWindowInnerWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
    writable: true,
  });
}

/** Install (or re-install) the mock; resets internal state to the default. */
export function installMatchMediaMock(): void {
  currentWidth = DEFAULT_VIEWPORT_WIDTH;
  overrideWindowInnerWidth(DEFAULT_VIEWPORT_WIDTH);
  instances.clear();
  window.matchMedia = matchMediaMock as unknown as Window["matchMedia"];
}

/**
 * Simulate a real resize: update the simulated width, flip/notify every live
 * query whose `matches` changed, and fire a plain `resize` event on `window`.
 */
export function setViewport(width: number): void {
  currentWidth = width;
  overrideWindowInnerWidth(width);
  instances.forEach((instance) => instance.reload());
  window.dispatchEvent(new Event("resize"));
}

/** Restore the default width and drop every live query/listener (→ afterEach). */
export function cleanupMatchMediaMock(): void {
  currentWidth = DEFAULT_VIEWPORT_WIDTH;
  overrideWindowInnerWidth(DEFAULT_VIEWPORT_WIDTH);
  instances.clear();
}

/** Alias used by tests that follow the "cleanupMock in afterEach" convention. */
export const cleanupMock = cleanupMatchMediaMock;

/** Simulated viewport width — read for assertions. */
export function getCurrentWidth(): number {
  return currentWidth;
}

installMatchMediaMock();