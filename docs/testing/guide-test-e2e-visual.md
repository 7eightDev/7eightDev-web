# Guida — Test E2E & Visual Regression su 7eightDev

Guida operativa per **usare** il sistema di test del progetto e per
**personalizzarlo** (nuovi test E2E, nuove baseline visuali, fixture, CI).
È il complemento operativo del tracking doc `docs/testing/responsive-ui-testing-ROADMAP.md`:
qui trovi *come fare*, lì trovi *perché* (le decisioni, i micro-step `MS-x.y`,
gli insegnamenti emersi). Dove utile la guida rimanda ai chunk della roadmap.

> **Vincoli assoluti del repo (RED LINE)** — non infringirli:
> - MAI `--update-snapshots` in un run normale né in CI. L'unica via per
>   refrescare le baseline è `npm run test:e2e:update`
>   (`scripts/update-snapshots.mjs`), una pipeline **deliberata
>   human-in-the-loop** che non auto-committa.
> - Un diff sui PNG a parità di contenuto è una **regressione o un data drift**:
>   si fa triage sui file `actual/expected/diff` in `test-results/`, mai lo si
>   assorbe in silenzio.
> - Prisma 7: dopo un cambio schema il client va rigenerato **manualmente**
>   (`npx prisma generate`) e il dev server riavviato con `npm run dev:clean`
>   (`rm -rf .next`). Un client Prisma stale fa fallire silenziosamente
>   `save(lead)`/`saveJob` (fire-and-forget) lasciando i job bloccati su
>   `running` con zero lead scritti.

---

## 1. Panoramica: i 4 livelli di test e la matrice degli script

Il progetto ha quattro livelli di verifica, dal più rapido al più lento.
Ognuno risponde a una domanda diversa.

| Livello | Cosa verifica | Sistema |
|---|---|---|
| **Qualità statica** | Lint (ESLint) e correttezza dei tipi (tsc) | `eslint`, `tsc --noEmit` |
| **Unit** | Logica di dominio, use-case, repository (niente UI) | Jest (`testEnvironment: node`) |
| **Unit presentazionale** | Contratto dei componenti React (classi/responsività/accessibilità) | Jest (`testEnvironment: jsdom`) + Testing Library |
| **E2E Playwright** | Comportamento reale su browser: navigazione, auth Clerk, flip responsivi, overflow, dialog | Playwright su 4 project |
| **Visual regression** | Screenshot pixel-perfect delle viste canoniche contro baseline committate | Playwright `toHaveScreenshot` |

### Matrice degli script (`package.json`, tutto verificato lì)

| Script | Comando effettivo | Uso |
|---|---|---|
| `npm run lint` | `eslint` | Qualità statica. Blocca la PR (job `lint` in CI). |
| `npm run typecheck` | `tsc --noEmit` | Type check. Blocca la PR (job `typecheck`). |
| `npm test` | `jest` | Unit di `domain/`, `application/`, `infrastructure/` (47 suite / 456 test). |
| `npm run test:presentation` | `jest --config jest.config.presentation.js` | Unit componente (`presentation/`, jsdom; 10 suite / 107 test). |
| `npm run test:e2e` | `npx playwright test` | TUTTI gli spec E2E su TUTTI e 4 i project. Gate CI. |
| `npm run test:visual` | `node scripts/visual-check.mjs` | Solo `e2e/screenshot-baselines.spec.ts` (12 baseline) sui 3 project canonici, **read-only**, nessun `--update-snapshots`. |
| `npm run test:e2e:update` | `node scripts/update-snapshots.mjs` | Rigenerazione **deliberata** delle baseline. MAI in run normali/CI. |
| `npm run dev` / `npm run dev:clean` | `next dev` / `rm -rf .next && next dev` | Dev server (il webServer di Playwright usa `npm run dev`). |
| `npm run db:migrate` | `prisma migrate dev` | Migrazione schema (ricordati di rigenerare il client dopo). |
| `npm run db:seed` | `prisma db seed` | Seed catalog + AVIS quote + fixture deterministica E2E (via `prisma.config.ts` → `tsx prisma/seed.ts`). |
| `npm run db:seed:catalog` | `tsx prisma/seed-catalog.ts` | Solo catalogo. |

**Letto in fila per un commit**: `lint` → `typecheck` → `test` +
`test:presentation` → (se tocchi UI/responsive) `test:e2e` → (solo se le viste
canoniche sono cambiate) rigenerazione baseline + `test:visual`.

### I 4 project Playwright e i boundary

Source of truth unica per le larghezze: `presentation/lib/breakpoints.ts`
(`DEVICE_PROFILES`, `BREAKPOINTS`, `TEST_BOUNDARIES`). Mai numeri hard-coded
nei test o negli script: è la filosofia portante di MA-2/3/4.

| Project (nome sanitizzato per le baseline) | Viewport | Motore | Note |
|---|---|---|---|
| `Desktop 1280x800` → `Desktop-1280x800` | 1280×800 | chromium dpr1, no touch | Viewport canonico per il visual. |
| `Tablet 768x1024` → `Tablet-768x1024` | 768×1024 | chromium dpr2, touch | < lg (1024) → hamburger; < cardStack (820) → card grid. |
| `Mobile Safari 375x667` → `Mobile-Safari-375x667` | 375×667 | webkit (iPhone 8) dpr2 | Canonico. WebKit = più lento, trap su `domcontentloaded`. |
| `Mobile Chrome 375x812` | 375×812 | chromium dpr3 (Pixel 5) | **NON canonico**: skippato nelle baseline. |
| `auth-setup` | — | chromium persistent/local o headless/CI | Setup che cattura la sessione Clerk in `.e2e/storage-state/fullAdmin.json`; gli altri 4 ne dipendono. |

