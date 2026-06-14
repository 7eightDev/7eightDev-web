import type { CatalogRepository } from "@/domain/catalog/catalog.repository";
import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";
import { moneyFromUnits } from "@/domain/shared/money";

const ONE_TIME = { kind: "one_time" } as const;
const MONTHLY = { kind: "recurring", interval: "monthly" } as const;

/**
 * Initial Service Catalog content. This is *seed* data, not a runtime source:
 * at runtime the catalog is read from the database via CatalogRepository.
 * `sortOrder` is derived from array position, preserving the curated order.
 */
const CATALOG_SEED_ITEMS: ReadonlyArray<Omit<ServiceCatalogItem, "sortOrder">> =
  [
    /* ── Livello 1 · Web Assets (PMI) ── */
    {
      id: "landing-page",
      tier: "web_assets",
      title: "Landing Page (alta conversione)",
      description:
        "Pagina singola ottimizzata per conversione: copy-driven, Core Web Vitals al top, analytics.",
      pricing: { kind: "fixed", price: moneyFromUnits(2500) },
      billing: ONE_TIME,
      defaultOptional: false,
    },
    {
      id: "spa-nextjs",
      tier: "web_assets",
      title: "SPA / Sito Next.js",
      description:
        "Applicazione React/Next.js multi-pagina: routing, SEO tecnica, design system su misura.",
      pricing: {
        kind: "range",
        from: moneyFromUnits(6000),
        to: moneyFromUnits(14000),
      },
      billing: ONE_TIME,
      defaultOptional: false,
    },
    {
      id: "cms-integration",
      tier: "web_assets",
      title: "Integrazione CMS headless",
      description:
        "Payload, Sanity o custom: contenuti gestibili in autonomia, preview e workflow editoriale.",
      pricing: { kind: "fixed", price: moneyFromUnits(1800) },
      billing: ONE_TIME,
      defaultOptional: true,
    },
    {
      id: "seo-performance",
      tier: "web_assets",
      title: "SEO tecnica & performance",
      description:
        "Core Web Vitals, dati strutturati, sitemap, ottimizzazione immagini e caching.",
      pricing: { kind: "fixed", price: moneyFromUnits(1100) },
      billing: ONE_TIME,
      defaultOptional: true,
    },
    {
      id: "accessibility-agid",
      tier: "web_assets",
      title: "Accessibilità AgID / WCAG 2.1 AA",
      description:
        "Audit, remediation e dichiarazione di accessibilità conforme alle Linee Guida AgID (Legge Stanca): requisito per enti pubblici e parapubblici.",
      pricing: { kind: "fixed", price: moneyFromUnits(1600) },
      billing: ONE_TIME,
      defaultOptional: true,
    },
    {
      id: "donor-area",
      tier: "web_assets",
      title: "Area riservata donatori / soci",
      description:
        "Autenticazione, profilo, storico e prenotazione: spazio personale per donatori, soci o tesserati.",
      pricing: {
        kind: "range",
        from: moneyFromUnits(3000),
        to: moneyFromUnits(6000),
      },
      billing: ONE_TIME,
      defaultOptional: true,
    },
    {
      id: "events-calendar",
      tier: "web_assets",
      title: "Calendario eventi & donazioni",
      description:
        "Agenda pubblica di eventi, raccolte e giornate di donazione, gestibile in autonomia dal CMS.",
      pricing: { kind: "fixed", price: moneyFromUnits(900) },
      billing: ONE_TIME,
      defaultOptional: true,
    },
    {
      id: "newsletter",
      tier: "web_assets",
      title: "Newsletter & comunicazioni",
      description:
        "Iscrizione conforme GDPR, integrazione con provider email e template per le comunicazioni periodiche.",
      pricing: { kind: "fixed", price: moneyFromUnits(700) },
      billing: ONE_TIME,
      defaultOptional: true,
    },
    {
      id: "maintenance",
      tier: "web_assets",
      title: "Manutenzione & monitoring",
      description:
        "Aggiornamenti, monitoraggio uptime/errori, piccoli interventi evolutivi e assistenza prioritaria.",
      pricing: { kind: "fixed", price: moneyFromUnits(150) },
      billing: MONTHLY,
      defaultOptional: true,
    },

    /* ── Livello 2 · Enterprise & SaaS ── */
    {
      id: "architecture-blueprint",
      tier: "enterprise",
      title: "Design dell'architettura (Blueprint)",
      description:
        "Analisi del dominio, bounded contexts, ADR, diagrammi C4 e roadmap tecnica esecutiva.",
      pricing: {
        kind: "range",
        from: moneyFromUnits(4000),
        to: moneyFromUnits(9000),
      },
      billing: ONE_TIME,
      defaultOptional: false,
    },
    {
      id: "multi-tenant",
      tier: "enterprise",
      title: "Sistema multi-tenant",
      description:
        "Isolamento dati per tenant, provisioning, billing per organizzazione, RBAC.",
      pricing: { kind: "on_request" },
      billing: ONE_TIME,
      defaultOptional: false,
    },
    {
      id: "api-gateway",
      tier: "enterprise",
      title: "API Gateway / Layer di integrazione",
      description:
        "API-first: contratti OpenAPI, versioning, rate limiting, integrazione sistemi terzi.",
      pricing: {
        kind: "range",
        from: moneyFromUnits(5000),
        to: moneyFromUnits(12000),
      },
      billing: ONE_TIME,
      defaultOptional: false,
    },
    {
      id: "legacy-bridge",
      tier: "enterprise",
      title: "Legacy-to-Cloud Migration Bridge",
      description:
        "Assessment, risk map e strangler-fig roadmap: il sistema critico continua a funzionare mentre lo modernizziamo, senza big-bang.",
      pricing: { kind: "on_request" },
      billing: ONE_TIME,
      defaultOptional: false,
    },
    {
      id: "audit",
      tier: "enterprise",
      title: "Audit di performance e sicurezza",
      description:
        "Report esecutivo + tecnico: vulnerabilità, colli di bottiglia, piano di remediation prioritizzato.",
      pricing: { kind: "fixed", price: moneyFromUnits(3500) },
      billing: ONE_TIME,
      defaultOptional: true,
    },
    {
      id: "managed-ops",
      tier: "enterprise",
      title: "Managed Ops & SLA",
      description:
        "Gestione continuativa: monitoring proattivo, on-call, SLA garantiti e report mensili.",
      pricing: { kind: "fixed", price: moneyFromUnits(900) },
      billing: MONTHLY,
      defaultOptional: true,
    },
  ];

/** Seed data with derived sortOrder (array position). */
export const CATALOG_SEED: readonly ServiceCatalogItem[] =
  CATALOG_SEED_ITEMS.map((item, index) => ({ ...item, sortOrder: index }));

/**
 * Idempotent seeding: upserts every seed item by id. Safe to re-run; existing
 * items are overwritten with the seed definition, none are deleted.
 */
export async function seedCatalog(repository: CatalogRepository): Promise<void> {
  for (const item of CATALOG_SEED) {
    await repository.save(item);
  }
}
