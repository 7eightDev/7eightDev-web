# Lead Generation — Guida Sviluppatore

> Guida tecnica per chi deve intervenire sul **Lead Generation System** di
> 7eightDev: estendere funzionalità, aggiungere provider, o fixare bug.
> La guida utente è in `docs/Lead Generation — Guida Utente.md`.

---

## Indice

1. [Panoramica architetturale](#1-panoramica-architetturale)
2. [Struttura delle cartelle](#2-struttura-delle-cartelle)
3. [Il flusso end-to-end (pipeline)](#3-il-flusso-end-to-end-pipeline)
4. [Data model (Prisma)](#4-data-model-prisma)
5. [Port e adapter: come aggiungere un provider](#5-port-e-adapter-come-aggiungere-un-provider)
6. [Server actions e route](#6-server-actions-e-route)
7. [UI: componenti e filtri](#7-ui-componenti-e-filtri)
8. [Configurazione ed env](#8-configurazione-ed-env)
9. [Gestione della quota Google](#9-gestione-della-quota-google)
10. [Job, stato e recovery](#10-job-stato-e-recovery)
11. [Testing](#11-testing)
12. [Troubleshooting & fix comuni](#12-troubleshooting--fix-comuni)
13. [Checklist prima di aprire un PR](#13-checklist-prima-di-aprire-un-pr)

---

## 1. Panoramica architetturale

Il sistema segue **Clean / Hexagonal Architecture** con dipendenze
**unidirezionali verso il core**:

```
domain (puro) → application (use case) → infrastructure (adapter) 
                                          presentation / app (framework)
```

- Il **domain** (regole di business, tipi, *port* = interfacce) non conosce
  framework, DB né API esterne.
- L'**application** orchestra i casi d'uso e le server actions.
- L'**infrastructure** implementa gli adapter concreti (Prisma, Google, …) e il
  **container DI** che le lega a runtime.

Regola d'oro: **mai importare** `@/infrastructure` o `@/application/lead` *dal*
domain. Il domain importa solo port (interfacce). I test del domain/application
usano implementazioni in-memory delle port (vedi sezione Testing).

Possibile refactoring futuro: nell'infrastructure esistono **due interfacce
`LeadGenerationJob`** — la forma piatta in `domain/lead/lead.types.ts` (usata
dal container e dalla UI) e quella annidata in
`domain/lead/lead-generation-job.types.ts` (usata dalla classe legacy
`ExecuteLeadGenerationJob`). Non sono allineate; se tocchi i job verifica quale
stai usando.

---

## 2. Struttura delle cartelle

| Percorso | Ruolo |
|---|---|
| `domain/lead/` | Tipi puri, regole (score, criteria, copyright, job), port: `lead.repository.ts`, `lead.discovery.ts`, `lead.pagespeed.ts`, `lead.tech.ts`, `lead.copyright.ts` |
| `application/lead/` | Use case + server actions: `admin.actions.ts`, `run-lead-generation-pipeline.ts`, `start-run-lead-job.ts`, `rerun-lead-generation-job.ts`, `export-leads.ts`, `create-quote-from-lead.ts`, `reconcile-stale-jobs.ts`, schemi Zod in `lead.schemas.ts` |
| `infrastructure/lead/` | Adapter concreti: `prisma-lead.repository.ts`, `in-memory-lead.repository.ts`, `lead.mapper.ts`, `discovery/` (`google-places-lead-discovery.ts`, `outscraper-*`), `pagespeed/google-pagespeed-insights.ts`, `tech-stack/html-tech-detector.ts`, `copyright/html-copyright-detector.ts` |
| `presentation/features/admin/leads/` | Componenti React (shadcn/ui) della UI |
| `app/(private)/admin/leads/` | Route: lista, dettaglio, nuovo job, export CSV, proxy autocomplete, modali |
| `infrastructure/container.ts` | Composizione delle dipendenze |

---

## 3. Il flusso end-to-end (pipeline)

Il punto d'ingresso orchestrato è
`application/lead/run-lead-generation-pipeline.ts`. Le fasi:

1. **Discovery** — `leadDiscovery.search(input)` → `DiscoveredLead[]`
   (provider attivo: Google Places Text Search, paginato, con quota guard).
2. **Normalizzazione + dedup** — per `websiteKey` (dominio normalizzato) e per
   nome+località quando non c'è sito.
3. **Persistenza** — ogni lead salvato come `new` (upsert, dedup in DB).
4. **Analisi** (solo per i lead **con sito**):
   a. PageSpeed (strategia `mobile`) → score + Web Vitals;
   b. rilevazione tech stack (marker HTML);
   c. rilevazione copyright (footer).
   d. **Qualificazione**: `score < 50 → qualified`, altrimenti `analyzed`
      (vedi `domain/lead/lead.score.ts`).
   e. salvataggio analisi + aggiornamento lead.
5. **Lead senza sito** → restano `new` (contattabili via telefono/email).
6. **Contatori del job** ricalcolati dal DB → job `completed`.
7. In caso di errore in una fase → job `failed`.

**Fire-and-forget**: `start-run-lead-job.ts` crea il job come `running` e
**non** attende la pipeline, così la richiesta HTTP torna subito. L'avanzamento
è tracciato a ogni analisi e la UI **polla** con `router.refresh()` (vedi
`live-job-refresher.tsx`, ogni 4 s) finché ci sono job non terminali.

> ⚠️ **Trappola nota**: la pipeline persiste l'avanzamento in modo
> "fire-and-forget" (promesse non await). Un **client Prisma stale** (vedi
> sezione Troubleshooting) può silenziosamente uccidere questi save e lasciare
> il job bloccato su `running`. Sempre aggiornare il client Prisma dopo le
> migrazioni.

---

## 4. Data model (Prisma)

Modelli nel file `prisma/schema.prisma`:

- **`Lead`** — `companyName`, `category?`, `website?`, `websiteKey?` (unique,
  dedup), `phone?`, `email?`, `address?`, `city?`, `source`
  (`google_maps|outscraper|serpapi`), `status` (`new|analyzed|qualified|discarded`),
  `analysisError?`, `techStack` (`String[]`), `copyright?`, `jobId?`.
  Relazioni: `analyses` (1:N), `job` (N:1, `SetNull` on delete).
- **`LeadAnalysis`** — `leadId` (FK), `strategy` (`mobile|desktop`),
  `performanceScore?`, `lcp?`, `fcp?`, `cls?`, `tbt?`, `analyzedAt`.
  Cascade delete da `Lead`.
- **`LeadGenerationJob`** — `query`, `location`, `quantity?`, `techStack?`,
  `copyright?`, `status` (`pending|running|completed|failed`), `totalFound`,
  `analyzed`, `qualified`, `favorite`, `startedAt?`, `completedAt?`, `error?`.
  Relazione `leads` (1:N).

Il mapping tra tipi domain e righe Prisma è in `infrastructure/lead/lead.mapper.ts`.
Nota: legge filtra i payload copyright tipo JS/CSS via `isCopyrightPayload`.

> ⚠️ **Prisma 7**: `prisma migrate dev` **non rigenera il client**. Dopo ogni
> modifica allo schema esegui `npx prisma generate`, poi **riavvia il dev server
> con cache pulita** (`rm -rf .next && npm run dev`). Un client stale genera
> `PrismaClientValidationError` ("Unknown argument …").

---

## 5. Port e adapter: come aggiungere un provider

Per aggiungere una nuova sorgente di discovery (es. SerpAPI):

1. **Estendi il tipo** `LeadSource` in `domain/lead/lead.types.ts` se serve
   un nuovo valore `source`.
2. **Crea l'adapter** in `infrastructure/lead/discovery/` che implementa la
   port `LeadDiscoveryPort` da `domain/lead/lead.discovery.ts`:
   ```ts
   interface LeadDiscoveryPort {
     search(input: LeadSearchInput): Promise<DiscoveredLead[]>;
   }
   ```
   Esistono già due implementazioni: `GooglePlacesLeadDiscovery`
   (attiva) e `OutscraperLeadDiscovery` (+ `outscraper-http-client.ts`, **non
   collegato**, richiede carta di credito).
3. **Registra il binding** in `infrastructure/container.ts` (campo
   `leadDiscovery`).
4. Aggiungi l'**etichetta Sorgente** in
   `presentation/features/admin/leads/lead-filters.ts`
   (`SOURCE_FILTER_LABEL`) e, se serve, la persistenza della sorgente.
5. **Test**: aggiungi un test unit per il nuovo adapter (mock degli HTTP) e
   assicurati che i test del pipeline restino verdi.

Pattern analogo per PageSpeed (`PageSpeedPort`), tech stack (`TechStackPort`),
copyright (`CopyrightPort`): crea l'adapter in infrastructure, bind nel
container, testa.

---

## 6. Server actions e route

**Server actions** in `application/lead/admin.actions.ts` (per la UI):

| Action | Uso |
|---|---|
| `startLeadGenerationAction` | Avvia un nuovo job (valida con Zod + rate limit) |
| `rerunLeadGenerationAction` | Rilancia un job esistente (rifiuta se `pending`/`running`) |
| `toggleJobFavoriteAction` | Pin/star di un job nella sidebar |
| `deleteJobAction` | Elimina un job (i lead restano, associazione azzerata) |
| `deleteLeadAction` | Elimina un lead |
| `getLeadDetailAction` | Lead + analisi per il pannello dettaglio |
| `createQuoteFromLeadAction` | Bozza preventivo da lead qualificato (redirect al composer) |

Le action validano gli input con gli **schemi Zod** in
`application/lead/lead.schemas.ts` e applicano **rate limiting** (container:
`leadGenerationRateLimiter` 5 req/min, `exportRateLimiter` 10 req/min).

**Route** in `app/(private)/admin/leads/`:

- `page.tsx` — lista (`force-dynamic`): riconcilia job stale, carica job + lead,
  applica filtri/sort, pagina (8/page).
- `new/page.tsx` — pagina form; con la **parallel route**
  `@modal/(.)new/page.tsx` il form si apre come **dialogo** quando navigi da
  dentro la sezione.
- `[id]/page.tsx` — dettaglio lead.
- `export/route.ts` — `GET` CSV export (rate-limited, filtri presi dalla URL).
- `new/location-autocomplete/route.ts` — proxy server-side di Google Places
  Autocomplete (keep la chiave lato server, check quota giornaliera).

---

## 7. UI: componenti e filtri

I componenti vivono in `presentation/features/admin/leads/`. I più rilevanti
per modifiche:

- `lead-search-form.tsx` — form di avvio job (client).
- `lead-filter-bar.tsx` — toolbar due righe + filtri avanzati (client, stato in
  URL).
- `lead-table.tsx` — tabella densa, colonne ordinabili, azioni per riga,
  apre `LeadDetailSheet`.
- `lead-detail-sheet.tsx` — pannello laterale (lazy load del dettaglio).
- `lead-job-drawer.tsx` / `lead-job-status.tsx` — elenco e card delle ricerche.
- `live-job-refresher.tsx` — polling `router.refresh()` (4 s) finché ci sono
  job non terminali.

**Logica di filtro/ordinamento**: `presentation/features/admin/leads/lead-filters.ts`
è **pura e unit-testabile** (nessun framework). Espone `filterLeads`, `sortLeads`,
parsers URL→tipi, `uniqueTechStacks`, `uniqueCopyrightYears`, ecc. Tutto lo stato
filtri vive nei **parametri URL**, così la pagina resta un Server Component.

Se aggiungi un nuovo filtro: definisci tipo + parser + label, gestiscilo in
`filterLeads`, esponilo nell'URL e aggiungi il controllo in `lead-filter-bar.tsx`,
e aggancialo all'`exportHref` se deve influenzare il CSV. Aggiorna il relativo
test in `application/lead/lead-filters.test.ts` (se i test filtri vivono lì).

---

## 8. Configurazione ed env

| Variabile | Uso |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Discovery Text Search + Autocomplete |
| `GOOGLE_PAGESPEED_API_KEY` | PageSpeed Insights (gratuita, nessun SKU fatturato) |
| `OUTSCRAPER_API_KEY` | Adapter Outscraper (non collegato) |
| `GOOGLE_PLACES_DAILY_QUOTA_LIMIT` | Max Text Search/day (default 32) |
| `GOOGLE_AUTOCOMPLETE_DAILY_QUOTA_LIMIT` | Max Autocomplete/day (default 322) |

Le chiavi sono in `.env.local` (gitignored); `.env.example` documenta le
variabili. L'area admin è protetta da **Clerk** (proxy middleware).

---

## 9. Gestione della quota Google

L'app chiama **API Google a pagamento** (Text Search, Autocomplete). Il
`DailyQuotaGuard` (in `infrastructure/shared/daily-quota-guard.ts`, istanza
condivisa in `infrastructure/container.ts` come `googleApiQuotaGuard`) blocca le
chiamate al raggiungimento del limite giornaliero, evitando il superamento
dell'allowance mensile gratuita per SKU.

- Bucket `places-text-search` → usato da `GooglePlacesLeadDiscovery` (1 check per
  pagina).
- Bucket `places-autocomplete` → usato dalla route `location-autocomplete`.
- `GooglePageSpeedInsights` **NON** è gated (API senza SKU fatturato).

Badge live in admin: `app/(private)/admin/api/google-quota/route.ts` (read-only)
+ componente `GoogleQuotaBadge` (polla ogni 15 s, ambra vicino al limite, rosso
a esaurimento).

I contatori sono su Postgres (tabella `api_quota_counters`), dietro il seam
`QuotaStore` (`infrastructure/shared/quota-store.ts`): in produzione lo store è
`PrismaQuotaStore`, nei test `InMemoryQuotaStore`. La chiave è
(bucket, giorno UTC), quindi il reset giornaliero è solo una chiave nuova e
l'`increment` è un `INSERT ... ON CONFLICT DO UPDATE` atomico — su serverless più
istanze incrementano lo stesso bucket in concorrenza e un read-modify-write
perderebbe chiamate.

> **Fail-closed**: se il DB non è raggiungibile la guardia **nega** la chiamata e
> il badge mostra il bucket come esaurito. Per un controllo di costo una feature
> bloccata è preferibile a una chiamata fatturata non conteggiata.

Dettagli completi e strategia di calcolo dei limiti: sezione "Google API Quota
Guard" in `AGENTS.md`.

---

## 10. Job, stato e recovery

- **Stati job**: `pending | running | completed | failed`.
- **Stale job**: `domain/lead/lead.job.ts` definisce `JOB_STALE_AFTER_MS` (20
  min) e `resolveJobStatus`, che declassa un job non-terminale più vecchio della
  soglia a `failed`.
- **Recovery**: `application/lead/reconcile-stale-jobs.ts` gira al **load della
  pagina admin** e marca come `failed` i job orfani così smettono di apparire
  "in corso".
- **Rerun**: `rerun-lead-generation-job.ts` riusa lo stesso job ID e
  **ricontrolla i lead già presenti** (ri-qualificazione) invece di duplicarli.
- Il `saveJob` del repository (`prisma-lead.repository.ts`) esclude
  deliberatamente `favorite` dall'update per non sovrascrivere il pin dell'utente.

Quando tocchi i job, fai attenzione alla **duplicazione di interfacce** già
segnalata in §1: il container e la UI usano la forma piatta di `lead.types.ts`.

---

## 11. Testing

Framework: **Jest**. Comandi:

```bash
npm test -- --runInBand     # test (usa --runInBand per evitare race su DB in-memory/file)
npm run lint
npx tsc --noEmit
npm run build
```

Principi:
- I test di **domain/application** usano repository/adapter **in-memory**
  (`infrastructure/lead/in-memory-lead.repository.ts`,
  `in-memory-lead-generation-job.repository.ts`) per non toccare Prisma.
- Gli **adapter** (Google Places, PageSpeed, tech, copyright) si testano con
  **mock** delle risposte HTTP.
- `lead-filters` ha i **test puri** della logica di filtro/sort.
- Nuovi use case → nuovo file `*.test.ts` accanto.

> I test usano flag sul DB? Verifica nel singolo file. Se tocchi la pipeline o
> i repository, esegui tutta la suite `--runInBand`.

---

## 12. Troubleshooting & fix comuni

**Il job resta `running` per sempre e i lead scritti sono 0.**
Client Prisma **stale**. Dopo `prisma generate`/migrazione la dev cache
(Turbopack, `.next/dev`) conserva il client vecchio e i `save` fire-and-forget
lanciano `PrismaClientValidationError` non gestiti, uccidendo la pipeline.
Fix:
```bash
npx prisma generate
rm -rf .next && npm run dev
```

**Tutti i lead finiscono `scartati` / errore PageSpeed.**
Controlla `GOOGLE_PAGESPEED_API_KEY` e che l'URL caricato sia raggiungibile.
Timeout 60 s voluto (siti lenti = lead interessanti) — non ridurlo se non
necessario.

**Il job fallisce con "quota esaurita".**
`DailyQuotaGuard` ha raggiunto il limite giornaliero (vedi badge in alto o la
tabella `api_quota_counters`). Attendi il day-change (reset automatico) o, se
stai testando, alza i limiti / elimina la riga del bucket per risincronizzare.
Vedi `AGENTS.md` per i valori. Il rilevamento del cambio giorno è automatico.

Se invece la quota risulta esaurita **subito**, sospetta il DB: la guardia è
fail-closed e riporta il bucket a zero residuo quando non riesce a leggere il
contatore. Controlla che la migration `api_quota_counters` sia applicata.

**L'autocomplete non risponde (HTTP 429).**
Quota `places-autocomplete` esaurita (un consumo per keystroke, debounce 250
ms). Colpisce rapidamente vicino alle 322 chiamate/giorno.

**Il job non riappare/la lista non si aggiorna.**
Il `LiveJobRefresher` smette di pollare quando tutti i job sono terminali. Se un
job è rimasto `running` senza recovery, la pagina admin lo marca `failed` al
reload (vedi §10).

**Cambiato un limite quota ma i contatori non cambiano.**
I limiti sono letti dall'env alla costruzione e non sono persistiti, quindi la
modifica ha effetto subito: sul DB c'è solo il conteggio `used`. Per azzerarlo,
elimina la riga del bucket da `api_quota_counters`.

---

## 13. Checklist prima di aprire un PR

- [ ] Nuovi adapter implementano la port corretta e sono bindati nel container;
      i provider obsoleti non rompono i test.
- [ ] Se cambi lo schema Prisma: `npx prisma generate` + nota nel PR di dover
      riavviare con `rm -rf .next` (vedi AGENTS.md).
- [ ] Se aggiungi filtri: tipo + parser + `filterLeads` + controllo UI + test puri.
- [ ] Se tocchi la quota Google: capisci l'impatto sulla guardia e sui contatori
      in `api_quota_counters`; non esporre mai le chiavi.
- [ ] `npm test -- --runInBand`, `npm run lint`, `npx tsc --noEmit`,
      `npm run build` tutti verdi.
- [ ] Nessun import di `@/infrastructure` o `@/application` nel `domain`.
- [ ] Nessun commento superfluo aggiunto (rispetta lo stile del codice).
