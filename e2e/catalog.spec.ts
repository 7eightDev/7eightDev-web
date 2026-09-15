import { expect, test, type Page } from "@playwright/test";
import {
  BREAKPOINTS,
  DEVICE_PROFILES,
  TEST_BOUNDARIES,
} from "../presentation/lib/breakpoints";
import { expectNoHorizontalOverflow } from "./helpers/layout";

/**
 * MS-5.4 — Catalog list + form responsive matrix (P1).
 *
 * Copre i flip censiti in MA-5 verso `app/(private)/admin/catalog/page.tsx` e
 * `presentation/features/admin/catalog-item-form.tsx`:
 *  - list grid `grid-cols-[1fr_auto_auto] max-[680px]:grid-cols-1` (r.80):
 *    flip ad-hoc a 680 (boundary di test `TEST_BOUNDARIES.catalogGridFlip`,
 *    NON un token Tailwind) → 679 una colonna, 681 tre colonne;
 *  - bottone "+ Nuova voce" double-label (r.47-50): `w-9 h-9` con "+" `sm:hidden`
 *    sotto sm, `sm:w-auto` con label estesa `hidden sm:inline` da sm;
 *  - form `max-w-[680px]` con sezione `grid-cols-1 sm:grid-cols-2` (r.105/107):
 *    triage a 375 (una colonna, nessun overflow) + flip a sm (639/641);
 *  - range prezzo `grid-cols-2 max-w-[460px]` (r.193): fisso a 2 colonne anche
 *    a 375, dentro il cap — triage via helper overflow;
 *  - edit page via href harvestato dalla lista (pattern verde MS-5.2:
 *    `CatalogRowActions` espone `<a href="…/edit">` nel DOM, navigazione
 *    diretta `page.goto()` senza transizioni client-side → la trappola
 *    suffixed-cookie Clerk di MS-3.4 non può rimbalzare a /sign-in).
 *
 * Vincoli roadmap: `waitUntil:"commit"` sulle navigation (trap WebKit MS-3.3),
 * larghezze sempre da `DEVICE_PROFILES`/`BREAKPOINTS`/`TEST_BOUNDARIES` (mai
 * hard-coded), ogni test admin termina con `not.toHaveURL(/sign-in/)`,
 * NIENTE screenshot (dati catalogo live dal DB).
 */

const HEIGHT = 800;
const TABLET_HEIGHT = 1024;
const MOBILE_HEIGHT = 667;

const smMinus = BREAKPOINTS.sm - 1;
const smPlus = BREAKPOINTS.sm + 1;
const gridMinus = TEST_BOUNDARIES.catalogGridFlip - 1;
const gridPlus = TEST_BOUNDARIES.catalogGridFlip + 1;

/** Lista catalogo: viewport + goto + h1 + guardia anti-bounce Clerk. */
async function gotoCatalog(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/admin/catalog", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Catalogo servizi" })
  ).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);
}

/** Form new: viewport + goto + h1 + guardia anti-bounce Clerk. */
async function gotoCatalogNew(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/admin/catalog/new", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Nuova voce di catalogo" })
  ).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);
}

const colCount = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length
  );