I project E2E (e le altezze) sono derivati a runtime da `DEVICE_PROFILES` +
convenzione roadmap (altezze 800/1024/667, più 812 per Mobile Chrome), sia in
`playwright.config.ts` sia nei generatori `scripts/update-snapshots.mjs` e
`scripts/visual-check.mjs` (`CANONICAL_HEIGHTS`).

Breakpoints canonici: `sm` 640 · `md` 768 · `cardStack` 820 · `lg` 1024 · `xl`
1280 · `2xl` 1536 (`BREAKPOINTS`), più `TEST_BOUNDARIES.catalogGridFlip = 680`
(flip ad-hoc della grid del catalogo). Per i flip esatti si testa a `N−1`/`N+1`
(es. 819/821 per `cardStack`, 639/641 per sm, 767/769 per md, 1023/1025 per lg).

---

## 2. Prerequisiti locali

1. **Node 22.x** (`engines: {"node": "22.x"}` in `package.json`) e `npm`.
2. **Postgres 16** — la *stessa* versione della CI (`postgres:16-alpine`). In
   locale puoi usare Docker:
   ```bash
   docker run -d --name pg7eight -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=seven -p 5432:5432 postgres:16-alpine
   ```
   La roadmap usa spesso una porta alternativa (es. `54329`) per non collidere
   con un Postgres esistente: scegli la porta che preferisci e aggiorna
   `DATABASE_URL`/`DIRECT_URL` di conseguenza. In locale **non** serve il pooler:
   `DATABASE_URL == DIRECT_URL`.
3. **`.env` / `.env.local`** copiate da `.env.example`. Per la parte test
   servono almeno:
   - `DATABASE_URL`, `DIRECT_URL` (Postgres locale);
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (istanza Clerk **dev**;
     in locale i test E2E girano contro il dev server su `localhost:3000`);
   - `ADMIN_EMAILS` con la tua email (allowlist admin — vuota = nessuno entra).
   - Il custom claim `email` nel session token (Clerk → Sessions → Customize
     session token: `{ "email": "{{user.primary_email_address}}" }`): senza di
     esso la CLI auth in CI fallisce e la sessione dev può comportarsi
     inaspettatamente.
   - Le chiavi Google (`GOOGLE_PLACES_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`) e
     le quote guard (`GOOGLE_PLACES_DAILY_QUOTA_LIMIT`, `GOOGLE_AUTOCOMPLETE_DAILY_QUOTA_LIMIT`)
     servono all'app (routing) e al badge quota; i test li **neutralizzano**
     (aiuto `route.fulfill` nelle baseline, v. §5) quindi non devi consumare
     quote per i test — ma una `.env` senza quelle chiavi può far rifiutare
     alcune rotte. Copia tutto da `.env.example` e valorizza.
4. **Browser Playwright**: `npx playwright install chromium webkit` (chromium
   per Desktop/Tablet/Mobile Chrome, webkit per Mobile Safari).
5. **Auth Clerk** (vedi §2.1 sotto): in locale serve UN login Google manuale
   che sedimenta la sessione nel profilo persistente.
6. I risultati si leggono da `playwright-report/` e `test-results/` (v. §3).

### 2.1 Auth E2E: le due modalità

Gestita da `e2e/auth.setup.ts` (project `auth-setup`). Tutti e 4 i project
replayano da `.e2e/storage-state/fullAdmin.json` (gitignored).

- **Locale** — `chromium.launchPersistentContext` sul profilo persistente
  `.e2e/ghost-scroll-profile`. La sessione richiede un login Google **una
  tantum**:
  ```bash
  node scripts/ghost-scroll-audit.mjs --login
  ```
  (apre un browser headed, fai il login, poi chiudi). ⚠️ La sessione Clerk dev
  ha **TTL breve (~3-4 min)**: se un setup/test rimbalza a `/sign-in` dopo una
  pausa, rifai `--login` e riparti. Con dev server longevo usa prima
  `npm run dev:clean`.
- **CI** — il job inietta `CLERK_TEST_TOKEN` (session JWT del test user,
  `7eightdev@gmail.com`, con claim `email` + nella `ADMIN_EMAILS`). Il setup fa
  `chromium.launch({headless:true})` → bootstrap dev-browser su `/` (attende il
  cookie `__clerk_db_jwt`) → `addCookies([__session=<TOKEN>, __client_uat=1])`
  → naviga `/admin/leads` → **normalizza** il cookie-jar solo-unsuffisso prima
  di `storageState()`. Se un token non viene accettato: controlla istanza
  (dev/test), claim `email`, utente in `ADMIN_EMAILS`.

---

## 3. Run quotidiano

### 3.1 DB e dev server

```bash
# 1. Postgres up (una volta per sessione)
docker start pg7eight

# 2. Migrazioni + fixture deterministica (DB fresco idealmente)
npx prisma migrate deploy        # applica le migrazioni
npm run db:seed                  # catalog + AVIS quote + fixture E2E (40 lead/16 quote)
```

`db:seed` è **idempotente** (upsert per id stabile): su un DB già popolato
*aggiunge* la fixture senza togliere nulla. Se aggiungi altri dati, il DB non
corrisponde più al "DB di cattura" delle baseline → le baseline vanno
rigenerate consapevolmente (v. §5).

```bash
# 3. Dev server (webServer di Playwright lo riusa con reuseExistingServer)
npm run dev            # Playwright lo riusa se già attivo
npm run dev:clean      # se hai toccato lo schema Prisma: rm -rf .next + next dev
```

