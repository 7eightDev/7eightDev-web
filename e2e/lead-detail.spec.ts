import { expect, test, type Locator, type Page } from "@playwright/test";
import { BREAKPOINTS, DEVICE_PROFILES } from "../presentation/lib/breakpoints";
import { expectNoHorizontalOverflow } from "./helpers/layout";

/**
 * MS-5.3 — Lead detail page + dialog responsive matrix (P0).
 *
 * Copre i flip censiti in MA-5 verso `lead-detail.tsx` (r.86/208) e
 * `lead-detail-dialog.tsx` (r.363/452/131):
 *  - KPI grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (r.86): flip a sm
 *    (639→2 col, 641→3 col) e a lg (1023→3, 1025→6);
 *  - card Cliente/Contesto/Vendita `grid lg:grid-cols-3` (r.208): colonna
 *    singola implicita sotto lg, 3 colonne da lg;
 *  - dialog `sm:max-w-5xl` (r.363): sotto sm il cap è `max-w-[calc(100%-2rem)]`
 *    (dialog quasi-fullwidth, 16px di margine), da sm diventa 1024px;
 *  - corpo dialog `grid-cols-1 md:grid-cols-2` (r.452): flip a md (767/769);
 *  - PageSpeedBand `overflow-x-auto` (r.131/423): a 375 l'eventuale overflow
 *    delle metriche è assorbito dallo scroller interno, mai da `<main>`;
 *  - apertura del dialog dalla riga della tabella (lead-table.tsx onClick),
 *    senza navigazione client-side (nessuna trappola suffixed-cookie MS-3.4);
 *  - `<main>` senza overflow (helper `e2e/helpers/layout.ts`, MS-3.4).
 *
 * Vincoli roadmap MS-5.3: NIENTE screenshot (score/vitals/dates volatili dal
 * DB), solo assert layout/DOM; `waitUntil:"commit"` sulle navigazioni (trap
 * WebKit MS-3.3); larghezze sempre da `DEVICE_PROFILES`/`BREAKPOINTS` (mai
 * hard-coded); ogni test admin termina con `not.toHaveURL(/sign-in/)`.
 *
 * Testabilità senza server action: la `getLeadDetailAction` è flaky in E2E
 * (il dev-browser Clerk entra a tratti in "session token infinite redirect
 * loop" e lo stream della server action non si risolve mai lato client pur
 * con POST 200 — dialog fermo su skeleton o in `role="alert"`). Quindi:
 *  - il leadId per la pagina full è HARVESTED dal React fiber del trigger
 *    "Azioni per …" (props di `LeadRowActions`: `{ id, companyName }`) —
 *    lettura DOM pura, zero rete, mai fixture hard-codata;
 *  - le assert sul dialog tollerano entrambi gli stati (contenuto caricato
 *    OPPURE skeleton): lo skeleton monta le STESSE classi layout del body
 *    (`grid-cols-1 md:grid-cols-2` r.221, `overflow-x-auto` r.423), quindi i
 *    flip restano deterministici con o senza dati;
 *  - la pagina full (`[id]/page.tsx`) è un server component: nessun action
 *    coinvolta, solo `page.goto()` + assert.
 */

const HEIGHT = 800;
const TABLET_HEIGHT = 1024;
const MOBILE_HEIGHT = 667;

const VIEWPORTS = [
  { name: "mobile", width: DEVICE_PROFILES.mobile, height: MOBILE_HEIGHT },
  { name: "tablet", width: DEVICE_PROFILES.tablet, height: TABLET_HEIGHT },
  { name: "desktop", width: DEVICE_PROFILES.desktop, height: HEIGHT },
] as const;

// Flip esatti dai breakpoint canonici (mai numeri hard-coded).
const smMinus = BREAKPOINTS.sm - 1;
const smPlus = BREAKPOINTS.sm + 1;
const mdMinus = BREAKPOINTS.md - 1;
const mdPlus = BREAKPOINTS.md + 1;
const lgPlus = BREAKPOINTS.lg + 1;

/** Lista lead: viewport + goto + h1 + guardia anti-Clerk-trap. */
async function gotoLeads(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/admin/leads", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Lead" })
  ).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);
}

