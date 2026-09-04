# 7eightDev — Lead Generation Mini-Project

> Documento di contesto operativo del mini-progetto.
>
> Questo file deve essere mantenuto aggiornato durante tutto lo sviluppo.
> Quando si apre una nuova chat/sessione, incollare questo documento come contesto iniziale.

---

# 1. Obiettivo del progetto

Realizzare all'interno del progetto 7eightDev un sistema automatizzato di **lead generation**, utilizzabile dall'area amministrativa privata.

Obiettivo della V1:

```text
NICCHIA + LOCALITÀ + QUANTITÀ
              │
              ▼
       LEAD DISCOVERY
              │
              ▼
       NORMALIZZAZIONE
              │
              ▼
        DEDUPLICAZIONE
              │
              ▼
         PAGESPEED
              │
              ▼
        QUALIFICAZIONE
              │
              ▼
          DATABASE
              │
              ▼
         ADMIN UI
              │
              ▼
      LEAD QUALIFICATI
```

Esempio:

```text
Nicchia:    Dentisti
Località:   Milano
Quantità:   100
```

Il sistema deve cercare aziende della nicchia/località indicata, recuperare i dati disponibili, individuare il sito web, analizzarlo e identificare automaticamente i lead che rappresentano una potenziale opportunità commerciale per 7eightDev.

---

# 2. Tecnologia

Il progetto deve essere sviluppato **interamente in TypeScript/Node.js**.

Python NON viene utilizzato.

Stack esistente:

- Next.js
- TypeScript
- Prisma
- Jest
- shadcn/ui
- PostgreSQL/database già utilizzato dal progetto
- architettura Clean/Hexagonal già presente

---

# 3. Architettura esistente

Il progetto segue una separazione:

```text
app
  ↓
presentation
  ↓
application
  ↓
domain
  ↓
infrastructure
```

Struttura concettuale:

```text
app/
    routing Next.js

presentation/
    UI e feature

application/
    use case e orchestrazione

domain/
    business rules, types, ports

infrastructure/
    Prisma, API esterne, adapter concreti
```

La nuova funzionalità Lead Generation deve rispettare questo modello.

NON introdurre una nuova architettura parallela.

---

# 4. UI

La UI dell'area amministrativa utilizza **shadcn/ui**.

La nuova sezione Lead Generation dovrà utilizzare:

```text
shadcn/ui
```

e mantenere i pattern visuali e architetturali già presenti nel progetto.

Quando sarà necessario progettare una nuova pagina/form/table e non sarà chiaro il pattern esistente, chiedere all'utente un componente o una pagina esistente come template.

---

# 5. Vincolo Git

Questo è un requisito fondamentale.

Il mini-progetto è isolato da `main`.

Struttura:

```text
main
  │
  └── feat/lead-generation
          │
          ├── feat/lead-generation-domain
          ├── feat/lead-generation-persistence
          ├── feat/lead-generation-discovery
          ├── feat/lead-generation-pagespeed
          ├── feat/lead-generation-pipeline
          ├── feat/lead-generation-jobs
          ├── feat/lead-generation-admin
          ├── feat/lead-generation-export
          ├── feat/lead-generation-quotes
          └── feat/lead-generation-hardening
```

## Regole

1. `main` rimane stabile durante tutto il progetto.
2. `feat/lead-generation` è il branch contenitore dell'intero mini-progetto.
3. Ogni task viene sviluppato in un branch separato.
4. Ogni branch task nasce da `feat/lead-generation`.
5. Ogni task deve essere testato e validato.
6. Solo dopo la validazione il task viene mergiato in `feat/lead-generation`.
7. I task NON vengono mergiati direttamente in `main`.
8. `main` riceverà il merge del progetto soltanto alla fine.
9. Prima del merge finale in `main` deve essere verificata l'intera suite.

## Merge finale

Alla fine:

```text
feat/lead-generation
        │
        │ tutti i task completati
        │ tutti i test verdi
        │ lint verde
        │ typecheck verde
        │ build verde
        ▼
      main
```

Preferenza:

```bash
git merge --no-ff feat/lead-generation
```

per mantenere visibile il mini-progetto nella storia Git.

---

# 6. Metodo di sviluppo

Il progetto deve essere sviluppato **passo passo**.

Non fornire grandi quantità di codice da implementare tutte insieme.

Per ogni micro-step:

1. spiegare cosa stiamo facendo;
2. spiegare brevemente perché;
3. indicare i file coinvolti;
4. fornire il codice necessario;
5. far eseguire i test/check;
6. attendere la conferma dell'utente;
7. procedere al micro-step successivo.

Quando appropriato usare TDD:

```text
RED
 ↓
implementazione minima
 ↓
GREEN
 ↓
REFACTOR
```

Non procedere al task successivo finché il precedente non è validato.

---

# 7. Definition of Done

Un task è concluso quando:

```text
[ ] implementazione completata
[ ] test specifici completati
[ ] intera suite Jest verde
[ ] lint verde
[ ] typecheck verde
[ ] build verde
[ ] nessuna regressione
[ ] commit effettuato
[ ] branch mergiato in feat/lead-generation
```

Dopo il merge:

```text
[ ] branch task eliminato, se opportuno
[ ] stato Git verificato
```

---

# 8. Modello concettuale V1

Il dominio iniziale comprende tre concetti principali:

```text
Lead
LeadAnalysis
LeadGenerationJob
```

---

# 9. Lead

`Lead` rappresenta un'azienda acquisita dal sistema.

Campi iniziali:

```text
id
companyName
category
website
phone
email
address
city
source
status
createdAt
updatedAt
```

Source iniziale:

```ts
type LeadSource = 'google_maps' | 'outscraper' | 'serpapi';
```

Status iniziale:

```ts
type LeadStatus = 'new' | 'analyzed' | 'qualified' | 'discarded';
```

`qualified` NON significa cliente.

Significa:

> il lead supera i criteri di qualificazione definiti dal sistema.

---

# 10. LeadAnalysis

`LeadAnalysis` rappresenta una singola analisi tecnica del sito.

Campi iniziali:

```text
id
leadId
strategy
performanceScore
lcp
fcp
cls
tbt
analyzedAt
```

Strategy:

```ts
'mobile' | 'desktop';
```

Per la V1 la qualificazione parte dal Performance Score.

Gli altri valori devono comunque essere conservati perché potranno essere utilizzati in futuro.

---

# 11. LeadGenerationJob

`LeadGenerationJob` rappresenta una ricerca avviata dall'admin.

Campi:

```text
id
query
location
status
totalFound
analyzed
qualified
startedAt
completedAt
error
createdAt
```

Status:

```ts
type LeadGenerationJobStatus = 'pending' | 'running' | 'completed' | 'failed';
```

Esempio:

```text
Query:       Dentisti
Location:    Milano
Status:      completed

Trovati:     247
Analizzati:  193
Qualificati: 57
```

Il job dovrà permettere in futuro elaborazioni asincrone e non dovrà dipendere da una singola request HTTP lunga.

---

# 12. Lead Qualification V1

Regola iniziale:

```text
Performance 0–49
        ↓
qualified
```

```text
Performance 50–100
        ↓
not_qualified
```

```text
Performance assente/errore
        ↓
not_qualified
```

La funzione attualmente prevista:

```ts
calculateLeadQualification(
  performanceScore: number | undefined
): LeadQualification
```

con:

```ts
type LeadQualification = 'qualified' | 'not_qualified';
```

Questa logica deve essere progettata per poter essere estesa.

In futuro potranno essere aggiunti:

- LCP
- FCP
- CLS
- TBT
- SEO
- HTTPS
- segnali tecnici
- segnali commerciali
- altri criteri

Non complicare la V1 prematuramente.

---

# 13. Discovery

La discovery deve essere astratta tramite un port.

Concettualmente:

```ts
interface LeadDiscoveryPort {
  search(input: LeadSearchInput): Promise<DiscoveredLead[]>;
}
```

L'application layer non deve conoscere il provider concreto.

Possibili adapter:

```text
infrastructure/lead/
├── discovery/
│   ├── outscraper-lead-discovery.ts
│   └── serpapi-lead-discovery.ts
```

Il provider definitivo NON è ancora stato scelto.

Prima definire il port, poi implementare il provider.

---

# 14. PageSpeed

PageSpeed deve essere astratto:

```text
Application
     ↓
PageSpeedPort
     ↑
Infrastructure
     ↓
Google PageSpeed Insights API
```

L'application/domain non devono dipendere direttamente da Google.

L'adapter concreto sarà responsabile di:

- chiamata API
- parsing JSON
- normalizzazione risultato
- timeout
- error handling
- eventuali retry
- URL non validi
- risultati incompleti

---

# 15. Pipeline prevista

Pipeline concettuale:

```text
LeadGenerationJob
        │
        ▼
Discovery
        │
        ▼
DiscoveredLead[]
        │
        ▼
Normalization
        │
        ▼
Deduplication
        │
        ▼
Lead persistence
        │
        ▼
PageSpeed analysis
        │
        ▼
LeadAnalysis
        │
        ▼
Qualification
        │
        ▼
Lead status
```

---

# 16. Integrazione con Catalog e Quote

Questa parte è prevista ma NON deve essere anticipata rispetto alla V1.

Obiettivo futuro:

```text
Lead
 ↓
Problemi tecnici
 ↓
Servizio compatibile dal Catalog
 ↓
Quote draft
 ↓
Invio
```

Il sistema deve riutilizzare l'architettura Quote esistente.

NON duplicare la logica dei preventivi.

Il Lead Generation module deve diventare un nuovo utilizzatore dei servizi Quote esistenti.

---

# 17. Roadmap dei task

## TASK 1 — Domain

Branch:

```text
feat/lead-generation-domain
```

Obiettivo:

Definire il dominio Lead senza database e senza provider esterni.

File previsti:

```text
domain/lead/
├── lead.types.ts
├── lead.score.ts
├── lead.score.test.ts
├── lead.repository.ts
├── lead-generation-job.types.ts
├── lead-generation-job.repository.ts
└── lead.errors.ts
```

### Stato

🟡 IN CORSO

Già completato:

```text
[x] Lead types iniziali
[x] LeadAnalysis types iniziali
[x] LeadGenerationJob types iniziali
[x] LeadQualification
[x] calculateLeadQualification()
[x] test score 49
[x] test score 0
[x] test score 50
[x] test score 100
[x] test score undefined
```

Da completare:

```text
[ ] eventuali test aggiuntivi sul dominio
[ ] eventuale validazione finale del task
[ ] Jest completo
[ ] lint
[ ] typecheck
[ ] build
[ ] commit
[ ] merge in feat/lead-generation
```

---

# 18. TASK 2 — Persistence

Branch:

```text
feat/lead-generation-persistence
```

Obiettivo:

Implementare persistenza Prisma per:

```text
Lead
LeadAnalysis
LeadGenerationJob
```

Attività:

```text
[ ] schema Prisma
[ ] migration
[ ] generated Prisma types
[ ] Lead mapper
[ ] Lead repository interface verification
[ ] PrismaLeadRepository
[ ] repository tests
[ ] eventuale in-memory repository
[ ] Job repository
[ ] test suite
[ ] lint
[ ] typecheck
[ ] build
[ ] commit
[ ] merge
```

Il pattern deve seguire i repository già presenti nel progetto.

---

# 19. TASK 3 — Discovery

Branch:

```text
feat/lead-generation-discovery
```

Obiettivo:

Implementare la ricerca delle aziende.

Attività:

```text
[ ] definire LeadDiscoveryPort
[ ] definire input/output
[ ] definire DiscoveredLead
[ ] scegliere provider
[ ] configurazione environment variables
[ ] adapter provider
[ ] mapping/normalizzazione
[ ] gestione errori
[ ] test adapter dove appropriato
[ ] test application
[ ] lint
[ ] typecheck
[ ] build
[ ] commit
[ ] merge
```

Provider iniziali candidati:

```text
Outscraper
SerPAPI
```

