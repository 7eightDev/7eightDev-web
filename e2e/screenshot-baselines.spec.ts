import {
  expect,
  test,
  type Page,
  type Response,
} from "@playwright/test";
import { DEVICE_PROFILES } from "../presentation/lib/breakpoints";

/**
 * MS-4.1 — screenshot canonici (`toHaveScreenshot`) delle 3 viste chiave × 3
 * form factor con baseline committata.
 *
 * Le 3 viste (coordinate MS-1.2/MS-1.3):
 *   1. Landing `/` (pubblica, nessuna auth)
 *   2. `/admin/leads` (card grid / tabella, paginazione, banner job)
 *   3. `/admin/quotes` (QuoteFilterBar fix MS-1.4, card row)
 *
 * I 3 form factor canonici sono i project Playwright (larghezze da
 * `DEVICE_PROFILES`, mai hard-coded nel dettaglio):
 *   • Desktop 1280×800  (chromium dpr1, no touch)
 *   • Tablet 768×1024   (chromium dpr2, touch, <lg hamburger + <820 card grid)
 *   • Mobile Safari     (iPhone 8, webkit dpr2, touch)
 * Il 4° project (Mobile Chrome 375×812) NON è canonico per la baseline: lo
 * saltiamo qui sotto, così la matrice resta 3 viste × 3 progetti = 9 PNG.
 *
 * Condizioni per la stabilità (gli stessi problemi risolti in MS-3.x:
 * WebKit `waitUntil:"commit"`, sub-pixel dpr2, flake nav):
 *  - `waitUntil: "commit"` ovunque (su /admin/quotes WebKit non risolve mai
 *    `domcontentloaded`, vedi MS-3.3): l'attesa vera la fanno gli `expect`.
 *  - `colorScheme: "dark"` emulato esplicitamente: l'app forza `defaultTheme
 *    "dark"` (ThemeProvider, enableSystem=false), ma emulare la media rende
 *    scrollbar/controlli nativi coerenti tra chromium e webkit anche quando i
 *    device descriptor divergono su `prefers-color-scheme`.
 *  - Landing con `reducedMotion: "reduce"`: il `Hero` usa `useReducedMotion()`
 *    per sostituire la `Aurora` WebGL (rAF continuo → shader drift, NON
 *    stoppato da `animations:"disabled"` che copre solo CSS/WAAPI) con un
*    div statico; gli `Reveal` framer-motion sotto la piega rendono statici.
   *    La baseline è lo stato "a riposo" (settle 700ms dopo h1).
 *  - GoogleQuotaBadge (admin header): intercettato con fixture fissa via
 *    `route.fulfill()` → il badge rende "Quota: 7/32" deterministico in ogni
 *    run, indipendente dal DB reale.
 *  - `animations: "disabled"` per il matcher in config (blink cursor e
 *    `animate-spin` congelati all'initial keyframe).
 *  - Fonts + immagini attesi prima dello shot: `document.fonts.ready` e tutti
 *    gli `img` `complete` (l'avatar Clerk del UserButton è un'immagine remota).
 *
 * Dati live: /admin/leads e /admin/quotes leggono il DB reale → strategia (b)
 * MS-4.1: le baseline vanno rigenerate quando il DB cambia (MS-4.2 formalizzerà
 * la pipeline `--update-snapshots`). Il badge quota è l'unico dato volatile
 * intercettato, appunto per non legare la baseline al contatore live.
 */

/** Fixture fissa per il badge quota — niente dipendenza dal contatore DB. */
const QUOTA_FIXTURE = {
  date: "2026-09-01",
  buckets: {
    "places-text-search": { used: 7, limit: 32, available: true },
    "places-autocomplete": { used: 88, limit: 322, available: true },
  },
};

const VIEWS = [
  {
    name: "landing",
    path: "/",
    label: "Landing page (pubblica)",
    reducedMotion: true,
  },
  {
    name: "leads",
    path: "/admin/leads",
    label: "Admin — lista lead",
    reducedMotion: false,
  },
  {
    name: "quotes",
    path: "/admin/quotes",
    label: "Admin — lista preventivi",
    reducedMotion: false,
  },
] as const;

/**
 * Attende la pagina in uno stato "a riposo" prima dello shot: fonts caricati,
 * (per le viste admin) il badge quota già renderizzato, tutte le immagini
 * `complete` (avatar Clerk) e un breve settle per GSAP/framer-motion.
 */
async function waitForStablePage(
  page: Page,
  quotaResponse?: Promise<Response>
): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  if (quotaResponse) await quotaResponse;
  await page.waitForFunction(
    () =>
      document.images.length === 0 ||
      Array.from(document.images).every((img) => img.complete),
    null,
    { timeout: 15_000 }
  );
  // GSAP/framer settle: cattura lo stato a riposo, non un frame intermedio.
  await page.waitForTimeout(700);
}

test.describe("canonical screenshots", () => {
  // Il 4° project (Mobile Chrome 375×812, chromium dpr3) NON è un form factor
  // canonico della baseline (solo Desktop/Tablet/Mobile Safari): saltato qui.
  test.skip(({ browserName, viewport }) => {
    const isMobileChrome =
      browserName === "chromium" &&
      viewport?.width === DEVICE_PROFILES.mobile;
    return isMobileChrome;
  }, "Mobile Chrome non è un form factor canonico della baseline (9 PNG = 3 viste × 3 progetti)");

  test.describe.configure({ timeout: 90_000 });

  for (const view of VIEWS) {
    test(`baseline: ${view.label} (${view.path})`, async ({ page }) => {
      await page.emulateMedia({
        colorScheme: "dark",
        reducedMotion: view.reducedMotion ? "reduce" : "no-preference",
      });

      let quotaResponse: Promise<Response> | undefined;
      if (view.path.startsWith("/admin/")) {
        await page.route("**/admin/api/google-quota", (route) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(QUOTA_FIXTURE),
          })
        );
        quotaResponse = page.waitForResponse((res) =>
          res.url().includes("/admin/api/google-quota")
        );
      }

      await page.goto(view.path, { waitUntil: "commit" });

      // Ancora stabile per l'h1 della vista (le navigazioni admin restano
      // autenticate via storageState, mai un rimbalzo a /sign-in).
      await expect(
        page.getByRole("heading", { level: 1 }).first()
      ).toBeVisible({ timeout: 15_000 });

      if (view.path.startsWith("/admin/")) {
        await expect(page).not.toHaveURL(/\/sign-in/);
        await waitForStablePage(page, quotaResponse);
      } else {
        await waitForStablePage(page);
      }

      // `fullPage: false` → crop del viewport (stabile); `maxDiffPixelRatio`
      // tollera differenze sub-pixel cross-engine senza nascondere overflow.
      // Il nome deve riportare l'estensione (Playwright la separa in
      // `{arg}`/`{ext}` dentro snapshotPathTemplate).
      await expect(page).toHaveScreenshot(`${view.name}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});