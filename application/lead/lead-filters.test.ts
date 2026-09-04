import type { Lead } from '@/domain/lead/lead.types';
import {
  filterLeads,
  sortLeads,
  parseLeadStatusFilter,
  parseScoreFilter,
  parseSourceFilter,
  parseSortOption,
  type LeadReadModel,
  type LeadStatusFilter,
  type ScoreFilter,
  type SourceFilter,
  type SortOption
} from '@/presentation/features/admin/leads/lead-filters';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeLead(
  overrides: Partial<Lead> & { id: string; companyName: string }
): Lead {
  return {
    source: 'google_maps',
    status: 'new',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  };
}

function row(lead: Lead, score?: number): LeadReadModel {
  return { lead, score };
}

const ALL: LeadStatusFilter = 'all';
const ALL_SCORE: ScoreFilter = 'all';
const ALL_SOURCE: SourceFilter = 'all';
const ALL_SORT: SortOption = 'date-desc';
const NO_Q = '';

/* ------------------------------------------------------------------ */
/*  Parsers                                                           */
/* ------------------------------------------------------------------ */

describe('lead-filters parsers', () => {
  it('parseLeadStatusFilter returns "all" for unknown input', () => {
    expect(parseLeadStatusFilter(undefined)).toBe('all');
    expect(parseLeadStatusFilter('bogus')).toBe('all');
  });

  it('parseLeadStatusFilter accepts valid statuses', () => {
    expect(parseLeadStatusFilter('new')).toBe('new');
    expect(parseLeadStatusFilter('qualified')).toBe('qualified');
  });

  it('parseScoreFilter returns "all" for unknown input', () => {
    expect(parseScoreFilter(undefined)).toBe('all');
    expect(parseScoreFilter('xyz')).toBe('all');
  });

  it('parseScoreFilter accepts valid score filters', () => {
    expect(parseScoreFilter('low')).toBe('low');
    expect(parseScoreFilter('none')).toBe('none');
  });

  it('parseSourceFilter returns "all" for unknown input', () => {
    expect(parseSourceFilter(undefined)).toBe('all');
    expect(parseSourceFilter('facebook')).toBe('all');
  });

  it('parseSourceFilter accepts valid sources', () => {
    expect(parseSourceFilter('google_maps')).toBe('google_maps');
    expect(parseSourceFilter('outscraper')).toBe('outscraper');
  });

  it('parseSortOption returns "date-desc" for unknown input', () => {
    expect(parseSortOption(undefined)).toBe('date-desc');
    expect(parseSortOption('random')).toBe('date-desc');
  });

  it('parseSortOption accepts valid sort options', () => {
    expect(parseSortOption('name-asc')).toBe('name-asc');
    expect(parseSortOption('score-desc')).toBe('score-desc');
  });
});

/* ------------------------------------------------------------------ */
/*  filterLeads — status                                              */
/* ------------------------------------------------------------------ */

describe('filterLeads — status', () => {
  const rows: LeadReadModel[] = [
    row(makeLead({ id: '1', companyName: 'A', status: 'new' })),
    row(makeLead({ id: '2', companyName: 'B', status: 'analyzed' }), 80),
    row(makeLead({ id: '3', companyName: 'C', status: 'qualified' }), 30),
    row(makeLead({ id: '4', companyName: 'D', status: 'discarded' }))
  ];

  it('shows all when status=all', () => {
    expect(
      filterLeads(rows, {
        status: ALL,
        score: ALL_SCORE,
        source: ALL_SOURCE,
        q: NO_Q,
        sort: ALL_SORT
      })
    ).toHaveLength(4);
  });

  it('filters by new', () => {
    const result = filterLeads(rows, {
      status: 'new',
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('1');
  });

  it('filters by qualified', () => {
    const result = filterLeads(rows, {
      status: 'qualified',
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('3');
  });
});

/* ------------------------------------------------------------------ */
/*  filterLeads — score                                               */
/* ------------------------------------------------------------------ */

describe('filterLeads — score', () => {
  const rows: LeadReadModel[] = [
    row(makeLead({ id: '1', companyName: 'A' }), 95),
    row(makeLead({ id: '2', companyName: 'B' }), 70),
    row(makeLead({ id: '3', companyName: 'C' }), 30),
    row(makeLead({ id: '4', companyName: 'D' }))
  ];

  it('high: score >= 90', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: 'high',
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('1');
  });

  it('medium: 50 <= score < 90', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: 'medium',
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('2');
  });

  it('low: score < 50', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: 'low',
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('3');
  });

  it('none: score is undefined', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: 'none',
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('4');
  });

  it('all: no score filtering', () => {
    expect(
      filterLeads(rows, {
        status: ALL,
        score: ALL_SCORE,
        source: ALL_SOURCE,
        q: NO_Q,
        sort: ALL_SORT
      })
    ).toHaveLength(4);
  });
});

/* ------------------------------------------------------------------ */
/*  filterLeads — source                                              */
/* ------------------------------------------------------------------ */

