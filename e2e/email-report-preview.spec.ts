import { expect, test, type Page } from "@playwright/test";
import { BREAKPOINTS, DEVICE_PROFILES } from "../presentation/lib/breakpoints";
import { expectNoHorizontalOverflow } from "./helpers/layout";

/**
 * MS-5.5 — Email + Lead report preview responsive matrix (P1).
 *
 * Copre il flip condiviso censito in MA-5 verso
 * `presentation/features/admin/email-preview-panel.tsx` (r.84) e
 * `presentation/features/admin/leads/lead-report-preview-panel.tsx` (r.104):
 *  - grid `grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px]`: stacked
 *    sotto lg, 3 colonne (scenario 280px + preview fluida + test-send 320px)
 *    da lg — flip esatto a 1023/1025 su `BREAKPOINTS.lg` (computed
 *    `gridTemplateColumns`, mai solo-classi);
 *  - pagine `app/(private)/admin/email/page.tsx` (dev-only: 404 in prod via
 *    gate `NODE_ENV`, qui dev-server → renderizza) e
 *    `app/(private)/admin/leads/report/page.tsx` (raggiungibile ovunque):
 *    entrambe `Container max-w-[1440px] py-4 lg:h-full lg:flex lg:flex-col`
 *    con h1 + pannello client;
 *  - view toggle senza screenshot (HTML/iframe volatile dal DB/template):
 *    email `html` (iframe "Anteprima email") vs `text` (pre);
 *    report `email` (iframe "Anteprima email") / `report` (iframe
 *    "Anteprima report PDF") / `text` (pre);
 *  - contratto DOM stabile: scenario selector + "Oggetto" + input test-send
 *    `placeholder="destinatario@esempio.com"` + bottone "Invia test →"
 *    (report: anche link "Scarica PDF ↗" + "Report del …");
 *  - `<main>` senza overflow ai 3 viewport canonici (helper MS-3.4).
 *
 * Vincoli roadmap: `waitUntil:"commit"` sulle navigation (trap WebKit MS-3.3),
 * larghezze sempre da `DEVICE_PROFILES`/`BREAKPOINTS` (mai hard-coded), ogni
 * test admin termina con `not.toHaveURL(/sign-in/)`, NIENTE screenshot
 * (markup email/report volatile).
 */

const HEIGHT = 800;
const TABLET_HEIGHT = 1024;
const MOBILE_HEIGHT = 667;

const lgMinus = BREAKPOINTS.lg - 1;
const lgPlus = BREAKPOINTS.lg + 1;

const PANEL_GRID = '[class~="lg:grid-cols-[280px_minmax(0,1fr)_320px]"]';

/** Pagina email: viewport + goto + h1 + guardia anti-bounce Clerk. */
async function gotoEmail(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/admin/email", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Anteprima email" })
  ).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);
}

/** Pagina report: viewport + goto + h1 + guardia anti-bounce Clerk. */
async function gotoReport(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/admin/leads/report", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Anteprima report lead" })
  ).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);
}

const colCount = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length
  );

