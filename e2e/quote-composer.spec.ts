import { expect, test, type Page } from "@playwright/test";
import { BREAKPOINTS, DEVICE_PROFILES } from "../presentation/lib/breakpoints";

/**
 * MS-5.2 — QuoteComposer (new/edit) responsive matrix (P0).
 *
 * Copre i flip dell'interfaccia censiti in MA-5 verso
 * `presentation/features/admin/quote-composer.tsx`:
 *  - sidebar `grid-cols-1 lg:grid-cols-[1fr_340px]` (r.517/921): il `<aside
 *    hidden lg:flex sticky top-24>` è presente ≥lg (1280/1025), assente sotto
 *    lg (768/375/1023) — qui il footer mobile prende il posto del save;
 *  - sticky footer mobile `lg:hidden fixed bottom-0 … z-50` (r.1018): presente
 *    <lg, assente ≥lg;
 *  - bottoni step `hidden sm:*` (r.594/746/787/898): flip a sm−1/sm+1 (639/641);
 *  - catalogo collassabile mobile (r.607): toggle `lg:hidden` + card `w-[160px]`
 *    dentro un `overflow-x-auto` controllato (mai overflow sul `<main>`);
 *  - edit mode (bozza): sidebar "Salva modifiche" ≥lg, footer "Salva" <lg.
 *
 * Vincoli roadmap MS-5.2: `waitUntil:"commit"` sulle navigation (trap WebKit
 * MS-3.3), attese su h1/h2 reali, `not.toHaveURL(/sign-in/)`, NIENTE screenshot
 * (dati volatili: `defaultValidUntil()` = `new Date()`), larghezze sempre da
 * `DEVICE_PROFILES`/`BREAKPOINTS` (mai hard-coded), suite eseguita con
 * `dependencies` (mai `--no-deps`, vedi MS-3.5).
 */

const HEIGHT = 800;

// Flip esatti dai breakpoint canonici (mai numeri hard-coded).
const lgMinus = BREAKPOINTS.lg - 1;
const lgPlus = BREAKPOINTS.lg + 1;
const smMinus = BREAKPOINTS.sm - 1;
const smPlus = BREAKPOINTS.sm + 1;

const sidebar = (page: Page) => page.locator("main aside");
const mobileFooter = (page: Page) =>
  page.locator("main [class~='lg:hidden'][class~='fixed'][class~='bottom-0']");

/** Apre il composer new, attendendo l'h1 server + l'h2 client-rendered. */
async function openComposerNew(
  page: Page,
  viewport: { width: number; height: number }
) {
  await page.setViewportSize(viewport);
  await page.goto("/admin/quotes/new", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Nuovo preventivo" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Cliente & progetto" })
  ).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);
}

