# Lead Generation Mini-Project

Pipeline B2B automatica di **prospezione e qualificazione lead** per uno studio
web. Partendo da una nicchia + località, il sistema scopre aziende, analizza le
loro performance web con **PageSpeed Insights**, qualifica i lead e li converte
in **bozze di preventivo** pre-compilate — il tutto con un'architettura pulita,
tipizzata e coperta da test.

> Documento di sintesi del mini-progetto Lead Generation di 7eightDev.
> Pensato per essere estratto e reso autonomo come portfolio/curriculum project.

---

## Il problema

Acquisire nuovi clienti per uno studio web è lento e manuale: trovare aziende
nella nicchia giusta, aprire il loro sito, controllare se è performante e
contattarle. Chi ha un **sito lento** è il candidato ideale a cui vendere un
intervento di ottimizzazione o rifacimento — ma capirlo per decine di aziende a
mano richiede ore.

Questo progetto **automatizza l'intero ciclo**:

```
Scopri aziende      → Analizza il sito    → Qualifica     → Preventivo
(nicchia + luogo)     (PageSpeed Core         (score < 50)     (bozza pre-compilata)
                       Web Vitals)
```

## Cosa fa

1. **Discovery** — trova business in una nicchia/località via Google Places
   (Text Search New): nome, categoria, telefono, sito, indirizzo, città.
2. **Analisi** — per ogni sito, misura le Core Web Vitals con PageSpeed
   Insights (performance, LCP, FCP, CLS, TBT).
3. **Qualificazione** — un lead è `qualified` se il performance score < 50
   (sito lento = opportunità commerciale). Gli altri restano `analyzed` o
   `new`.
4. **Export** — scarica i lead qualificati in CSV (RFC 4180, compatibile
   Excel).
5. **Quote Integration** — da un lead qualificato, con un click l'admin crea
   una **bozza preventivo** pre-compilata: cliente già valorizzato, servizi
   del catalogo suggeriti in base alla gravità del problema, scadenza +30
   giorni. L'admin la revisiona nel composer prima di inviarla.

## Stack

- **Next.js 16** (App Router, React 19, Server Actions)
- **TypeScript strict**
- **Prisma + PostgreSQL**
- **Google Places API** (Text Search New) — discovery provider V1
- **PageSpeed Insights API** — qualificazione
- **shadcn/ui** — componenti admin
- **Jest** — test

## Architettura

Clean / **Domain-Driven Design** con dipendenze unidirezionali verso l'interno:
la logica di business (`domain`) e i casi d'uso (`application`) non dipendono da
framework, DB o API esterne — dipendono solo da **port** (interfacce). Le
implementazioni concrete (API, Prisma) vivono in `infrastructure` e vengono
legate a runtime in un **container DI**.

```
domain          — entità, value object, port (repository/discovery/analisi)
application     — use case + server actions (mappano i comportamenti)
infrastructure  — adapter: Google Places, PageSpeed, Prisma, DI container
presentation    — componenti React (shadcn/ui), pagine admin
```

### Casi d'uso principali

| Caso d'uso | File |
|---|---|
| Pipeline discovery → analisi → qualificazione | `application/lead/run-lead-generation-pipeline.ts` |
| Esecuzione di un job (per batch) | `application/lead/execute-lead-generation-job.ts` |
| Export CSV lead qualificati | `application/lead/export-leads.ts` |
| Preventivo da lead qualificato | `application/lead/create-quote-from-lead.ts` |

### Providers

- **Google Places Lead Discovery** (`GooglePlacesLeadDiscovery`) — provider
  attivo. Non fornisce email (accettabile per V1).
- **Outscraper** (`OutscraperHttpClient` + `OutscraperLeadDiscovery`) — adapter
  alternativo con email, presente nel codice ma non collegato (richiede carta
  di credito). Si riattiva cambiando il binding nel container.

## Hosting & sicurezza

- Area admin protetta da **Clerk** (proxy middleware).
- API key in `.env.local` (gitignored); `.env.example` documenta le variabili:
  `GOOGLE_PLACES_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`, `OUTSCRAPER_API_KEY`.

## Test

**204 test** complessivi (28 suite), inclusi i 13 del use case
`createQuoteFromLead`, 6 dell'export CSV e 13 dell'adapter Google Places.
Lint, typecheck e build tutti verdi.

```bash
npm test -- --runInBand
npm run lint
npx tsc --noEmit
npm run build
```

## Cosa mostra

- **Qualificazione basata su metriche reali** (Core Web Vitals), non su
  giudizi — un dato oggettivo e verificabile da mostrare al prospect.
- **Architettura pulita e testabile**: port + adapter + DI, provider
  intercambiabili.
- **Automatizzazione di un business loop reale** con riuso di componenti
  esistenti (Catalog e Quote System).
