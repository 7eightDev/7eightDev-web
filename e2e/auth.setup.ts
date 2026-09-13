import { join } from "node:path";
import { expect, test as setup, chromium } from "@playwright/test";

/**
 * Auth bridge (MS-3.2): lifts the Clerk admin session into a storageState so
 * every Playwright project (Desktop/Tablet/Mobile Safari/Mobile Chrome) starts
 * authenticated — replacing MS-1.3's per-run persistent-profile workaround.
 *
 * Google OAuth is a manual one-time step, so the session still lives in the
 * persistent Chromium profile created by `scripts/ghost-scroll-audit.mjs
 * --login`. This setup project opens that profile headlessly, confirms the
 * session is accepted (no redirect to /sign-in), and snapshots it into
 * `.e2e/storage-state/fullAdmin.json`. The empirical MS-3.2 verification
 * decides whether Clerk dev honours the storageState round-trip.
 */

const ROOT = join(__dirname, "..");
const PROFILE_DIR = process.env.E2E_AUTH_PROFILE ?? join(ROOT, ".e2e", "ghost-scroll-profile");
const STORAGE_STATE = join(ROOT, ".e2e", "storage-state", "fullAdmin.json");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

setup("capture Clerk admin session into storageState", async () => {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${BASE_URL}/admin/leads`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // The Clerk proxy either serves /admin/* or redirects to /sign-in — that
    // redirect is the AUTH-REQUIRED banner of MS-1.3 made explicit.
    await page.waitForURL(/\/admin\/|\/sign-in/, { timeout: 30_000 });
    expect(
      new URL(page.url()).pathname,
      [
        `Nessuna sessione Clerk nel profilo persistente (${PROFILE_DIR.replace(ROOT, "")}).`,
        "Esegui una tantum: node scripts/ghost-scroll-audit.mjs --login",
        "(login Google OAuth manuale) e riprova.",
      ].join(" ")
    ).toMatch(/^\/admin\//);

    // Wait for the admin product to actually render (filters toolbar h1) so a
    // client-side bounce to sign-in cannot slip past the URL check.
    await page
      .getByRole("heading", { level: 1, name: "Lead" })
      .waitFor({ timeout: 20_000 });

    // Let Clerk settle/rotate its cookies on the localhost origin first.
    await page.waitForTimeout(1500);
    await context.storageState({ path: STORAGE_STATE });
  } finally {
    await context.close();
  }
});