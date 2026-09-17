import { expect, test } from "@playwright/test";
import { BREAKPOINTS, DEVICE_PROFILES } from "../presentation/lib/breakpoints";

/**
 * MS-3.3 — AdminHeader nav responsiva (run su tutti e 4 i project, storageState
 * già replayato dal setup).
 *
 * R2: l'hamburger è visibile sotto lg (1024) — mobile 375 e tablet 768 — e
 *     nascosto su desktop, dove è la nav `<nav class="hidden lg:flex">` a
 *     prendere il posto.
 * R3: il Sheet nav è `w-[85%] max-w-[340px]`: width reale della dialog ≤ 340
 *     (e ≥ 0). La dialog ha l'accessible name dal SheetTitle sr-only
 *     "Menu di navigazione".
 */
test.describe("AdminHeader: hamburger + Sheet nav", () => {
  test("R2 — hamburger visibile < lg, nav desktop ≥ lg", async ({ page }) => {
    await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Lead" })
    ).toBeVisible();

    const width = page.viewportSize()?.width ?? DEVICE_PROFILES.desktop;
    const hamburger = page.getByRole("button", { name: "Apri il menu" });
    if (width >= BREAKPOINTS.lg) {
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

  test("Sheet nav — dialog 'Menu di navigazione', R3 ≤340, chiusura Escape", async ({
    page,
  }) => {
    await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
    const width = page.viewportSize()?.width ?? DEVICE_PROFILES.desktop;
    test.skip(
      width >= BREAKPOINTS.lg,
      "il Sheet nav esiste solo sotto lg (dove c'è l'hamburger)"
    );

    await expect(
      page.getByRole("heading", { level: 1, name: "Lead" })
    ).toBeVisible();

    // Guardia hydration: il click deve atterrare sul trigger già idratato, altrimenti
    // può andare perso (listener React non ancora attaccato) e il dialog non si
    // apre — verificato empiricamente, è l'unico flake di questo spec.
    const hamburger = page.getByRole("button", { name: "Apri il menu" });
    const dialog = page.getByRole("dialog", { name: "Menu di navigazione" });
    await expect(async () => {
      await hamburger.click();
      await expect(dialog).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });

    // R3 — contratto collaterale del Sheet: w-[85%] cap su max-w-[340px].
    const box = await dialog.boundingBox();
    expect(box, "il Sheet nav deve avere una bounding box").not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(0);
    // Tolleranza 1px per l'artefatto sub-pixel (a tablet dpr2 il cap
    // max-w-340 rende 340.0000305175781px).
    expect(box!.width).toBeLessThanOrEqual(340 + 1);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});