# Roadmap — Responsive & Visual Regression Testing

- **Branch:** `feat/responsive-ui-testing`
- **Scope:** strategia completa di test UI/UX e responsività (DataTables dense, Sheet/Drawer laterali, filtri condizionali, elementi data-dense).
- **Convention:** stack di test = **Jest + RTL** (NON Vitest) + **Playwright** (da installare). Stack decisione confermata dal committente.
- **Modus operandi:** un micro-step alla volta; verifica al terminale prima di passare al successivo; aggiornare questo file alla fine di ogni step. Prima di creare/modificare file di test, chiedere al committente se ispezionare file/componenti esistenti per allinearsi allo scaffold.
- **Riferimenti:** `presentation/lib/breakpoints.ts` (matrice canonica: `BREAKPOINTS`, `DEVICE_PROFILES`, `mqMin`/`mqMax`) — unico punto di verità.

---

## MACRO-ATTIVITÀ 1 — Audit del Layout & Setup del Toolkit di Debug Locale

- [x] **MS-1.1** Matrice breakpoint canonici in unico punto di verità condiviso
      → `presentation/lib/breakpoints.ts` (sm 640 / md 768 / **cardStack 820** / lg 1024 / xl 1280 / 2xl 1536) + token `--breakpoint-820` in `app/globals.css` `@theme`. Rimosso riferimento Vitest da `presentation/features/landing/stack.tsx`. Verificato: lint ✅ typecheck ✅ build ✅.
- [x] **MS-1.2** Mappare pagine/componenti visivi critici da sottoporre a test (AdminHeader, Sheet/Drawer laterali, LeadTable desktop+mobile, LeadFilterBar, quote list)
      → Mappatura completa in sezione dedicata sotto. Snapshot: AdminHeader (nav `hidden lg:flex` / hamburger `lg:hidden` / Sheet nav `w-[85%] max-w-[340px]`), Sheet primitivo Radix (`w-3/4 max-w-md`, `side` sinistra/destra), LeadJobDrawer (`w-[340px] max-w-[85vw]` left), LeadTable desktop `<table>` vs card grid `max-[820px]:grid`, quote list card rows con `max-[820px]:grid-template-areas`, LeadFilterBar 2 livelli con riga filtri `flex-nowrap` (candidato overflow confermato: ~400px min), QuoteFilterBar con overflow popover mobile. Badge/chip data-dense censiti. Note: `LeadDetailSheet` è codice morto (in uso è `LeadDetailDialog`, dialog centrata `sm:max-w-5xl`); pagine censite; tabella 768 < cardStack 820 → il profilo tablet mostra le card.
- [x] **MS-1.3** Script di audit overflow locale ("ghost scroll") via Playwright: `scrollWidth > clientWidth` su viewport mirati (1280/768/375), con report.
      → `scripts/ghost-scroll-audit.mjs` (Node ESM standalone, `playwright-core` con **profilo persistente** `.e2e/ghost-scroll-profile` per Clerk; login una tantum con `--login`) + report `docs/testing/responsive-ui-testing-ghost-scroll-report.md` (non committato). Viewport width da `presentation/lib/breakpoints.ts` (`DEVICE_PROFILES`), altezze roadmap (800/1024/667), `TOLERANCE=1px`. Classificazione: clip/scroll container propri → deliberati (rollup per classe); interni clipati → soppressi; sospetti = overflow che sfugge fino a document edge. 12 run (3 pagine + variante `?status=qualified` × 3 breakpoint) → **3 sospetti** (header quote list a tablet 768×1024, overflowPx ~171-203) · 102 deliberati raggruppati in 8 gruppi. Scoperta triage: il candidato riga filtri `lead-filter-bar.tsx` è **falso positivo** (i select `w-[170px]` vengono compressi da flex-shrink: riga 328px ≤ 343px, anche con clear attivo) → da validare visivamente in MS-1.4.
- [x] **MS-1.4** Verifica terminale del detector sulle 3 viste chiave + triage.
      → **1 bug REALE** confermato: toolbar `QuoteFilterBar` a tablet 768×1024 — il cluster secondario (`hidden sm:flex items-end gap-x-5`) è già attivo da sm (640): toolbar 892px vs 689 disponibili, tab più a destra a x=924 (156px oltre il viewport 768), `main` rende scrollbar orizzontale (scrollW 924 > clientW 753, `overflow-x:auto`). I 3 sospetti audit (header/main/div.w-full) sono la stessa catena di overflow. Root cause: soglia `sm:` per l'inline secondario, mentre il mapping MS-1.2 prevede "inline solo su desktop" (`lg:`; tablet deve usare il popover). /admin/quotes non ha job selector → nessuna variante "job attivo" da verificare (densità invariata).
      **Falso positivo CONFERMATO**: riga filtri `lead-filter-bar.tsx` @ 375×667 con `?status=qualified` (clear attivo) — i 2 select compressi da flex-shrink a 134px, clear 36px → riga 328px ≤ 343px contenitore; select audit right=150, vendita right=296, clear right=344, tutti VISIBILI/nessun troncato, nessun h-scroll pagina né main.
      Nessun problema a mobile: /admin/quotes @ 375×667 OK (doc scrollW 360=main 360, header bbox 344 = rightmost 344).
      **Azioni seguenti**: (1) fix tablet → cluster secondario `hidden lg:flex` + popover trigger `lg:hidden` ~~(triage da incrociare con MS-3.3/regression)~~ → **APPLICATO e regredito in MS-3.3** (`quote-filter-bar.tsx` + spec `e2e/quotes-toolbar.spec.ts` verde su tutti e 4 i project); (2) solo se in futuro i select non dovranno restringersi: aggiungere `min-w-[170px]` ai wrapper (sarebbe overflow reale, oggi è corretto). Screenshot grezzi in `docs/testing/ms14-screenshots/` (non committati).

