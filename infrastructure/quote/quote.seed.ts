import type { Quote } from "@/domain/quote/quote.types";
import { moneyFromUnits } from "@/domain/shared/money";

/**
 * Seed data for the in-memory repository (dev only).
 * In production quotes are composed in the private dashboard.
 */
export const AVIS_QUOTE: Quote = {
  id: "a3f91c20-7e8d-4b6a-9f12-0c4e8d2b6a91",
  number: "PREV-2026-014",
  status: "sent",
  client: {
    name: "AVIS Comunale",
    company: "AVIS Comunale di Bergamo — OdV",
  },
  project: "Nuovo sito + area donatori",
  intro:
    "Un sito istituzionale veloce e accessibile, con un’area riservata dove i donatori prenotano la donazione e consultano lo storico. Costruito con Next.js, performante e facile da aggiornare in autonomia.",
  issuedAt: "2026-06-10T00:00:00.000Z",
  validUntil: "2026-07-10T00:00:00.000Z",
  vatRate: 0.22,
  lineItems: [
    {
      id: "discovery",
      type: "one_time",
      title: "Discovery & architettura informativa",
      description: "Interviste, mappatura contenuti, sitemap e wireframe.",
      unitPrice: moneyFromUnits(1200),
      optional: false,
    },
    {
      id: "design",
      type: "one_time",
      title: "Design UI/UX",
      description:
        "Interfaccia sito + area riservata, design system accessibile (WCAG AA).",
      unitPrice: moneyFromUnits(3400),
      optional: false,
    },
    {
      id: "frontend",
      type: "one_time",
      title: "Sviluppo front-end",
      description:
        "Next.js + TypeScript, CMS headless, contenuti gestibili da te.",
      unitPrice: moneyFromUnits(6800),
      optional: false,
    },
    {
      id: "area-donatori",
      type: "one_time",
      title: "Area donatori",
      description:
        "Autenticazione, prenotazione donazione, storico e promemoria.",
      unitPrice: moneyFromUnits(4200),
      optional: false,
    },
    {
      id: "seo",
      type: "one_time",
      title: "SEO tecnica & performance",
      description:
        "Core Web Vitals, dati strutturati, sitemap, ottimizzazione immagini.",
      unitPrice: moneyFromUnits(1100),
      optional: false,
    },
    {
      id: "deploy",
      type: "one_time",
      title: "Deploy, CI/CD & assistenza",
      description:
        "Messa online, pipeline automatica e 3 mesi di assistenza inclusa.",
      unitPrice: moneyFromUnits(1300),
      optional: false,
    },
    {
      id: "pwa",
      type: "one_time",
      title: "PWA + notifiche push",
      description: "App installabile e promemoria donazione via notifica.",
      unitPrice: moneyFromUnits(2400),
      optional: true,
    },
    {
      id: "crm",
      type: "one_time",
      title: "Integrazione gestionale donazioni",
      description: "Sincronizzazione via API col sistema regionale.",
      unitPrice: moneyFromUnits(3200),
      optional: true,
    },
    {
      id: "i18n",
      type: "one_time",
      title: "Multilingua (IT / EN)",
      description: "Sito e area riservata in doppia lingua.",
      unitPrice: moneyFromUnits(1500),
      optional: true,
    },
  ],
  metadata: {
    phases: [
      { title: "Discovery", weeks: "Sett. 1" },
      { title: "Design", weeks: "Sett. 2–3" },
      { title: "Sviluppo", weeks: "Sett. 4–7" },
      { title: "Lancio", weeks: "Sett. 8" },
    ],
    timelineNote:
      "Stima complessiva: ~8 settimane dall’avvio. Demo navigabile a ogni fine settimana.",
    techStack: [
      { label: "Framework", technology: "Next.js 16 + React 19" },
      { label: "Linguaggio", technology: "TypeScript (strict)" },
      { label: "Contenuti", technology: "CMS headless" },
      { label: "Database", technology: "PostgreSQL" },
      { label: "Qualità", technology: "Jest · Playwright · CI/CD" },
      { label: "Accessibilità", technology: "WCAG AA" },
    ],
    terms: [
      {
        label: "Pagamento",
        body: "40% all’avvio · 30% a metà progetto · 30% alla consegna.",
      },
      {
        label: "Cosa serve da te",
        body: "Contenuti (testi, logo, immagini) e un referente per le approvazioni.",
      },
      {
        label: "Incluso",
        body: "Codice sorgente tuo, documentazione e 3 mesi di assistenza post-lancio.",
      },
      {
        label: "Validità",
        body: "Offerta valida fino al 10 luglio 2026. Prezzi IVA esclusa dove indicato.",
      },
    ],
  },
};
