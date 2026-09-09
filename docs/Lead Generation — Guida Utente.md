# Lead Generation — Guida Utente

> Come usare la sezione **Lead** dell'area admin di 7eightDev.
> Questa guida descrive la UI e il flusso operativo: come lanciare una ricerca,
> leggere i risultati, filtrare i lead, analizzarli nel dettaglio ed esportarli.
> Raggiungibile da `admin/leads` (voce **Lead** nel menu admin).

---

## Indice

1. [Cosa fa il sistema](#1-cosa-fa-il-sistema)
2. [Lanciare una nuova ricerca](#2-lanciare-una-nuova-ricerca)
3. [Il pannello delle ricerche](#3-il-pannello-delle-ricerche)
4. [La tabella dei lead](#4-la-tabella-dei-lead)
5. [Filtri e ordinamento](#5-filtri-e-ordinamento)
6. [Dettaglio di un lead](#6-dettaglio-di-un-lead)
7. [Creare un preventivo da un lead](#7-creare-un-preventivo-da-un-lead)
8. [Esportare i lead in CSV](#8-esportare-i-lead-in-csv)
9. [Domande frequenti](#9-domande-frequenti)

---

## 1. Cosa fa il sistema

La sezione **Lead** automatizza la **prospezione e qualificazione di potenziali
clienti** per lo studio. Il flusso è unico e lineare:

```
Scopri aziende      → Analizza il sito    → Qualifica     → Preventivo
(nicchia + luogo)     (PageSpeed / Web         (score < 50)    (bozza da inviare)
                       Core Vitals)
```

In pratica, partendo da **una nicchia (es. "Dentisti") + una località (es.
"Milano")**, il sistema:

1. **Trova le aziende** tramite Google (nome, categoria, telefono, sito,
   indirizzo, città);
2. **Analizza il sito** di ciascuna con PageSpeed (le Core Web Vitals:
   performance, LCP, FCP, CLS, TBT);
3. **Rileva il tech stack** (WordPress, Wix, Shopify, React, …) e il
   **copyright nel footer** (un segnale di quanto il sito sia "vecchio");
4. **Qualifica** il lead: se il performance score è **< 50** il sito è lento →
   lead `qualificato` (opportunità commerciale);
5. Permette di **creare una bozza di preventivo** pre-compilata o di
   **esportare** i lead in CSV.

---

## 2. Lanciare una nuova ricerca

Vai in **Lead** → pulsante **"+ Nuova ricerca"** (in alto nella lista, oppure
dall'apposita pagina `/admin/leads/new`). Si apre il modulo di ricerca con i
seguenti campi:

| Campo | Obbligatorio | Descrizione |
|---|---|---|
| **Nicchia** | ✅ Sì | Cosa cerchi, es. `Dentisti`, `Idraulici`, `Palestre`. |
| **Località** | ✅ Sì | Dove, es. `Milano`. Ha **autocompletamento** (basta digitare 2+ caratteri). |
| **Quantità** | No | Limite massimo di lead da cercare (es. `100`). Se vuoto, nessun limite. |
| **Tech / Stack** | No | Tiene **solo i siti che usano** questa tecnologia (es. `WordPress`). |
| **Copyright nel footer** | No | Tiene solo i siti il cui footer contiene questo testo (es. `© 2019`). |

> **Suggerimento**: i campi **Tech/Stack** e **Copyright** servono a restringere
> il risultato a lead molto specifici. Se vuoi una panoramica ampia, lasciali vuoti.

Premi **"Avvia ricerca →"**. La ricerca parte in **background**: non devi
restare sulla pagina. Vieni riportato alla lista, dove un **indicatore di
stato** mostra l'avanzamento (vedi sezione 3). La pagina si **aggiorna da sola**
finché il job non termina.

---

## 3. Il pannello delle ricerche

In alto nella lista lead c'è il selettore delle ricerche (mostra la ricerca
attiva o "Tutte le ricerche"). Il pannello (apribile dal pulsante) elenca tutte
le ricerche salvate, ciascuna come una **card** con:

- **Stato**: `in coda`, `in corso`, `completato`, `fallito`
- **Query e località** (es. "Dentisti" / "Milano")
- Eventuali badge dei criteri (`tech: …` e `©: …`)
- **Statistiche**: numero di lead
  - 🔍 **trovati** (totalFound)
  - 👁️ **analizzati** (analyzed)
  - 🎯 **qualificati** (qualified)

Per ogni ricerca puoi:
- **⭐** metterla tra le **preferite** (appare in cima);
- **▶ Rivvia** la stessa ricerca (solo se completata o fallita);
- **🗑** **eliminarla** (i lead associati restano nel sistema).

> Un job può **fallire** (es. esaurito il limite giornaliero dell'API Google o
> errore di rete). Se `fallito`, premi **Riavvia** per riprovare.

---

## 4. La tabella dei lead

La lista presenta ogni lead come riga con le colonne:

| Colonna | Contenuto |
|---|---|
| **Azienda / Dominio** | Nome dell'azienda + sito (senza `https://`), se disponibile. |
| **Città** | Località del lead. |
| **Tech Stack** | Tecnologie rilevate sul sito (max 3 visibili; al passaggio del mouse le altre). |
| **Copyright** | Anno nel footer (segnale di vetustà); la riga intera al passaggio del mouse. |
| **PageSpeed** | Performance score (0–100) dell'ultima analisi. |
| **Stato** | Badge: `nuovo`, `analizzato`, `qualificato`, `scartato`. |
| **Azioni** | Pulsante `…` per aprire le azioni della riga. |

**Stati di un lead** — cosa significano:

| Stato | Significato |
|---|---|
| **Nuovo** | Salvato ma non ancora analizzato (spesso è un lead **senza sito**, contattabile via telefono/email). |
| **Analizzato** | Sito analizzato; performance score **≥ 50** (sito nella norma). |
| **Qualificato** | Sito analizzato; performance score **< 50** → **sito lento = opportunità commerciale**. Questa è la categoria su cui lavorare. |
| **Scartato** | Analisi PageSpeed **fallita** (il motivo è mostrato nel dettaglio). |

---

## 5. Filtri e ordinamento

Sotto l'intestazione c'è la **barra dei filtri**. I filtri si applicano **in
tempo reale** (mentre digiti) e vengono salvati nell'URL, quindi **possono
essere condivisi o ricaricati**.

**Filtri rapidi (sempre visibili):**
- 🔍 **Cerca lead…** — ricerca libera su nome, città, categoria, sito, telefono,
  email (debounce ~350 ms, nessun Invio richiesto);
- **Stato** — toggle `tutti / nuovi / analizzati / qualificati / scartati`;
- **Azzera filtri** — compare solo quando c'è almeno un filtro attivo.

**Filtri avanzati** (pannello collassabile col chevron `⌄` in mezzo alla riga
divisoria). Il chevron diventa evidenziato quando uno di questi è attivo:

- **Score** — `tutti / ≥ 90 / 50–89 / < 50 / senza analisi`;
- **Sorgente** — `tutte / Google Maps / Outscraper / SerpAPI`;
- **Copyright** — intervallo di **anni** del footer (da / a);
- **Tech Stack** — multiselezione a **pillole** (chip cliccabili) delle
  tecnologie rilevate.

**Ordinamento:** clicca sull'intestazione di una colonna ordinabile (Azienda,
Città, PageSpeed, Stato) per alternare crescente/decrescente.

> I filtri **si combinano**: un lead deve superare *tutti* i filtri attivi per
> essere visibile. La lista è paginata (8 lead per pagina); i controlli di
> paginazione sono in fondo alla tabella.

---

## 6. Dettaglio di un lead

Nella colonna **Azioni** di una riga, premi il pulsante `…` e scegli
**Dettaglio** (icona occhio). Si apre un **pannello laterale** (slide-over) con:

- **Dati azienda**: categoria, sito, telefono, email, indirizzo, città, fonte,
  data di creazione;
- **Analisi PageSpeed** (se eseguita):
  - **Performance** — badge con lo score;
  - **LCP / FCP / CLS / TBT** — le metriche Core Web Vitals, colorate rispetto
    ai valori ideali (verde = ok, ambra = da migliorare, rosso = critico);
- **Stato** di qualificazione.

Casi particolari nel pannello:
- Lead **scartato** → viene mostrato l'**errore** dell'analisi fallita;
- Lead **nuovo senza sito** → messaggio che spiega che puoi contattarlo via
  telefono/email (nessuna analisi possibile).

Se il lead è **qualificato**, in fondo al pannello compare il pulsante
**"Crea preventivo"** (vedi sezione successiva).

> Esiste anche la pagina di dettaglio completa all'indirizzo `/admin/leads/[id]`.

---

## 7. Creare un preventivo da un lead

Dai lead **qualificati** (score < 50) puoi generare in un click una **bozza di
preventivo pre-compilata**:

1. Apri il dettaglio del lead qualificato (pannello laterale o pagina);
2. Premi **"Crea preventivo"**;
3. Il sistema prepara una bozza con:
   - **cliente** già valorizzato (ragione sociale, contatti);
   - **servizi del catalogo suggeriti** in base alla gravità del problema
     (sempre SEO/performance, più un audit se lo score è molto basso, < 30);
   - **scadenza** a +30 giorni.
4. Vieni portato al **composer preventivi** per revisionare e, se ok, inviare.

> La bozza è solo un punto di partenza: rivedi sempre prezzi, servizi e note
> prima dell'invio.

---

## 8. Esportare i lead in CSV

Premi **"Esporta CSV"** (in alto, accanto a "+ Nuova ricerca"). Scarichi un file
`.csv` compatibile con Excel (RFC 4180, con virgole e ritorni a capo CRLF).

L'export rispetta i **filtri attivi** correnti: se stai guardando una singola
ricerca, un certo stato, una sorgente, un tecnologie o un intervallo di anni,
nel CSV trovi esattamente quei lead.

> L'export include anche lo **score PageSpeed** più recente di ogni lead.
> Nota: il pulsante può essere soggetto a **rate limiting**: se ricevi un errore
> "troppe richieste", attendi qualche istante e riprova.

---

## 9. Domande frequenti

**Q: La ricerca resta "in corso" a lungo. È normale?**
Sì. Analizzare ogni sito con Google PageSpeed richiede tempo, soprattutto per i
siti lenti (che sono proprio quelli interessanti — il timeout è volutamente
alto). La pagina si aggiorna da sola a ogni avanzamento.

**Q: Cosa succede se il job "fallisce"?**
Controlla l'errore mostrato sulla card della ricerca. Le cause più comuni sono:
limite giornaliero dell'API Google raggiunto (vedi il badge in alto) o problemi
di rete. Premi **Riavvia** per riprovare.

**Q: Un lead "nuovo" non ha score. Perché?**
Perché non ha un sito web associato (scoperto solo nome/telefono/email). Non è
analizzabile via PageSpeed, ma resta contattabile.

**Q: Dove trovo i dati su quanti lead ho trovato/analizzato/qualificato?**
Sulle card delle ricerche nel pannello di selezione (🔍 trovati / 👁️ analizzati
/ 🎯 qualificati) e nel badge del selettore in alto.

**Q: Come distinguo velocemente i lead da contattare?**
Usa il filtro **Stato = qualificati** (oppure Score = `< 50`). Sono i siti
lenti, il target dell'attività commerciale. Da lì puoi aprire il dettaglio e
creare i preventivi.

**Q: A cosa serve la colonna "Copyright"?**
Mostra l'anno nel footer del sito. Un anno vecchio è un segnale che il sito non
viene aggiornato da tempo → un possibile candidato per intervento. Combinabile
con il filtro anni avanzato.
