import type { Quote } from "@/domain/quote/quote.types";
import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from "@/domain/lead/lead.types";
import { moneyFromUnits } from "@/domain/shared/money";
import { PrismaLeadRepository } from "@/infrastructure/lead/prisma-lead.repository";
import { PrismaQuoteRepository } from "@/infrastructure/quote/prisma-quote.repository";

/**
 * Deterministic E2E fixture (MS-4.4, decisione (b)).
 *
 * Sostituisce la dipendenza dal DB di cattura "unione di discovery reali" con
 * un dataset SANIFICATO e riproducibile: 40 lead fittizi + analisi + 1 job
 * terminale + 16 preventivi fittizi. Le 9 baseline screenshot (MS-4.1) vengono
 * catturate CONTRO questa fixture (fresca: `migrate deploy` + `db:seed`), quindi
 * il DB di CI (Postgres service, stesso seed) è byte-identico a quello di
 * cattura e il cancello visuale non drift mai per dati live.
 *
 * Regole di determinismo osservate dalle route:
 *  - `/admin/leads` ordina per `createdAt` DESC e pagina 8 → le 8 lead più
 *    recenti (indici 33..40 qui sotto) sono quelle della pagina 1 con la varietà
 *    più ricca (status/score/outreach/tech/ads/copyright/favorite).
 *  - L'unico job è TERMINALE (`completed`): nessun banner "in corso" e nessuna
 *    dipendenza dal clock reale (un job `running` diventerebbe stale dopo 20 min
 *    e `reconcileStaleJobs` lo ribalterebbe, facendo driftare lo screenshot).
 *  - Tutti i `validUntil` dei preventivi sono nel futuro lontano (2030): il
 *    bucket due-date e il bottone "Segna scaduto" (canExpire) restano invariati
 *    qualsiasi sia la data di esecuzione dei test.
 *  - Nessun dato reale: aziende, persone, siti (.example.com), email e telefoni
 *    sono tutti fittizi.
 *
 * L'intero seeding è idempotente (upsert per id stabile). NOTA: su un DB già
 * popolato `db:seed` AGGIUNGE la fixture senza rimuovere altro; per riprodurre
 * il DB di cattura esatto serve un DB fresco (CI lo crea a ogni run; in locale
 * `docker compose`/Postgres ad-hoc + `prisma migrate deploy` + `db:seed`).
 */

export const FIXTURE_JOB_ID = "fixture-job-0001";
export const FIXTURE_LEAD_COUNT = 40;

const LEAD_EPOCH = new Date("2026-08-01T06:00:00.000Z").getTime();
const LEAD_STEP_MS = 60_000;

/* ----------------------------- Lead fixtures ----------------------------- */

const LEAD_COMPANIES = [
  "Caffè Buonumore",
  "Officina Rota Impianti",
  "Studio Legale Meridiana",
  "Ottica Helios",
  "Pizzeria La Brace",
  "Azienda Agricola Ca' del Sole",
  "Fabbro & C. Ferramenta",
  "Edera Ricami",
  "Lampo Traslochi",
  "Jardini Verdure Bio",
  "Bistrot Alba Serena",
  "Falegnameria Quercia",
  "Sinai Consulenze",
  "Ottica Lumen",
  "Gelateria Polare",
  "Tipografia Zanetti",
  "B&B La Terrazza sul Brembo",
  "Trattoria del Borgo",
  "Agriturismo Il Nocciolo",
  "Estetica Diva Mila",
  "Ristorante Antico Frantoio",
  "Panificio Grano Puro",
  "Officina Cicli Vela",
  "Fisioterapia Riva del Lago",
  "Agenzia Viaggi Oriente",
  "Pasticceria Dolce Sosta",
  "Idraulica Lamberto",
  "Profumerie Azzurra",
  "Hotel del Parco",
  "Fioraio Cascina Nuova",
  "Elettrauto Duranti",
  "Biblioteca della Rovere",
  "Calzature Passo Lento",
  "Web Agency Pixel Conciato",
  "Studio Architetti Nord",
  "Zafferano Catering",
  "Palestra Hydra",
  "Cartolibreria Foglia",
  "Bottega del Miele",
  "Officina Frenagriglia"
];