test.describe("Email preview — flip lg 3-col + view (MS-5.5)", () => {
  test("flip esatto 1023 (stacked) vs 1025 (280px/1fr/320px)", async ({
    page,
  }) => {
    await gotoEmail(page, lgMinus, HEIGHT);

    const panel = page.locator(PANEL_GRID).first();
    await expect(panel).toBeVisible();
    await expect.poll(() => colCount(page, PANEL_GRID)).toBe(1);

    await page.setViewportSize({ width: lgPlus, height: HEIGHT });
    await expect.poll(() => colCount(page, PANEL_GRID)).toBe(3);

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("contratto DOM: scenario + oggetto + toggle html/text + invio test", async ({
    page,
  }) => {
    await gotoEmail(page, DEVICE_PROFILES.desktop, HEIGHT);

    // Left: scenario selector + subject card.
    await expect(page.getByText("Scenario", { exact: true })).toBeVisible();
    await expect(page.getByText("Oggetto", { exact: true })).toBeVisible();

    // Center: default html → iframe, toggle text → pre (guardia MS-3.3: il
    // toggle client può perdere il click pre-hydration/remount).
    const frame = page.getByTitle("Anteprima email");
    await expect(frame).toBeVisible();
    await expect(async () => {
      await page.getByRole("button", { name: /^text$/i }).click();
      await expect(page.locator("main pre").first()).toBeVisible();
    }).toPass({ timeout: 15_000 });
    await expect(frame).toBeHidden();
    await page.getByRole("button", { name: /^html$/i }).click();
    await expect(frame).toBeVisible();

    // Right: invio di test (input + bottone, mai cliccato: Resend reale).
    await expect(
      page.getByPlaceholder("destinatario@esempio.com")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Invia test/ })
    ).toBeVisible();

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("main senza overflow ai 3 viewport canonici (helper layout)", async ({
    page,
  }) => {
    await gotoEmail(page, DEVICE_PROFILES.desktop, HEIGHT);
    await expectNoHorizontalOverflow(page, {
      label: `email preview (desktop ${DEVICE_PROFILES.desktop})`,
    });

    await page.setViewportSize({
      width: DEVICE_PROFILES.tablet,
      height: TABLET_HEIGHT,
    });
    await expectNoHorizontalOverflow(page, {
      label: `email preview (tablet ${DEVICE_PROFILES.tablet})`,
    });

    await page.setViewportSize({
      width: DEVICE_PROFILES.mobile,
      height: MOBILE_HEIGHT,
    });
    await expectNoHorizontalOverflow(page, {
      label: `email preview (mobile ${DEVICE_PROFILES.mobile})`,
    });

    await expect(page).not.toHaveURL(/sign-in/);
  });
});

test.describe("Lead report preview — flip lg 3-col + view (MS-5.5)", () => {
  test("flip esatto 1023 (stacked) vs 1025 (280px/1fr/320px)", async ({
    page,
  }) => {
    await gotoReport(page, lgMinus, HEIGHT);

    const panel = page.locator(PANEL_GRID).first();
    await expect(panel).toBeVisible();
    await expect.poll(() => colCount(page, PANEL_GRID)).toBe(1);

    await page.setViewportSize({ width: lgPlus, height: HEIGHT });
    await expect.poll(() => colCount(page, PANEL_GRID)).toBe(3);

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("contratto DOM: email/report/text + scarica PDF", async ({ page }) => {
    await gotoReport(page, DEVICE_PROFILES.desktop, HEIGHT);

    await expect(page.getByText("Scenario", { exact: true })).toBeVisible();
    await expect(page.getByText("Oggetto", { exact: true })).toBeVisible();

    // Default email → iframe "Anteprima email".
    await expect(page.getByTitle("Anteprima email")).toBeVisible();

    // Guardia MS-3.3 sui toggle client (click perso pre-hydration/remount).
    await expect(async () => {
      await page.getByRole("button", { name: "Report PDF" }).click();
      await expect(page.getByTitle("Anteprima report PDF")).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await expect(async () => {
      await page.getByRole("button", { name: "Testo" }).click();
      await expect(page.locator("main pre").first()).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await page.getByRole("button", { name: "Email" }).click();
    await expect(page.getByTitle("Anteprima email")).toBeVisible();

    // Right: invio test + download PDF reale (href, mai cliccato).
    await expect(
      page.getByPlaceholder("destinatario@esempio.com")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Invia test/ })
    ).toBeVisible();
    const pdf = page.getByRole("link", { name: /Scarica PDF/ });
    await expect(pdf).toBeVisible();
    await expect(pdf).toHaveAttribute("href", /\/admin\/leads\/report\/pdf\?/);
    await expect(page.getByText(/Report del /)).toBeVisible();

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("main senza overflow ai 3 viewport canonici (helper layout)", async ({
    page,
  }) => {
    await gotoReport(page, DEVICE_PROFILES.desktop, HEIGHT);
    await expectNoHorizontalOverflow(page, {
      label: `report preview (desktop ${DEVICE_PROFILES.desktop})`,
    });

    await page.setViewportSize({
      width: DEVICE_PROFILES.tablet,
      height: TABLET_HEIGHT,
    });
    await expectNoHorizontalOverflow(page, {
      label: `report preview (tablet ${DEVICE_PROFILES.tablet})`,
    });

    await page.setViewportSize({
      width: DEVICE_PROFILES.mobile,
      height: MOBILE_HEIGHT,
    });
    await expectNoHorizontalOverflow(page, {
      label: `report preview (mobile ${DEVICE_PROFILES.mobile})`,
    });

    await expect(page).not.toHaveURL(/sign-in/);
  });
});
