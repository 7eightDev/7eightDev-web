# 7eightDev — Lead Generation Admin UI

> Piano di esecuzione del TASK 7.
>
> Questo file deve essere mantenuto aggiornato durante lo sviluppo.
> Quando si apre una nuova chat/sessione, leggere questo documento come contesto.

---

## Contesto

Il backend è completo (Task 1-6): domain, persistence, discovery adapter, PageSpeed adapter, pipeline, jobs. Manca completamente la parte admin UI — nessuna route, nessun componente, nessuna server action.

**Problema notato**: l'adapter `OutscraperLeadDiscovery` esiste ma non c'è un client HTTP concreto — la pipeline funzionerà ma tutti i lead finiranno come `discarded` (errore PageSpeed). Questo è accettabile per la V1 admin UI; il client HTTP reale potrà essere aggiunto dopo.

**Due interfacce `LeadGenerationJob`**: la forma piatta in `lead.types.ts` (usata dal container) e quella annidata in `lead-generation-job.types.ts` (usata da `ExecuteLeadGenerationJob`). Lavoriamo con la prima — è quella già esposta dal repository nel container.

---

## Step 1 — Wiring nel DI container

**File**: `infrastructure/container.ts`

Aggiungere l'export di `leadRepository`:

```ts
import { LeadRepository } from '@/domain/lead/lead.repository';
import { PrismaLeadRepository } from '@/infrastructure/lead/prisma-lead.repository';

export const leadRepository: LeadRepository = new PrismaLeadRepository();
```

Questo segue il pattern identico di `quoteRepository` e `catalogRepository`.

### Stato

```
[x] completato
```

---

## Step 2 — Server actions per lead

**Nuovo file**: `application/lead/admin.actions.ts`

Pattern identico a `application/quote/admin.actions.ts`:

- `"use server"` all'inizio
- Import del container, use case, `revalidatePath`, `redirect`
- Tipo di ritorno `LeadActionResult { ok, error? }`

Azioni:

| Action                      | Parametri                                           | Comportamento                                                                      |
| --------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `startLeadGenerationAction` | `query: string, location: string, quantity: number` | Chiama `runLeadGenerationPipeline`, revalidate `/admin/leads`, redirect alla lista |
| `deleteLeadAction`          | `id: string`                                        | Elimina lead via `leadRepository.delete`, revalidate                               |
| `deleteJobAction`           | `id: string`                                        | Elimina job (se esiste un metodo delete nel repository — altrimenti skip)          |

**Nota**: la pipeline è sincrona e può impiegare tempo. Per la V1 la eseguiamo direttamente nella server action. Il TASK 6 (Jobs) renderà il tutto asincrono.

### Stato

```
[x] completato
```

---

## Step 3 — Route pages

**Directory**: `app/(private)/admin/leads/`

| Route               | File            | Tipo             | Contenuto                        |
| ------------------- | --------------- | ---------------- | -------------------------------- |
| `/admin/leads`      | `page.tsx`      | Server Component | Lista lead + lista job recenti   |
| `/admin/leads/new`  | `new/page.tsx`  | Client Component | Form di ricerca (avvia job)      |
| `/admin/leads/[id]` | `[id]/page.tsx` | Server Component | Dettaglio singolo lead + analisi |

### 3a — `/admin/leads` (lista)

Server Component con `export const dynamic = "force-dynamic"`. Pattern identico a `app/(private)/admin/quotes/page.tsx`:

- Import `leadRepository` dal container
- Chiama `leadRepository.findAll()` per i lead
- Legge `searchParams` (async, Next.js 16) per filtri status/score
- Layout: `Container max-w-[1100px] py-12`
- Header: titolo "Lead" + link "+ Nuova ricerca" a `/admin/leads/new`
- Due sezioni:
  1. **Job recenti** — card con stato (pending/running/completed/failed), query, location, stats (trovati/analizzati/qualificati)
  2. **Lista lead** — griglia responsive con: nome azienda, sito, status badge, performance score, data
- Empty state se nessun lead

### 3b — `/admin/leads/new` (form ricerca)

Server Component che wrappa un Client Component `LeadSearchForm`:

- Campi: query (testo), location (testo), quantity (numero)
- Bottone "Avvia ricerca" con stato `pending` durante l'esecuzione
- On submit: chiama `startLeadGenerationAction`
- Stile identico a `CatalogItemForm`: stessi CSS class per input, label, bottoni

### 3c — `/admin/leads/[id]` (dettaglio)

Server Component:

- Carica lead + analisi via `leadRepository.findById` + `leadRepository.findAnalysesByLeadId`
- Layout card con:
  - Dati azienda (nome, categoria, sito, telefono, email, indirizzo, città)
  - Metriche PageSpeed (performance score con badge colorato, LCP, FCP, CLS, TBT)
  - Qualification status (qualified/not_qualified/discardato)
  - Data analisi
- Link "Torna alla lista"

### Stato

```
[ ] 3a — pagina lista
[ ] 3b — pagina form ricerca
[ ] 3c — pagina dettaglio
```

---

## Step 4 — Componenti presentation