const LEAD_CATEGORIES = [
  "Bar · Gelateria",
  "Impianti termoidraulici",
  "Studio legale",
  "Ottica",
  "Ristorazione",
  "Agriturismo",
  "Ferramenta",
  "Artigianato tessile",
  "Traslochi",
  "Ortofrutta",
  "Ristorazione",
  "Falegnameria",
  "Consulenza aziendale",
  "Ottica",
  "Gelateria",
  "Tipografia",
  "Ospitalità",
  "Ristorazione",
  "Agriturismo",
  "Estetica",
  "Ristorazione",
  "Panificio",
  "Cicli",
  "Salute e benessere",
  "Agenzia viaggi",
  "Pasticceria",
  "Impianti idraulici",
  "Profumerie",
  "Ospitalità",
  "Floricoltura",
  "Elettrauto",
  "Biblioteca",
  "Calzature",
  "Agenzia digitale",
  "Architettura",
  "Catering",
  "Fitness",
  "Cartolibreria",
  "Alimentari",
  "Officina meccanica"
];

const LEAD_CITIES = [
  "Bergamo", "Treviglio", "Milano", "Lecco", "Bergamo", "Trescore Balneario",
  "Crema", "Bergamo", "Monza", "Sesto San Giovanni", "Ponte San Pietro",
  "Comun Nuovo", "Brescia", "Cisano Bergamasco", "Mapello", "Sorisole",
  "Villa d'Almè", "Clusone", "Gazzaniga", "Albino", "Romano di Lombardia",
  "Bagnatica", "Terno d'Isola", "Capriate San Gervasio", "Dalmine",
  "Stezzano", "Seriate", "Grassobbio", "Brusaporto", "Carobbio degli Angeli",
  "Osio Sopra", "Verdello", "Arzago d'Adda", "Vimercate", "Cernusco sul Naviglio",
  "Pioltello", "Segrate", "Peschiera Borromeo", "Milanofiori Assago", "Novate Milanese"
];

const LEAD_STATUSES: Lead["status"][] = [
  "analyzed", "new", "qualified", "analyzed", "new", "discarded",
  "analyzed", "qualified", "new", "analyzed", "qualified", "new",
  "analyzed", "discarded", "analyzed", "new", "qualified", "analyzed",
  "new", "qualified", "analyzed", "discarded", "new", "analyzed",
  "qualified", "new", "analyzed", "qualified", "analyzed", "new",
  "discarded", "analyzed"
];

const LEAD_OUTREACH: Lead["outreachStatus"][] = [
  "not_contacted", "audit_sent", "in_talks", "not_contacted", "rejected",
  "closed_won", "not_contacted", "audit_sent", "in_talks", "not_contacted",
  "closed_won", "not_contacted", "audit_sent", "rejected", "in_talks",
  "not_contacted", "audit_sent", "not_contacted", "closed_won", "in_talks",
  "not_contacted", "rejected", "not_contacted", "audit_sent", "in_talks",
  "not_contacted", "not_contacted", "closed_won", "not_contacted", "audit_sent",
  "rejected", "in_talks"
];

const TECH_POOL: readonly (readonly string[])[] = [
  ["WordPress", "jQuery"],
  ["Wix"],
  ["Squarespace"],
  ["Drupal"],
  ["Shopify"],
  ["Prestashop"],
  ["Next.js"],
  ["SvelteKit", "Vercel"]
];

const SCORE_POOL = [53, 66, 58, 72, 41, 64, 55, 71, 48, 69, 62, 74, 57, 68, 60, 76];

const COPYRIGHT_POOL = ["2015", "2017", "2019", "2020", "2021", "2022", "2023", "2024"];

/**
 * The 8 newest leads (displayed on page 1 of `/admin/leads`, createdAt DESC):
 * hand-tuned for the visual variety a screenshot baseline needs.
 */