## MACRO-ATTIVITÀ 2 — Unit & Component Testing degli State Responsive (Jest + RTL)

- [x] **MS-2.1** Test setup jsdom con mock di `window.matchMedia` + helper `setViewport`/`renderAt(width)`.
      → `setupFilesAfterEnv` aggiunto in `jest.config.presentation.js` → `presentation/__mocks__/match-media.ts`. Mock singleton di `matchMedia` (default width 1280 da `DEVICE_PROFILES`, `matches` da `min-width`/`max-width`/prefers-*, `change` event su flip reale, supporto `addListener`/`onchange`, `window.innerWidth` in sync + evento `resize`). Helper `setViewport(width)` + `renderAt(width, ui)` (RTL, setta il viewport PRIMA del render) in `presentation/__mocks__/set-viewport.ts`. Auto-verifica `presentation/__mocks__/match-media.test.ts` (7 test: default desktop, flip tablet dispatches 1 solo change, 375 solo query mobile, no-event su non-flip, listener legacy, cleanup senza residui). Verificato: `npm run test:presentation` ✅ (2 suite / 43 test verdi), typecheck ✅.
- [x] **MS-2.2** `AdminHeader`: hamburger visibile <1024px, nav desktop ≥1024px, Sheet nav open/close senza rottura DOM.
      → `presentation/features/admin/admin-header.test.tsx` (6 test, RTL + `renderAt`). Mock solo seams esterni (`next/navigation.usePathname`→`/admin/leads`, `next/link`→anchor `forwardRef`, `@clerk/nextjs.UserButton`→div, `next-themes.useTheme`→dark) + `google-quota-badge`→null; **Sheet Radix, Button e ThemeToggle reali** (open/close su DOM vero). Asserzioni su contratto classi Tailwind (`hidden lg:flex` / `lg:hidden`, `w-[85%] max-w-[340px]`): in jsdom non c'è layout, quindi proprietà CSS-visibility/boundingBox si verificano sui token DOM. **R3** = helper `expectSheetWidth` che deriva la width dalle classi reali del nodo (`w-[85%]`/`max-w-[340px]`) contro il viewport simulato, stubba `getBoundingClientRect` sul nodo e assert `≤340` e `≥ min(340, 85vw)`. Coperto: desktop 1280 (nav desktop + hamburger `lg:hidden`, `aria-current`), mobile 375 (hamburger visibile, nav `hidden`), **R2 tablet 768** (hamburger + Sheet capato a 340px), open/close da link nav + Escape con `queryByRole(dialog)` null post-close, `afterEach(cleanup + cleanupMatchMediaMock)`, nessun act warning (soppresso il solo advisory Radix "Missing `Description`" — l'header usa solo `SheetTitle` sr-only, scelta voluta). Verificato: `npx jest --config jest.config.presentation.js` ✅ (3 suite / **49 test** verdi), `npm run typecheck` ✅.
- [x] **MS-2.3** `LeadTable`: render desktop vs card grid mobile (<820px), degradazione badge→icone, `emptyRow` in entrambi gli stati.
      → `presentation/features/admin/leads/lead-table.test.tsx` (9 test, RTL + `renderAt`). Mock solo seams esterni (`next/navigation.useSearchParams`→`sort=score-asc` + `useRouter`→`{push,prefetch}`, `next/link`→anchor `forwardRef`, `@/application/lead/admin.actions`→jest.fn, `lead-quote-draft.storeLeadQuoteInput`→jest.fn, `LeadDetailDialog`→null); **tabella, card grid, StatusBadge/LeadOutreachBadge, StatusIcon/OutreachStatusIcon, LeadScoreBadge, TechStackCell, LeadAdsBadge reali** (contratto classi Tailwind, niente layout in jsdom). Coperto: desktop 1280 (9 `columnheader` con % 25/8/20/7/8/7/9/9/7, pill testo "qualificato"/"In trattativa", **R6** sticky header `sticky top-0 z-30` sul `th`), **R1** flip esatto 819 (card grid `max-[820px]:grid` + `grid-cols-[1fr_auto]`) e 821 (tabella di nuovo), **R2** tablet 768 (card, non tabella), degradazione badge→icona in riga 2 card (`title`="qualificato"/"In trattativa" + score 42, pill testo assenti nel grid), **R6** card view senza semantica tabella (`queryByRole("columnheader"/"table")` null), `emptyRow` desktop `td[colspan=9]` + `p-0` e mobile `p-10` (empty state scoped `within` — lo stesso prop è renderizzato in entrambi gli stati, quindi niente `getByTestId` globale). `afterEach(cleanup + cleanupMatchMediaMock)`, nessun act warning (soppresso advisory Radix "Missing `Description`|`Title`" se si attiva). Fixture `Lead` completo (status qualified, outreach in_talks, techStack 3 chip, ads, copyright 2020). Verificato: `npx jest --config jest.config.presentation.js` ✅ (4 suite / **58 test** verdi), `npm run typecheck` ✅, eslint ✅.
