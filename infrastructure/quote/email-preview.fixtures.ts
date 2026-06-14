import type { Quote } from "@/domain/quote/quote.types";
import { moneyFromUnits } from "@/domain/shared/money";

/**
 * Dev-only fixtures for the email preview/test tools.
 *
 * These are throwaway sample quotes used ONLY to render and test-send emails
 * without creating real quotes (a sent quote is frozen, see `sendQuote`).
 * They never touch the database or the quote status machine.
 */

export type EmailKind = "sent" | "accepted";

export interface EmailScenario {
  /** Stable id used in the URL and the send action. */
  readonly id: string;
  readonly label: string;
  /** Which renderer/recipient path this exercises. */
  readonly kind: EmailKind;
  readonly quote: Quote;
}

const FAR_FUTURE = "2026-12-31T23:59:59.999Z";
const ISSUED = "2026-06-14T00:00:00.000Z";

/** AVIS Light — prestazione occasionale (fuori campo IVA, sconto primo cliente). */
const occasionalLight: Quote = {
  id: "00000000-0000-4000-8000-0000000000a1",
  number: "PREV-2026-DEMO-OCC",
  status: "draft",
  client: {
    name: "AVIS Comunale",
    company: "AVIS Comunale (demo)",
    email: "anteprima@example.com",
  },
  project: "Sito vetrina single-page",
  intro:
    "Una pagina singola chiara e curata per raccontare perché donare e raccogliere nuovi donatori.",
  issuedAt: ISSUED,
  validUntil: FAR_FUTURE,
  fiscalRegime: "occasional",
  vatRate: 0,
  lineItems: [
    {
      id: "vetrina",
      type: "one_time",
      title: "Sito vetrina single-page",
      description: "Pagina unica scrolling, responsive.",
      unitPrice: moneyFromUnits(550),
      optional: false,
    },
    {
      id: "copy",
      type: "one_time",
      title: "Architettura contenuti + copywriting",
      description: "Struttura sezioni e testi.",
      unitPrice: moneyFromUnits(200),
      optional: false,
    },
    {
      id: "form",
      type: "one_time",
      title: 'Form "Diventa donatore"',
      description: "Modulo con consenso GDPR.",
      unitPrice: moneyFromUnits(150),
      optional: false,
    },
    {
      id: "seo",
      type: "one_time",
      title: "SEO local + Google Business Profile",
      description: "Ricerche locali e scheda Google.",
      unitPrice: moneyFromUnits(100),
      optional: false,
    },
  ],
  metadata: {
    phases: [
      { title: "Analisi & contenuti", weeks: "Sett. 1" },
      { title: "Design & sviluppo", weeks: "Sett. 2–3" },
      { title: "Revisione & online", weeks: "Sett. 4" },
    ],
    terms: [
      { label: "Pagamento", body: "40% all'avvio · 60% alla consegna." },
    ],
    discount: { kind: "percent", value: 0.2 },
  },
};

/** Full VAT quote with recurring + optional items + all sections shown. */
const vatFull: Quote = {
  id: "00000000-0000-4000-8000-0000000000b2",
  number: "PREV-2026-DEMO-IVA",
  status: "draft",
  client: {
    name: "Mario Rossi",
    company: "ACME Srl",
    email: "anteprima@example.com",
  },
  project: "Piattaforma SaaS multi-tenant",
  intro:
    "Proposta per la nuova piattaforma: architettura scalabile, area cliente e canone di gestione.",
  issuedAt: ISSUED,
  validUntil: FAR_FUTURE,
  fiscalRegime: "vat",
  vatRate: 0.22,
  lineItems: [
    {
      id: "blueprint",
      type: "one_time",
      title: "Design dell'architettura (Blueprint)",
      description: "Domini, bounded contexts, ADR.",
      unitPrice: moneyFromUnits(4000),
      optional: false,
    },
    {
      id: "frontend",
      type: "one_time",
      title: "Sviluppo front-end",
      description: "Next.js + TypeScript.",
      unitPrice: moneyFromUnits(6800),
      optional: false,
    },
    {
      id: "audit",
      type: "one_time",
      title: "Audit di sicurezza",
      description: "Report esecutivo + tecnico.",
      unitPrice: moneyFromUnits(3500),
      optional: true,
    },
    {
      id: "managed-ops",
      type: "recurring",
      interval: "monthly",
      title: "Managed Ops & SLA",
      description: "Monitoring, on-call, report mensili.",
      unitPrice: moneyFromUnits(900),
      optional: false,
    },
  ],
  metadata: {
    phases: [
      { title: "Discovery", weeks: "Sett. 1" },
      { title: "Design", weeks: "Sett. 2–3" },
      { title: "Sviluppo", weeks: "Sett. 4–7" },
      { title: "Lancio", weeks: "Sett. 8" },
    ],
    timelineNote: "Stima complessiva: ~8 settimane dall'avvio.",
    terms: [
      { label: "Pagamento", body: "40% all'avvio · 30% a metà · 30% alla consegna." },
    ],
    techStack: [
      { label: "Framework", technology: "Next.js 16 + React 19" },
      { label: "Linguaggio", technology: "TypeScript (strict)" },
    ],
  },
};

/** Accepted-quote owner alert: same quote, with an acceptance record. */
const accepted: Quote = {
  ...vatFull,
  id: "00000000-0000-4000-8000-0000000000c3",
  number: "PREV-2026-DEMO-ACC",
  status: "accepted",
  acceptance: {
    acceptedByName: "Mario Rossi",
    acceptedAt: "2026-06-14T09:30:00.000Z",
    selectedOptionalIds: ["audit"],
  },
};

export const EMAIL_SCENARIOS: readonly EmailScenario[] = [
  {
    id: "sent-occasional",
    label: "Invio cliente · Prestazione occasionale (AVIS Light)",
    kind: "sent",
    quote: occasionalLight,
  },
  {
    id: "sent-vat",
    label: "Invio cliente · IVA, con ricorrente e opzionali",
    kind: "sent",
    quote: vatFull,
  },
  {
    id: "accepted",
    label: "Alert titolare · Preventivo accettato",
    kind: "accepted",
    quote: accepted,
  },
];

export function findScenario(id: string): EmailScenario | undefined {
  return EMAIL_SCENARIOS.find((s) => s.id === id);
}