> **Trap Prisma/Turbopack (AGENTS.md)**: dopo qualsiasi cambio a
> `prisma/schema.prisma` devi lanciare `npx prisma generate` **a mano** e
> riavviare con `npm run dev:clean`. Un client stale non esplode subito:
> `save(lead)`/`saveJob` falliscono in silenzio (`PrismaClientValidationError`,
> "Unknown argument ...") nei flussi fire-and-forget → `totalFound` salvato ma
> `leads written = 0` e job bloccati su `running`. È la prima cosa da
> sospettare in assenza di errori visibili.

### 3.2 Eseguire le suite

```bash
npm run lint                 # eslint
npm run typecheck            # tsc --noEmit
npm test                     # unit domain/application/infrastructure
npm run test:presentation    # unit componente (jsdom)
npm run test:e2e             # E2E completo (tutti gli spec, tutti i 4 project)
npm run test:visual          # solo baseline (read-only, veloce)
```

In locale Playwright gira con worker multipli (`workers` non impostato) e
`retries: 0`; in CI (`CI=1`) `workers:1`, `retries:2`, `forbidOnly`, reporter
`html`+`list`. Se vuoi un singolo spec:

```bash
npx playwright test e2e/lead-detail.spec.ts
npx playwright test e2e/screenshot-baselines.spec.ts --project="Desktop 1280x800"
```

L'ordine di esecuzione è sempre gestito dalle `dependencies` tra project
(`auth-setup` prima di tutti): non usare `--no-deps` (rompe il storageState).

### 3.3 Leggere i risultati

| Cosa | Dove | Come |
|---|---|---|
| Report HTML navigabile | `playwright-report/` | `npx playwright show-report` (o apri `index.html`) |
| Screenshot diff del matcher | `test-results/` | tripletto `actual-*` / `expected-*` / `diff-*` (PNG) per ogni fallimento |
| Trace della run ritentata | `test-results/.../trace.zip` | `npx playwright show-trace path/to/trace.zip` |
| Log di run | stdout della suite | il reporter `list` in locale, `list`+`html` in CI |

In CI i due step E2E e Visual hanno `continue-on-error: true` e un passo
**gate** finale che propaga il rosso; i dossier `playwright-report/` e
`test-results/` vengono caricati come artifact (retention 7 giorni) **solo su
failure**. Se la run è verde non ci sono artifact.

> ⚠️ `test-results/` viene **svuotato all'avvio di ogni run Playwright**. Se in
> CI il run E2E fallisce e poi parte il run Visual, i diagnostici del primo
> run vengono sovrascritti da quelli del secondo (v. tabella §8).

### 3.4 Retry e flake noti

- **Clerk dev TTL breve (~3-4 min)**: sessioni che si spengono a metà verifica →
  `node scripts/ghost-scroll-audit.mjs --login` e si riparte (rifare il login
  NON rigenera un bug; è infrastruttura Clerk dev).
- **`Execution context destroyed` su WebKit** con dev server longevo (HMR di
  sessione): si risolve con `npm run dev:clean` (dev server pulito).
- **Click perso pre-hydration** (dialog/modal/sheet): i test lo coprono con la
  guardia `toPass` (v. §4) — non è un flake da "tentare di nuovo", è compreso
  dal pattern.
- **`domcontentloaded` che non risolve** su `/admin/quotes` (WebKit, pagine
  pesanti): usare `waitUntil: "commit"` e lasciare che gli `expect` facciano
  l'attesa vera (documentato da MS-3.3 in poi).
- **Drift metrico sub-pixel 0.02–0.04** sui bordi glifo (rendering dark,
  contenuto identico): se non riprodotto al re-run è rumore, non una
  regressione (triage MS-5.5). Un **default stabile e noto** è
  `Mobile-Safari-375x667/quotes.png` a ratio ~0.03 (data-drift glifo, **non
  assorbito** — documentato in MS-5.4/5.5/5.8).

---

## 4. Come scrivere nuovi test E2E

Tutti gli spec vivono in `e2e/` (testDir di `playwright.config.ts`). Un file
nuovo viene eseguito automaticamente da `npm run test:e2e` su **tutti e 4 i
project**, autenticato via storageState. Per essere "CI-green" un test deve
dipendere **solo dalla fixture deterministica di MS-4.4**, mai da dati reali,
reti live o clock.

### 4.1 Struttura dei `describe` per project

I project sono già interamente gestiti dalla config: **niente loop manuali sui
device** dentro i test. Se un comportamento deve valere solo per un sottoinsieme
di apparecchi, si può:

```ts
import { test, expect } from "@playwright/test";
import { DEVICE_PROFILES } from "../presentation/lib/breakpoints";

test.describe("AdminHeader: hamburger + Sheet nav", () => {
  test("R2 — hamburger visibile < lg, nav desktop ≥ lg", async ({ page }) => {
    await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Lead" })).toBeVisible();
    const width = page.viewportSize()?.width ?? DEVICE_PROFILES.desktop;
    if (width >= BREAKPOINTS.lg) {
      await expect(page.getByRole("button", { name: "Apri il menu" })).toBeHidden();
    } else {
      await expect(page.getByRole("button", { name: "Apri il menu" })).toBeVisible();
    }
  });
});
```

Per saltare in modo **deliberato** un caso su certi project (es. il 4°,
Mobile Chrome, nelle baseline) si usa `test.skip` con guardia sul
`browserName`+viewport (vedi `e2e/screenshot-baselines.spec.ts:126`).

### 4.2 Pattern responsivo: flip con `setViewportSize` + computed style

