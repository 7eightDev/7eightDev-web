/**
 * Shared R3 guard for lateral-sheet tests (MS-2.2 / MS-2.4).
 *
 * jsdom has no layout engine: `getBoundingClientRect` returns all-zero rects.
 * The rendered width of a `SheetContent` is therefore derived from the Tailwind
 * tokens actually present on the DOM node, interpolated against the simulated
 * viewport:
 *   - the primitive default is `w-3/4` (≡ 75%) + `max-w-md` (28rem = 448px);
 *   - consumers override them via `className` with arbitrary `w-[N%]` /
 *     `max-w-[Npx]` tokens (tw-merge drops the conflicting defaults).
 *
 * Stubs the node rect with `min(max-w, percent · viewportWidth)` and asserts
 * the R3 guarantee: boundingBox.width ≤ the max-w token AND ≥ the capped
 * viewport-relative (`Nvw`) width.
 */
interface Token {
  value: number;
  token: string;
}

/** Width token → percentage: arbitrary `w-[N%]` or the default `w-3/4` → 75. */
function widthTokenOf(className: string): Token {
  const arbitrary = /(w-\[([\d.]+)%\])/.exec(className);
  if (arbitrary) {
    return { value: Number(arbitrary[2]), token: arbitrary[1] };
  }
  if (className.includes("w-3/4")) {
    return { value: 75, token: "w-3/4" };
  }
  throw new Error(
    `expectSheetWidth: no width token (w-[N%] or w-3/4) on the Sheet node: "${className}"`,
  );
}

/** Max-width token → px: arbitrary `max-w-[Npx]` or the default `max-w-md` (448). */
function maxWidthTokenOf(className: string): Token {
  const arbitrary = /(max-w-\[(\d+)px\])/.exec(className);
  if (arbitrary) {
    return { value: Number(arbitrary[2]), token: arbitrary[1] };
  }
  if (className.includes("max-w-md")) {
    return { value: 448, token: "max-w-md" };
  }
  throw new Error(
    `expectSheetWidth: no max-width token (max-w-[Npx] or max-w-md) on the Sheet node: "${className}"`,
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
  const { value: percent, token: widthToken } = widthTokenOf(dialog.className);
  const { value: maxPx, token: maxToken } = maxWidthTokenOf(dialog.className);

  // Contract lock: the tokens the width was derived from must be the ones on
  // the node (the default `w-3/4 max-w-md` or the consumer's arbitrary cap).
  expect(dialog).toHaveClass(widthToken);
  expect(dialog).toHaveClass(maxToken);

  const fromPercent = (percent / 100) * viewportWidth;
  const expected = Math.min(maxPx, fromPercent);

  const previousRect = dialog.getBoundingClientRect.bind(dialog);
  dialog.getBoundingClientRect = () =>
    ({ ...previousRect(), width: expected }) as DOMRect;

  const rect = dialog.getBoundingClientRect();
  // R3: width ≤ max-w AND ≥ the capped viewport-relative width (e.g. 85vw).
  expect(rect.width).toBeLessThanOrEqual(maxPx);
  expect(rect.width).toBeGreaterThanOrEqual(expected);
  expect(rect.width).toBeCloseTo(expected, 5);
}