La scelta deve essere fatta prima dell'implementazione concreta.

---

# 20. TASK 4 — PageSpeed

Branch:

```text
feat/lead-generation-pagespeed
```

Obiettivo:

Integrare Google PageSpeed Insights API.

Attività:

```text
[x] definire PageSpeedPort
[x] definire input/output
[x] implementare Google adapter
[x] parsing response
[x] Performance Score
[x] LCP
[x] FCP
[x] CLS
[x] TBT
[x] mobile strategy
[x] timeout
[x] error handling
[x] eventuale retry
[x] test
[x] lint
[x] typecheck
[x] build
[x] commit
[x] merge
```

---

# 21. TASK 5 — Pipeline

Branch:

```text
feat/lead-generation-pipeline
```

Obiettivo:

Collegare discovery, persistence, PageSpeed e qualification.

Flusso:

```text
Discovery
 ↓
Normalize
 ↓
Deduplicate
 ↓
Persist Lead
 ↓
PageSpeed
 ↓
Persist Analysis
 ↓
Qualification
 ↓
Update Lead
```

Attività:

```text
[x] application use case
[x] dependency injection
[x] orchestrazione
[x] gestione errori per singolo lead
[x] aggiornamento contatori Job
[x] test use case
[x] test error scenarios
[x] suite
[x] lint
[x] typecheck
[ ] build
[ ] commit
[ ] merge
```

---

# 22. TASK 6 — Jobs

Branch:

```text
feat/lead-generation-jobs
```

Obiettivo:

Evitare pipeline lunghe dentro una singola request HTTP.

Attività:

```text
[ ] definire lifecycle Job
[ ] pending
[ ] running
[ ] completed
[ ] failed
[ ] progress
[ ] retry strategy
[ ] error persistence
[ ] execution mechanism compatibile con deployment
[ ] idempotenza
[ ] gestione job duplicati
[ ] test
[ ] lint
[ ] typecheck
[ ] build
[ ] commit
[ ] merge
```

La soluzione concreta dovrà essere compatibile con l'infrastruttura di deployment del progetto.

---

# 23. TASK 7 — Admin UI

Branch:

```text
feat/lead-generation-admin
```

Obiettivo:

Creare l'interfaccia amministrativa.

Route prevista:

```text
/admin/leads
```

Possibili componenti:

```text
presentation/features/admin/leads/
├── lead-search-form.tsx
├── lead-table.tsx
├── lead-detail.tsx
├── lead-score.tsx
└── ...
```

Funzionalità V1:

```text
[ ] form ricerca
[ ] query
[ ] location
[ ] quantità
[ ] avvio Job
[ ] stato Job
[ ] progress
[ ] lista Lead
[ ] filtro status
[ ] filtro score
[ ] dettaglio Lead
[ ] dati azienda
[ ] sito
[ ] dati PageSpeed
[ ] qualification
```

Usare shadcn/ui.

Prima della costruzione della UI verificare i pattern delle pagine admin esistenti.

---

# 24. TASK 8 — Export

Branch:

```text
feat/lead-generation-export
```

Obiettivo:

Esportare i lead qualificati.

Possibili formati:

```text
CSV
Excel
```

La decisione definitiva verrà presa quando arriveremo al task.

Dati esportabili:

```text
company
category
website
phone
email
address
city
performance
LCP
FCP
CLS
TBT
qualification
source
```

---

# 25. TASK 9 — Quote Integration

Branch:

```text
feat/lead-generation-quotes
```

Obiettivo:

Integrare Lead Generation con Catalog e Quote.

Possibile flusso:

```text
Lead
 ↓
Analisi
 ↓
Problemi rilevati
 ↓
Servizio Catalog compatibile
 ↓
Create Quote draft
```

Attività:

```text
[ ] definire relazione Lead → Quote
[ ] definire selezione servizi
[ ] riutilizzare catalog
[ ] riutilizzare quote use case
[ ] creare draft quote
[ ] eventuale UI
[ ] test
[ ] lint
[ ] typecheck
[ ] build
[ ] commit
[ ] merge
```