- [x] **MS-2.4** `Sheet` (ui/sheet.tsx): props `side`/`className`/`showCloseButton`, larghezza viewport-relative, focus/aria.
      → `presentation/components/ui/sheet.test.tsx` (10 test, RTL + `renderAt`). **Nessun mock**: Sheet è una facciata Radix Dialog pura (Button e icone Hugeicons reali) → solo `renderAt` + `expectSheetWidth`. Helper condiviso `expectSheetWidth(dialog, viewportWidth)` estratto da `admin-header.test.tsx` in `presentation/__mocks__/expect-sheet-width.ts` (resolve i token `w-[N%]`/`max-w-[Npx]` dall'arbitrario, oppure i default `w-3/4`→75% / `max-w-md`→448px, stubba il rect e assert R3 ≤ max-w e ≥ cap vw; admin-header ora lo importa con i token `w-[85%] max-w-[340px]`). Coperto: default `side="right"` (role dialog, `right-0 inset-y-0 h-full`, **R3** width 75vw), override `className` via tw-merge (`w-[40%] max-w-[300px]` vince, i default spariscono), `side="left"` (role dialog, `left-0` + slide-in-from-left), `side="top"`/`"bottom"` (`max-h-[80vh]`), `showCloseButton` default (bottone "Close") vs `false` (assente), focus management (click trigger → focus dentro il dialog, Escape → `queryByRole(dialog)` null con DOM pulito), aria (`SheetTitle` → `toHaveAccessibleName`, `SheetDescription` → `toHaveAccessibleDescription`), overlay `z-50 bg-black/80 supports-backdrop-filter:backdrop-blur-xs` + trigger `data-slot`. `afterEach(cleanup + cleanupMatchMediaMock)`, soppressione mirata dell'advisory Radix "Missing `Description`" (di solito le render non lo includono, scelta voluta). Verificato: `npx jest --config jest.config.presentation.js` ✅ (**5 suite / 68 test** verdi, MS-2.1/2.2/2.3 intatti), `npm run typecheck` ✅, eslint ✅.
- [x] **MS-2.5** `LeadFilterBar` e `LeadJobDrawer`: stato header/azioni responsive, drawer senza overflow DOM.
      → `presentation/features/admin/leads/lead-filter-bar.test.tsx` (9 test) + `presentation/features/admin/leads/lead-job-drawer.test.tsx` (10 test, RTL + `renderAt`). Mock solo seams esterni (`next/navigation.useRouter/usePathname/useSearchParams` con URL scelto per test, `next/link`→anchor `forwardRef`, `framer-motion` sottile `{AnimatePresence→children, motion.div→div, useReducedMotion→false}` per evitare act-warning sul panel avanzati, `@/application/lead/admin.actions`→`jest.fn` resolve `{ok:true}` per i 3 job action); **Sheet Radix, Button, Tooltip, AlertDialog, LeadJobDrawer, LeadJobStatus e i suoi bottoni reali**. Fixture `ToolbarJob` ×3 (completed preferito con tech/copyright, running senza preferito, failed con error) + caso jobs vuoto (selector assente). **Esteso l'helper condiviso** `expectSheetWidth` (`presentation/__mocks__/expect-sheet-width.ts`) ai token `w-[Npx]` (candidata fissa) e `max-w-[Nvw]` (cap ∝ viewport) oltre ai `w-[N%]`/`max-w-[Npx]`/defaults esistenti — width reale = `min(candidata, cap)`; MS-2.2/2.4 verificati verdi dopo il refactor. Coperto: desktop 1280 (toolbar role/aria-label, h1 `text-2xl sm:text-3xl`, selector job con title=query attiva + `(N)`, export `hidden sm:inline-flex` con href `export?job=…`, CTA "+ Nuova ricerca", preferiti label visibile), **flip sm 639/641** (export solo icona `sm:hidden w-9 h-9` senza testo + label preferiti nascosta sotto sm; a 641 label + testo presenti), riga filtri @375 con `status=qualified` (2 select `w-[170px]`, riga `flex-nowrap`, clear `shrink-0` — **R5 RETTIFICATA da MS-1.4**: niente assert di overflow, solo blocco del contratto DOM nowrap + shrink-0), drawer VERO via job selector (dialog "Ricerche", aria-expanded, **R3** `expectSheetWidth(375)`→min(340, 318.75), Escape→dialog null), avanzati chevron aria-expanded/aria-label flip + select score/source/ads/anno + chip tech `aria-pressed`, cerca debounced 350ms (`jest.useFakeTimers` + `advanceTimersByTime(350)` → `router.push('/admin/leads?q=…', {scroll:false})`) con clear su q da URL. Drawer test controllato diretto: dialog accessibile "Ricerche" + classe `left-0` + token `w-[340px] max-w-[85vw]` (default tw-merge droppati), aria-current su "Tutte"/card attiva, ordinamento favoriti-prima + id desc, card completo (pill completato/in corso/fallito, stats found/analyzed/qualified con `title`, chip tech/©, `role="alert"` solo su failed), **R3** × 3 viewport (375→318.75, 320→272, 1280→340), overflow DOM (lista `min-h-0 flex-1 overflow-y-auto` senza token width laterali + contenuti `truncate`), azioni (aria-label preferiti/elimina/ripeti, "↻ Ripeti ricerca" solo su completed/failed, click favorite → `toggleJobFavoriteAction("job-2")`, click body card → `onOpenChange(false)`). `afterEach(cleanup + cleanupMatchMediaMock)`, soppressione mirata dell'advisory Radix "Missing `Description`" (il drawer usa solo `SheetTitle`, scelta voluta). Verificato: `npm run test:presentation` ✅ (**7 suite / 87 test** verdi, MS-2.1/2.2/2.3/2.4 intatti), `npm run typecheck` ✅, eslint ✅.
- [x] **MS-2.6** Verifica: `npm run test:presentation` verde.
      → **MA-2 chiusa.** Inventario: 7 suite / **87 test** verdi (`test:presentation` 7 suite/87 test ✅ senza act-warning né console noise; per-suite isolato 6 suite/51 test ✅ senza regressioni; `npm run typecheck` ✅; eslint ✅ su tutti i file MA-2 — nessun errore). Conto suite: match-media (7) + admin-header (6) + lead-table (9) + sheet (10) + lead-filter-bar (9) + lead-job-drawer (10) + lead-dialog-utils (36) = 87. Scope git rispettato (solo roadmap + `expect-sheet-width.ts` + 2 nuovi `*.test.tsx`). Comandi eseguiti: `npm run test:presentation`, `npx jest --config jest.config.presentation.js <6 suite per-suite>`, `npm run typecheck`, `npx eslint <file MA-2>`.

## MACRO-ATTIVITÀ 3 — E2E Responsive con Playwright

- [x] **MS-3.1** Installare `@playwright/test` + browser; `playwright.config.ts` con projects: Desktop 1280×800 / Tablet 768×1024 (touch) / Mobile Safari 375×667 / Mobile Chrome 375×812.
      → `@playwright/test` ^1.63.0 già devDependency (MS-1.3): eseguito `npx playwright install chromium webkit` (webkit serve anche per il progetto Mobile Safari; versione cache `chromium-1243`/`webkit-2359`). Creato `playwright.config.ts` alla radice: **viewport NON hard-coded** — larghezze importate da `DEVICE_PROFILES` (`presentation/lib/breakpoints.ts`) con template literal nei nomi progetto; altezze convenzione roadmap (800/1024/667) + 812 per Mobile Chrome. I 4 projects: **Desktop 1280×800** (`devices["Desktop Chrome"]`, `deviceScaleFactor:1`, `isMobile:false`, `hasTouch:false`), **Tablet 768×1024** (`Desktop Chrome` + dpr 2/isMobile/hasTouch — 768 < 820 → card grid ed <1024 → hamburger, R2), **Mobile Safari 375×667** (`devices["iPhone 8"]` = webkit dpr 2 touch, viewport 375×667 nativ), **Mobile Chrome 375×812** (`devices["Pixel 5"]` chromium dpr 3 touch con viewport override). `webServer: npm run dev` su `http://localhost:3000` con `reuseExistingServer: !CI` (in CI server fresco; localmente riusa — attenzione al trap Prisma/Turbopack di AGENTS.md: se cambia lo schema, ripartire con `npm run dev:clean`), `testDir: ./e2e`, `trace: on-first-retry`, reporter list/HTML(CI), retries 2 solo in CI, `fullyParallel`. Scaffold: `e2e/smoke.spec.ts` (1 test pubblico su `/` per validare config+server su tutti e 4 i project — niente auth, che è MS-3.2) + `.gitignore` esteso (`/test-results/`, `/playwright-report/`, `/blob-report/`). **Note incrocio MS-3.3**: il fix tablet `QuoteFilterBar` di MS-1.4 (cluster secondario `hidden lg:flex` + popover trigger `lg:hidden` al posto dell'attuale `hidden sm:flex`/`sm:hidden`) era il prerequisito di MS-3.3 → **applicato e regredito lì** (spec `e2e/quotes-toolbar.spec.ts` verde). Verificato: `npx playwright test` ✅ **4/4 (1.63.0)**, `npm run typecheck` ✅, `npx eslint playwright.config.ts e2e/smoke.spec.ts` ✅.
- [x] **MS-3.2** Assorbire scaffold auth (Clerk) per route protette nel `storageState`.
      → Setup project **`auth-setup`** (`e2e/auth.setup.ts`) con `testMatch: /auth\.setup\.ts/` + `dependencies` su tutti e 4 i project in `playwright.config.ts`; i 4 project usano ora `use.storageState: ".e2e/storage-state/fullAdmin.json"`. Il setup apre headless il **profilo persistente MS-1.3** (`.e2e/ghost-scroll-profile` — login Google OAuth manuale uno-tantum resta `node scripts/ghost-scroll-audit.mjs --login`), naviga su `/admin/leads`, **verifica che non sia stato rimbalzato a `/sign-in`** (è l'assert esplicito dell'AUTH-REQUIRED di MR-1.3: il banner diventa verifica in `e2e/auth.spec.ts`), attende l'h1 "Lead" del toolbar e fa `context.storageState({ path })`. **Prova empirica decisiva**: il round-trip dello storageState funziona — NEW: la nota MS-1.3 "rejected by Clerk dev" NON regge per lo snapshot catturato da sessione Clerk sedimentata nel profilo persistente (include i cookie cross-origin `__session`/`__clerk_db_jwt` su `localhost` + accounts.dev e la `localStorage` `__clerk_environment`), cosa che il vecchio `ghost-scroll-storage-state.json` (catturato da contesto regolare, non persistente) non garantiva. Tutti e 4 i project (anche **Mobile Safari/WebKit**) partono autenticati senza workaround del profilo.
      Nuovi test `e2e/auth.spec.ts` (2 × 4 project, girano sul project autenticato): (1) **AUTH-REQUIRED esplicito** — contesto pulito `browser.newContext({ storageState: {cookies:[],origins:[]} })` (⚠️ scoperto empiricamente: Playwright MERGIA `use.storageState` in `newContext()`, serve l'override esplicito vuoto), `/admin/leads` → URL `/sign-in` + heading h1 "Sign in to 7eightDev" del `<SignIn />` embedded (il `toHaveTitle` è inaffidabile: Clerk riscrive il documento title client-side); (2) **protected minimale** — `/admin/leads` autenticato: non su `/sign-in`, `toHaveTitle(/Admin — 7eightDev/)`, h1 "Lead" visibile, contratto AdminHeader R2 (nav desktop ≥1024 + hamburger `lg:hidden`; `< 1024` hamburger visibile; assert nav con `{ exact: true }` — in dev "Lead" fa collisione con "Report Lead").
      Il profilo persistente resta la **fonte credenziale** (il setup lo apre ad ogni run e ne ritrae uno snapshot fresco, Clerk rinfresca/ruota i cookie lì in loco — nessun residuo nei test, `.e2e/` in `.gitignore`). Smoke resta verde come test pubblico. Verificato: `npx playwright test` ✅ **13/13** (setup 1 + smoke 1×4 + auth 2×4), `npm run typecheck` ✅, `npx eslint playwright.config.ts e2e/auth.setup.ts e2e/auth.spec.ts` ✅.
- [x] **MS-3.3** Test visibilità/regression (storageState, 4 project): hamburger/Sheet nav, flip tabella→card, toolbar senza overflow.
      → **Fix tablet `QuoteFilterBar` dal triage MS-1.4 APPLICATO in MS-3.3** (`presentation/features/admin/quote-filter-bar.tsx`): cluster secondario `hidden sm:flex items-end gap-x-5` → **`hidden lg:flex items-end gap-x-5`** (riga 255) e wrapper popover mobile `sm:hidden` → **`lg:hidden`** (riga 200). A tablet 768×1024 il cluster inline NON esiste più (il popover "Altri filtri" è il trigger, coincidente con /admin/quotes senza job selector) e `main` non scrolla orizzontalmente — **triage MS-1.4 regredito/verificato** (toolbar inline solo ≥lg, 689px disponibili ora bastano). 3 nuovi spec, tutti su storageState, larghezze viewport da `DEVICE_PROFILES`/`BREAKPOINTS` (mai hard-coded):
      → `e2e/nav.spec.ts` — AdminHeader: hamburger `lg:hidden` visibile <lg (R2, 375+768) e hidden ≥lg con nav desktop `hidden lg:flex`; Sheet nav Radix → dialog con accessible name "Menu di navigazione" (SheetTitle sr-only); **R3** boundingBox width ∈ [0, 340] su `w-[85%] max-w-[340px]` (**tolleranza +1px**: a tablet dpr2 il cap max-w-340 rende 340.00003px); chiusura via Escape → dialog hidden. Scoperta empirica: il click sull'hamburger può andare perso pre-hydration (listener React non ancora attaccato — R2 che è pura visibilità resta verde) → guardia `expect(async () => { click; toBeVisible(2s) }).toPass({ timeout: 15s })`.
      → `e2e/leads-table-flip.spec.ts` — /admin/leads: **R1** flip esatto a `BREAKPOINTS.cardStack` 820 → test a **819** (`max-[820px]:grid` visibile, `getByRole("table")` count 0 perché `max-[820px]:hidden` = display:none fuori dall'a11y tree) e **821** (tabella visibile, card grid hidden), viewport cambiato via `page.setViewportSize` **dentro il test** (il flip è guidato dalla media query, non dal device del project); **R6** sticky: a 819 `columnheader` count 0, a 821 `toHaveCSS("position","sticky")` sul th.
      → `e2e/quotes-toolbar.spec.ts` — /admin/quotes: a tablet 768×1024 trigger "Altri filtri" visibile e "rifiutato" inline count 0 (**`exact` obbligatorio**: collisione coi bottoni riga "Segna il preventivo come rifiutato"), nessun elemento del toolbar tracima la viewport (bbox.x ≥ 0 e x + width ≤ vw) e `main.scrollWidth ≤ main.clientWidth` (segnali esatti del bug MS-1.4); regression desktop 1280 = cluster inline attivo con divider + trigger "Altri filtri" assente; regression mobile 375 = trigger visibile e nessun overflow; **R5** LeadFilterBar = falso positivo confermato → niente assert di overflow, solo contratto DOM della riga filtri (`flex-nowrap`) + clear `shrink-0` su `/admin/leads?status=qualified`. **Scoperta WebKit/Playwright**: su Mobile Safari `goto` con `waitUntil:"domcontentloaded"` non risolve mai su /admin/quotes pur avendo il DOM completo (streaming Next + pagina pesante; snapshot a timeout mostra toolbar e righe renderizzate) → le navigation dello spec usano `waitUntil:"commit"` e l'attesa vera la fanno gli `expect` subito dopo.
      Verificato: `npx playwright test` ✅ **48 passati + 1 skip deliberato su 49** (setup 1 + smoke 1×4 + auth 2×4 + nav 2×4 [skip R3 Sheet solo su Desktop ≥lg, non c'è hamburger] + flip 3×4 + toolbar 4×4); `npm run test:presentation` ✅ 7 suite / 87 test (nessun clamp del fix component); `npm run typecheck` ✅; `npx eslint playwright.config.ts e2e/nav.spec.ts e2e/leads-table-flip.spec.ts e2e/quotes-toolbar.spec.ts presentation/features/admin/quote-filter-bar.tsx` ✅.
- [x] **MS-3.4** Assert di layout: nessun elemento tracima il viewport (`boundingBox` vs 0/viewportWidth).
      → **Helper condiviso** `e2e/helpers/layout.ts` — `expectNoHorizontalOverflow(page, { root?, label? })` generalizza `expectToolbarWithinViewport` di MS-3.3 e lo rende agnostico dal toolbar: `root` è un parametro (default il `<main>` della pagina, per gli spec globali; per il regression mirato si passa la toolbar "Filtri preventivi"), scansione degli elementi interattivi (`button, a, select, input, [role=button/checkbox/radio/switch/tab]`) dentro il root con `boundingBox` dentro `[-0.5, vw+0.5]` (EPS sub-pixel R3 dpr2), classi di errore chiare `<tag> left=X right=Y vw=Z`, e asserisce `main.scrollWidth ≤ main.clientWidth` (segnali del bug MS-1.4). **Filtro anti-falso-positivo** (rubrica MS-1.3 "clip/scroll container propri → deliberati"): si saltano i nodi a size 0, quelli co `opacity:0`/`visibility:hidden`, e quelli dentro un ancestore `[inert]` — scoperto empiricamente qui: i cluster azioni slide-in di `LeadRowActions`/`QuoteRowActions` chiusi sono `translate-x-full`+`opacity-0`+`inert` (fuori cella nel DOM, NON un overflow reale: quando l'utente apre il toggle tornano dentro il viewport). `quotes-toolbar.spec.ts` ora DELEGA l'assert a questo helper (stesso regression MS-1.4, root= toolbar). Nessuna modifica ad app/ (solo e2e).
      → **Nuovo `e2e/layout-overflow.spec.ts`** — matrice pagine × viewport (larghezze da `DEVICE_PROFILES`, altezze convenzione roadmap; `waitUntil:"commit"` ovunque per WebKit, MS-3.3): scansione completa di `<main>` su `/admin/quotes`, `/admin/quotes?status=rejected` (pagina risultati `?status` dei preventivi — attivo filtro secondario), `/admin/leads`, `/admin/quotes/new` (composer, attendere l'h2 "Cliente & progetto" oltre all'h1); **pagaia triage MS-1.4**: `/admin/leads?status=qualified` resta SOLO contratto DOM (`flex-nowrap` + clear `shrink-0`, mai assert di overflow — falso positivo confermato). 15 test × 4 project = 60.
      Verificato: `npx playwright test` ✅ **108 passati + 1 skip deliberato su 109** (setup 1 + smoke 1×4 + auth 2×4 + nav 2×4 [skip R3 Sheet solo su Desktop] + flip 3×4 + toolbar 4×4 + layout-overflow 60); `npm run typecheck` ✅; `npx eslint e2e/helpers/layout.ts e2e/layout-overflow.spec.ts e2e/quotes-toolbar.spec.ts` ✅. Nota operativa: la sessione Clerk dev nel profilo persistente è scaduta a metà verifica (TTL sessione breve; il silent handshake non si completa headless) → refresh tramite il login manuale documentato `node scripts/ghost-scroll-audit.mjs --login` (una tantum), poi suite verde da zero.
- [x] **MS-3.5** Verifica: `npx playwright test` verde su tutti i projects.
      → **Verifica di chiusura MA-3.** `npx playwright test` ✅ **108 passati + 1 skip deliberato su 109** (setup auth 1 + smoke 1×4 + auth 2×4 + nav 2×4 [skip R3 Sheet solo su Desktop ≥lg, non c'è hamburger] + flip 3×4 + toolbar 4×4 + layout-overflow 60), suite intera con `dependencies` (MAI `--no-deps`). Nessun flake, nessun triage necessario: confermata su strada la pagaia MS-3.4 integra. Sessione Clerk dev nel profilo persistente ancora valida in questa run (nessun refresh `--login` richiesto — trap MS-3.4 non scattata). `npm run typecheck` ✅; `npx eslint e2e/helpers/layout.ts e2e/layout-overflow.spec.ts e2e/quotes-toolbar.spec.ts e2e/nav.spec.ts e2e/leads-table-flip.spec.ts e2e/auth.spec.ts e2e/auth.setup.ts e2e/smoke.spec.ts playwright.config.ts` ✅ (nessun file nuovo in MS-3.5: solo verifica esplicita). Nessuna modifica ad app/ (nessun `prisma generate` → Turbopack/stale client non pertinente). **MA-3 chiusa.**

## MACRO-ATTIVITÀ 4 — Visual Regression Testing & Automazione CI/CD

- [ ] **MS-4.1** Screenshot canonici (`toHaveScreenshot`) delle 3 viste chiave × 3 form factor con baseline committata.
- [ ] **MS-4.2** Pipeline di update deliberate (`--update-snapshots` + script npm dedicato).
- [ ] **MS-4.3** Script npm unificati (`test:e2e`, `test:e2e:update`, `test:visual`) in `package.json`.
- [ ] **MS-4.4** Workflow `.github/workflows/` (CI headless: lint → typecheck → unit → E2E → visual) con artefatti upload su failure.
- [ ] **MS-4.5** Verifica finale: CI verde da zero, snapshot stabili, threshold rate.

---

## MAPPATURA MS-1.2 — Pagine e componenti critici (inventario per i test)

Tutti i viewport fanno riferimento a `presentation/lib/breakpoints.ts`
(`sm 640 / md 768 / cardStack 820 / lg 1024 / xl 1280 / 2xl 1536`) e
`DEVICE_PROFILES` (mobile 375, tablet 768, desktop 1280). Le classi nel codice
usano direttamente `max-[820px]:` (arbitrario), equivalente al token
`--breakpoint-820` registrato in `app/globals.css` (`@theme`).

### Stato del toolkit locale (verificato per MS-2.x)
- Jest 30 + ts-jest jsdom: `jest.config.presentation.js` ha roots
  `presentation/`, `moduleNameMapper` `@/`, testMatch `*.test.{ts,tsx}` e ora
  anche `setupFilesAfterEnv` → `presentation/__mocks__/match-media.ts`
  (mock `window.matchMedia` installato a ogni test file) + helper
  `setViewport`/`renderAt` in `presentation/__mocks__/set-viewport.ts`.
- Unico test presentation non-mock: `lead-dialog-utils.test.ts` (puri utilità,
  niente componenti). **Primo test componente**: `admin-header.test.tsx`
  (MS-2.2, 6 test) → il pattern da riusare è mock dei soli seam esterni +
  contratto classi Tailwind (niente layout in jsdom).
- Playwright **installato** (MS-3.1): `@playwright/test` ^1.63.0 + browser `chromium`/`webkit` (cache locale). Config `playwright.config.ts` alla radice (4 project, larghezze da `DEVICE_PROFILES`), `testDir ./e2e`, webServer `npm run dev`. Auth Clerk **assorbita** (MS-3.2): setup project `auth-setup` → storageState `.e2e/storage-state/fullAdmin.json` replay su tutti i project (profilo persistente MS-1.3 resta la fonte credenziale, `--login` uno-tantum).

### Pagine admin (tutte montano `AdminHeader` via `app/(private)/layout.tsx`)
| Pagina | Componenti critici | Note responsive |
|---|---|---|
| `/admin/quotes` | QuoteFilterBar, card row (inline) | collapse card a 820, `grid-template-areas` mobile |
| `/admin/quotes/new` · `[id]/edit` | form preventivo | non censito nei test target |
| `/admin/catalog` (+ new/edit) | list/form catalogo | fuori scope MA-1 |
| `/admin/leads` | LeadTable, LeadFilterBar, pagination, banner job in corso, LiveJobRefresher | il core della MA-2/3 |
| `/admin/leads/new` (+ intercepted modal `new-lead-dialog.tsx`) | Dialog `sm:max-w-[680px]` | indiretto via modal slot |
| `/admin/leads/[id]` | dettaglio full-page | fuori scope test component MA-2 (copy del dialog) |
| `/admin/leads/report` · `/admin/email` | report/email | fuori scope |

### Componenti glossario
1. **AdminHeader** — `presentation/features/admin/admin-header.tsx`
   - Sticky `top-0 z-40 h-14`, shell `flex h-dvh flex-col overflow-hidden` +
     `main flex-1 min-h-0 overflow-y-auto` (lo scroll di pagina è dentro `<main>`).
   - Desktop nav `<nav className="hidden lg:flex">` ≥1024. Hamburger `lg:hidden`
     (<1024) = SheetTrigger → SheetContent `side="right" w-[85%] max-w-[340px]`.
   - Cluster destro: GoogleQuotaBadge + ThemeToggle + "Vai al sito"
     (`hidden md:inline-flex` ≥768) + divider (`hidden md:block`) + hamburger +
     UserButton. **Check densità a tablet 768–1024** (badge quota testo variabile).
2. **Sheet primitivo** — `presentation/components/ui/sheet.tsx` (Radix Dialog)
   - Default `side="right" w-3/4 max-w-md`, overlay `z-50 bg-black/80 back-drop blur`.
   - `side` top/bottom = `max-h-[80vh]`; left/right = full height.
   - `className` mergia in coda (tw-merge): gli override width del consumer
     prevalgono su `w-3/4/max-w-md`.
3. **Sheet/Drawer in uso**:
   - Nav Sheet: right `w-[85%] max-w-[340px]`, header h-16 + nav scrollabile, titolo `sr-only`.
   - `LeadJobDrawer` (left): `w-[340px] max-w-[85vw]` → a 375px vale 318px, a 320px
   ~272px (limite sicuro). Header "Ricerche" + CTA + lista `LeadJobStatus`.
   - ⚠️ **`LeadDetailSheet` è dead code** (nessun import): il dettaglio reale è
     `LeadDetailDialog`, dialog centrata `sm:max-w-5xl max-h-[90vh]` con body
     scrollabile — da marcarsi come candidato test, non come Sheet laterale.
4. **LeadTable** — `presentation/features/admin/leads/lead-table.tsx`
   - Desktop `<Table className="max-[820px]:hidden">`: 9 colonne a % fisse
     (25/8/20/7/8/7/9/9/7), header sticky `sticky top-0 z-30`, celle truncate,
     TechStackCell (max 3 chip + "+N" tooltip), badge Stato/Outreach/Score/Ads.
   - Mobile `hidden max-[820px]:grid`: card `grid-cols-[1fr_auto]`, riga 2 =
     StatusIcon + Score + OutreachIcon (**degradazione badge→icona**).
   - `emptyRow` renderizzato in **entrambi** gli stati (desktop `colSpan=9 p-0`,
     mobile `p-10`).
   - Breakpoint: **768 (tablet) < 820 → il profilo tablet mostra le card, non la
     tabella.** Dominio del test: 820 è il punto di flip esatto.
5. **LeadFilterBar** — `presentation/features/admin/leads/lead-filter-bar.tsx`
   - Toolbar 2 livelli sticky; Row1 action header (titolo `text-2xl sm:text-3xl`,
     selector job `max-w-[200px] sm:max-w-[300px]`, preferiti label `hidden sm:inline`,
     export CSV `hidden sm:inline-flex` → icona `w-9 h-9` su mobile, "Nuova ricerca"
     → "+" icona).
   - Row2 filtro: search h-11 full width + riga `flex flex-nowrap items-end
     justify-center gap-3` con 2 select `w-[170px]` + clear (solo se attivi).
     **Candidato overflow confermato:** min senza clear 170+170+12 = 352px; con
     clear 352+36+12 = **400px > 375px** → ghost scroll a 375 quando ci sono
     filtri attivi (target MS-1.4/MS-3.3).
   - Avanzati (collapsible, AnimatePresence): score/source/ads `flex-1
     min-w-[130px] sm:min-w-[150px]`, copyright `min-w-[160px] sm:min-w-[200px]`,
     `TechStackMultiselect` chip `flex-wrap` (niente overflow nota).
6. **QuoteFilterBar** — `presentation/features/admin/quote-filter-bar.tsx`
   - Tabs pipeline; etichette `hidden sm:inline` (solo tab attivo mostra label su
     mobile); filtri secondari (stati chiusi, scadenza, archiviati) in
     `Popover` sotto lg (`lg:hidden`), inline da lg (`hidden lg:flex`) — fix
     tablet MS-1.4 applicato in MS-3.3 (prima era `sm:hidden`/`hidden sm:flex`).
7. **Quote list** — `app/(private)/admin/quotes/page.tsx` (Server Component)
   - Desktop grid `grid-cols-[110px_1fr_auto_150px_auto_auto]`; mobile
     `max-[820px]:grid-cols-[1fr_auto]` + `grid-template-areas:
     'num actions' 'client client' 'price price' 'meta meta'`.
   - Badge status fisso `w-[104px]`; date `whitespace-nowrap`; `contents` wrapper
     che in mobile diventa `flex` con `[grid-area:meta]`.
8. **Elementi data-dense**
   - Badge pill (mono 10px, `px-2.5 py-[5px]`, bordo `color-mix oklab 45%`):
     `StatusBadge`/`LeadOutreachBadge` (table), `LeadScoreBadge` (accent <50 =
     opportunità, muted ≥50; "—" se assente), `LeadAdsBadge` ("Ads" / "Ads · N"
     + tooltip), status pill quote, `status` LeadJobStatus.
   - Chips: `TechStackCell` truncate `px-1.5` + "+N" tooltip; `TechStackMultiselect`
     toggle chips con spunta e truncate; badge tech/copyright in LeadJobStatus
     (`flex-wrap`); `TrackerBadge` con dot.
   - Multi-select: `TechStackMultiselect` (`aria-pressed`, chips check).
   - `WebVital` (dialog): metric `tabular-nums truncate`, 3 toni ok/warn/bad,
     riga "ideale x". `KpiItem` sub-header dialog.

### Regole emerse per i test (da applicare in MS-2.x/3.x)
- **R1** 820 è il flip tabella→card: testare a 819 e 821.
- **R2** Tablet 768 < 820: usa hamburger nav (lg non raggiunto) E card grid.
- **R3** Sheet laterali: verifica `boundingBox.width` ≤ `max-w` e ≥ `85vw` cap.
- **R4** `LeadDetailSheet` fuori dai test (dead code); dettaglio = Dialog `sm:max-w-5xl`.
- **R5** La riga filtri LeadFilterBar è l'unico overflow noto a 375 (con clear).
- **R6** Sticky header LeadTable: solo stato desktop; in card view niente sticky.

---

## Stato avanzamento

- **In corso:** MACRO-ATTIVITÀ 4 · **MS-4.1** (screenshot canonici `toHaveScreenshot` delle 3 viste chiave — landing, /admin/leads, /admin/quotes — × 3 form factor con baseline committata).
- **Prossimo:** MS-4.2 (pipeline update deliberate), MS-4.3 (script npm unificati), MS-4.4 (workflow CI), MS-4.5 (verifica finale).
- **Completate:** MA-1 intera (MS-1.1…MS-1.4) + MA-2 intera (MS-2.1…MS-2.6) + MA-3 intera (MS-3.1…**MS-3.5** — setup 4 project storageState, spec responsive/flip/toolbar, fix tablet `QuoteFilterBar` del triage MS-1.4, helper layout condiviso `e2e/helpers/layout.ts` + matrice overflow pagine admin × viewport, verifica di chiusura 108+1).

> Alla fine di ogni macro-attività consegnare un prompt di riepilogo avanzamento + punto di ripresa, riferito a questo file.