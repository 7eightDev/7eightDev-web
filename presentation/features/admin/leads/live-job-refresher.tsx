'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Polling cadence while at least one job is pending/running. */
export const JOB_POLL_INTERVAL_MS = 4000;

interface LiveJobRefresherProps {
  /** True when at least one job is pending or running and needs polling. */
  readonly active: boolean;
}

/**
 * Re-fetches the leads page (server component) on an interval while a
 * lead-generation job is still in progress, so the job status card and the
 * growing lead list update without a manual reload. Stops polling as soon as
 * every job reaches a terminal state.
 */
export function LiveJobRefresher({ active }: LiveJobRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), JOB_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
