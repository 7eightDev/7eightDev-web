import { exportLeadsCsv } from '@/application/lead/export-leads';
import type { Lead, LeadAnalysis } from '@/domain/lead/lead.types';
import { InMemoryLeadRepository } from '@/infrastructure/lead/in-memory-lead.repository';

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    jobId: 'job-1',
    companyName: 'Studio Dentistico Rossi',
    category: 'dentist',
    website: 'https://rossi.example',
    phone: '+39 02 1234567',
    email: 'info@rossi.example',
    address: 'Via Dante 1, Milano',
    city: 'Milano',
    source: 'google_maps',
    status: 'qualified',
    outreachStatus: 'not_contacted',
    createdAt: '2026-08-31T10:00:00.000Z',
    updatedAt: '2026-08-31T10:00:00.000Z',
    ...overrides
  };
}

function makeAnalysis(overrides: Partial<LeadAnalysis> = {}): LeadAnalysis {
  return {
    id: 'analysis-1',
    leadId: 'lead-1',
    strategy: 'mobile',
    performanceScore: 30,
    lcp: 4100,
    fcp: 2600,
    cls: 0.4,
    tbt: 820,
    analyzedAt: '2026-08-31T10:00:00.000Z',
    ...overrides
  };
}

const CSV_HEADER =
  'company,category,website,phone,email,address,city,performance,lcp,fcp,cls,tbt,qualification,source,has_ads,ads_trackers';

describe('exportLeadsCsv', () => {
  it('exports every lead with the CSV header when no filters are set', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.save(makeLead());
    await repo.save(
      makeLead({ id: 'lead-2', companyName: 'Lead scartato', status: 'discarded' })
    );

    const csv = await exportLeadsCsv(repo);

    const lines = csv.split('\r\n').filter((line) => line.length > 0);
    expect(lines[0]).toBe(CSV_HEADER);
    expect(csv).toContain('Studio Dentistico Rossi');
    expect(csv).toContain('Lead scartato');
  });

  it('filters by jobId when a job is selected', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.save(makeLead({ jobId: 'job-1' }));
    await repo.save(
      makeLead({
        id: 'lead-2',
        jobId: 'job-2',
        companyName: 'Un altra ricerca'
      })
    );

    const csv = await exportLeadsCsv(repo, { jobId: 'job-1' });

    expect(csv).toContain('Studio Dentistico Rossi');
    expect(csv).not.toContain('Un altra ricerca');
  });

  it('filters by status and reports the real status in the qualification column', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.save(makeLead());
    await repo.save(
      makeLead({ id: 'lead-2', companyName: 'Lead scartato', status: 'discarded' })
    );

    const csv = await exportLeadsCsv(repo, { status: 'discarded' });

    expect(csv).toContain('Lead scartato');
    expect(csv).toContain(',discarded,google_maps,false,\r\n');
    expect(csv).not.toContain('Studio Dentistico Rossi');
  });

  it('filters by free-text query', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.save(makeLead());
    await repo.save(
      makeLead({ id: 'lead-2', companyName: 'Fiorario Ravenna' })
    );

    const csv = await exportLeadsCsv(repo, { q: 'ravenna' });

    expect(csv).toContain('Fiorario Ravenna');
    expect(csv).not.toContain('Studio Dentistico Rossi');
  });

  it('includes contact data and the latest analysis metrics', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.save(makeLead());
    await repo.saveAnalysis(makeAnalysis());
    await repo.saveAnalysis(
      makeAnalysis({ id: 'older', analyzedAt: '2026-08-01T10:00:00.000Z', performanceScore: 10 })
    );

    const csv = await exportLeadsCsv(repo);

    expect(csv).toContain(
      'Studio Dentistico Rossi,dentist,https://rossi.example,+39 02 1234567,info@rossi.example,'
    );
    expect(csv).toContain('30,4100,2600,0.4,820,qualified,google_maps,false,');
  });

  it('uses the most recent analysis when a lead has several', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.save(makeLead());
    await repo.saveAnalysis(
      makeAnalysis({ id: 'a1', performanceScore: 20, analyzedAt: '2026-08-01T10:00:00.000Z' })
    );
    await repo.saveAnalysis(
      makeAnalysis({ id: 'a2', performanceScore: 45, analyzedAt: '2026-09-01T10:00:00.000Z' })
    );

    const csv = await exportLeadsCsv(repo);

    expect(csv).toContain(',45,4100,2600,0.4,820,qualified,google_maps,false,');
    expect(csv).not.toContain(',20,4100,2600,0.4,820,qualified,google_maps,');
  });

  it('escapes fields containing commas, quotes and newlines', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.save(
      makeLead({
        companyName: 'Rossi, Mario & Figli',
        address: 'Via "degli Esperti", 5\nPiano 2',
        category: 'dentist, implants'
      })
    );

    const csv = await exportLeadsCsv(repo);

    expect(csv).toContain('"Rossi, Mario & Figli"');
    expect(csv).toContain('"dentist, implants"');
    expect(csv).toContain('"Via ""degli Esperti"", 5\nPiano 2"');
  });

  it('returns only the header when no lead matches', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.save(makeLead());

    const csv = await exportLeadsCsv(repo, { q: 'niente da trovare' });

    const lines = csv.split('\r\n').filter((line) => line.length > 0);
    expect(lines).toEqual([CSV_HEADER]);
  });

  it('excludes non-matching leads when the selected job has criteria, without deleting them', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.saveJob({
      id: 'job-1',
      query: 'ottici',
      location: 'Vicenza',
      status: 'completed',
      techStack: 'wordpress',
      copyright: undefined,
      totalFound: 3,
      analyzed: 3,
      qualified: 2,
      createdAt: '2026-09-01T10:00:00.000Z'
    });
    await repo.save(
      makeLead({ id: 'lead-wp', techStack: ['WordPress'], copyright: '© 2019' })
    );
    await repo.save(
      makeLead({
        id: 'lead-wix',
        companyName: 'Sito Wix',
        techStack: ['Wix'],
        copyright: '© 2019'
      })
    );

    const csv = await exportLeadsCsv(repo, { jobId: 'job-1' });

    expect(csv).toContain('Studio Dentistico Rossi');
    expect(csv).not.toContain('Sito Wix');
    // Non-matching leads are only hidden from the view, not removed.
    await expect(repo.findById('lead-wix')).resolves.toMatchObject({
      companyName: 'Sito Wix'
    });
  });

  it('writes empty cells for missing optional fields', async () => {
    const repo = new InMemoryLeadRepository();
    await repo.save(
      makeLead({
        category: undefined,
        website: undefined,
        phone: undefined,
        email: undefined,
        address: undefined,
        city: undefined
      })
    );

    const csv = await exportLeadsCsv(repo);

    expect(csv).toContain('Studio Dentistico Rossi,,,,,,,,,,,,qualified,google_maps,false,\r\n');
  });
});