Il flip è guidato dalla **media query**, non dal device del project: si cambia
viewport *dentro* il test e si asserisce sul **computed style**, mai solo sulle
classi (il contratto classi è il dominio dei test jsdom). Larghezze sempre dai
breakpoint canonici:

```ts
import { BREAKPOINTS } from "../presentation/lib/breakpoints";

const smMinus = BREAKPOINTS.sm - 1;   // 639
const smPlus = BREAKPOINTS.sm + 1;    // 641
const lgPlus = BREAKPOINTS.lg + 1;    // 1025

const kpiCols = () => kpi.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);

await page.setViewportSize({ width: smMinus, height: 800 });
await expect.poll(kpiCols).toBe(2);              // sotto sm: 2 colonne
await page.setViewportSize({ width: smPlus, height: 800 });
await expect.poll(kpiCols).toBe(3);              // da sm: 3 colonne
```

Esempi reali nel repo: flip tabella→card a 819/821 (`e2e/leads-table-flip.spec.ts`),
flip KPI a sm/lg su `e2e/lead-detail.spec.ts`, flip catalog 679/681 su
`e2e/catalog.spec.ts` (`TEST_BOUNDARIES.catalogGridFlip`), flip email/report a
1023/1025 su `e2e/email-report-preview.spec.ts`, landing below-the-fold su
`e2e/landing-below-fold.spec.ts`. Per i valori di layout si usano
`toBeVisible`/`toBeHidden` (a11y tree) oppure `toHaveCSS("display","grid")` /
`toHaveCSS("position","sticky")` quando il layout non ha corrispettivo
nell'a11y tree.

### 4.3 Pattern overflow: `expectNoHorizontalOverflow`

L'helper condiviso `e2e/helpers/layout.ts` verifica che nessun elemento
**interattivo** (`button, a, select, input, [role=…]`) del root tracimi la
viewport e che `main.scrollWidth ≤ main.clientWidth`. Filtra i falsi positivi:
nodi a size 0, `opacity:0`/`visibility:hidden`, e i cluster azioni slide-in
`[inert]`.

```ts
import { expectNoHorizontalOverflow } from "./helpers/layout";

await expectNoHorizontalOverflow(page);                                     // root = <main>
await expectNoHorizontalOverflow(page, {
  root: page.getByRole("toolbar", { name: "Filtri preventivi" }),
  label: "toolbar Filtri preventivi",                                       // regression mirato
});
```

Uso maturo: `e2e/layout-overflow.spec.ts` (matrice pagine × viewport sui 3
canonici), `e2e/quotes-toolbar.spec.ts`, `e2e/lead-detail.spec.ts`.

> **R5 — esclusione documentata**: `/admin/leads?status=qualified` è un falso
> positivo confermato (la riga filtri `w-[170px]` si comprime con flex-shrink).
> Su quella pagina niente assert di overflow, solo il contratto DOM
> (`flex-nowrap` + clear `shrink-0`, `e2e/quotes-toolbar.spec.ts:99`).

### 4.4 Pattern dialog/modal: guardia anti pre-hydration

I click che aprono dialog/modal/sheet possono andare persi se il listener React
non è ancora attaccato (trap MS-3.3). Si riprova finché l'evento non arriva:

```ts
const dialog = page.getByRole("dialog");
await expect(async () => {
  await row.click();
  await expect(dialog).toBeVisible();
}).toPass({ timeout: 15_000 });
```

Stesso pattern nel Sheet nav (`e2e/nav.spec.ts:55`) e nel quote-modal della
landing (`e2e/landing-below-fold.spec.ts`). Sui content dialog, gli assert
tollerano i due stati **skeleton vs contenuto** perché montano le stesse classi
di layout — si usa l'`.or()` di Playwright:

```ts
await expect(
  dialog.getByRole("heading", { name: "Anagrafica" }).or(dialog.locator(".animate-pulse").first())
).toBeVisible({ timeout: 15_000 });
```

(vedi `e2e/lead-detail.spec.ts:296`). Così il flip resta deterministico anche
se la fetch dei dati resta appesa nel dev-browser E2E.

### 4.5 Pattern "harvest" di dati dagli id: React fiber

Per recuperare il `lead.id` senza fetch né server action (che è flaky in
dev-browser), `e2e/lead-detail.spec.ts` risale il **React fiber** del trigger
"Azioni per …":

```ts
function readLeadIdFromFiber(el: HTMLElement): string | null {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const fiberKey = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  if (!fiberKey) return null;
  let fiber = (el as any)[fiberKey];
  for (let i = 0; i < 30; i++) {
    if (typeof fiber !== "object" || fiber === null) return null;
    const props = fiber.memoizedProps ?? fiber.pendingProps;
    if (typeof props?.id === "string" && uuidRe.test(props.id) && typeof props.companyName === "string") {
      return props.id;
    }
    fiber = fiber.return;
  }
  return null;
}
```

Il `harvestFirstLeadId` avvolge l'evaluate in `expect(...).toPass({ timeout: 15_000 })`
per coprire il pre-hydration (fiber assente finché React non monta). La guardia
uuid riflette l'invariante applicativa `leadIdSchema = z.string().uuid`: **mai**
harvestare o fixture-are id non-uuid (regressione reale scoperta al primo run
CI, MS-4.5).

### 4.6 Doppie navigazioni: `restorePristineClerkCookies` + guardia anti-rimbalzo