const SHOWCASE: Array<Omit<Lead, "id" | "jobId" | "createdAt" | "updatedAt"> & { score?: number }> = [
  { // index 33 (pagina 1, ultima in date-desc)
    companyName: "Edera Ricami",
    category: "Artigianato tessile",
    website: "https://ederaricami.example.com",
    phone: "+39 035 000 0001",
    address: "Via Torretta 4, Bergamo",
    city: LEAD_CITIES[7],
    source: "google_maps",
    status: "discarded",
    outreachStatus: "not_contacted",
    analysisError: "CouponPageError: timeout su page.",
    copyright: "2019",
    hasAds: false,
    score: 12,
  },
  { // index 34
    companyName: "Fabbro & C. Ferramenta",
    category: "Ferramenta",
    website: "https://fabbro-ferramenta.example.com",
    phone: "+39 0373 000 002",
    city: LEAD_CITIES[6],
    source: "google_maps",
    status: "new",
    outreachStatus: "not_contacted",
    copyright: "2016",
    hasAds: false,
  },
  { // index 35
    companyName: "Azienda Agricola Ca' del Sole",
    category: "Agriturismo",
    website: "https://cadelsole.example.com",
    phone: "+39 035 000 003",
    address: "Via Cascina Sole 12, Trescore Balneario",
    city: LEAD_CITIES[5],
    source: "outscraper",
    status: "new",
    outreachStatus: "not_contacted",
    copyright: "2022",
    hasAds: false,
  },
  { // index 36
    companyName: "Pizzeria La Brace",
    category: "Ristorazione",
    website: "https://brace.example.com",
    phone: "+39 035 000 004",
    city: LEAD_CITIES[4],
    source: "google_maps",
    status: "analyzed",
    outreachStatus: "in_talks",
    techStack: ["WordPress"],
    copyright: "2019",
    hasAds: true,
    adsTrackers: ["Google Ads"],
    score: 45,
  },
  { // index 37
    companyName: "Ottica Helios",
    category: "Ottica",
    website: "https://otticahelios.example.com",
    phone: "+39 0341 000 005",
    city: LEAD_CITIES[3],
    source: "google_maps",
    status: "qualified",
    outreachStatus: "closed_won",
    techStack: ["Next.js"],
    copyright: "2024",
    hasAds: false,
    favorite: true,
    lastContactedAt: "2026-07-28T09:00:00.000Z",
    score: 78,
  },
  { // index 38
    companyName: "Studio Legale Meridiana",
    category: "Studio legale",
    website: "https://meridiana.studio.example.com",
    phone: "+39 02 000 006",
    city: LEAD_CITIES[2],
    source: "outscraper",
    status: "analyzed",
    outreachStatus: "not_contacted",
    techStack: ["WordPress", "Elementor"],
    copyright: "2021",
    hasAds: true,
    adsTrackers: ["Meta Pixel"],
    score: 61,
  },
  { // index 39
    companyName: "Officina Rota Impianti",
    category: "Impianti termoidraulici",
    website: "https://rotaimpianti.example.com",
    phone: "+39 0363 000 007",
    city: LEAD_CITIES[1],
    source: "google_maps",
    status: "qualified",
    outreachStatus: "audit_sent",
    techStack: ["Wix"],
    copyright: "2018",
    hasAds: false,
    score: 84,
  },
  { // index 40 — the newest lead, top of page 1
    companyName: "Caffè Buonumore",
    category: "Bar · Gelateria",
    website: "https://caffebuonumore.example.com",
    phone: "+39 035 000 008",
    address: "Via Pignolo 22, Bergamo",
    city: LEAD_CITIES[0],
    source: "google_maps",
    status: "qualified",
    outreachStatus: "in_talks",
    techStack: ["WordPress", "jQuery"],
    copyright: "2020",
    hasAds: true,
    adsTrackers: ["Google Ads", "Meta Pixel"],
    favorite: true,
    lastContactedAt: "2026-07-30T15:30:00.000Z",
    score: 92,
  }
];

/** Build the 32 deterministic filler leads (indices 1..32). */
function buildFillerLeads(): Lead[] {
  return Array.from({ length: 32 }, (_, i) => {
    const idx = i + 1;
    const status = LEAD_STATUSES[i];
    const tech =
      status === "qualified" || status === "analyzed"
        ? TECH_POOL[i % TECH_POOL.length]
        : undefined;
    return {
      id: `fixture-lead-${String(idx).padStart(3, "0")}`,
      jobId: FIXTURE_JOB_ID,
      companyName: LEAD_COMPANIES[i],
      category: LEAD_CATEGORIES[i],
      website: `https://fixture-${String(idx).padStart(3, "0")}.example.com`,
      phone: `+39 035 ${String(1000 + idx * 7)}`,
      address: idx % 3 === 0 ? `Via Provinciale ${idx * 3}, ${LEAD_CITIES[i]}` : undefined,
      city: LEAD_CITIES[i],
      source: i % 4 === 0 ? "outscraper" : "google_maps",
      status,
      outreachStatus: LEAD_OUTREACH[i],
      techStack: tech,
      copyright: COPYRIGHT_POOL[i % COPYRIGHT_POOL.length],
      hasAds: i % 5 === 0,
      adsTrackers: i % 5 === 0 ? ["Meta Pixel"] : undefined,
      favorite: i % 7 === 0,
      createdAt: new Date(LEAD_EPOCH + idx * LEAD_STEP_MS).toISOString(),
      updatedAt: new Date(LEAD_EPOCH + idx * LEAD_STEP_MS).toISOString()
    } satisfies Lead;
  });
}

