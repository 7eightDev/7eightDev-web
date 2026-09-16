#!/usr/bin/env node
/**
 * Deliberate snapshot update pipeline — MS-4.2 (responsive-ui-testing ROADMAP).
 *
 * Standalone Node ESM script (NOT a Jest/Playwright test). Regenerates the
 * canonical baseline PNGs (9 canonici + 3 landing full-page) against a STABLE
 * database and reports what changed, WITHOUT auto-committing: the pipeline is
 * deliberate and human-in-the-loop.
 *
 * Context (MS-4.1, strategy (b)): `/admin/leads` and `/admin/quotes` render
 * live DB data, so each committed baseline in `e2e/screenshots/` is valid only
 * while the database content it was captured against stays stable. This script
 * is the conscious counterpart of that strategy.
 *
 *   WHEN to run it
 *     - after `npm run db:seed` / a Prisma migration (`npx prisma migrate dev`)
 *     - after any DELIBERATE visual change to the 3 canonical views
 *       (landing `/`, `/admin/leads`, `/admin/quotes`) or their styles
 *     - after manual DB edits that alter the rendered content
 *
 *   WHAT a diff on the PNGs means
 *     - diff after an intentional change = expected: review the byte delta from
 *       `git diff --stat`, then commit the new baselines deliberately
 *       (`git add e2e/screenshots/ && git commit -m "..."`)
 *     - diff when NOTHING was supposed to change = regression or data drift,
 *       NOT to be absorbed: the matcher already emits the pixel
 *       actual/expected/diff under `test-results/` — inspect and triage
 *     - NO diff on a clean run = determinism re-verified: the baselines are
 *       still valid against the stable DB
 *
 *   Why --update-snapshots NEVER belongs in a normal run (nor in CI)
 *     - update mode silently rewrites the committed baselines to whatever
 *       renders NOW: a regression would pass instead of failing
 *     - it turns the visual gate into a no-op — the whole point of a baseline
 *       is to FAIL on unintended drift
 *     - in CI it would additionally leave uncommitted rewrites in the
 *       workspace, diverging from the repo without any conscious review
 *
 * The canonical projects are derived at runtime from `DEVICE_PROFILES`
 * (`presentation/lib/breakpoints.ts`) + the roadmap-convention heights that
 * mirror the constants in `playwright.config.ts` — never hard-coded widths
 * (same philosophy as `scripts/ghost-scroll-audit.mjs`).
 *
 * Usage:
 *   node scripts/update-snapshots.mjs   # regenerate 9 baselines + report the diff
 *
 * Exit code: the Playwright run's exit code (non-zero on failure); the diff
 * report is printed either way so partial writes stay visible.
 */

import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BREAKPOINTS_PATH = join(ROOT, "presentation/lib/breakpoints.ts");
const SCREENSHOTS_DIR = "e2e/screenshots";

/** Roadmap-convention heights — must mirror playwright.config.ts
 *  (DESKTOP_HEIGHT / TABLET_HEIGHT / MOBILE_SAFARI_HEIGHT). */
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

function gitReport(relativeDir) {
  const diffStat = execSync(`git diff --stat -- ${relativeDir}`, {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  const porcelain = execSync(`git status --short -- ${relativeDir}`, {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  return { diffStat, porcelain };
}

/* ---------------------------------------------------------------------- *
 * 1. Regenerate.
 * ---------------------------------------------------------------------- */
console.log(
  "Updating screenshots against the STABLE database — canonical projects:"
);
for (const name of PROJECTS) console.log(`  - ${name}`);

const result = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    // Scope limitato alle sole baseline, come `visual-check.mjs`: il pipeline
    // di update NON deve ri-eseguire l'intera matrice E2E (spec admin/nav/
    // leakage), ma rigenerare soltanto i PNG canonici. Senza il filtro la
    // re-cattura in CI sul runner pieno è fragile (es. harvest fiber di
    // lead-detail sotto worker=1) e un fail estraneo blocca l'update.
    "e2e/screenshot-baselines.spec.ts",
    ...PROJECTS.map((name) => `--project=${name}`),
    "--update-snapshots",
  ],
  { cwd: ROOT, stdio: "inherit" }
);

/* ---------------------------------------------------------------------- *
 * 2. Report what changed (never auto-commit).
 * ---------------------------------------------------------------------- */
const exitCode = result.status ?? 1;
const { diffStat, porcelain } = gitReport(SCREENSHOTS_DIR);

console.log(`\n=== Baseline report: ${SCREENSHOTS_DIR} ===`);
if (exitCode !== 0) {
  console.log(
    "Playwright exited non-zero — baselines may be partial. Inspect the output above."
  );
} else if (!diffStat && !porcelain) {
  console.log(
    "No baseline file changed: the regenerated PNGs are byte-identical to the committed\n" +
      "ones — baselines are still deterministic against the stable DB. Nothing to commit."
  );
}

if (diffStat) {
  console.log("\nChanged tracked baseline PNGs (git diff --stat):");
  console.log(diffStat);
  console.log(
    "\nA diff on a run where you changed nothing = regression or data drift, not\n" +
      "something to absorb silently: inspect the matcher diff under test-results/ and triage."
  );
}
const untracked = porcelain
  .split("\n")
  .filter((line) => line.startsWith("??"));
if (untracked.length) {
  console.log("\nNew baseline files not tracked yet (git status --short):");
  console.log(untracked.join("\n"));
}

console.log(
  "\nBaselines were NOT committed (deliberate, human-in-the-loop step).\n" +
    "Review the delta above, then commit explicitly, e.g.:\n" +
    '  git add e2e/screenshots/ && git commit -m "test(responsive): update screenshot baselines"\n' +
    "The next normal run (`npm run test:e2e`) then validates the new baselines for real."
);

process.exit(exitCode);