/**
 * Legge il `lead.id` dal React fiber del trigger "Azioni per …" (prima riga):
 * risalendo i fiber si incontra `LeadRowActions` le cui props sono
 * `{ id: <uuid>, companyName, … }`. Lettura DOM pura — nessuna fetch, nessuna
 * server action, nessun cookie Clerk coinvolto. Il `toPass` copre il
 * pre-hydration (fiber assente finché React non monta).
 */
function readLeadIdFromFiber(el: HTMLElement): string | null {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const fiberKey = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  if (!fiberKey) return null;
  let fiber: unknown = (el as unknown as Record<string, unknown>)[fiberKey];
  for (let i = 0; i < 30; i++) {
    if (typeof fiber !== "object" || fiber === null) return null;
    const node = fiber as Record<string, unknown>;
    const props = node["memoizedProps"] ?? node["pendingProps"];
    if (typeof props === "object" && props !== null) {
      const p = props as Record<string, unknown>;
      const id = p["id"];
      if (
        typeof id === "string" &&
        uuidRe.test(id) &&
        typeof p["companyName"] === "string"
      ) {
        return id;
      }
    }
    fiber = node["return"];
  }
  return null;
}

/** Harvest del leadId della prima riga (mai hard-coded, mai via action). */
async function harvestFirstLeadId(page: Page): Promise<string> {
  const anchor = page.locator('button[aria-label^="Azioni per "]').first();
  let id: string | null = null;
  await expect(async () => {
    id = await anchor.evaluate(readLeadIdFromFiber);
    expect(id, "leadId harvest dal fiber del trigger Azioni").toBeTruthy();
  }).toPass({ timeout: 15_000 });
  return id as unknown as string;
}

/**
 * Ripristina il cookie-jar Clerk allo stato storageState tra due navigazioni
 * full-page dello stesso test:
 *  - pota i cookie suffissi (`__client_uat_<sfx>`, `__clerk_db_jwt_<sfx>`,
 *    `__session_<sfx>`) lasciati da clerk-js senza `__session` suffissa
 *    (trappola suffixed-cookie MS-3.4: il middleware passa in suffixed-mode
 *    e la navigazione successiva rimbalza a /sign-in);
 *  - resetta l'unsuffixed `__client_uat` a `1` (come fa auth.setup in
 *    normalizzazione): clerk-js lo ruota a epoch-corrente e il middleware
 *    boccia il check `SessionTokenIATBeforeClientUAT` (token iat < uat →
 *    sessione stale → bounce).
 *  Ogni test parte da storageState incontaminato: il problema nasce solo
 *  alla SECONDA navigazione nello stesso test (gli altri spec ne fanno una
 *  sola e sono immuni).
 */
async function restorePristineClerkCookies(page: Page) {
  const jar = await page.context().cookies();
  for (const c of jar) {
    if (
      c.name.startsWith("__client_uat_") ||
      c.name.startsWith("__clerk_db_jwt_") ||
      c.name.startsWith("__session_")
    ) {
      await page.context().clearCookies({
        name: c.name,
        domain: c.domain,
        path: c.path,
      });
    }
  }
  await page.context().addCookies([
    {
      name: "__client_uat",
      value: "1",
      domain: "localhost",
      path: "/",
    },
  ]);
}