/** The 8 showcase leads (indices 33..40) with hand-tuned variety. */
function buildShowcaseLeads(): Lead[] {
  const baseIndex = 33;
  return SHOWCASE.map((item, i) => {
    const idx = baseIndex + i + 1;
    const { score, ...rest } = item;
    // Lead itself has no score field (the score lives in LeadAnalysis); it is
    // consumed by buildFixtureAnalyses via SHOWCASE[i]=... from here.
    void score;
    return {
      ...rest,
      id: `fixture-lead-${String(idx).padStart(3, "0")}`,
      jobId: FIXTURE_JOB_ID,
      techStack: rest.techStack ?? undefined,
      createdAt: new Date(LEAD_EPOCH + idx * LEAD_STEP_MS).toISOString(),
      updatedAt: new Date(LEAD_EPOCH + idx * LEAD_STEP_MS).toISOString()
    } satisfies Lead;
  });
}

export function buildFixtureLeads(): Lead[] {
  return [...buildFillerLeads(), ...buildShowcaseLeads()];
}

/** Analyses only for leads that render a score badge (analyzed/qualified/discarded). */
export function buildFixtureAnalyses(): LeadAnalysis[] {
  const leads = buildFixtureLeads();
  return leads.flatMap((lead, i) => {
    // Indices 32..39 in the combined array map to SHOWCASE[0..7].
    const showcaseItem = i >= 32 ? SHOWCASE[i - 32] : undefined;
    const showcaseScore = showcaseItem?.score;
    const fillerScore = lead.status !== "new" ? SCORE_POOL[i % SCORE_POOL.length] : undefined;
    const score = showcaseScore ?? fillerScore;
    if (score === undefined) return [];
    const analyzedAt = new Date(LEAD_EPOCH + (i + 1) * LEAD_STEP_MS + 120_000).toISOString();
    const analysis: LeadAnalysis = {
      id: `fixture-analysis-${String(i + 1).padStart(3, "0")}`,
      leadId: lead.id,
      strategy: "desktop",
      performanceScore: score,
      lcp: Number((1.2 + (score % 37) / 100).toFixed(2)),
      fcp: Number((0.7 + (score % 23) / 100).toFixed(2)),
      cls: Number((0.01 + ((score % 9) / 100)).toFixed(2)),
      tbt: 120 + ((score * 13) % 400),
      analyzedAt
    };
    return [analysis];
  });
}

/** Terminal completed job: deterministic toolbar selector, no polling banners. */
export function buildFixtureJob(): LeadGenerationJob {
  return {
    id: FIXTURE_JOB_ID,
    query: "panifici artigianali",
    location: "Bergamo e dintorni",
    quantity: FIXTURE_LEAD_COUNT,
    status: "completed",
    totalFound: FIXTURE_LEAD_COUNT,
    analyzed: 24,
    qualified: 9,
    favorite: true,
    startedAt: "2026-08-01T05:30:00.000Z",
    completedAt: "2026-08-01T07:00:00.000Z",
    createdAt: "2026-07-31T22:00:00.000Z"
  } satisfies LeadGenerationJob;
}

/* ---------------------------- Quote fixtures ---------------------------- */

const QUOTE_STATUSES: Quote["status"][] = [
  "draft", "draft", "draft", "sent", "sent", "accepted", "draft", "accepted",
  "sent", "sent", "draft", "accepted", "rejected", "sent", "draft", "accepted"
];

