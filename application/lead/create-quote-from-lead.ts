import type { LeadRepository } from '@/domain/lead/lead.repository';
import type { CatalogRepository } from '@/domain/catalog/catalog.repository';
import type { CreateQuoteInput } from '@/application/quote/quote.schemas';

export type CreateQuoteFromLeadResult =
  | { readonly ok: true; readonly input: CreateQuoteInput }
  | { readonly ok: false; readonly error: string };

interface CreateQuoteFromLeadDeps {
  readonly leadRepository: LeadRepository;
  readonly catalogRepository: CatalogRepository;
  readonly now?: () => Date;
}

/** Catalog service ids used by the severity-based mapping. */
const SEO_PERFORMANCE_ID = 'seo-performance';
const AUDIT_ID = 'audit';

/** Selects compatible catalog services from the analysis performance score. */
function selectServices(
  catalog: Awaited<ReturnType<CatalogRepository['findAll']>>,
  performanceScore: number,
) {
  const perf = catalog.find((s) => s.id === SEO_PERFORMANCE_ID);
  const audit = catalog.find((s) => s.id === AUDIT_ID);
  const selected = perf ? [perf] : [];
  if (performanceScore < 30 && audit) selected.push(audit);
  return selected;
}

/** ISO date (YYYY-MM-DD) 30 days from the given instant. */
function validUntilDate(now: Date): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

/**
 * Use case: build a pre-populated CreateQuoteInput from a qualified lead so the
 * admin can review and confirm via the existing quote composer. Never creates a
 * quote itself — the "one source of truth" for composition remains createQuote.
 */
export async function createQuoteFromLead(
  deps: CreateQuoteFromLeadDeps,
  leadId: string,
): Promise<CreateQuoteFromLeadResult> {
  const lead = await deps.leadRepository.findById(leadId);
  if (!lead) return { ok: false, error: 'Lead non trovato.' };
  if (lead.status !== 'qualified') {
    return { ok: false, error: 'Il lead deve essere qualificato per creare un preventivo.' };
  }

  const analyses = await deps.leadRepository.findAnalysesByLeadId(leadId);
  const latest = analyses[0];
  const performanceScore = latest?.performanceScore;
  if (!latest || performanceScore === undefined) {
    return { ok: false, error: 'Nessuna analisi valida disponibile per questo lead.' };
  }
  if (performanceScore >= 50) {
    return { ok: false, error: 'Il performance score del lead non lo qualifica per un preventivo.' };
  }

  const catalog = await deps.catalogRepository.findAll();
  const services = selectServices(catalog, performanceScore);

  const now = deps.now ?? (() => new Date());

  const input: CreateQuoteInput = {
    clientName: lead.companyName,
    clientCompany: lead.companyName,
    clientEmail: lead.email || '',
    project: `${lead.companyName} — Sito Web`,
    intro: 'Proposta per il miglioramento delle performance del sito web.',
    validUntil: validUntilDate(now()),
    fiscalRegime: 'vat',
    vatRate: 0.22,
    lineItems: services.map((s) => ({
      catalogRef: s.id,
      title: s.title,
      description: s.description,
      priceUnits:
        s.pricing.kind === 'fixed' ? s.pricing.price.amountCents / 100 : 0,
      quantity: 1,
      optional: s.defaultOptional,
      type: s.billing.kind === 'recurring' ? 'recurring' : 'one_time',
      ...(s.billing.kind === 'recurring'
        ? { interval: s.billing.interval }
        : {}),
    })),
    phases: [],
    terms: [],
    techStack: [],
    pricingDisplay: 'itemized',
  };

  return { ok: true, input };
}