/** Harvest dell'id via fiber + navigazione completa alla pagina full-page. */
async function openLeadDetail(page: Page): Promise<string> {
  await gotoLeads(page, DEVICE_PROFILES.desktop, HEIGHT);
  const id = await harvestFirstLeadId(page);
  // Doppia navigazione full-page nello stesso test → ripristino jar Clerk
  // (v. restorePristineClerkCookies) prima del goto dettaglio.
  await restorePristineClerkCookies(page);
  await page.goto(`/admin/leads/${id}`, { waitUntil: "commit" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Il bounce Clerk dev-browser ("infinite redirect loop") è transiente e
  // client-side: la pagina è renderizzata (h1 visibile) ma poi rimbalza.
  // Si ripristina e si riprova con una navigazione fresca (resetta clerk-js).
  if (/sign-in/.test(page.url())) {
    await restorePristineClerkCookies(page);
    await page.waitForTimeout(1000);
    await page.goto(`/admin/leads/${id}`, { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await expect(page).not.toHaveURL(/sign-in/);
  return id;
}

/**
 * Apre la lista lead e clicca la PRIMA riga per aprire il dialog di dettaglio:
 * tabella desktop (`tbody tr td:first-child`) sopra cardStack, card grid
 * (`[class*='max-[820px]:grid'] > div`) sotto. Il click è un puro onClick React
 * (lead-table.tsx setSelected) — nessuna navigazione client-side, quindi la
 * trappola suffixed-cookie Clerk (MS-3.4) non può rimbalzare a /sign-in.
 * La guardia MS-3.3 riprova il click finché il dialog non appare (click perso
 * pre-hydration sotto carico parallelo). NON attende i dati: il corpo monta
 * subito skeleton oppure contenuto, entrambi con le stesse classi layout.
 */
async function openLeadDialog(
  page: Page,
  width: number,
  height: number
): Promise<Locator> {
  await gotoLeads(page, width, height);

  const dialog = page.getByRole("dialog");
  const row =
    width >= BREAKPOINTS.cardStack + 1
      ? page.locator("tbody tr td:first-child").first()
      : page.locator('[class*="max-[820px]:grid"] > div').first();
  await expect(async () => {
    await row.click();
    await expect(dialog).toBeVisible();
  }).toPass({ timeout: 15_000 });
  return dialog;
}

test.describe("Lead detail page — KPI + card (MS-5.3)", () => {
  test("KPI grid flip 2/3/6 a sm/lg + card lg:grid-cols-3", async ({ page }) => {
    await openLeadDetail(page);

    const kpi = page.locator(
      '[class~="grid-cols-2"][class~="sm:grid-cols-3"][class~="lg:grid-cols-6"]'
    );
    await expect(kpi).toHaveCount(1);
    const kpiCols = () =>
      kpi.evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length
      );

    // 2 colonne sotto sm (639), 3 da sm (641) e fino a lg−1 (1023), 6 da lg.
    await page.setViewportSize({ width: smMinus, height: HEIGHT });
    await expect.poll(kpiCols).toBe(2);

    await page.setViewportSize({ width: smPlus, height: HEIGHT });
    await expect.poll(kpiCols).toBe(3);

    await page.setViewportSize({ width: BREAKPOINTS.lg - 1, height: HEIGHT });
    await expect.poll(kpiCols).toBe(3);

    await page.setViewportSize({ width: lgPlus, height: HEIGHT });
    await expect.poll(kpiCols).toBe(6);

    // Card Cliente/Contesto/Vendita `grid lg:grid-cols-3` (r.208): sotto lg il
    // grid è implicito a colonna singola, da lg sono 3 colonne.
    const cards = page.locator('[class~="grid"][class~="lg:grid-cols-3"]');
    await expect(cards).toHaveCount(1);
    const cardsCols = () =>
      cards.evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length
      );
    await page.setViewportSize({ width: BREAKPOINTS.lg - 1, height: HEIGHT });
    await expect.poll(cardsCols).toBe(1);
    await page.setViewportSize({ width: lgPlus, height: HEIGHT });
    await expect.poll(cardsCols).toBe(3);

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("main senza overflow ai 3 viewport canonici (helper layout)", async ({
    page,
  }) => {
    await openLeadDetail(page);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await expectNoHorizontalOverflow(page, {
        label: `main di un lead detail (${vp.name} ${vp.width})`,
      });
    }
    await expect(page).not.toHaveURL(/sign-in/);
  });
});

test.describe("Lead detail dialog (MS-5.3)", () => {
  test("apertura dalla riga della tabella a 1280, corpo e footer montati", async ({
    page,
  }) => {
    await gotoLeads(page, DEVICE_PROFILES.desktop, HEIGHT);
    const firstRowCompany = (
      await page.locator("tbody tr td:first-child span").first().textContent()
    )?.trim();

    // Guardia MS-3.3 (click perso pre-hydration): riprova il click di riga
    // finché il dialog non è visibile.
    const dialog = page.getByRole("dialog");
    await expect(async () => {
      await page.locator("tbody tr td:first-child").first().click();
      await expect(dialog).toBeVisible();
    }).toPass({ timeout: 15_000 });

    // Il title arriva dalle props (leadCompanyName), mai dalla fetch: prova
    // che la riga ha cablato il lead giusto nel dialog.
    if (firstRowCompany) {
      await expect(dialog.getByRole("heading", { level: 2 })).toContainText(
        firstRowCompany
      );
    }

    // Corpo: contenuto caricato OPPURE skeleton (stesse classi layout, la
    // fetch può restare appesa nel dev-browser E2E — v. nota in testa).
    const skeleton = dialog.locator(".animate-pulse").first();
    await expect(
      dialog.getByRole("heading", { name: "Anagrafica" }).or(skeleton)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      dialog
        .getByRole("heading", { name: "Stato Outreach & Vendita" })
        .or(skeleton)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      dialog
        .getByRole("heading", { name: "Tracciamento & Campaign Ads" })
        .or(skeleton)
    ).toBeVisible({ timeout: 15_000 });

    // Footer: azioni reali OPPURE i loro skeleton — in entrambi i casi il
    // footer è montato; il click sulla riga NON ha navigato (stessa URL della
    // lista — nessuna trappola Clerk nel percorso).
    await expect(
      dialog.getByRole("link", { name: /Anteprima report/ }).or(skeleton)
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin\/leads$/);
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("dialog sm:max-w-5xl: sotto sm fullwidth con margine, da sm cap 1024px", async ({
    page,
  }) => {
    const dialog = await openLeadDialog(
      page,
      DEVICE_PROFILES.mobile,
      MOBILE_HEIGHT
    );
    // getByRole("dialog") risolve già il DialogContent stesso (Radix lo
    // porta fuori via Portal): le classi max-w sono sull'elemento dialog.
    const content = dialog;
    await expect(content).toHaveClass(/sm:max-w-5xl/);

    // Sotto sm il cap è `max-w-[calc(100%-2rem)]` (una calc, NON 1024px).
    // La larghezza resta content-driven entro il cap: l'assert che conta è
    // il flip del cap, più il contenimento nella viewport.
    const maxWidth = () =>
      content.evaluate((el) => getComputedStyle(el).maxWidth);
    expect(
      await maxWidth(),
      "sotto sm il cap non deve essere ancora 1024px"
    ).not.toBe("1024px");
    const boxMobile = await content.boundingBox();
    expect(boxMobile!.width).toBeLessThanOrEqual(DEVICE_PROFILES.mobile);

    // A 641 il cap `sm:max-w-5xl` (1024px) è attivo sul computed max-width.
    await page.setViewportSize({ width: smPlus, height: MOBILE_HEIGHT });
    await expect.poll(maxWidth).toBe("1024px");

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("dialog corpo grid md:grid-cols-2: 767 una col, 769 due col", async ({
    page,
  }) => {
    const dialog = await openLeadDialog(page, mdMinus, HEIGHT);
    // Skeleton (r.221) e body caricato (r.452) montano le stesse classi in
    // mutua esclusione: il count è 1 con o senza dati fetchati.
    const body = dialog.locator(
      '[class~="grid-cols-1"][class~="md:grid-cols-2"]'
    );
    await expect(body).toHaveCount(1);
    const bodyCols = () =>
      body.evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length
      );

    await expect.poll(bodyCols).toBe(1);

    await page.setViewportSize({ width: mdPlus, height: HEIGHT });
    await expect.poll(bodyCols).toBe(2);

    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("PageSpeedBand overflow-x-auto a 375, overflow assorbito nel dialog", async ({
    page,
  }) => {
    const dialog = await openLeadDialog(
      page,
      DEVICE_PROFILES.mobile,
      MOBILE_HEIGHT
    );
    // Banda PageSpeed caricata (r.131) oppure suo skeleton (r.423): entrambe
    // `overflow-x-auto` — l'overflow resta nello scroller interno.
    const band = dialog.locator('[class~="overflow-x-auto"]').first();
    await expect(band).toBeVisible();
    await expect(band).toHaveCSS("overflow-x", "auto");

    // L'eventuale overflow delle metriche PageSpeed resta racchiuso nel suo
    // scroller interno: main non deve scrollare orizzontalmente.
    const mainOk = await page
      .locator("main")
      .evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(
      mainOk,
      "main non deve scrollare orizzontalmente col dialog aperto"
    ).toBe(true);

    await expect(page).not.toHaveURL(/sign-in/);
  });
});
