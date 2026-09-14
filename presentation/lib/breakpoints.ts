/**
 * Canonical viewport breakpoints — single source of truth for responsive
 * layout AND responsive testing across the app.
 *
 * `sm` … `2xl` mirror the Tailwind v4 defaults (CSS token `--breakpoint-*`).
 * `cardStack` (820px) is the app-specific switch below which data-dense
 * surfaces (LeadTable, quotes list) collapse from fixed-width tables into
 * stacked card grids. It is registered in Tailwind via `@theme` ->
 * `--breakpoint-820` in `app/globals.css`, so any future class can use the
 * named `max-820:` / `min-820:` variants.
 *
 * Tests and Playwright projects import these values instead of hard-coding
 * pixel numbers, so the matrix is never duplicated.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  /** App-specific switch: below this, dense tables collapse into card stacks. */
  cardStack: 820,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

/** Playwright device/viewport profiles used for the E2E + visual projects. */
export const DEVICE_PROFILES = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
} as const;

export type DeviceProfile = keyof typeof DEVICE_PROFILES;

/**
 * Test-only boundaries required by the responsive test matrix but NOT part of
 * the Tailwind theme (so they cannot become named variants like `max-820:`).
 * They are flip targets for the E2E boundary tests; component classes must not
 * reference them. Add an entry here (never inside `BREAKPOINTS`, which mirrors
 * the theme) whenever the censimento surfaces another ad-hoc flip.
 */
export const TEST_BOUNDARIES = {
  /**
   * Catalog list ad-hoc flip `max-[680px]:grid-cols-1`
   * (`app/(private)/admin/catalog/page.tsx:80`) on the `[1fr_auto_auto]` grid.
   * Sits between `sm` (640) and `cardStack` (820): normalizing it to either
   * token would move the flip 40–140px and change the rendered layout, so it
   * stays a dedicated test boundary (679/681). Candidate for app-side
   * tokenization if the grid is ever refactored.
   */
  catalogGridFlip: 680,
} as const;

export type TestBoundaryName = keyof typeof TEST_BOUNDARIES;

/** Media-query string builder: used by unit tests (matchMedia emulation). */
export function mqMin(px: number): string {
  return `(min-width: ${px}px)`;
}

/** Media-query string builder: used by unit tests (matchMedia emulation). */
export function mqMax(px: number): string {
  return `(max-width: ${px}px)`;
}