---

# 26. TASK 10 — Hardening

Branch:

```text
feat/lead-generation-hardening
```

Obiettivo:

Rendere il sistema robusto per uso reale.

Checklist:

```text
[ ] validazione input
[ ] rate limiting dove necessario
[ ] gestione API limits
[ ] timeout
[ ] retry
[ ] idempotenza
[ ] deduplica
[ ] logging
[ ] error tracking
[ ] sicurezza secrets
[ ] validazione URL
[ ] gestione domini non raggiungibili
[ ] gestione API failure
[ ] gestione job failure
[ ] test edge cases
[ ] test regressione
[ ] lint
[ ] typecheck
[ ] build
```

---

# 27. Stato globale del progetto

Aggiornare questa sezione dopo ogni task.

```text
TASK 1 — Domain
✅ COMPLETATO

TASK 2 — Persistence
✅ COMPLETATO

TASK 3 — Discovery
✅ COMPLETATO

TASK 4 — PageSpeed
✅ COMPLETATO

TASK 5 — Pipeline
✅ COMPLETATO

TASK 6 — Jobs
✅ COMPLETATO

TASK 7 — Admin UI
✅ COMPLETATO

TASK 8 — Export
✅ COMPLETATO

TASK 9 — Quote Integration
⚪ NON INIZIATO

TASK 10 — Hardening
⚪ NON INIZIATO

FINAL INTEGRATION → main
⚪ NON INIZIATO
```

---

# 28. Stato Git corrente

Branch contenitore:

```text
feat/lead-generation
```

Branch operativo:

```text
feat/lead-generation-outscraper
```

Il branch operativo nasce da `feat/lead-generation` (task per il client HTTP
Outscraper). `feat/lead-generation` contiene tutti i task 1-7 e NON deve essere
modificato fino al completamento dell'intero progetto.

`main` NON deve essere modificato fino al completamento dell'intero progetto.

---

# 29. Regola per le nuove sessioni

Quando si apre una nuova chat:

1. fornire questo documento come contesto;
2. leggere la sezione "Stato globale del progetto";
3. leggere "Stato Git corrente";
4. identificare il primo task `🟡 IN CORSO`;
5. NON ripartire da zero;
6. NON creare task già completati;
7. chiedere eventualmente lo stato Git/test se necessario;
8. continuare dal micro-step successivo.

Il modello deve comportarsi come un **pair programmer/TDD guide** e accompagnare l'utente passo passo.

---

# 30. Regola fondamentale

Non sacrificare l'architettura esistente per velocizzare lo sviluppo.

La Lead Generation deve integrarsi con:

```text
Domain
Application
Infrastructure
Presentation
```

e riutilizzare, quando appropriato:

```text
Repository pattern
Dependency injection
Composition root
Use cases
Test pattern
Catalog
Quote
```

L'obiettivo non è soltanto "far funzionare lo scraper", ma costruire una funzionalità mantenibile e coerente con l'architettura di 7eightDev.

---

# 31. Prossimo micro-step

Stato attuale:

```text
feat/lead-generation
```

✅ COMPLETATO — TASK 6 — JOB ASINCRONO + POLLING + RECOVERY

Le ricerche "in corso" restavano tali per sempre perché la pipeline girava in
modo **sincrono dentro la request HTTP** del server action: superato il timeout
del server (es. Vercel 60s) il processo veniva ucciso e il job non arrivava mai
a `completed`/`failed`.

Fix — tre livelli:

```text
application/lead/start-run-lead-job.ts                 ← nuovo use case
application/lead/admin.actions.ts                      ← launch non bloccante
presentation/features/admin/leads/live-job-refresher.ts ← polling router.refresh()
presentation/features/admin/leads/lead-search-form.tsx  ← naviga alla lista dopo il lancio
domain/lead/lead.job.ts (resolveJobStatus / isJobStale) ← recovery job bloccati
app/(private)/admin/leads/page.tsx                      ← applica recovery + attiva polling
```

1. **Async**: `startLeadGenerationAction` crea il job `running`, lo avvia in
   background (fire-and-forget) e ritorna subito → la request non è più
   bloccante.
