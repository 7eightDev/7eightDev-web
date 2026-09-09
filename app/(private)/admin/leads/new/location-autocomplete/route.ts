import { HttpError } from "@/infrastructure/shared/retry";
import { googleApiQuotaGuard } from "@/infrastructure/container";
import { QUOTA_BUCKET_PLACES_AUTOCOMPLETE } from "@/infrastructure/shared/daily-quota-guard";

export const dynamic = "force-dynamic";

const AUTOCOMPLETE_ENDPOINT = "https://places.googleapis.com/v1/places:autocomplete";
const DEFAULT_TIMEOUT_MS = 8_000;

const FIELD_MASK = [
  "suggestions.placePrediction.structuredFormat.mainText.text",
  "suggestions.placePrediction.structuredFormat.secondaryText.text",
  "suggestions.placePrediction.text.text",
].join(",");

/**
 * GET /admin/leads/new/location-autocomplete?q=<query>
 *
 * Proxies the Google Places Autocomplete (New) API for the locality field of
 * the lead search form. Keeps GOOGLE_PLACES_API_KEY server-side. Auth is
 * enforced by the Clerk proxy on the `(private)` area.
 *
 * Returns a compact list of `{ main, secondary }` suggestions.
 */
export async function GET(request: Request): Promise<Response> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Autocomplete non configurato (GOOGLE_PLACES_API_KEY mancante)." },
      { status: 503 },
    );
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return Response.json({ suggestions: [] });
  }

  // Safety: block autocomplete calls when the daily free allowance for the
  // Autocomplete SKU is exhausted to avoid unexpected costs. The unit is
  // consumed only when the call actually succeeds below.
  const quota = await googleApiQuotaGuard.check(
    QUOTA_BUCKET_PLACES_AUTOCOMPLETE,
  );
  if (!quota.allowed) {
    return Response.json(
      { error: "Quota API Google esaurita per oggi. Riprova domani." },
      { status: 429 },
    );
  }

  try {
    const suggestions = await fetchSuggestions(apiKey, q);
    // Count only monetizable calls: failures and zero-result responses are
    // billed under Google's $0 "Zero results" SKU, so they must not inflate
    // the daily usage.
    if (suggestions.length > 0) {
      await googleApiQuotaGuard.increment(QUOTA_BUCKET_PLACES_AUTOCOMPLETE);
    }
    return Response.json({ suggestions });
  } catch (error) {
    if (error instanceof HttpError && error.status === 429) {
      return Response.json(
        { error: "Troppe richieste. Riprova tra qualche secondo." },
        { status: 429 },
      );
    }

    return Response.json(
      { error: "Errore nel suggerire le località." },
      { status: 502 },
    );
  }
}

async function fetchSuggestions(
  apiKey: string,
  input: string,
): Promise<{ main: string; secondary?: string }[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(AUTOCOMPLETE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        input,
        languageCode: "it",
        regionCode: "IT",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpError(
        `Google Places autocomplete failed with status ${response.status}`,
        response.status,
      );
    }

    return parseSuggestions(await response.json());
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new Error("Google Places autocomplete failed", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

function parseSuggestions(
  payload: unknown,
): { main: string; secondary?: string }[] {
  const suggestions = (payload as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(suggestions)) {
    return [];
  }

  return suggestions
    .map((suggestion) => {
      const prediction = (suggestion as { placePrediction?: unknown } | null)
        ?.placePrediction;
      const structured = (prediction as { structuredFormat?: unknown } | null)
        ?.structuredFormat;
      const mainText = (structured as
        | { mainText?: { text?: unknown } }
        | undefined)?.mainText?.text;
      const secondaryText = (structured as
        | { secondaryText?: { text?: unknown } }
        | undefined)?.secondaryText?.text;

      const main =
        typeof mainText === "string" && mainText.length > 0
          ? mainText.trim()
          : "";
      const secondary =
        typeof secondaryText === "string" && secondaryText.length > 0
          ? secondaryText.trim()
          : undefined;

      return main.length > 0 ? { main, secondary } : null;
    })
    .filter(
      (s): s is { main: string; secondary: string | undefined } => s !== null,
    );
}
