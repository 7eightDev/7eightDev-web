import {
  hasCriteria,
  leadMatchesCriteria
} from '@/domain/lead/lead.criteria';

describe('lead.criteria', () => {
  it('hasCriteria is false when no criterion is set', () => {
    expect(hasCriteria({})).toBe(false);
    expect(hasCriteria({ techStack: '', copyright: '  ' })).toBe(false);
  });

  it('hasCriteria is true when any criterion is set', () => {
    expect(hasCriteria({ techStack: 'wordpress' })).toBe(true);
    expect(hasCriteria({ copyright: '© 2019' })).toBe(true);
  });

  it('matches techStack by case-insensitive containment', () => {
    const lead = { techStack: ['WordPress', 'jQuery'] as string[], copyright: undefined };

    expect(leadMatchesCriteria(lead, { techStack: 'wordpress' })).toBe(true);
    expect(leadMatchesCriteria(lead, { techStack: 'PRESS' })).toBe(true);
    expect(leadMatchesCriteria(lead, { techStack: 'wix' })).toBe(false);
  });

  it('a lead with no detected tech never matches a tech criterion', () => {
    expect(
      leadMatchesCriteria({ techStack: undefined, copyright: undefined }, { techStack: 'wix' })
    ).toBe(false);
  });

  it('matches copyright by case-insensitive containment', () => {
    const lead = { copyright: '© 2019 ... Ottica Rossi', techStack: [] };

    expect(leadMatchesCriteria(lead, { copyright: '© 2019' })).toBe(true);
    expect(leadMatchesCriteria(lead, { copyright: 'ottica rossi' })).toBe(true);
    expect(leadMatchesCriteria(lead, { copyright: '© 2024' })).toBe(false);
  });

  it('a lead must satisfy every criterion at once', () => {
    const lead = { techStack: ['WordPress'], copyright: '© 2019' };

    expect(
      leadMatchesCriteria(lead, { techStack: 'wordpress', copyright: '© 2019' })
    ).toBe(true);
    expect(
      leadMatchesCriteria(lead, { techStack: 'wordpress', copyright: '© 2024' })
    ).toBe(false);
    expect(leadMatchesCriteria(lead, { techStack: 'wix', copyright: '© 2019' })).toBe(false);
  });
});