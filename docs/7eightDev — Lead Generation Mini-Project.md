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
type LeadSource =
  | "google_maps"
  | "outscraper"
  | "serpapi";
```

Status iniziale:

```ts
type LeadStatus =
  | "new"
  | "analyzed"
  | "qualified"
  | "discarded";
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
"mobile" | "desktop"
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
type LeadGenerationJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";
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
type LeadQualification =
  | "qualified"
  | "not_qualified";
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
[ ] definire PageSpeedPort
[ ] definire input/output
[ ] implementare Google adapter
[ ] parsing response
[ ] Performance Score
[ ] LCP
[ ] FCP
[ ] CLS
[ ] TBT
[ ] mobile strategy
[ ] timeout
[ ] error handling
[ ] eventuale retry
[ ] test
[ ] lint
[ ] typecheck
[ ] build
[ ] commit
[ ] merge
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
[ ] application use case
[ ] dependency injection
[ ] orchestrazione
[ ] gestione errori per singolo lead
[ ] aggiornamento contatori Job
[ ] test use case
[ ] test error scenarios
[ ] suite
[ ] lint
[ ] typecheck
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
🟡 IN CORSO

TASK 2 — Persistence
⚪ NON INIZIATO

TASK 3 — Discovery
⚪ NON INIZIATO

TASK 4 — PageSpeed
⚪ NON INIZIATO

TASK 5 — Pipeline
⚪ NON INIZIATO

TASK 6 — Jobs
⚪ NON INIZIATO

TASK 7 — Admin UI
⚪ NON INIZIATO

TASK 8 — Export
⚪ NON INIZIATO

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
feat/lead-generation-domain
```

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
feat/lead-generation-domain
```

Il prossimo passo è:

```text
completare Task 1 — Domain
```

Prima di procedere verificare:

```bash
npm test -- --runInBand
npm run lint
npx tsc --noEmit
npm run build
```

Poi:

```bash
git status
```

Se tutto è verde:

```text
commit
↓
merge in feat/lead-generation
↓
verifica branch
↓
inizio Task 2
```

**NON fare il merge in `main`.**