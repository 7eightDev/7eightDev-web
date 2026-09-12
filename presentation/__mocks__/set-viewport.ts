/**
 * Test helpers for responsive component tests (MS-2.x).
 *
 * Thin wrappers over the singleton `matchMedia` mock (./match-media.ts):
 * - `setViewport(width)` — re-exported, simulates a live resize.
 * - `renderAt(width, ui)` — RTL wrapper that sets the viewport *before* render,
 *   so the component mounts already in the target breakpoint state
 *   (e.g. `renderAt(375, <LeadTable ... />)` mounts the mobile card grid).
 *
 * Preferred import for tests: `@/presentation/__mocks__/set-viewport`.
 */
import { render } from "@testing-library/react";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { cleanupMatchMediaMock, setViewport } from "./match-media";

export { cleanupMatchMediaMock, setViewport };

/** Render `ui` after forcing the given simulated viewport width. */
export function renderAt(
  width: number,
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  setViewport(width);
  return render(ui, options);
}