2. **Polling**: `LiveJobRefresher` (client) fa `router.refresh()` ogni 4s
   finché esiste un job `pending`/`running`, così status e lista lead si
   aggiornano da soli.
3. **Recovery**: `resolveJobStatus` (dominio puro, 8 test) marca `failed` i job
   `pending`/`running` più vecchi di 10 minuti (worker ucciso da
   timeout/crash) → smettono di riferire e vengono esposti come falliti.

```text
npm test -- --runInBand        → 247/247 pass (239 + 8 nuovi)
npm run lint                   → OK
npx tsc --noEmit               → OK
npm run build                  → OK
```

Nota: su deployment serverless senza processi persistenti il lavoro vero gira
comunque dentro la request (fire-and-forget) e può ancora morire su dataset
lunghissimi; il recovery garantisce comunque che il job non resti "in corso"
per sempre. Una coda/worker dedicato è il passo successivo (hardening).

✅ COMPLETATO — TASK 7 — RICERCA LIVE con debounce

La ricerca testuale richiedeva Invio (nessun debounce) — comportamento poco
intuitivo. Ora il campo filtra **mentre digiti** (debounce 350ms), mantenendo
i filtri già attivi (status, score, source, sort). Pulsante × per cancellare.
Sincronizza il campo con l'URL su back/forward.

```text
presentation/features/admin/leads/lead-filter-bar.tsx
```

Il caso d'uso riportato (status=qualified + q=Ravenna) filtra correttamente a
1 record.

```text
npm test -- --runInBand        → 239/239 pass
npm run lint                   → OK
npx tsc --noEmit               → OK
npm run build                  → OK
```

✅ COMPLETATO — TASK 7 — LAYOUT due colonne /admin/leads

Le "Ricerche recenti" occupavano troppo spazio in verticale prima del primo
risultato. La lista lead ora è divisa in due colonne (desktop): a sinistra una
**sidebar sticky (300px)** con le ricerche recenti, a destra la **lista lead**
con filtri. Su mobile le colonne si impilano (ricerche in alto).

```text
app/(private)/admin/leads/page.tsx   ← grid lg:grid-cols-[300px_1fr]
```

Sticky (`lg:top-6`) perché le ricerche restino visibili scorrendo la lista.

```text
npm test -- --runInBand        → 239/239 pass
npm run lint                   → OK
npx tsc --noEmit               → OK
npm run build                  → OK
```

✅ COMPLETATO — TASK 7 — FILTRI lista /admin/leads

Filtri e ordinamento sulla lista lead, seguendo il pattern già stabilito dai
preventivi (logica pura URL-driven + barra client + server component).

```text
presentation/features/admin/leads/lead-filters.ts    ← logica pura (filter/sort/parser)
presentation/features/admin/leads/lead-filter-bar.tsx ← client bar (URL params)
application/lead/lead-filters.test.ts                 ← 34 test
app/(private)/admin/leads/page.tsx                    ← legge searchParams, applica filtri
```

Filtri disponibili:

```text
status   → tutti / nuovi / analizzati / qualificati / scartati
score    → tutti / ≥90 / 50–89 / <50 / senza analisi
source   → tutte / Google Maps / Outscraper / SerpAPI
q        → ricerca testuale (azienda, città, categoria, sito, tel, email)
sort     → più recenti / meno recenti / A→Z / Z→A / score basso / score alto
```

Lo stato vive nell'URL (`?status=&score=&source=&q=&sort=`) quindi la pagina
resta Server Component e la vista è condivisibile/bookmarkabile. Ordinamento e
filtri compongono; i lead senza score finiscono in coda in qualunque ordine.

```text
npm test -- --runInBand        → 239/239 pass (205 + 34 nuovi)
npm run lint                   → OK
npx tsc --noEmit               → OK
npm run build                  → OK
```

✅ COMPLETATO — TASK 9 — Quote Integration

Integrazione Lead → Quote: da un lead **qualificato** si crea una **bozza
preventivo** pre-compilata, riusando Catalog e use case quote esistenti.

