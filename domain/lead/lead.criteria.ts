import type { Lead } from '@/domain/lead/lead.types';

/**
 * Search criteria narrowing a lead generation job to matching sites. Kept on
 * the job (LeadGenerationJob.techStack / .copyright) so it survives re-runs.
 */
export interface LeadCriteria {
  readonly techStack?: string;
  readonly copyright?: string;
}

/** True when the search must be narrowed to matching sites only. */
export function hasCriteria(criteria: LeadCriteria): boolean {
  return Boolean(criteria.techStack?.trim() || criteria.copyright?.trim());
}

/** Case-insensitive containment check of the tech/copyright criteria against
 *  the detected lead data. A lead fails as soon as one criterion misses. */
export function leadMatchesCriteria(
  lead: Pick<Lead, 'techStack' | 'copyright'>,
  criteria: LeadCriteria
): boolean {
  const tech = criteria.techStack?.trim().toLowerCase();
  if (tech) {
    const hit = (lead.techStack ?? []).some((name) =>
      name.toLowerCase().includes(tech)
    );
    if (!hit) return false;
  }

  const copyright = criteria.copyright?.trim().toLowerCase();
  if (copyright && !lead.copyright?.toLowerCase().includes(copyright)) {
    return false;
  }

  return true;
}