**Directory**: `presentation/features/admin/leads/`

| Componente             | Tipo           | File            | Funzione                                                              |
| ---------------------- | -------------- | --------------- | --------------------------------------------------------------------- |
| `lead-search-form.tsx` | `"use client"` | Form di ricerca | Campi query/location/quantity, `useTransition`, chiama server action  |
| `lead-table.tsx`       | Server         | Lista lead      | Griglia responsive con badge, score, azioni — stile identico a quotes |
| `lead-detail.tsx`      | Server         | Dettaglio lead  | Card dati azienda + metriche PageSpeed                                |
| `lead-row-actions.tsx` | `"use client"` | Azioni riga     | Elimina + link dettaglio — stile identico a `catalog-row-actions.tsx` |
| `lead-job-status.tsx`  | Server         | Card job        | Mostra stato job, query, location, statistiche                        |
| `lead-score-badge.tsx` | Server         | Badge score     | Badge colorato per performance score (verde < 50, rosso >= 50)        |

**Pattern condivisi** con le pagine admin esistenti:

- Stessi CSS class (`inputClass`, `labelClass` da `catalog-item-form.tsx`)
- Stessi font (`font-space` titoli, `font-mono` etichette, `font-hanken` corpo)
- Stessi breakpoint responsive (`max-[820px]`)
- Stessi colori badge (`border-[color-mix(in_oklab,...)]`)
- Stessi stati vuoti (`bg-surface border border-border rounded-2xl`)

### Stato

```
[ ] lead-score-badge.tsx
[ ] lead-job-status.tsx
[ ] lead-row-actions.tsx
[ ] lead-table.tsx
[ ] lead-search-form.tsx
[ ] lead-detail.tsx
```

---

## Step 5 — Aggiornamento nav admin

**File**: `presentation/features/admin/admin-header.tsx`

Aggiungere un nav item nell'array `navItems`:

```ts
{ href: "/admin/leads", label: "Lead" }
```

Posizionato dopo "Catalogo" e prima dell'eventuale "Email".

### Stato

```
[ ] completato
```

---

## Step 6 — Componenti shadcn/ui mancanti

**Non installiamo componenti nuovi**. La UI admin esistente costruisce tutto con Tailwind CSS grezzo (griglie, flex, border). Seguiamo lo stesso pattern — niente Table, Badge, Card shadcn. Tutto custom con le stesse classi CSS già in uso.

---

## Step 7 — Qualità

Dopo ogni micro-step significativo:

```bash
npm run lint
npx tsc --noEmit
npm run test -- --runInBand
npm run build
```

### Stato

```
[ ] lint verde
[ ] typecheck verde
[ ] test verde
[ ] build verde
```

---

## Ordine di esecuzione

```
1.  container.ts (wiring)
2.  admin.actions.ts (server actions)
3.  lead-score-badge.tsx + lead-job-status.tsx (componenti atomici)
4.  lead-row-actions.tsx (componente interattivo)
5.  lead-table.tsx (componente lista)
6.  lead-search-form.tsx (componente form)
7.  lead-detail.tsx (componente dettaglio)
8.  admin-header.tsx (nav update)
9.  app/(private)/admin/leads/page.tsx (route lista)
10. app/(private)/admin/leads/new/page.tsx (route form)
11. app/(private)/admin/leads/[id]/page.tsx (route dettaglio)
12. Quality gate completo
```

Ogni step viene validato prima di procedere al successivo.

---

## Note architetturali

1. **Pipeline sincrona nella server action**: per la V1 è accettabile. Il TASK 6 (Jobs) renderà il tutto asincrono con polling. Non serve anticipare.

2. **Nessun nuovo componente shadcn**: la UI admin esistente non usa Table/Badge shadcn — tutto è Tailwind custom. Coerenza > convenienza.

3. **Due interfacce Job**: per l'admin UI usiamo la forma piatta di `lead.types.ts` (quella del container). Non allineiamo le due versioni in questo task — è un refactoring separato.

4. **Outscraper HTTP client mancante**: la pipeline will fall back gracefully (lead diventano `discarded`). Il client reale potrà essere aggiunto in un task dedicato.

5. **Quantity nel form**: il campo quantity è nel doc ma `LeadSearchInput` lo usa come limite per Outscraper. Lo mostriamo nel form, lo passiamo alla pipeline.

---

## Stato globale

```
STEP 1 — Wiring container
✅ COMPLETATO

STEP 2 — Server actions
✅ COMPLETATO

STEP 3 — Route pages
⚪ NON INIZIATO

STEP 4 — Componenti presentation
⚪ NON INIZIATO

STEP 5 — Nav admin update
⚪ NON INIZIATO

STEP 7 — Quality gate
⚪ NON INIZIATO
```

---

## Regola per le nuove sessioni

Quando si apre una nuova chat:

1. fornire questo documento come contesto;
2. leggere la sezione "Stato globale";
3. identificare il primo step `⚪ NON INIZIATO` o `🟡 IN CORSO`;
4. NON ripartire da zero;
5. NON creare step già completati;
6. continuare dal micro-step successivo.