describe('filterLeads — source', () => {
  const rows: LeadReadModel[] = [
    row(makeLead({ id: '1', companyName: 'A', source: 'google_maps' })),
    row(makeLead({ id: '2', companyName: 'B', source: 'outscraper' })),
    row(makeLead({ id: '3', companyName: 'C', source: 'serpapi' }))
  ];

  it('filters by google_maps', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: 'google_maps',
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.source).toBe('google_maps');
  });

  it('filters by outscraper', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: 'outscraper',
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
  });

  it('all shows everything', () => {
    expect(
      filterLeads(rows, {
        status: ALL,
        score: ALL_SCORE,
        source: ALL_SOURCE,
        q: NO_Q,
        sort: ALL_SORT
      })
    ).toHaveLength(3);
  });
});

/* ------------------------------------------------------------------ */
/*  filterLeads — text search                                         */
/* ------------------------------------------------------------------ */

describe('filterLeads — text search', () => {
  const rows: LeadReadModel[] = [
    row(makeLead({ id: '1', companyName: 'Dentisti Milano', city: 'Milano' })),
    row(makeLead({ id: '2', companyName: 'Studio Legale Roma', city: 'Roma' })),
    row(
      makeLead({
        id: '3',
        companyName: 'Autofficina Brescia',
        website: 'https://autofficina.it'
      })
    )
  ];

  it('matches company name', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: 'dentist',
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('1');
  });

  it('matches city', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: 'roma',
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('2');
  });

  it('matches website', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: 'autofficina',
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('3');
  });

  it('empty q returns all', () => {
    expect(
      filterLeads(rows, {
        status: ALL,
        score: ALL_SCORE,
        source: ALL_SOURCE,
        q: '',
        sort: ALL_SORT
      })
    ).toHaveLength(3);
  });

  it('case-insensitive', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: 'MILANO',
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/*  filterLeads — composition                                         */
/* ------------------------------------------------------------------ */

describe('filterLeads — composition', () => {
  const rows: LeadReadModel[] = [
    row(
      makeLead({
        id: '1',
        companyName: 'Dentisti Milano',
        status: 'qualified',
        source: 'google_maps'
      }),
      30
    ),
    row(
      makeLead({
        id: '2',
        companyName: 'Dentisti Roma',
        status: 'new',
        source: 'google_maps'
      })
    ),
    row(
      makeLead({
        id: '3',
        companyName: 'Studio Roma',
        status: 'qualified',
        source: 'outscraper'
      }),
      45
    )
  ];

  it('status + q compose', () => {
    const result = filterLeads(rows, {
      status: 'qualified',
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: 'milano',
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('1');
  });

  it('score + source compose', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: 'low',
      source: 'google_maps',
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result).toHaveLength(1);
    expect(result[0].lead.id).toBe('1');
  });

  it('all filters active, no match', () => {
    const result = filterLeads(rows, {
      status: 'discarded',
      score: 'high',
      source: 'serpapi',
      q: 'nonexistent',
      sort: ALL_SORT
    });
    expect(result).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  sortLeads                                                        */
/* ------------------------------------------------------------------ */

describe('sortLeads', () => {
  const rows: LeadReadModel[] = [
    row(
      makeLead({
        id: '1',
        companyName: 'Beta',
        createdAt: '2025-03-01T00:00:00.000Z'
      }),
      80
    ),
    row(
      makeLead({
        id: '2',
        companyName: 'Alpha',
        createdAt: '2025-01-01T00:00:00.000Z'
      }),
      30
    ),
    row(
      makeLead({
        id: '3',
        companyName: 'Gamma',
        createdAt: '2025-06-01T00:00:00.000Z'
      })
    )
  ];

  it('date-desc: most recent first', () => {
    const result = sortLeads(rows, 'date-desc');
    expect(result.map((r) => r.lead.id)).toEqual(['3', '1', '2']);
  });

  it('date-asc: oldest first', () => {
    const result = sortLeads(rows, 'date-asc');
    expect(result.map((r) => r.lead.id)).toEqual(['2', '1', '3']);
  });

  it('name-asc: alphabetical', () => {
    const result = sortLeads(rows, 'name-asc');
    expect(result.map((r) => r.lead.companyName)).toEqual([
      'Alpha',
      'Beta',
      'Gamma'
    ]);
  });

  it('name-desc: reverse alphabetical', () => {
    const result = sortLeads(rows, 'name-desc');
    expect(result.map((r) => r.lead.companyName)).toEqual([
      'Gamma',
      'Beta',
      'Alpha'
    ]);
  });

  it('score-asc: lowest first, undefined last', () => {
    const result = sortLeads(rows, 'score-asc');
    expect(result.map((r) => r.score)).toEqual([30, 80, undefined]);
  });

  it('score-desc: highest first, undefined last', () => {
    const result = sortLeads(rows, 'score-desc');
    expect(result.map((r) => r.score)).toEqual([80, 30, undefined]);
  });

  it('does not mutate the input array', () => {
    const input = [...rows];
    sortLeads(rows, 'name-asc');
    expect(rows).toEqual(input);
  });
});
