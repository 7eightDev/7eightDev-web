import { createQuoteFromLead } from '@/application/lead/create-quote-from-lead';
import type { LeadRepository } from '@/domain/lead/lead.repository';
import type { CatalogRepository } from '@/domain/catalog/catalog.repository';
import type { Lead, LeadAnalysis } from '@/domain/lead/lead.types';
import type { ServiceCatalogItem } from '@/domain/catalog/catalog.types';

/* ---------- mock factories ---------- */

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    companyName: 'ACME Srl',
    category: 'Ristorazione',
    website: 'https://acme.it',
    phone: '+39 02 1234567',
    email: 'info@acme.it',
    address: 'Via Roma 1',
    city: 'Milano',
    source: 'google_maps',
    status: 'qualified',
    outreachStatus: 'not_contacted',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAnalysis(
  overrides: Partial<LeadAnalysis> = {}
): LeadAnalysis {
  return {
    id: 'analysis-1',
    leadId: 'lead-1',
    strategy: 'mobile',
    performanceScore: 25,
    lcp: 4.1,
    fcp: 2.8,
    cls: 0.35,
    tbt: 620,
    analyzedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

const SERVICES: ServiceCatalogItem[] = [
  {
    id: 'seo-performance',
    tier: 'web_assets',
    title: 'SEO tecnica & performance',
    description: 'Core Web Vitals, dati strutturati, sitemap.',
    pricing: { kind: 'fixed', price: { amountCents: 110_000, currency: 'EUR' } },
    billing: { kind: 'one_time' },
    defaultOptional: true,
    sortOrder: 1,
  },
  {
    id: 'audit',
    tier: 'enterprise',
    title: 'Audit di performance e sicurezza',
    description: 'Report esecutivo + tecnico.',
    pricing: { kind: 'fixed', price: { amountCents: 350_000, currency: 'EUR' } },
    billing: { kind: 'one_time' },
    defaultOptional: true,
    sortOrder: 2,
  },
  {
    id: 'maintenance',
    tier: 'web_assets',
    title: 'Manutenzione Mensile',
    description: 'Aggiornamenti e monitoraggio continuo.',
    pricing: { kind: 'fixed', price: { amountCents: 150_00, currency: 'EUR' } },
    billing: { kind: 'recurring', interval: 'monthly' },
    defaultOptional: false,
    sortOrder: 3,
  },
];

function makeLeadRepo(lead: Lead | null, analyses: LeadAnalysis[] = []) {
  return {
    async findById() { return lead; },
    async findAll() { return lead ? [lead] : []; },
    async save() {},
    async delete() {},
    async findAnalysesByLeadId() { return analyses; },
    async findLatestAnalysesByLeadIds() {
      if (!lead) return [];
      const latest = analyses.reduce<LeadAnalysis | undefined>(
        (best, a) => (!best || a.analyzedAt > best.analyzedAt ? a : best),
        undefined,
      );
      return latest ? [latest] : [];
    },
    async saveAnalysis() {},
    async findJobById() { return null; },
    async findAllJobs() { return []; },
    async saveJob() {},
    async setJobFavorite() {},
    async setLeadFavorite() {},
    async deleteJob() {},
    async findPaginated() { return { leads: lead ? [lead] : [], total: lead ? 1 : 0 }; },
    async findMatchingLeads() { return lead ? [lead] : []; },
    async existsByWebsiteKey() { return false; },
    async findByWebsiteKey() { return null; },
    async existsLeadByCompanyInJob() { return false; },
    async countLeadsByJobIds() { return new Map(); },
    async getLeadCountsByJobIds() { return new Map(); },
  } satisfies LeadRepository;
}

function makeCatalogRepo(items: ServiceCatalogItem[] = SERVICES) {
  return {
    async findAll() { return items; },
    async findById(id: string) { return items.find((i) => i.id === id) ?? null; },
    async save() {},
    async delete() {},
  } satisfies CatalogRepository;
}

/* ---------- tests ---------- */

describe('createQuoteFromLead', () => {
  it('returns a CreateQuoteInput with correct client info and selected services', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), [makeAnalysis()]),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.input.clientName).toBe('ACME Srl');
    expect(result.input.clientCompany).toBe('ACME Srl');
    expect(result.input.clientEmail).toBe('info@acme.it');
    expect(result.input.project).toContain('ACME Srl');

    const ids = result.input.lineItems.map((i) => i.catalogRef);
    expect(ids).toContain('seo-performance');
    expect(ids).toContain('audit');
    expect(ids).not.toContain('maintenance');
  });

  it('returns error for non-existent lead', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(null),
        catalogRepository: makeCatalogRepo() },
      'unknown',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/non trovato/i);
  });

  it('returns error for non-qualified lead', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead({ status: 'new' }), [makeAnalysis()]),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/qualificato/i);
  });

  it('returns error when no analysis is available', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), []),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/analisi/i);
  });

  it('returns error when performance score is undefined', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), [makeAnalysis({ performanceScore: undefined })]),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/analisi/i);
  });

  it('returns error when performance >= 50 (not qualified)', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), [makeAnalysis({ performanceScore: 72 })]),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/performance/i);
  });

  it('returns empty lineItems when no catalog services match', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), [makeAnalysis()]),
        catalogRepository: makeCatalogRepo([]) },
      'lead-1',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.lineItems).toHaveLength(0);
  });

  it('uses the most recent analysis when multiple exist', async () => {
    const older = makeAnalysis({ id: 'old', performanceScore: 20, analyzedAt: '2026-05-01T00:00:00.000Z' });
    const newer = makeAnalysis({ id: 'new', performanceScore: 35, analyzedAt: '2026-06-01T00:00:00.000Z' });

    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), [older, newer]),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );
    expect(result.ok).toBe(true);
  });

  it('sets validUntil to 30 days from now', async () => {
    const fixedNow = new Date('2026-07-01T10:00:00.000Z');
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), [makeAnalysis()]),
        catalogRepository: makeCatalogRepo(),
        now: () => fixedNow },
      'lead-1',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.validUntil).toBe('2026-07-31');
  });

  it('uses default vatRate 0.22', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), [makeAnalysis()]),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.vatRate).toBe(0.22);
  });

  it('maps email correctly when lead has no email', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead({ email: undefined }), [makeAnalysis()]),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.clientEmail).toBe('');
  });

  it('severity "severe" selects both seo-performance and audit', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), [makeAnalysis({ performanceScore: 15 })]),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.input.lineItems.map((i) => i.catalogRef);
    expect(ids).toContain('seo-performance');
    expect(ids).toContain('audit');
  });

  it('severity "moderate" selects only seo-performance', async () => {
    const result = await createQuoteFromLead(
      { leadRepository: makeLeadRepo(makeLead(), [makeAnalysis({ performanceScore: 40 })]),
        catalogRepository: makeCatalogRepo() },
      'lead-1',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.input.lineItems.map((i) => i.catalogRef);
    expect(ids).toContain('seo-performance');
    expect(ids).not.toContain('audit');
  });
});
