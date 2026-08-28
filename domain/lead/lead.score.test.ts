import {
  calculateLeadQualification,
  type LeadQualification
} from '@/domain/lead/lead.score';

describe('calculateLeadQualification', () => {
  it('qualifies a lead with a performance score below 50', () => {
    expect(calculateLeadQualification(49)).toBe<LeadQualification>('qualified');
  });

  it('qualifies a lead with a performance score of 0', () => {
    expect(calculateLeadQualification(0)).toBe<LeadQualification>('qualified');
  });

  it('does not qualify a lead with a performance score of 50', () => {
    expect(calculateLeadQualification(50)).toBe<LeadQualification>(
      'not_qualified'
    );
  });

  it('does not qualify a lead with a perfect performance score', () => {
    expect(calculateLeadQualification(100)).toBe<LeadQualification>(
      'not_qualified'
    );
  });

  it('does not qualify a lead when the performance score is unavailable', () => {
    expect(calculateLeadQualification(undefined)).toBe<LeadQualification>(
      'not_qualified'
    );
  });
});