Un test che fa più navigazioni full-page nella stessa sessione deve ripristinare
il cookie-jar Clerk tra una e l'altra (trappola suffixed-cookie MS-3.4 + check
`SessionTokenIATBeforeClientUAT`). Il helper `restorePristineClerkCookies`
potà i cookie suffissi (`__client_uat_*`, `__clerk_db_jwt_*`, `__session_*`) e
resetta `__client_uat=1`. In test dove il bounce è transiente, la pagine viene
ricaricata una volta e si riprova. Come guardia da mettere in fondo a ogni test
admin:

```ts
await expect(page).not.toHaveURL(/sign-in/);
```

Sulle navigazioni usa `waitUntil: "commit"` (WebKit non risolve
`domcontentloaded` su pagine pesanti), tranne dove serve il DOM parsato
subito (vedi 4.7).

### 4.7 Conclusione dei `/sign-in` e altre norme trasversali

- Ogni test admin termina con `not.toHaveURL(/sign-in/)`: fotografare un
  rimbalzo Clerk non è un test valido.
- `getByRole` con `{ exact: true }` dove un label collide con testi di righe
  (es. il bottone "rifiutato" della toolbar vs "Segna il preventivo come
  rifiutato", `e2e/quotes-toolbar.spec.ts:57`).
- Le larghezze non sono mai hard-coded fuori da `DEVICE_PROFILES`/`BREAKPOINTS`/
  `TEST_BOUNDARIES`; le altezze a convenzione roadmap (800/1024/667, più 812
  Mobile Chrome).
- Non fare il `goto` con `waitUntil:"domcontentloaded"` su pagine WebKit-heavy
  salvo casi specifici; quando serve il DOM per `addStyleTag` dopo un `commit`
  non è parsato (`document.head === null`), quindi inietta dopo l'attesa h1
  (lezione MS-4.3).
- **Verifica finale di un nuovo spec**: prima su un solo project in locale
  (`npx playwright test e2e/mio.spec.ts --project="Desktop 1280x800"`), poi
  `npm run test:e2e` completo (dipende dalla fixture, si comporta in CI come in
  locale). `npm run lint` + `npm run typecheck` devono restare verdi.

---

## 5. Come customizzare le baseline visuali

Le baseline sono PNG **committati** in `e2e/screenshots/<ProjectName>/`
(`Desktop-1280x800/`, `Tablet-768x1024/`, `Mobile-Safari-375x667/`), catturati
da `e2e/screenshot-baselines.spec.ts` contro la fixture deterministica.
Matrice attuale: **12 baseline** = 9 canonici (`landing`, `leads`, `quotes` ×
3 project) + 3 **full-page** della landing (`landing-full.png`).

Lo spec:
- skip del 4° project (Mobile Chrome) con guardia su `browserName`+width —
  le baseline restano 3 viste × 3 project;
- per ogni vista: `emulateMedia({ colorScheme: "dark" })` (+ `reducedMotion:
  "reduce"` per la landing, che fa sostituire la `Aurora` WebGL con un div
  statico e congela gli `Reveal` framer-motion), `addInitScript` +
  `addStyleTag` con `DEV_TOOLS_HIDE_CSS` (nasconde il `<nextjs-portal>` di
  dev-tools, che in prod non esiste), e per le viste admin nessuna dipendenza
  dal contatore live: `page.route("**/admin/api/google-quota")` →
  `route.fulfill` con la fixture fissa (badge deterministico "Quota: 7/32");
- `waitForStablePage` = `document.fonts.ready` + (admin) risposta quota +
  tutti gli `img` `complete` (avatar Clerk remoto) + settle **700ms**;
- shot: `toHaveScreenshot("<name>.png", { fullPage: false, maxDiffPixelRatio:
  0.01 })`. Il nome **deve** portare l'estensione (Playwright la separa in
  `{arg}`/`{ext}`), `fullPage: true` per `landing-full`.
- `animations: "disabled"` è impostato in config (`playwright.config.ts`,
  `expect.toHaveScreenshot`), così cursor `animate-blink` e `animate-spin`
  sono congelati al primo keyframe.
- `snapshotPathTemplate: "{testDir}/screenshots/{projectName}/{arg}{ext}"`
  (niente token `{platform}`: il PNG committato funziona sia su locale sia su
  CI perché ogni project è motore singolo e le font sono self-hosted).

### 5.1 Aggiungere una vista canonica (baseline nuova)

1. Aggiungi la vista all'array `VIEWS` in `e2e/screenshot-baselines.spec.ts`
   (oppure un nuovo `test` nel describe dedicato, es. full-page).
2. Rigenera in modo **deliberato** con la pipeline (mai `--update-snapshots`
   a mano in un run normale):
   ```bash
   npm run test:e2e:update
   ```
   Lo script genera i 3 `--project=` canonici da `DEVICE_PROFILES`, esegue il
   solo spec baseline con `--update-snapshots`, e stampa il report con `git
   diff --stat` + `git status --short` di `e2e/screenshots/`. **Non
   auto-committa** (exit code = run Playwright).
3. Rivedi i PNG cambiati e committa **consapevolmente**:
   ```bash
   git add e2e/screenshots/ && git commit -m "test(responsive): update screenshot baselines"
   ```
4. Ri-valida con `npm run test:visual` (read-only, deve essere verde a
   parità di fixture).

Per rigenerare **solo le full-page** (senza toccare le altre baseline):
```bash
npx playwright test e2e/screenshot-baselines.spec.ts \
  --project="Desktop 1280x800" --project="Tablet 768x1024" --project="Mobile Safari 375x667" \
  -g "landing full-page" --update-snapshots
```
(pattern usato in MS-5.6 per non assorbire il drift noto di `quotes.png`).

### 5.2 Quando rigenerare

