import type { Lead } from '@/domain/lead/lead.types';
import {
  filterLeads,
  sortLeads,
  parseLeadStatusFilter,
  parseScoreFilter,
  parseSourceFilter,
  parseAdsFilter,
  parseSortOption,
  parseYearFilter,
  uniqueCopyrightYears,
  toggleColumnSort,
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
    outreachStatus: 'not_contacted',
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

  it('parseAdsFilter returns "all" for unknown input', () => {
    expect(parseAdsFilter(undefined)).toBe('all');
    expect(parseAdsFilter('campagne')).toBe('all');
  });

  it('parseAdsFilter accepts valid ads filters', () => {
    expect(parseAdsFilter('with')).toBe('with');
    expect(parseAdsFilter('without')).toBe('without');
  });

  it('parseSortOption returns "date-desc" for unknown input', () => {
    expect(parseSortOption(undefined)).toBe('date-desc');
    expect(parseSortOption('random')).toBe('date-desc');
  });

  it('parseSortOption accepts valid sort options', () => {
    expect(parseSortOption('name-asc')).toBe('name-asc');
    expect(parseSortOption('score-desc')).toBe('score-desc');
  });

  it('parseYearFilter returns undefined for absent or implausible values', () => {
    expect(parseYearFilter(undefined)).toBeUndefined();
    expect(parseYearFilter('bogus')).toBeUndefined();
    expect(parseYearFilter('201')).toBeUndefined();
    expect(parseYearFilter('1800')).toBeUndefined();
  });

  it('parseYearFilter accepts a 4-digit year', () => {
    expect(parseYearFilter('2016')).toBe(2016);
    expect(parseYearFilter('2026')).toBe(2026);
  });
});

describe('uniqueCopyrightYears — extracts distinct footer years', () => {
  it('collects years from lead copyrights, sorted ascending', () => {
    const leads = [
      makeLead({ id: '1', companyName: 'A', copyright: '© 2024 Studio' }),
      makeLead({ id: '2', companyName: 'B', copyright: 'Grant 2019 srl' }),
      makeLead({ id: '3', companyName: 'C', copyright: '© 2025 Studio' }),
      makeLead({ id: '4', companyName: 'D' })
    ];
    expect(uniqueCopyrightYears(leads)).toEqual([2019, 2024, 2025]);
  });

  it('returns an empty list when no copyright carries a year', () => {
    expect(uniqueCopyrightYears([makeLead({ id: '1', companyName: 'A' })])).toEqual([]);
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

  it('filters by analyzed (only the analyzed status)', () => {
    const result = filterLeads(rows, {
      status: 'analyzed',
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT
    });
    expect(result.map((r) => r.lead.id)).toEqual(['2']);
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
/*  filterLeads — tech stack & copyright                              */
/* ------------------------------------------------------------------ */

describe('filterLeads — tech stack', () => {
  const rows: LeadReadModel[] = [
    row(
      makeLead({
        id: '1',
        companyName: 'A',
        techStack: ['WordPress', 'jQuery']
      })
    ),
    row(
      makeLead({
        id: '2',
        companyName: 'B',
        techStack: ['React', 'Next.js']
      })
    ),
    row(makeLead({ id: '3', companyName: 'C', techStack: [] }))
  ];

  it('no filter shows all', () => {
    expect(
      filterLeads(rows, {
        status: ALL,
        score: ALL_SCORE,
        source: ALL_SOURCE,
        q: NO_Q,
        sort: ALL_SORT,
        techStack: []})
    ).toHaveLength(3);
  });

  it('matches any-of selected tech (OR)', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT,
      techStack: ['WordPress', 'React']});
    expect(result.map((r) => r.lead.id).sort()).toEqual(['1', '2']);
  });

  it('matches a single tech', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT,
      techStack: ['Next.js']});
    expect(result.map((r) => r.lead.id)).toEqual(['2']);
  });

  it('partial (substring) match is case-insensitive', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT,
      techStack: ['wordpress']});
    expect(result.map((r) => r.lead.id)).toEqual(['1']);
  });

  it('no tech on the lead never matches', () => {
    const result = filterLeads(rows, {
      status: ALL,
      score: ALL_SCORE,
      source: ALL_SOURCE,
      q: NO_Q,
      sort: ALL_SORT,
      techStack: ['WordPress']});
    expect(result.some((r) => r.lead.id === '3')).toBe(false);
  });
});

