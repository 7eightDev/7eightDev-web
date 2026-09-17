import { expect, test } from "@playwright/test";

/** Local dev origin — mirrors `playwright.config.ts` `BASE_URL`. */
const BASE_URL = "http://localhost:3000";

/**
 * MS-3.2 — protected-route auth contract.
 *
 * The two tests run on all 4 projects (the storageState is already replayed):
 * 1. Unauthenticated `/admin/leads` → redirect to `/sign-in` (the AUTH-REQUIRED
 *    behaviour MS-1.3 detected as a banner, now asserted explicitly).
 * 2. Authenticated `/admin/leads` renders the admin product per viewport.
 */
test.describe("route protette /admin (Clerk)", () => {
  test("senza sessione /admin/leads reindirizza a /sign-in (AUTH-REQUIRED)", async ({
    browser,
  }) => {
    // Fresh context on purpose: explicit empty storageState overrides the
    // project's `use.storageState` (Playwright merges it into newContext), so
    // the Clerk proxy actually strips us.
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/leads`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/\/sign-in/);
    // The embedded Clerk <SignIn /> actually rendered (Clerk sets its own
    // document.title, so assert the visible sign-in heading instead).
    await expect(
      page.getByRole("heading", { level: 1, name: /7eight/i })
    ).toBeVisible();
    await context.close();
  });

  test("admin/leads carica autenticato in ogni project (no AUTH-REQUIRED)", async ({
    page,
  }) => {
    await page.goto("/admin/leads", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page).toHaveTitle(/Admin — 7eightDev/);

    // The protected product is actually there: leads toolbar heading.
    await expect(
      page.getByRole("heading", { level: 1, name: "Lead" })
    ).toBeVisible();

    // AdminHeader nav contract (R2): desktop nav ≥1024, hamburger <1024.
    const width = page.viewportSize()?.width ?? 1280;
    const hamburger = page.getByRole("button", { name: "Apri il menu" });
    if (width >= 1024) {
      await expect(hamburger).toBeHidden();
      await expect(
        page
          .getByRole("navigation")
          .getByRole("link", { name: "Lead", exact: true })
      ).toBeVisible();
    } else {
      await expect(hamburger).toBeVisible();
    }
  });
});