- dopo `npm run db:seed` (il DB è cambiato);
- dopo una **migrazione Prisma** (`npx prisma migrate dev` → `npx prisma
  generate` → restart `npm run dev:clean` — trap AGENTS.md);
- dopo **qualsiasi modifica visuale deliberata** alle 3 viste canoniche
  (landing `/`, `/admin/leads`, `/admin/quotes`) o ai loro componenti/stili;
- dopo **edit manuali al DB** che alterano il contenuto renderizzato.

### 5.3 Cosa dice un diff sui PNG

| Scenario | Cosa fare |
|---|---|
| Diff dopo un **cambio intenzionale** | Atteso: rivedi il byte-delta, committa le nuove baseline |
| Diff su run in cui **non è cambiato nulla** | **Regressione o data drift**: niente ri-baseline "per far verde"; triage sui `actual/expected/diff` in `test-results/` |
| Nessun diff su run pulito | Determinismo ri-verificato: le baseline sono ancora valide |
| Drift **cross-OS** (mac vs Linux) | v. §5.4 |

Il badge quota è l'unico dato volatile **neutralizzato** nelle baseline;
le altre viste admin leggono il DB reale (strategia (b) MS-4.1) — da qui la
regola 5.2.

### 5.4 Il flusso cross-OS (mai ri-catturare da mac)

Le baseline committate sono state catturate su **Linux**. Un run locale su
macOS può fallire con un **drift metrico sistematico 0.02–0.08** sopra la
soglia 0.01 (rasterizzazione font, anche su pagine statiche; verificato come
deterministico da retry a retry, v. `.github/workflows/capture-baselines.yml`).
WebKit è invece invariato tra OS (2 PNG Mobile-Safari byte-identici nel
cross-OS).

Procedura corretta:

1. **Non** assorbire in silenzio né ri-catturare da macOS.
2. Fare triage: contenuto identico + ratio stabile ai retry = drift di
   rasterizzazione, non regressione.
3. Se serve una vera ri-baseline, usare il workflow manuale
   `.github/workflows/capture-baselines.yml` (**workflow_dispatch**):
   - runner `ubuntu-latest`, stesso Postgres `16-alpine` e stessa fixture
     deterministica di MS-4.4, stessi secrets;
   - esegue `npm run test:e2e:update` scoped a `e2e/screenshot-baselines.spec.ts`;
   - produce l'artifact **`canonical-baselines-linux`** con i PNG di
     `e2e/screenshots/`;
4. Scarichi l'artifact, **sostituisci a mano** `e2e/screenshots/` (nessun
   auto-commit), committi le baseline Linux e ri-lanci `ci.yml`: atteso verde
   (Linux vs Linux).

### 5.5 Cosa NON fare (RED LINE)

- MAI `--update-snapshots` in un run normale (`npm run test:e2e`, `npm run
  test:visual`) né in CI: update-mode riscrive le baseline con "quel che rende
  ora" → una regressione vincerebbe invece di fallire e il cancello visuale
  diventerebbe un no-op.
- MAI ri-catturare le baseline da macOS per "far passare" il gate (v. §5.4).
- MAI ignorare che `test-results/` è sovrascritto a ogni run (v. §8).

---

## 6. Come customizzare la fixture deterministica

Tutto in `prisma/fixture.ts`, seedato da `npm run db:seed` (`prisma/seed.ts`
chiama `seedQuoteFixture()` + `seedLeadFixture()`). È la base su cui poggiano
sia le baseline sia la CI-green-ness dei test E2E: se la cambi, ri-genera le
baseline (§5.2) e verifica che ogni test continui a dipendere solo da essa.

### 6.1 Struttura (da NON rompere)

- **40 lead**: 32 filler deterministici (loop `i=1..32` su array
  `LEAD_COMPANIES`/`CATEGORIES`/`CITIES`, status/outreach/tech/copyright/etc.
  ciclati da pool) + 8 **showcase** manuali (`SHOWCASE`, indici 33..40) con
  varietà mirata di status/score/tech/ads/favorite. `FIXTURE_LEAD_COUNT = 40`,
  `FIXTURE_JOB_ID = "fixture-job-0001"`.
- **29 analisi**: solo per i lead che rendono un badge score (status
  `analyzed`/`qualified`/`discarded`; gli 8 showcase hanno score manuale, i
  filler da `SCORE_POOL`).
- **1 job terminale** `completed` (`buildFixtureJob`): nessun banner running,
  nessuna dipendenza dal clock — un job `running` diventerebbe stale dopo 20
  min e `reconcileStaleJobs` lo ribalterebbe facendo driftare gli screenshot.
- **16 quote** `buildFixtureQuotes`: status ciclati (6 draft/5 sent/4
  accepted/1 rejected), numeri `PREV-2026-015..030`, **tutti i `validUntil`
  nel futuro lontano (2030-01-01)** per tenere stabili bucket due-date e
  bottone "Segna scaduto" (`canExpire`).
- **Ordine di pagina**: `/admin/leads` ordina `createdAt DESC` (pagina 8) →
  gli 8 showcase (indici 33..40, `createdAt` = `LEAD_EPOCH + idx * 60_000`)
  sono proprio i lead della pagina 1 con la varietà più ricca. Se aggiungi lead,
  tieni conto di questa timeline.
- **Nessun dato reale**: siti `.example.com`, email/telefoni fittizi.

### 6.2 INVARIANTE CRITICO: gli id UUID

`leadIdSchema` (`z.string().uuid`) e `getLeadDetailAction` fanno fail su id
non-uuid ("Id lead non valido"). La fixture quindi usa:

