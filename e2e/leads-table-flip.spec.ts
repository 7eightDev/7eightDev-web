import { expect, test } from "@playwright/test";
import { BREAKPOINTS } from "../presentation/lib/breakpoints";

/**
 * MS-3.3 — LeadTable flip tabella→card (R1) e sticky header (R6).
 *
 * R1: 820 è il flip esatto — a 819 è attivo il card grid
 *     `max-[820px]:grid` (la tabella `max-[820px]:hidden` è display:none,
 *     quindi fuori dall'a11y tree), a 821 torna la tabella desktop.
 * R6: lo sticky header (`sticky top-0 z-30` sul th) esiste solo nello stato
 *     tabella; in card view non c'è alcuna semantica columnheader.
 *
 * Il viewport viene cambiato dentro il test via page.setViewportSize: il flip
 * è guidato dalla media query, non dal device del project.
 */
test.describe("LeadTable: flip tabella→card (R1) + sticky header (R6)", () => {
  const HEIGHT = 800;

  test("R1 — a 819 è attivo il card grid, la tabella è assente", async ({
    page,
  }) => {
    await page.setViewportSize({
      width: BREAKPOINTS.cardStack - 1,
      height: HEIGHT,
    });
    await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Lead" })
    ).toBeVisible();

    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.locator("[class*='max-[820px]:grid']")).toBeVisible();
  });

  test("R1 — a 821 è attiva la tabella desktop, il card grid è nascosto", async ({
    page,
  }) => {
    await page.setViewportSize({
      width: BREAKPOINTS.cardStack + 1,
      height: HEIGHT,
    });
    await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Lead" })
    ).toBeVisible();

    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.locator("[class*='max-[820px]:grid']")
    ).toBeHidden();
  });

  test("R6 — sticky header solo in tabella desktop, assente in card view", async ({
    page,
  }) => {
    // Card view (<820): nessuna semantica tabella/columnheader.
    await page.setViewportSize({
      width: BREAKPOINTS.cardStack - 1,
      height: HEIGHT,
    });
    await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Lead" })
    ).toBeVisible();
    await expect(page.getByRole("columnheader")).toHaveCount(0);

    // Tabella desktop (821+): header sticky.
    await page.setViewportSize({
      width: BREAKPOINTS.cardStack + 1,
      height: HEIGHT,
    });
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader").first()).toHaveCSS(
      "position",
      "sticky"
    );
  });
});