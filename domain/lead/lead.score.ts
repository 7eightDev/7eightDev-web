export type LeadQualification = 'qualified' | 'not_qualified';

export function calculateLeadQualification(
  performanceScore: number | undefined
): LeadQualification {
  if (performanceScore === undefined) {
    return 'not_qualified';
  }

  return performanceScore < 50 ? 'qualified' : 'not_qualified';
}