- lead: `a0000000-0000-4000-8000-<idx a 12 cifre>` via `fixtureLeadId(n)`;
- quote: `b0000000-0000-4000-8000-<idx a 12 cifre>`.

> Chi modifica la fixture deve rispettare questo invariante: la regressione
> reale (fixture `fixture-lead-001`, id non-uuid) è stata scoperta al primo
> run CI e ha tenuto i test dialog su `role="alert"` (MS-4.5). Anche nei test
> E2E la guardia uuid del fiber-harvest deve restare (mai rilassarla).

### 6.3 Aggiungere/rimuovere lead o quote (prescritture)

- **Aggiungere un lead**: usa `fixtureLeadId(N)` (indice fuori da 1..40, es.
  un nuovo showcase in coda), mantenendo tutte le date nella timeline DESC.
  Se deve mostrare uno score, va accompagnato dalla sua `LeadAnalysis`
  (`buildFixtureAnalyses`); altrimenti nessun badge score.
- **Rimuovere/ridurre**: ogni riduzione cambia la pagina 1 di `/admin/leads` e
  quindi le baseline → rigenerale (§5.2). Non intaccare mai
  l'unico job `completed`.
- **Aggiungere una quote**: id `b0000000-…`, numero `PREV-2026-NNN`, status nel
  pool, `validUntil` 2030. Modificare la distribuzione degli status cambia i
  bucket della lista → ri-baseline.
- **Idempotenza**: tutto è upsert per id stabile. Su un DB già popolato il
  seed aggiunge; per riprodurre il "DB di cattura" esatto serve DB
  **fresco** (`migrate deploy` + `db:seed`).

---

## 7. Come customizzare la CI

### 7.1 Il gate `.github/workflows/ci.yml` (4 job paralleli)

| Job | Comando | Blocca |
|---|---|---|
| `lint` | `npm run lint` | errori ESLint |
| `typecheck` | `npm run typecheck` | errori di tipo |
| `unit` | `npm test` + `npm run test:presentation` | regress. unit/dominio/presentazione |
| `e2e-visual` | `npm run test:e2e` + `npm run test:visual` + **gate** | regressioni E2E e drift visuale |

Quello che devi sapere per modificarlo:

- **Secrets richiesti** (Settings → Secrets and variables → Actions):
  `CLERK_TEST_TOKEN`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`;
  `ADMIN_EMAILS` è **hardcoded** nel workflow. Esiste un passo "Check required
  secrets" fail-fast che fallisce subito se un secret manca: se aggiungi
  qualcosa che richiede un secret nuovo, valorizzalo lì (il testtoken in
  `CLERK_TEST_TOKEN` è un JWT per l'utente `7eightdev@gmail.com`, claim
  `email`).
- **Postgres effimero**: service `postgres:16-alpine` (user/pass/db
  `postgres/postgres/seven`), `DATABASE_URL` = `DIRECT_URL` =
  `postgresql://postgres:postgres@localhost:5432/seven`. La sequenza è
  `migrate deploy` → `db:seed` → suite.
- **`continue-on-error` + `Gate`**: gli step E2E (`id: e2e`) e Visual
  (`id: visual`) girano anche se il precedente fallisce, così un singolo run
  mostra entrambi; il passo `Gate` (`if: always()`) verifica gli **`outcome`**
  (non `conclusion`) dei due step e propaga il rosso. Se aggiungi un passo di
  test, aggiungi al gate il suo outcome.
- **Artifact su failure** (`if: failure()`): `playwright-report` e `test-results`
  (retention 7 giorni; MAI `.e2e/storage-state`, contiene il cookie di
  sessione).
- **Opzioni Playwright in CI**: `workers:1`, `retries:2`, `forbidOnly`, reporter
  `html`+`list`. Concurrency `ci-${{ github.ref }}` con `cancel-in-progress`.
- Il visual NEL gate esegue solo `e2e/screenshot-baselines.spec.ts` (le 12
  baseline) via `test:visual` (read-only). `test:e2e:update` **non compare mai**
  in CI (RED LINE).

### 7.2 Aggiungere uno spec al gate

`npm run test:e2e` è `npx playwright test` senza filtri su `testDir: ./e2e`:
**un nuovo file `.spec.ts` in `e2e/` entra automaticamente nel gate** (e in
tutti i 4 project). Non devi toccare il workflow. Casi particolari:

- **Nuovo screenshot nella vista canonica**: aggiungi la vista/il test in
  `e2e/screenshot-baselines.spec.ts` + rigenera e committa le baseline (§5.1).
  Se non committi il PNG, il gate fallirà con "Error: A snapshot doesn't exist".
- **Test che richiedono un secret nuovo**: valorizzalo nelle ENV del job
  `e2e-visual` e nel passo "Check required secrets".
- **Test più pesanti**: se servono più di 30 min (`timeout-minutes: 30` del
  job) alza anche lì il budget, ma prima chiediti se non stai sfruttando male
  la fixture.

### 7.3 Il workflow manuale `capture-baselines.yml`

Resta **workflow_dispatch** (nessun trigger automatico): ricattura i canonici
su ubuntu con la stessa fixture e produce l'artifact `canonical-baselines-linux`
(sostituzione manuale, v. §5.4). Se aggiungi una vista canonica, questo
workflow la rigenera automaticamente (esegue `test:e2e:update` sull'intero
spec baseline).

Console GitHub → Actions → "Capture baselines (manual)" → **Run workflow**
> branch → il run esegue `migrate deploy` + `db:seed` + `test:e2e:update` e
> carica l'artifact. Poi scarichi, sostituisci, committi.

---

## 8. Troubleshooting