const QUOTE_CLIENTS = [
  { name: "Gelateria Polare", company: "Gelateria Polare Srls", email: "info@gelateriapolare.example.com" },
  { name: "Tipografia Zanetti", email: "ordini@tipografiazanetti.example.com" },
  { name: "B&B La Terrazza sul Brembo", email: "booking@laterrazza.example.com" },
  { name: "Trattoria del Borgo", company: "Trattoria del Borgo Snc", email: "tavola@trattoriadelborgo.example.com" },
  { name: "Agriturismo Il Nocciolo", email: "info@ilnocciolo.example.com" },
  { name: "Estetica Diva Mila", company: "Estetica Diva Mila di M. R.", email: "appuntamenti@divamila.example.com" },
  { name: "Ristorante Antico Frantoio", email: "sala@anticofrantoio.example.com" },
  { name: "Panificio Grano Puro", company: "Panificio Grano Puro di Bagnatica", email: "contatti@granopuro.example.com" },
  { name: "Officina Cicli Vela", email: "assistenza@ciclivala.example.com" },
  { name: "Fisioterapia Riva del Lago", company: "Fisioriva Srl", email: "segreteria@fisioriva.example.com" },
  { name: "Agenzia Viaggi Oriente", email: "booking@viaggioriente.example.com" },
  { name: "Pasticceria Dolce Sosta", company: "Pasticceria Dolce Sosta Srl", email: "info@docesosta.example.com" },
  { name: "Idraulica Lamberto", email: "prontointervento@idraulicalamberto.example.com" },
  { name: "Profumerie Azzurra", email: "store@azzurra.example.com" },
  { name: "Hotel del Parco", company: "Albergo del Parco Spa", email: "reception@hoteldelparco.example.com" },
  { name: "Fioraio Cascina Nuova", email: "ordini@cascinanuova.example.com" }
];

const QUOTE_PROJECTS = [
  "Sito istituzionale + area soci",
  "E-commerce cosmetici",
  "Restyling brand e sito vetrina",
  "App PWA per prenotazioni",
  "Portale eventi & biglietteria",
  "E-commerce gastronomia locale",
  "Sito vetrina multipiattaforma",
  "Portale ricerca fornitori",
  "Landing campagne marketing",
  "Rifacimento portale prenotazioni",
  "Sito istituzionale ente locale",
  "Piattaforma corsi online",
  "E-commerce arredo & interni",
  "Portale associazioni sportive",
  "Sito internazionale B2B",
  "Dashboard interno gestione ordini"
];

const QUOTE_AMOUNTS = [1200, 3400, 6800, 2400, 1500, 4200, 5600, 3200, 1800, 7200, 2900, 4800, 6100, 2300, 3900, 5400];

export function buildFixtureQuotes(): Quote[] {
  return QUOTE_PROJECTS.map((project, i) => {
    const id = `b0000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const cpu = moneyFromUnits(QUOTE_AMOUNTS[i]);
    return {
      id,
      number: `PREV-2026-${String(15 + i).padStart(3, "0")}`,
      status: QUOTE_STATUSES[i],
      client: QUOTE_CLIENTS[i],
      project,
      intro:
        "Progetto web su misura: design, sviluppo e lancio con standard tecnici e di qualità concordati.",
      issuedAt: "2026-06-01T00:00:00.000Z",
      // Far-future validity keeps due budgets ("valida") and canExpire stable
      // for any execution date (see module header).
      validUntil: "2030-01-01T00:00:00.000Z",
      fiscalRegime: "vat" as const,
      vatRate: 0.22,
      lineItems: [
        {
          id: `line-${String(i + 1).padStart(3, "0")}`,
          type: "one_time" as const,
          title: project,
          description: "Analisi, design, sviluppo, test e messa online.",
          unitPrice: cpu,
          optional: false
        }
      ],
      metadata: {
        phases: [{ title: "Sviluppo", weeks: "Sett. 1–4" }],
        techStack: [
          { label: "Framework", technology: "Next.js 16 + React 19" },
          { label: "Qualità", technology: "Jest · Playwright · CI/CD" }
        ],
        terms: [
          { label: "Pagamento", body: "40% all'avvio · 30% a metà · 30% alla consegna." }
        ]
      }
    } satisfies Quote;
  });
}

/* ----------------------------- Seeding routines ----------------------------- */

/**
 * Seeds the deterministic lead fixture (job + leads + analyses).
 * Idempotent (upsert per id stabile). To reproduce the exact capture DB this
 * must run against a FRESH database (`migrate deploy` + `db:seed`).
 */
export async function seedLeadFixture(): Promise<void> {
  const leadRepository = new PrismaLeadRepository();
  await leadRepository.saveJob(buildFixtureJob());
  for (const lead of buildFixtureLeads()) {
    await leadRepository.save(lead);
  }
  for (const analysis of buildFixtureAnalyses()) {
    await leadRepository.saveAnalysis(analysis);
  }
}

/** Seeds the 16 deterministic quotes (AVIS quote stays in `prisma/seed.ts`). */
export async function seedQuoteFixture(): Promise<void> {
  const quoteRepository = new PrismaQuoteRepository();
  for (const quote of buildFixtureQuotes()) {
    await quoteRepository.save(quote);
  }
}