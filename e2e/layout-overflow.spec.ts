import { expect, test } from "@playwright/test";
import { DEVICE_PROFILES } from "../presentation/lib/breakpoints";
import { expectNoHorizontalOverflow } from "./helpers/layout";

/**
 * MS-3.4 — assert di layout globali su tutte le pagine admin mirate.
 *
 * Iterazione pagine × viewport: nessun elemento interattivo dentro `<main>`
 * tracima la viewport (boundingBox.x ≥ 0, x+width ≤ viewportWidth) e `main`
 * non scrolla orizzontalmente (scrollWidth ≤ clientWidth) — i segnali esatti
 * del bug reale MS-1.4 (toolbar quote a tablet).
 *
 * - Le larghezze vengono da DEVICE_PROFILES (unico punto di verità), le
 *   altezze sono la convenzione roadmap (800/1024/667); mai hard-coded nel
 *   dettaglio, vedi playwright.config.ts.
 * - Le navigation usano `waitUntil: "commit"` ovunque: su Mobile Safari
 *   `domcontentloaded` non risolve mai su /admin/quotes (MS-3.3), quindi
 *   l'attesa vera la fanno gli `expect` subito dopo.
 * - Pagaia di triage MS-1.4: la pagina `?status=` dei LEAD è un falso
 *   positivo confermato (riga filtri LeadFilterBar compressa da
 *   flex-shrink) → qui NON si asserisce alcun overflow, solo il contratto
 *   DOM (`flex-nowrap` + `shrink-0`, blocco dedicato in fondo). La pagina
 *   `?status=` dei PREVENTIVI invece è sicura (QuoteFilterBar è il fix
 *   MS-1.4 regredito in MS-3.3) ed è inclusa nella scansione completa.
 */

// Altezze convenzione roadmap — le larghezze vengono da DEVICE_PROFILES.
const DESKTOP_HEIGHT = 800;
const TABLET_HEIGHT = 1024;
const MOBILE_HEIGHT = 667;

const VIEWPORTS = [
  { name: "mobile", width: DEVICE_PROFILES.mobile, height: MOBILE_HEIGHT },
  { name: "tablet", width: DEVICE_PROFILES.tablet, height: TABLET_HEIGHT },
  { name: "desktop", width: DEVICE_PROFILES.desktop, height: DESKTOP_HEIGHT },
] as const;

/** Pagine coperte dalla scansione completa di `<main>` (root default). */
const PAGES_FULL_SCAN = [
  { path: "/admin/quotes", label: "quote list", h1: "Preventivi" },
  {
    path: "/admin/quotes?status=rejected",
    label: "quote list filtrata (risultati rifiutati)",
    h1: "Preventivi",
  },
  { path: "/admin/leads", label: "lead list", h1: "Lead" },
  {
    path: "/admin/quotes/new",
    label: "nuovo preventivo (composer)",
    h1: "Nuovo preventivo",
    // Il composer è un client component: l'h1 è server, per scansionare la
    // pagina completa serve un landmark del form idratato.
    composerAnchor: "Cliente & progetto",
  },
] as const;

for (const pageDef of PAGES_FULL_SCAN) {
  test.describe(`layout-overflow — ${pageDef.label}`, () => {
    for (const vp of VIEWPORTS) {
      test(`${vp.name} ${vp.width}×${vp.height} — nessun elemento tracima la viewport`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageDef.path, { waitUntil: "commit" });

        await expect(
          page.getByRole("heading", { level: 1, name: pageDef.h1 })
        ).toBeVisible();

        if ("composerAnchor" in pageDef && pageDef.composerAnchor) {
          await expect(
            page.getByRole("heading", { level: 2, name: pageDef.composerAnchor })
          ).toBeVisible();
        }

        await expectNoHorizontalOverflow(page, {
          label: `main di ${pageDef.path}`,
        });
      });
    }
  });
}

/**
 * Pagaia di triage MS-1.4: la pagina risultati `/admin/leads?status=qualified`
 * è il falso positivo confermato (i `w-[170px]` dei select vengono compressi
 * da flex-shrink, riga 328px ≤ 343px). Niente assert di overflow: solo il
 * contratto DOM della riga (`flex-nowrap`) e del clear (`shrink-0`).
 */
test.describe("layout-overflow — triage MS-1.4: /admin/leads?status=qualified (contratto DOM)", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} ${vp.width}×${vp.height} — riga filtri flex-nowrap + clear shrink-0`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
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
  }
});

/**
 * MS-5.2 — estensione della matrice overflow `<main>` al composer in MODIFICA
 * (la rotta `/admin/quotes/new` è già coperta in `PAGES_FULL_SCAN`). L'id della
 * bozza è volatile (dati live/fixture), quindi si apre la prima bozza dalla
 * lista filtrata `?status=draft` e si scansiona poi ai 3 viewport canonici.
 * Stesso contratto del resto della suite: `waitUntil:"commit"` (trap WebKit
 * MS-3.3), attese su h1 reali e `not.toHaveURL(/sign-in/)`.
 */
test.describe("layout-overflow — QuoteComposer in modifica (MS-5.2)", () => {
  test("apre la prima bozza e scansiona main ai 3 viewport canonici", async ({
    page,
  }) => {
    await page.goto("/admin/quotes?status=draft", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Preventivi" })
    ).toBeVisible();
    await expect(page).not.toHaveURL(/sign-in/);

    // Il link "Modifica la bozza" vive nel cluster `inert`/opacity-0 delle
    // azioni di riga (rubrica MS-1.3 "interni clipati → soppressi", NON un
    // overflow): resta però nel DOM, quindi l'href è leggibile senza aprire
    // il toggle — la rotta edit è ciò che serve alla scansione di `<main>`.
    const editHref = await page
      .locator('a[href$="/edit"]')
      .first()
      .getAttribute("href");
    expect(editHref, "la lista bozze deve esporre almeno un link di modifica").toBeTruthy();

    await page.goto(editHref!, { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Modifica preventivo" })
    ).toBeVisible();
    await expect(page).not.toHaveURL(/sign-in/);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await expectNoHorizontalOverflow(page, {
        label: `main di ${editHref} (${vp.name} ${vp.width})`,
      });
    }
  });
});