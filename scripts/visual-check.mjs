#!/usr/bin/env node
/**
 * Read-only visual regression check — MS-4.3 (responsive-ui-testing ROADMAP).
 *
 * Standalone Node ESM script (NOT a Jest/Playwright test). Runs the single
 * `e2e/screenshot-baselines.spec.ts` (9 canonical PNGs: 3 views × 3 canonical
 * projects) against the committed baselines WITHOUT `--update-snapshots`: it is
 * the quick read-only gate that FAILS on unintended pixel drift.
 *
 * Contrast with the deliberate pipeline:
 *
 *   npm run test:e2e       full Playwright gate (all specs, all 4 projects)
 *   npm run test:e2e:update  node scripts/update-snapshots.mjs  (deliberate
 *                          baseline regeneration — NEVER in normal runs/CI)
 *   npm run test:visual    this script (read-only, only the baseline spec)
 *
 * The 3 canonical `--project=` filters are generated HERE at runtime from
 * `DEVICE_PROFILES` (`presentation/lib/breakpoints.ts`) + the roadmap-convention
 * heights, mirroring the exact same constants that `playwright.config.ts` and
 * `scripts/update-snapshots.mjs` use — never hard-coded widths, no `--project=`
 * filters duplicated in `package.json`. `update-snapshots.mjs` is left untouched
 * (its own generator stays the single source for the update pipeline).
 *
 * Usage:
 *   node scripts/visual-check.mjs
 *
 * Exit code: the Playwright run's exit code (non-zero on any screenshot diff or
 * runtime failure).
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BREAKPOINTS_PATH = join(ROOT, "presentation/lib/breakpoints.ts");

/** Roadmap-convention heights — must mirror playwright.config.ts
 *  (DESKTOP_HEIGHT / TABLET_HEIGHT / MOBILE_SAFARI_HEIGHT) AND
 *  scripts/update-snapshots.mjs (CANONICAL_HEIGHTS). */
const CANONICAL_HEIGHTS = { desktop: 800, tablet: 1024, mobile: 667 };

function loadCanonicalProjectNames() {
  const source = readFileSync(BREAKPOINTS_PATH, "utf8");
  const match = source.match(
    /export const DEVICE_PROFILES\s*=\s*\{([\s\S]*?)\}\s*as const;/
  );
  if (!match) {
    throw new Error(
      `Cannot locate DEVICE_PROFILES in ${BREAKPOINTS_PATH} — did the source change?`
    );
  }
  const widths = {};
  for (const entry of match[1].matchAll(/([A-Za-z0-9_]+)\s*:\s*(\d+)/g)) {
    widths[entry[1]] = Number(entry[2]);
  }
  const missing = Object.keys(CANONICAL_HEIGHTS).filter((key) => !widths[key]);
  if (missing.length) {
    throw new Error(
      `Missing canonical DEVICE_PROFILES keys (${missing.join(", ")}) in ${BREAKPOINTS_PATH}`
    );
  }
  return [
    `Desktop ${widths.desktop}x${CANONICAL_HEIGHTS.desktop}`,
    `Tablet ${widths.tablet}x${CANONICAL_HEIGHTS.tablet}`,
    `Mobile Safari ${widths.mobile}x${CANONICAL_HEIGHTS.mobile}`,
  ];
}

const PROJECTS = loadCanonicalProjectNames();

console.log(
  "Visual check (READ-ONLY — committed baselines, no --update-snapshots):"
);
for (const name of PROJECTS) console.log(`  - ${name}`);

const result = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "e2e/screenshot-baselines.spec.ts",
    ...PROJECTS.map((name) => `--project=${name}`),
  ],
  { cwd: ROOT, stdio: "inherit" }
);

console.log(
  "\nRead-only run: any diff above means unintended pixel drift — inspect the\n" +
    "actual/expected/diff under test-results/ and triage. To deliberately refresh\n" +
    "the baselines against a stable DB use `npm run test:e2e:update` instead."
);

process.exit(result.status ?? 1);