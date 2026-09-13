import { expect, test, type Page } from "@playwright/test";
import { DEVICE_PROFILES } from "../presentation/lib/breakpoints";

// Altezze convenzione roadmap (800/1024/667) — le larghezze vengono da
// DEVICE_PROFILES (unico punto di verità), mai hard-coded.
const DESKTOP_HEIGHT = 800;
const TABLET_HEIGHT = 1024;
const MOBILE_HEIGHT = 667;

/**
 * Nessun elemento visibile del toolbar deve uscire dalla viewport
 * (boundingBox.x ≥ 0 e box.x + box.width ≤ viewportWidth) e `main` non deve
 * scrollare orizzontalmente. È il segnale esatto del bug reale MS-1.4:
 * a tablet 768×1024 la toolbar QuoteFilterBar era 892px su 689 disponibili
 * e `main` rendeva scrollbar orizzontale (scrollW 924 > clientW 753).
 */
async function expectToolbarWithinViewport(page: Page) {
  await expect(
    page.getByRole("toolbar", { name: "Filtri preventivi" })
  ).toBeVisible();

  const report = await page.evaluate(() => {
    const toolbar = document.querySelector(
      '[role="toolbar"][aria-label="Filtri preventivi"]'
    );
    if (!toolbar) {
      return {
        toolbarFound: false as const,
        mainScrollOk: null,
        offenders: [] as string[],
      };
    }
    const vw = document.documentElement.clientWidth;
    const offenders: string[] = [];
    toolbar
      .querySelectorAll<HTMLElement>("button, a, select, [role='checkbox']")
      .forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (rect.left < -0.5 || rect.right > vw + 0.5) {
          offenders.push(
            `<${el.tagName.toLowerCase()}> left=${rect.left.toFixed(
              1
            )} right=${rect.right.toFixed(1)} vw=${vw}`
          );
        }
      });
    const main = document.querySelector("main");
    return {
      toolbarFound: true as const,
      mainScrollOk: main ? main.scrollWidth <= main.clientWidth : false,
      offenders,
    };
  });

  expect(
    report.toolbarFound,
    "la toolbar 'Filtri preventivi' deve esistere su /admin/quotes"
  ).toBe(true);
  expect(
    report.mainScrollOk,
    "main non deve scrollare orizzontalmente (bug MS-1.4)"
  ).toBe(true);
  expect(report.offenders, "nessun elemento del toolbar tracima il viewport").toEqual(
    []
  );
}

/**
 * MS-3.3 — QuoteFilterBar dopo il fix del triage MS-1.4:
 * cluster secondario inline SOLO da lg (`hidden lg:flex`), popover trigger
 * sotto lg (`lg:hidden`). A tablet quindi il popover "Altri filtri" è il
 * trigger, il cluster inline non c'è e niente tracima.
 *
 * Le navigation usano `waitUntil: "commit"`: su WebKit (Mobile Safari)
 * `domcontentloaded` non risolve mai su /admin/quotes (page reale, streaming
 * Next + pagina pesante) pur avendo il DOM completo — l'attesa vera la fanno
 * gli `expect` subito dopo.
 */
test.describe("QuoteFilterBar: toolbar senza overflow a tablet (fix MS-1.4)", () => {
  test("tablet 768×1024 — trigger popover visibile, cluster inline assente, nessun overflow", async ({
    page,
  }) => {
    await page.setViewportSize({
      width: DEVICE_PROFILES.tablet,
      height: TABLET_HEIGHT,
    });
    await page.goto("/admin/quotes", { waitUntil: "commit" });

    await expect(page.getByRole("button", { name: "Altri filtri" })).toBeVisible();

    // Il cluster secondario è `hidden lg:flex`: sotto lg non è nell'a11y tree
    // (i bottoni "rifiutato"/"scaduto" inline vivono lì) e il popover non è
    // ancora montato, quindi non ci devono essere match. `exact` evita la
    // collisione con i bottoni riga "Segna il preventivo come rifiutato".
    await expect(
      page.getByRole("button", { name: "rifiutato", exact: true })
    ).toHaveCount(0);

    await expectToolbarWithinViewport(page);
  });

  test("desktop 1280 — cluster secondario inline con divider, trigger popover assente", async ({
    page,
  }) => {
    await page.setViewportSize({
      width: DEVICE_PROFILES.desktop,
      height: DESKTOP_HEIGHT,
    });
    await page.goto("/admin/quotes", { waitUntil: "commit" });

    await expect(
      page.getByRole("button", { name: "rifiutato", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Altri filtri", exact: true })
    ).toHaveCount(0);

    await expectToolbarWithinViewport(page);
  });

  test("mobile 375 — trigger popover visibile, cluster inline assente, nessun overflow", async ({
    page,
  }) => {
    await page.setViewportSize({
      width: DEVICE_PROFILES.mobile,
      height: MOBILE_HEIGHT,
    });
    await page.goto("/admin/quotes", { waitUntil: "commit" });

    await expect(page.getByRole("button", { name: "Altri filtri", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "rifiutato", exact: true })
    ).toHaveCount(0);

    await expectToolbarWithinViewport(page);
  });

  test("R5 — riga filtri LeadFilterBar: contratto flex-nowrap + clear shrink-0 (niente assert di overflow)", async ({
    page,
  }) => {
    // Il falso positivo MS-1.4 è CONFERMATO: i select w-[170px] vengono
    // compressi da flex-shrink, quindi non si asserisce l'overflow, solo il
    // contratto DOM della riga (flex-nowrap) e del clear (shrink-0).
    await page.setViewportSize({
      width: DEVICE_PROFILES.mobile,
      height: MOBILE_HEIGHT,
    });
    await page.goto("/admin/leads?status=qualified", {
      waitUntil: "commit",
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Lead" })
    ).toBeVisible();

    await expect(page.locator('[class*="flex-nowrap"]')).toHaveCount(1);
    await expect(
      page.getByRole("combobox", { name: "Filtro per stato audit" })
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Filtro per stato vendita" })
    ).toBeVisible();
    const clear = page.getByRole("button", { name: "Rimuovi filtri" });
    await expect(clear).toBeVisible();
    await expect(clear).toHaveClass(/shrink-0/);
  });
});