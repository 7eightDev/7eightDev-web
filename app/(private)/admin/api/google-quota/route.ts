import { googleApiQuotaGuard } from "@/infrastructure/container";
import {
  QUOTA_BUCKET_PLACES_AUTOCOMPLETE,
  QUOTA_BUCKET_PLACES_TEXT_SEARCH,
} from "@/infrastructure/shared/daily-quota-guard";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/google-quota
 *
 * Exposes the current Google API quota usage so the admin UI can show a live
 * "Quota: X/Y" badge. Auth is enforced by the Clerk proxy on the `(private)`
 * area. Read-only: never increments the counters.
 */
export async function GET(): Promise<Response> {
  const textSearch = googleApiQuotaGuard.usage(
    QUOTA_BUCKET_PLACES_TEXT_SEARCH,
  );
  const autocomplete = googleApiQuotaGuard.usage(
    QUOTA_BUCKET_PLACES_AUTOCOMPLETE,
  );

  return Response.json({
    date: textSearch.date,
    buckets: {
      [QUOTA_BUCKET_PLACES_TEXT_SEARCH]: {
        used: textSearch.used,
        limit: textSearch.limit,
      },
      [QUOTA_BUCKET_PLACES_AUTOCOMPLETE]: {
        used: autocomplete.used,
        limit: autocomplete.limit,
      },
    },
  });
}