describe('filterLeads — ads tracker', () => {
  const rows: LeadReadModel[] = [
    row(makeLead({ id: '1', companyName: 'A', hasAds: true })),
    row(makeLead({ id: '2', companyName: 'B', hasAds: false })),
    row(makeLead({ id: '3', companyName: 'C' }))
  ];

  const base = {
    status: ALL,
    score: ALL_SCORE,
    source: ALL_SOURCE,
    q: NO_Q,
    sort: ALL_SORT
  };

  it('no filter shows all', () => {
    expect(filterLeads(rows, base)).toHaveLength(3);
  });

  it('"with" keeps only leads that spend on ads', () => {
    const result = filterLeads(rows, { ...base, ads: 'with' });
    expect(result.map((r) => r.lead.id)).toEqual(['1']);
  });

  it('"without" keeps only leads without ads', () => {
    const result = filterLeads(rows, { ...base, ads: 'without' });
    expect(result.map((r) => r.lead.id)).toEqual(['2', '3']);
  });

  it('combines with other filter dimensions', () => {
    const result = filterLeads(
      [
        row(
          makeLead({
            id: '1',
            companyName: 'Dentisti Milano',
            city: 'Milano',
            hasAds: true
          })
        ),
        row(
          makeLead({
            id: '2',
            companyName: 'Dentisti Verona',
            city: 'Verona',
            hasAds: true
          })
        )
      ],
      { ...base, ads: 'with', q: 'milano' }
    );
    expect(result.map((r) => r.lead.id)).toEqual(['1']);
  });
});

describe('filterLeads — copyright year range', () => {
  const rows: LeadReadModel[] = [
    row(makeLead({ id: '1', companyName: 'A', copyright: '© 2024 Studio' })),
    row(makeLead({ id: '2', companyName: 'B', copyright: '© 2025 Studio' })),
    row(makeLead({ id: '3', companyName: 'C' }))
  ];

  const base: {
    status: LeadStatusFilter;
    score: ScoreFilter;
    source: SourceFilter;
    q: string;
    sort: SortOption;
    techStack: string[];
  } = {
    status: ALL,
    score: ALL_SCORE,
    source: ALL_SOURCE,
    q: NO_Q,
    sort: ALL_SORT,
    techStack: []
  };

  it('no range shows all', () => {
    expect(filterLeads(rows, base)).toHaveLength(3);
  });

  it('matches leads up to a year (before 2016 case)', () => {
    const result = filterLeads(rows, { ...base, copyrightTo: 2024 });
    expect(result.map((r) => r.lead.id)).toEqual(['1']);
  });

  it('matches leads from a year onward', () => {
    const result = filterLeads(rows, { ...base, copyrightFrom: 2025 });
    expect(result.map((r) => r.lead.id)).toEqual(['2']);
  });

  it('supports a from/to range', () => {
    const result = filterLeads(rows, {
      ...base,
      copyrightFrom: 2024,
      copyrightTo: 2024
    });
    expect(result.map((r) => r.lead.id)).toEqual(['1']);
  });

  it('leads without a year never match an active range', () => {
    const result = filterLeads(rows, { ...base, copyrightTo: 2026 });
    expect(result.some((r) => r.lead.id === '3')).toBe(false);
    expect(result).toHaveLength(2);
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

describe('sortLeads by column', () => {
  const rows: LeadReadModel[] = [
    row(
      makeLead({ id: '1', companyName: 'Beta', city: 'Roma', status: 'new' }),
      80
    ),
    row(
      makeLead({
        id: '2',
        companyName: 'Alpha',
        city: undefined,
        status: 'qualified'
      }),
      30
    ),
    row(
      makeLead({
        id: '3',
        companyName: 'Gamma',
        city: 'Milano',
        status: 'discarded'
      }),
      50
    )
  ];

  it('city-asc: alphabetical, empty cities last', () => {
    const result = sortLeads(rows, 'city-asc');
    expect(result.map((r) => r.lead.id)).toEqual(['3', '1', '2']);
  });

  it('city-desc: reverse alphabetical, empty cities last', () => {
    const result = sortLeads(rows, 'city-desc');
    expect(result.map((r) => r.lead.id)).toEqual(['1', '3', '2']);
  });

  it('status-asc: alphabetical status', () => {
    const result = sortLeads(rows, 'status-asc');
    expect(result.map((r) => r.lead.status)).toEqual([
      'discarded',
      'new',
      'qualified'
    ]);
  });

  it('status-desc: reverse status', () => {
    const result = sortLeads(rows, 'status-desc');
    expect(result.map((r) => r.lead.status)).toEqual([
      'qualified',
      'new',
      'discarded'
    ]);
  });
});

describe('toggleColumnSort', () => {
  it('returns null for columns without a mapped sort', () => {
    expect(toggleColumnSort('tech', 'date-desc')).toBeNull();
  });

  it('toggles asc -> desc per column', () => {
    expect(toggleColumnSort('company', 'date-desc')).toBe('name-asc');
    expect(toggleColumnSort('city', 'date-desc')).toBe('city-asc');
    expect(toggleColumnSort('score', 'date-desc')).toBe('score-desc');
    expect(toggleColumnSort('status', 'date-desc')).toBe('status-asc');
  });

  it('toggles desc -> asc when the column is already the active sort', () => {
    expect(toggleColumnSort('company', 'name-asc')).toBe('name-desc');
    expect(toggleColumnSort('company', 'name-desc')).toBe('name-asc');
    expect(toggleColumnSort('score', 'score-desc')).toBe('score-asc');
    expect(toggleColumnSort('status', 'status-asc')).toBe('status-desc');
  });
});