```text
application/lead/create-quote-from-lead.ts        ← use case (prepara input)
application/lead/create-quote-from-lead.test.ts   ← test (13 test)
application/lead/admin.actions.ts                 ← createQuoteFromLeadAction
presentation/features/admin/leads/lead-create-quote-button.tsx ← shadcn Button
presentation/features/admin/leads/lead-detail.tsx ← pulsante (solo qualificati)
```

Flusso:

```text
Lead qualificato (score < 50)
 ↓
Admin clicca "Crea preventivo" (detail page)
 ↓
createQuoteFromLeadAction(leadId)
 ├─ createQuoteFromLead → CreateQuoteInput pre-compilato
 │    ├─ client: companyName/company/email del lead
 │    ├─ project: "<azienda> — Sito Web"
 │    ├─ validUntil: +30 giorni
 │    └─ lineItems: servizi Catalog compatibili (mappatura hardcoded V1)
 │         - sempre: seo-performance (Core Web Vitals)
 │         - se score < 30: + audit (performance e sicurezza)
 ↓
createQuote() → draft PREV-YYYY-NNN
 ↓
redirect → /admin/quotes/<id>/edit (composer per revisione)
```

Vincoli (V1): pagina dettaglio mostra il pulsante solo se
`status === "qualified"`; il use case rifiuta lead non qualificati,
senza analisi, con performance ≥ 50 o senza score. Non invia nulla al
cliente — il preventivo resta `draft` e l'admin lo revisiona.

Verifica eseguita e verde:

```text
npm test -- --runInBand        → 204/204 pass
npm run lint                   → OK
npx tsc --noEmit               → OK
npm run build                  → OK
```

✅ FIX — debug ricerca "meccanico / Varese" (analisi non visibili)

Diagnosi: la ricerca andava a buon fine (`job completed`, `totalFound=10`)
ma con `analyzed=0` e `qualified=0`. Nel DB c'erano solo 26 lead da test
precedenti (`source=outscraper`, tutti `discarded`). Due cause:

1. **Lead senza website scartati** — la pipeline scartava (`discarded`) ogni
   lead privo di sito web (`run-lead-generation-pipeline.ts`). Per nicchie
   come i meccanici, molte attività locali non hanno un sito su Google
   Places → zero analisi.
2. **Source errato** — l'admin action non passava `source`, quindi il default
   `'outscraper'` veniva salvato anche se il provider era Google Places.

Fix applicato:

```text
run-lead-generation-pipeline.ts  → lead senza website = status 'new' (non discard)
application/lead/admin.actions.ts → source: "google_maps" quando parte dalla UI
```

Ora i lead senza sito restano visibili come `new` (contattabili), e i nuovi
lead Google Places sono taggati correttamente `google_maps`.

```text
npm test -- --runInBand        → 205/205 pass
npm run lint                   → OK
npx tsc --noEmit               → OK
npm run build                  → OK
```

✅ CONFIG — PageSpeed Insights funzionante

L'analisi di performance richiede la `GOOGLE_PAGESPEED_API_KEY` (Google Cloud →
PageSpeed Insights API). Senza key Google risponde 429 (rate limit anonimo);
con key ma API non abilitata 403; con key ok ma siti lenti → timeout a 10s.

Fix applicato:

```text
.env.local / .env.example        → GOOGLE_PAGESPEED_API_KEY (documentata)
google-pagespeed-insights.ts     → timeout default 10s → 60s (siti lenti)
```

Con chiave valida il test live restituisce risultati reali, es. Top Tyres
(score 58, LCP 4.0s, FCP 2.6s, CLS 0.018, TBT 1.1s — durata 40s). Il timeout a
60s è necessario: i lead più interessanti (score < 50) sono tipicamente i siti
più lenti da analizzare.

```text
npm test -- --runInBand        → 205/205 pass
npm run lint                   → OK
npx tsc --noEmit               → OK
npm run build                  → OK
```

Prossimo task: da definire (mini-progetto lead generation completo).

**NON fare il merge in `main`.**
