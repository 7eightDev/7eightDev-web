/**
 * Shared R3 guard for lateral-sheet tests (MS-2.2 / MS-2.4 / MS-2.5).
 *
 * jsdom has no layout engine: `getBoundingClientRect` returns all-zero rects.
 * The rendered width of a `SheetContent` is therefore derived from the Tailwind
 * tokens actually present on the DOM node, interpolated against the simulated
 * viewport:
 *   - the primitive default is `w-3/4` (≡ 75%) + `max-w-md` (28rem = 448px);
 *   - consumers override them via `className` with arbitrary `w-[N%]` /
 *     `max-w-[Npx]` tokens (tw-merge drops the conflicting defaults); since
 *     MS-2.5 the helper also understands `w-[Npx]` (fixed, no viewport scaling)
 *     and `max-w-[Nvw]` (cap ∝ viewport width, e.g. the LeadJobDrawer's
 *     `w-[340px] max-w-[85vw]`).
 *
 * Every supported token resolves to a px candidate against the viewport width:
 *   - width: `w-[N%]` → N% of the viewport, `w-[Npx]` → N, `w-3/4` → 75%;
 *   - cap:   `max-w-[Npx]` → N, `max-w-[Nvw]` → N% of the viewport, `max-w-md`
 *     → 448.
 * real width = min(candidate, cap). Stubs the node rect with that value and
 * asserts the R3 guarantee: boundingBox.width ≤ the cap AND ≥ the resolved
 * `min(candidate, cap)` (the viewport-relative cap when the fixed width wins).
 */
interface Token {
  /** The exact Tailwind class the width/cap token was derived from. */
  token: string;
  /** Resolve the token to viewport CSS px for the simulated width. */
  resolve: (viewportWidth: number) => number;
}

/** Width token → candidate width in px: `w-[N%]` (∝ vw), `w-[Npx]` (fixed) or
 *  the default `w-3/4` → 75%. */
function widthTokenOf(className: string): Token {
  const percent = /(w-\[([\d.]+)%\])/.exec(className);
  if (percent) {
    const value = Number(percent[2]);
    return {
      token: percent[1],
      resolve: (viewWidth) => (value / 100) * viewWidth,
    };
  }
  const px = /(w-\[(\d+)px\])/.exec(className);
  if (px) {
    const value = Number(px[2]);
    return { token: px[1], resolve: () => value };
  }
  if (className.includes("w-3/4")) {
    return { token: "w-3/4", resolve: (viewWidth) => 0.75 * viewWidth };
  }
  throw new Error(
    `expectSheetWidth: no width token (w-[N%], w-[Npx] or w-3/4) on the Sheet node: "${className}"`,
  );
}

/** Max-width token → cap in px: `max-w-[Npx]` (fixed), `max-w-[Nvw]` (∝ vw) or
 *  the default `max-w-md` (448). */
function maxWidthTokenOf(className: string): Token {
  const px = /(max-w-\[(\d+)px\])/.exec(className);
  if (px) {
    const value = Number(px[2]);
    return { token: px[1], resolve: () => value };
  }
  const vw = /(max-w-\[([\d.]+)vw\])/.exec(className);
  if (vw) {
    const value = Number(vw[2]);
    return {
      token: vw[1],
      resolve: (viewWidth) => (value / 100) * viewWidth,
    };
  }
  if (className.includes("max-w-md")) {
    return { token: "max-w-md", resolve: () => 448 };
  }
  throw new Error(
    `expectSheetWidth: no max-width token (max-w-[Npx], max-w-[Nvw] or max-w-md) on the Sheet node: "${className}"`,
  );
}

/**
 * Assert the R3 width contract for an open lateral `SheetContent` at the given
 * simulated viewport width. Needs jest-dom (`toHaveClass`) in the calling test.
 */
export function expectSheetWidth(
  dialog: HTMLElement,
  viewportWidth: number,
): void {
  const width = widthTokenOf(dialog.className);
  const cap = maxWidthTokenOf(dialog.className);

  // Contract lock: the tokens the width was derived from must be the ones on
  // the node (the default `w-3/4 max-w-md` or the consumer's arbitrary pair).
  expect(dialog).toHaveClass(width.token);
  expect(dialog).toHaveClass(cap.token);

  const candidate = width.resolve(viewportWidth);
  const capPx = cap.resolve(viewportWidth);
  const expected = Math.min(candidate, capPx);

  const previousRect = dialog.getBoundingClientRect.bind(dialog);
  dialog.getBoundingClientRect = () =>
    ({ ...previousRect(), width: expected }) as DOMRect;

  const rect = dialog.getBoundingClientRect();
  // R3: width ≤ the cap AND ≥ the resolved min(candidate, cap).
  expect(rect.width).toBeLessThanOrEqual(capPx);
  expect(rect.width).toBeGreaterThanOrEqual(expected);
  expect(rect.width).toBeCloseTo(expected, 5);
}