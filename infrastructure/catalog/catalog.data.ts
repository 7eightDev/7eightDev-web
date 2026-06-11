import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";
import { moneyFromUnits } from "@/domain/shared/money";

/**
 * Hardcoded service catalog (MVP). Will move to a `catalog_items`
 * table with admin CRUD when needed.
 */
export const SERVICE_CATALOG: readonly ServiceCatalogItem[] = [
  /* ── Livello 1 · Web Assets (PMI) ── */
  {
    id: "landing-page",
    tier: "web_assets",
    title: "Landing Page (alta conversione)",
    description:
      "Pagina singola ottimizzata per conversione: copy-driven, Core Web Vitals al top, analytics.",
    pricing: { kind: "fixed", price: moneyFromUnits(2500) },
    defaultOptional: false,
  },
  {
    id: "spa-nextjs",
    tier: "web_assets",
    title: "SPA / Sito Next.js",
    description:
      "Applicazione React/Next.js multi-pagina: routing, SEO tecnica, design system su misura.",
    pricing: { kind: "range", from: moneyFromUnits(6000), to: moneyFromUnits(14000) },
    defaultOptional: false,
  },
  {
    id: "cms-integration",
    tier: "web_assets",
    title: "Integrazione CMS headless",
    description:
      "Payload, Sanity o custom: contenuti gestibili in autonomia, preview e workflow editoriale.",
    pricing: { kind: "fixed", price: moneyFromUnits(1800) },
    defaultOptional: true,
  },
  {
    id: "seo-performance",
    tier: "web_assets",
    title: "SEO tecnica & performance",
    description:
      "Core Web Vitals, dati strutturati, sitemap, ottimizzazione immagini e caching.",
    pricing: { kind: "fixed", price: moneyFromUnits(1100) },
    defaultOptional: true,
  },
  {
    id: "maintenance",
    tier: "web_assets",
    title: "Manutenzione & monitoring",
    description:
      "Aggiornamenti, monitoraggio uptime/errori, piccoli interventi evolutivi mensili.",
    pricing: { kind: "fixed", price: moneyFromUnits(150) },
    defaultOptional: true,
  },

  /* ── Livello 2 · Enterprise & SaaS ── */
  {
    id: "architecture-blueprint",
    tier: "enterprise",
    title: "Design dell'architettura (Blueprint)",
    description:
      "Analisi del dominio, bounded contexts, ADR, diagrammi C4 e roadmap tecnica esecutiva.",
    pricing: { kind: "range", from: moneyFromUnits(4000), to: moneyFromUnits(9000) },
    defaultOptional: false,
  },
  {
    id: "multi-tenant",
    tier: "enterprise",
    title: "Sistema multi-tenant",
    description:
      "Isolamento dati per tenant, provisioning, billing per organizzazione, RBAC.",
    pricing: { kind: "on_request" },
    defaultOptional: false,
  },
  {
    id: "api-gateway",
    tier: "enterprise",
    title: "API Gateway / Layer di integrazione",
    description:
      "API-first: contratti OpenAPI, versioning, rate limiting, integrazione sistemi terzi.",
    pricing: { kind: "range", from: moneyFromUnits(5000), to: moneyFromUnits(12000) },
    defaultOptional: false,
  },
  {
    id: "legacy-bridge",
    tier: "enterprise",
    title: "Legacy-to-Cloud Migration Bridge",
    description:
      "Assessment, risk map e strangler-fig roadmap: il sistema critico continua a funzionare mentre lo modernizziamo, senza big-bang.",
    pricing: { kind: "on_request" },
    defaultOptional: false,
  },
  {
    id: "audit",
    tier: "enterprise",
    title: "Audit di performance e sicurezza",
    description:
      "Report esecutivo + tecnico: vulnerabilità, colli di bottiglia, piano di remediation prioritizzato.",
    pricing: { kind: "fixed", price: moneyFromUnits(3500) },
    defaultOptional: true,
  },
] as const;

export function findCatalogItem(id: string): ServiceCatalogItem | undefined {
  return SERVICE_CATALOG.find((item) => item.id === id);
}