test.describe("Catalog list — flip grid 680 + bottone + (MS-5.4)", () => {
  test("flip esatto 679 (1 col) vs 681 (3 col) sul boundary catalog", async ({
    page,
  }) => {
    await gotoCatalog(page, gridMinus, HEIGHT);

    const row = page.locator('[class~="max-[680px]:grid-cols-1"]').first();
    await expect(row).toBeVisible();
    await expect.poll(() => colCount(page, '[class~="max-[680px]:grid-cols-1"]')).toBe(1);

    await page.setViewportSize({ width: gridPlus, height: HEIGHT });
    await expect.poll(() => colCount(page, '[class~="max-[680px]:grid-cols-1"]')).toBe(3);

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("bottone +: icona sola a 375, label estesa da sm", async ({ page }) => {
    await gotoCatalog(page, DEVICE_PROFILES.mobile, MOBILE_HEIGHT);

    // L'accessible name segue il label visibile: "+" sotto sm (lo span
    // `hidden sm:inline` è display:none, fuori dall'a11y tree), "+ Nuova voce"
    // da sm. L'href è l'ancora stabile (l'empty-state ha lo stesso href ma
    // viene dopo nell'DOM — il first è l'header CTA).
    const cta = page.locator('a[href="/admin/catalog/new"]').first();
    await expect(cta).toBeVisible();
    // Sotto sm: pill quadrata w-9 h-9 con "+" e label estesa nascosta.
    await expect(cta.getByText("+", { exact: true })).toBeVisible();
    await expect(cta.getByText("+ Nuova voce")).toBeHidden();
    const mobileBox = await cta.boundingBox();
    expect(Math.round(mobileBox!.width), "CTA mobile è un quadrato w-9").toBe(
      Math.round(mobileBox!.height)
    );

    await page.setViewportSize({ width: smPlus, height: MOBILE_HEIGHT });
    await expect(cta.getByText("+ Nuova voce")).toBeVisible();
    await expect(cta.getByText("+", { exact: true })).toBeHidden();

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("main senza overflow ai 3 viewport canonici (helper layout)", async ({
    page,
  }) => {
    await gotoCatalog(page, DEVICE_PROFILES.desktop, HEIGHT);
    await expectNoHorizontalOverflow(page, {
      label: `catalog list (desktop ${DEVICE_PROFILES.desktop})`,
    });

    await page.setViewportSize({
      width: DEVICE_PROFILES.tablet,
      height: TABLET_HEIGHT,
    });
    await expectNoHorizontalOverflow(page, {
      label: `catalog list (tablet ${DEVICE_PROFILES.tablet})`,
    });

    await page.setViewportSize({
      width: DEVICE_PROFILES.mobile,
      height: MOBILE_HEIGHT,
    });
    await expectNoHorizontalOverflow(page, {
      label: `catalog list (mobile ${DEVICE_PROFILES.mobile})`,
    });

    await expect(page).not.toHaveURL(/sign-in/);
  });
});

test.describe("Catalog form new — triage 375 + flip sm (MS-5.4)", () => {
  test("sezione id/tier: 1 col a 375/639, 2 col a 641; range 2 col fisse", async ({
    page,
  }) => {
    await gotoCatalogNew(page, DEVICE_PROFILES.mobile, MOBILE_HEIGHT);

    // Container form `max-w-[680px]` (r.105): cap presente, mai più largo.
    const form = page.locator('[class~="max-w-[680px]"]').first();
    await expect(form).toBeVisible();
    const formBox = await form.boundingBox();
    expect(formBox!.width).toBeLessThanOrEqual(680);

    // Grid id/tier `grid-cols-1 sm:grid-cols-2` (r.107): 1 col sotto sm.
    const idTier = '[class~="grid-cols-1"][class~="sm:grid-cols-2"]';
    await expect.poll(() => colCount(page, idTier)).toBe(1);

    await page.setViewportSize({ width: smMinus, height: MOBILE_HEIGHT });
    await expect.poll(() => colCount(page, idTier)).toBe(1);
    await page.setViewportSize({ width: smPlus, height: MOBILE_HEIGHT });
    await expect.poll(() => colCount(page, idTier)).toBe(2);

    // Range prezzo `grid-cols-2 max-w-[460px]` (r.193): rivelato dal pill
    // "Range", resta a 2 colonne fisse anche a 375 (triage: cap 460px).
    await page.setViewportSize({
      width: DEVICE_PROFILES.mobile,
      height: MOBILE_HEIGHT,
    });
    const range = page.locator('[class~="max-w-[460px]"]').first();
    // Guardia MS-3.3 (il setViewportSize può rimontare il client component e
    // staccare i listener): riprova finché la grid range non monta.
    await expect(async () => {
      await page.getByRole("button", { name: "Range", exact: true }).click();
      await expect(range).toBeVisible();
    }).toPass({ timeout: 15_000 });
    await expect
      .poll(() => colCount(page, '[class~="max-w-[460px]"]'))
      .toBe(2);
    const rangeBox = await range.boundingBox();
    expect(rangeBox!.width).toBeLessThanOrEqual(460);

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("main senza overflow a 375 con form completo + range aperto", async ({
    page,
  }) => {
    await gotoCatalogNew(page, DEVICE_PROFILES.mobile, MOBILE_HEIGHT);
    // Guardia MS-3.3 (click perso pre-hydration: l'h1 è server-rendered, il
    // pill client può non avere ancora il listener): riprova finché la grid
    // range non monta.
    const range = page.locator('[class~="max-w-[460px]"]').first();
    await expect(async () => {
      await page.getByRole("button", { name: "Range", exact: true }).click();
      await expect(range).toBeVisible();
    }).toPass({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page, {
      label: `catalog new (mobile ${DEVICE_PROFILES.mobile}, range aperto)`,
    });
    await expect(page).not.toHaveURL(/sign-in/);
  });
});

test.describe("Catalog edit — harvest href dalla lista (MS-5.4)", () => {
  test("edit monta lo stesso form max-w-[680px], h1 Modifica voce", async ({
    page,
  }) => {
    await gotoCatalog(page, DEVICE_PROFILES.desktop, HEIGHT);

    // Pattern verde MS-5.2: link "Modifica …" nel DOM → navigazione diretta.
    const editHref = await page
      .locator('a[href*="/admin/catalog/"][href$="/edit"]')
      .first()
      .getAttribute("href");
    expect(editHref, "la lista deve esporre almeno un link di modifica").toBeTruthy();

    await page.goto(editHref!, { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Modifica voce" })
    ).toBeVisible();
    await expect(page).not.toHaveURL(/sign-in/);

    const form = page.locator('[class~="max-w-[680px]"]').first();
    await expect(form).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Salva modifiche/ })
    ).toBeVisible();
    // In edit l'id è immutabile: input disabilitato (contratto DOM r.111-116).
    const idInput = page.getByPlaceholder("es. landing-page");
    await expect(idInput).toBeDisabled();

    await expectNoHorizontalOverflow(page, {
      label: `catalog edit (desktop ${DEVICE_PROFILES.desktop})`,
    });
    await expect(page).not.toHaveURL(/sign-in/);
  });
});