test.describe("QuoteComposer new — flip sidebar/footer a lg (MS-5.2)", () => {
  test("desktop — sidebar sticky presente, footer mobile assente", async ({
    page,
  }) => {
    await openComposerNew(page, {
      width: DEVICE_PROFILES.desktop,
      height: HEIGHT,
    });

    const aside = sidebar(page);
    await expect(aside).toBeVisible();
    await expect(aside).toHaveCSS("position", "sticky");
    await expect(
      aside.getByRole("button", { name: /Crea bozza preventivo/ })
    ).toBeVisible();
    await expect(mobileFooter(page)).toBeHidden();
  });

  test("sotto lg (768/375) — sidebar assente, footer fisso presente", async ({
    page,
  }) => {
    await openComposerNew(page, {
      width: DEVICE_PROFILES.tablet,
      height: 1024,
    });

    await expect(sidebar(page)).toBeHidden();
    const footer = mobileFooter(page);
    await expect(footer).toBeVisible();
    await expect(footer).toHaveCSS("position", "fixed");
    await expect(
      footer.getByRole("link", { name: "Annulla creazione" })
    ).toBeVisible();
    await expect(
      footer.getByRole("button", { name: /^Avanti →$/ })
    ).toBeVisible();

    await page.setViewportSize({
      width: DEVICE_PROFILES.mobile,
      height: 667,
    });
    await expect(sidebar(page)).toBeHidden();
    await expect(mobileFooter(page)).toBeVisible();
  });

  test("flip esatto a lg — 1023 (mobile) vs 1025 (desktop)", async ({ page }) => {
    await openComposerNew(page, { width: lgMinus, height: HEIGHT });
    await expect(sidebar(page)).toBeHidden();
    await expect(mobileFooter(page)).toBeVisible();

    await page.setViewportSize({ width: lgPlus, height: HEIGHT });
    await expect(sidebar(page)).toBeVisible();
    await expect(sidebar(page)).toHaveCSS("position", "sticky");
    await expect(mobileFooter(page)).toBeHidden();
  });

  test("desktop — il catalogo vive nella sidebar, il toggle mobile è assente", async ({
    page,
  }) => {
    await openComposerNew(page, {
      width: DEVICE_PROFILES.desktop,
      height: HEIGHT,
    });

    // Vai allo step "Voci di lavoro" (il footer "Avanti" non esiste ≥lg).
    await expect(async () => {
      await page.locator("main button", { hasText: "Prossimo step" }).click();
      await expect(
        page.getByRole("heading", { level: 2, name: "Voci di lavoro" })
      ).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await expect(
      sidebar(page).getByRole("heading", { level: 2, name: "Catalogo" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Apri catalogo servizi" })
    ).toHaveCount(0);
    await expect(mobileFooter(page)).toBeHidden();
  });
});

test.describe("QuoteComposer new — bottoni step flip sm (MS-5.2)", () => {
  test("639: bottone inline nascosto (footer guida); 641: bottone visibile", async ({
    page,
  }) => {
    await openComposerNew(page, { width: smMinus, height: HEIGHT });

    const inlineNext = page.locator("main button", {
      hasText: "Prossimo step",
    });
    await expect(inlineNext).toBeHidden();
    await expect(
      mobileFooter(page).getByRole("button", { name: /^Avanti →$/ })
    ).toBeVisible();

    // Contratto dei campi form: `grid-cols-1 sm:grid-cols-2` (r.525) → la grid
    // calcolata cambia davvero tra 1 e 2 tracce al flip sm (niente solo-classi).
    const fieldsGrid = page
      .locator('[class~="grid-cols-1"][class~="sm:grid-cols-2"]')
      .first();
    const colCount = async () =>
      (
        await fieldsGrid.evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns
        )
      ).split(" ").length;
    await expect.poll(colCount).toBe(1);

    await page.setViewportSize({ width: smPlus, height: HEIGHT });
    await expect(inlineNext).toBeVisible();
    await expect.poll(colCount).toBe(2);
  });
});

test.describe("QuoteComposer new — catalogo collassabile mobile (MS-5.2)", () => {
  test("375 — toggle apri/chiudi + card w-[160px] in overflow-x-auto controllato", async ({
    page,
  }) => {
    await openComposerNew(page, {
      width: DEVICE_PROFILES.mobile,
      height: 667,
    });

    // Step "Voci di lavoro": sotto sm il solo comando è il footer "Avanti →".
    await expect(async () => {
      await mobileFooter(page)
        .getByRole("button", { name: /^Avanti →$/ })
        .click();
      await expect(
        page.getByRole("heading", { level: 2, name: "Voci di lavoro" })
      ).toBeVisible();
    }).toPass({ timeout: 15_000 });

    const toggle = page.getByRole("button", { name: "Apri catalogo servizi" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("heading", { level: 2, name: "Catalogo servizi" })
    ).toHaveCount(0);

    // Apertura: catalogo compatto collassato in cima al form.
    await expect(async () => {
      await page.getByRole("button", { name: "Apri catalogo servizi" }).click();
      await expect(
        page.getByRole("heading", { level: 2, name: "Catalogo servizi" })
      ).toBeVisible();
    }).toPass({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "Chiudi catalogo servizi" })
    ).toBeVisible();

    // Card compatte w-[160px] dentro uno scroller orizzontale dedicato.
    const scroller = page
      .locator('[class~="overflow-x-auto"][class~="no-scrollbar"]')
      .first();
    await expect(scroller).toBeVisible();
    await expect(scroller).toHaveCSS("overflow-x", "auto");
    const cards = scroller.locator("button");
    expect(await cards.count(), "il catalogo deve avere voci da scorrere").toBeGreaterThan(2);
    const cardWidth = Math.round(
      await cards
        .first()
        .evaluate((el) => el.getBoundingClientRect().width)
    );
    expect(cardWidth, "le card compatte sono w-[160px]").toBe(160);
    const { scrollW, clientW } = await scroller.evaluate((el) => ({
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
    }));
    expect(
      scrollW > clientW,
      "le card devono effettivamente scorrere dentro il loro contenitore"
    ).toBe(true);

    // Overflow "controllato": le card escono dallo scroller, MAI dal <main>.
    const mainOk = await page
      .locator("main")
      .evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(
      mainOk,
      "l'overflow degli scroller del compositore non deve propagarsi a <main>"
    ).toBe(true);

    // Chiusura: catalogo smontato, toggle torna "apri".
    await page.getByRole("button", { name: "Chiudi catalogo servizi" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Catalogo servizi" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Apri catalogo servizi" })
    ).toBeVisible();
  });
});

test.describe("QuoteComposer edit — bozza (MS-5.2)", () => {
  test("sidebar 'Salva modifiche' ≥lg, footer 'Salva' <lg", async ({ page }) => {
    await page.setViewportSize({
      width: DEVICE_PROFILES.desktop,
      height: HEIGHT,
    });
    await page.goto("/admin/quotes?status=draft", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Preventivi" })
    ).toBeVisible();
    await expect(page).not.toHaveURL(/sign-in/);

    // Raggiunge l'edit con NAVIGAZIONE diretta per URL (pattern provato
    // verde in layout-overflow.spec.ts): la lista espone il link "Modifica la
    // bozza" (dentro il cluster `inert`, ma presente nel DOM) → si harvesta
    // l'href e si va con navigate(). Nessuna interazione con Clerk JS sulla
    // lista, quindi la trappola suffixed-cookie di MS-3.4 (che scatta sulle
    // transizioni client-side, ossia il click su un <a> Next) non può
    // rimbalzare a /sign-in.
    await expect(
      page.getByRole("heading", { level: 1, name: "Preventivi" })
    ).toBeVisible();
    await expect(page).not.toHaveURL(/sign-in/);

    const editHref = await page
      .locator('a[href$="/edit"]')
      .first()
      .getAttribute("href");
    expect(
      editHref,
      "la lista bozze deve esporre almeno un link di modifica"
    ).toBeTruthy();

    await page.goto(editHref!, { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Modifica preventivo" })
    ).toBeVisible();
    await expect(page).not.toHaveURL(/sign-in/);

    // Desktop: la sidebar porta il save; l'inline "Crea bozza" non esiste in edit.
    const aside = sidebar(page);
    await expect(aside).toBeVisible();
    await expect(
      aside.getByRole("button", { name: /^Salva modifiche$/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Crea bozza preventivo/, exact: true })
    ).toHaveCount(0);
    await expect(mobileFooter(page)).toBeHidden();

    // Mobile: la sidebar scompare e il footer fixed porta "Salva".
    await page.setViewportSize({
      width: DEVICE_PROFILES.mobile,
      height: 667,
    });
    await expect(sidebar(page)).toBeHidden();
    const footer = mobileFooter(page);
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Torna ai preventivi" })
    ).toBeVisible();
    await expect(footer.getByRole("button", { name: /^Salva$/ })).toBeVisible();
    await expect(
      footer.getByRole("button", { name: /^Avanti →$/ })
    ).toHaveCount(0);
  });
});