| Errore | Causa probabile | Fix |
|---|---|---|
| `PrismaClientValidationError: Unknown argument ...` silenzioso in `save(lead)`/`saveJob`, `totalFound` salvato ma 0 lead | Client Prisma **stale** dopo un cambio schema (Turbopack ha cacheato il vecchio client in `.next/dev`) | `npx prisma generate` e restart `npm run dev:clean` |
| Setup/test rimbalza a `/sign-in` subito dopo `--login` | Sessione Clerk dev scaduta (TTL ~3-4 min) o login mai fatto | `node scripts/ghost-scroll-audit.mjs --login`, poi riparti |
| `CLERK_TEST_TOKEN rifiutato dal proxy Clerk` (CI) | Token non dell'istanza, o utente senza claim `email`, o email non in `ADMIN_EMAILS` | Rigenera un test token (Dashboard → API Keys → Test tokens) e ricontrolla claim + allowlist |
| `Execution context destroyed` su WebKit/`waitForStablePage` | Dev server longevo: HMR/navigazione di sessione (classico flake WebKit) | `npm run dev:clean` (e in CI il `retries:2` copre i transienti) |
| Fallimento visual su macOS con ratio 0.02–0.08, contenuto identico, stabile ai retry | Drift **cross-OS** di rasterizzazione font — la baseline è Linux | NON ri-catturare da mac: usa `capture-baselines.yml` (§5.4) |
| `npm run test:visual` fallito ma nessun diff utile in `test-results/` | `test-results/` **viene svuotato ad ogni nuova run Playwright**: se prima del triage parte un altro run (es. in CI: `test:e2e` poi `test:visual`) i diagnostic del primo vengono sovrascritti | Salva i file del run incriminato PRIMA di ri-lanciare; in CI guarda proprio l'artifact del run rosso |
| `domcontentloaded` che non risolve mai su `/admin/quotes` WebKit | Streaming Next + pagina pesante: il DOM è pronto ma l'evento non arriva | Usa `waitUntil: "commit"` e fai attendere gli `expect` |
| Dialog non si apre al primo click (flake intermittente) | Click perso **pre-hydration** (listener React non ancora attaccato) | Guardia `expect(async () => { click; toBeVisible(); }).toPass({ timeout: 15_000 })` (§4.4) |
| Dopo una doppia navigazione full-page il test rimbalza a `/sign-in` | Cookie suffissi Clerk + `__client_uat` rotato (trappola MS-3.4 / check IAT) | `restorePristineClerkCookies` tra le navigazioni + guardia `not.toHaveURL(/sign-in/)` (§4.6) |
| `addStyleTag` esplode con `TypeError: ... appendChild` | `document.head` null perché fatto subito dopo `waitUntil:"commit"` | Inietta il CSS di stabilità solo a pagina renderizzata (h1 visibile), come fa lo spec baseline |
| Baseline `Mobile-Safari-375x667/quotes.png` a ratio ~0.03 ricorrente | Data-drift dei bordi glifo documentato (contenuto identico) | NON assorbirlo con una ri-baseline "per far verde": è un default noto (MS-5.4/5.5/5.8); strumenta se vuoi rivedere la vista |
| `npx playwright test` fallisce e poi tutti i test admin falliscono dopo | Eventuale bounce auth di massa | Controlla la sessione Clerk (se TTL scaduto → `--login`), dev server con `dev:clean`, poi re-run isolato di un solo spec |
| Snapshot mancante `Error: A snapshot doesn't exist` in CI | Hai aggiunto una `toHaveScreenshot` senza committare la baseline | Rigenera con `npm run test:e2e:update`, committa i PNG (§5.1) |

Flake **noti ma compresi** (documentati in roadmap, non bug del test):
Clerk dev TTL davvero corto; `Execution context destroyed` WebKit su dev
server longevo; drift metrico sub-pixel occasionale non riprodotto al re-run
(= rumore, nessuna ri-baseline).

---

## 9. Riferimenti alla roadmap (per approfondire)

| Argomento | Dove nella roadmap |
|---|---|
| Matrice breakpoint & solo-source-of-truth | MS-1.1 (`presentation/lib/breakpoints.ts`) |
| Audit overflow locale / detector ghost-scroll | MS-1.3/1.4 (+ `scripts/ghost-scroll-audit.mjs`) |
| Unit presentazionale (jsdom, `renderAt`, `matchMedia` mock) | MS-2.1…MS-2.6 |
| 4 project Playwright + auth storageState | MS-3.1/MS-3.2 |
| Pattern flip/overflow/dialog/hydration | MS-3.3/MS-3.4/MS-3.5 |
| Screenshot canonici + determinismo (dark/animation/quota/dev-tools) | MS-4.1 (strategia (b)) |
| Pipeline update deliberate + "perché mai in CI" | MS-4.2 |
| `test:visual` read-only + hardening `DEV_TOOLS_HIDE_CSS` | MS-4.3 |
| Workflow CI + auth CI + fixture + per la cronaca del primo run reale | MS-4.4 (le 3 classi di problemi) / MS-4.5 |
| Unpack matrice copertura residua | MS-5.1 (censimento + `TEST_BOUNDARIES`) |
| QuoteComposer / lead detail+dialog / catalog / email-report / landing below-fold | MS-5.2 / MS-5.3 / MS-5.4 / MS-5.5 / MS-5.6 |
| Unit P2/P3 (LeadSearchForm, PairListEditor, QuoteComposer shell) | MS-5.7 |
| Chiusura MA-5 (numeri attuali delle suite) | MS-5.8 |
| Inventario tecnico componenti/glossario | Sezione "MAPPATURA MS-1.2" |