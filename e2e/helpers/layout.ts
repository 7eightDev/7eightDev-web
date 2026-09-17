import { expect, type Locator, type Page } from "@playwright/test";

/**
 * MS-3.4 — assert di layout globale: nessun elemento tracima la viewport.
 *
 * Estrae e generalizza `expectToolbarWithinViewport` di `quotes-toolbar.spec.ts`
 * (MS-3.3): la scansione degli elementi e il check `main` non scrollano più
 * vivono soltanto dentro la toolbar, ma possono essere applicati a qualunque
 * root — il `<main>` della pagina (comportamento default, per gli spec che
 * iterano le pagine admin) o un ruolo specifico come la toolbar "Filtri
 * preventivi" (per il regression mirato di MS-3.3).
 *
 * Perché solo elementi interattivi nella scansione (mai tutti i nodi): un
 * `<button>`/`<a>`/`<select>` che esce dalla viewport è un difetto reale
 * (l'utente non può raggiungerlo), mentre testo troncato dentro un
 * contenitore `overflow-hidden`/scrollabile è deliberato (classificazione
 * "clip/scroll container propri → deliberati" del detector MS-1.3, vedi
 * roadmap). Formule i segnali del bug reale MS-1.4 (toolbar 892px su 689
 * disponibili, `main` con scrollbar orizzontale).
 *
 * La pagina `?status=` dei lead è ESCLUSA dagli assert di overflow: il triage
 * MS-1.4 ha confermato che la riga filtri LeadFilterBar è un falso positivo
 * (i `w-[170px]` vengono compressi da flex-shrink) → su quella pagina vale
 * solo il contratto DOM (`flex-nowrap` + `shrink-0`, vedi quotes-toolbar R5).
 */

export interface ExpectNoHorizontalOverflowOptions {
  /**
   * Root su cui scandire gli elementi interattivi. Default: il `<main>` della
   * pagina (contenuto admin sotto l'AdminHeader). Per gli spec mirati si può
   * passare un ruolo, es. la toolbar "Filtri preventivi".
   */
  root?: Locator;
  /** Etichetta del root nelle message di failure. */
  label?: string;
}

/**
 * Verifica che nessun elemento interattivo dentro `root` esca dalla viewport
 * (boundingBox.x ≥ 0 e x+width ≤ viewportWidth) e che `main` non scrolli
 * orizzontalmente (`scrollWidth ≤ clientWidth`).
 */
export async function expectNoHorizontalOverflow(
  page: Page,
  options: ExpectNoHorizontalOverflowOptions = {}
): Promise<void> {
  const scope = (options.root ?? page.locator("main")).first();
  const label = options.label ?? "main";

  await expect(
    scope,
    `il root scansionato (${label}) deve essere visibile`
  ).toBeVisible();

  const handle = await scope.elementHandle();
  expect(handle, `il root scansionato (${label}) deve esistere`).not.toBeNull();

  const report = await handle!.evaluate((rootEl) => {
    // Costanti inline: il callback viene serializzato in pagina, le closure
    // del modulo NON arrivano nel browser.
    const EPS = 0.5; // tolleranza sub-pixel (R3/MS-3.3: a dpr2 right = vw + 0.00003)
    const INTERACTIVE_SELECTOR =
      "button, a, select, input, [role='button'], [role='checkbox'], " +
      "[role='radio'], [role='switch'], [role='tab']";

    const vw = document.documentElement.clientWidth;
    const offenders: string[] = [];

    const rootRect = rootEl.getBoundingClientRect();
    if (rootRect.width > 0 && rootRect.height > 0) {
      if (rootRect.left < -EPS || rootRect.right > vw + EPS) {
        offenders.push(
          `<root> left=${rootRect.left.toFixed(1)} right=${rootRect.right.toFixed(1)} vw=${vw}`
        );
      }
    }

    rootEl
      .querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR)
      .forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // Hidden slide-in action cluster (LeadRowActions/QuoteRowActions):
        // quando lo "…" toggle è chiuso il cluster è `translate-x-full` +
        // `opacity-0` + `inert`, quindi fuori dalla cella ma nel DOM — un
        // controllo deliberatamente nascosto (rubrica MS-1.3 "interni
        // clipati → soppressi"), NON un overflow reale. Un elemento analogy
        // nascosto non può "tracimare la viewport" verso l'utente.
        if (el.closest("[inert]")) return;
        const style = getComputedStyle(el);
        if (style.opacity === "0" || style.visibility === "hidden") return;

        if (rect.left < -EPS || rect.right > vw + EPS) {
          offenders.push(
            `<${el.tagName.toLowerCase()}> left=${rect.left.toFixed(1)} right=${rect.right.toFixed(1)} vw=${vw}`
          );
        }
      });

    const main = document.querySelector("main");
    return {
      vw,
      offenders,
      mainScrollOk: main ? main.scrollWidth <= main.clientWidth : false,
    };
  });

  expect(
    report.offenders,
    `nessun elemento di '${label}' tracima la viewport (<tag> left/right vs vw=${report.vw})`
  ).toEqual([]);
  expect(
    report.mainScrollOk,
    `main non deve scrollare orizzontalmente su '${label}' (scrollWidth ≤ clientWidth, bug MS-1.4)`
  ).toBe(true);
}