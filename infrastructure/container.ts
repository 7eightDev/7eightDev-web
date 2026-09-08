import type { CatalogRepository } from "@/domain/catalog/catalog.repository";
import type { CopyrightPort } from "@/domain/lead/lead.copyright";
import type { LeadDiscoveryPort } from "@/domain/lead/lead.discovery";
import type { LeadRepository } from "@/domain/lead/lead.repository";
import type { PageSpeedPort } from "@/domain/lead/lead.pagespeed";
import type { TechStackPort } from "@/domain/lead/lead.tech";
import type { QuoteNotificationPort } from "@/domain/quote/quote-notification.port";
import type { QuoteRepository } from "@/domain/quote/quote.repository";
import { PrismaCatalogRepository } from "@/infrastructure/catalog/prisma-catalog.repository";
import { HtmlCopyrightDetector } from "@/infrastructure/lead/copyright/html-copyright-detector";
import { GooglePlacesLeadDiscovery } from "@/infrastructure/lead/discovery/google-places-lead-discovery";
import { PrismaLeadRepository } from "@/infrastructure/lead/prisma-lead.repository";
import { GooglePageSpeedInsights } from "@/infrastructure/lead/pagespeed/google-pagespeed-insights";
import { HtmlTechDetector } from "@/infrastructure/lead/tech-stack/html-tech-detector";
import { NullQuoteNotificationAdapter } from "@/infrastructure/quote/null-quote-notification.adapter";
import { PrismaQuoteRepository } from "@/infrastructure/quote/prisma-quote.repository";
import {
  ResendQuoteNotificationAdapter,
  type ResendQuoteNotificationConfig,
} from "@/infrastructure/quote/resend-quote-notification.adapter";
import { DailyQuotaGuard } from "@/infrastructure/shared/daily-quota-guard";
import { RateLimiter } from "@/infrastructure/shared/rate-limiter";
import { createLogger } from "@/infrastructure/logging/logger";

const log = createLogger("container");

/**
 * Composition root: single place where ports are bound to adapters.
 * Swap implementations here (e.g. in-memory for local demos without DB).
 */
export const quoteRepository: QuoteRepository = new PrismaQuoteRepository();

/** Service Catalog persistence (reference data composed into quotes). */
export const catalogRepository: CatalogRepository =
  new PrismaCatalogRepository();

/** Lead discovery and qualification persistence. */
export const leadRepository: LeadRepository = new PrismaLeadRepository();

/**
 * Google API daily quota guard (per-SKU buckets).
 * Blocks calls when a daily limit is reached so the account never exceeds
 * Google's monthly free allowance (Text Search ~1000/mo, Autocomplete
 * ~10000/mo). PageSpeed is free and is not gated.
 * Configure via GOOGLE_PLACES_DAILY_QUOTA_LIMIT, GOOGLE_AUTOCOMPLETE_DAILY_QUOTA_LIMIT
 * and GOOGLE_API_QUOTA_TRACKER_PATH.
 */
export const googleApiQuotaGuard = new DailyQuotaGuard();

/**
 * Lead discovery. Uses the Google Places Text Search API to find businesses
 * in a niche/location and extract their website (analyzed by PageSpeed) plus
 * contact data. Requires GOOGLE_PLACES_API_KEY in the environment.
 *
 * The Outscraper adapter remains available in the codebase but is not wired
 * here; switch back by replacing this binding.
 */
export const leadDiscovery: LeadDiscoveryPort = new GooglePlacesLeadDiscovery(
  {
    apiKey: process.env.GOOGLE_PLACES_API_KEY,
    quotaGuard: googleApiQuotaGuard,
  },
);

/**
 * Outbound quote notifications. Uses Resend when fully configured, otherwise
 * falls back to a no-op so the app still runs in dev/CI without a key.
 */
export const quoteNotifier: QuoteNotificationPort = buildQuoteNotifier();

/** PageSpeed analysis for lead qualification. API gratuita, nessun addebito. */
export const pageSpeedAnalyzer: PageSpeedPort = new GooglePageSpeedInsights({
  apiKey: process.env.GOOGLE_PAGESPEED_API_KEY,
});

/** Heuristic tech-stack detection on a lead's website (WordPress, Wix…). */
export const techStackDetector: TechStackPort = new HtmlTechDetector();

/** Footer copyright detection on a lead's website (staleness signal). */
export const copyrightDetector: CopyrightPort = new HtmlCopyrightDetector();

/** Rate limiters: per-instance in-memory (sufficient for B2B admin). */
export const leadGenerationRateLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
});

export const exportRateLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
});

/**
 * Reads the Resend email configuration from the environment, or returns null
 * when it is incomplete. Exported so dev tooling (email preview/test) can build
 * an ad-hoc adapter with the same config the app uses in production.
 */
export function emailConfigFromEnv(): ResendQuoteNotificationConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.QUOTE_FROM_EMAIL;
  const replyTo = process.env.QUOTE_REPLY_TO;
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!apiKey || !from || !replyTo || !appBaseUrl) return null;

  // Owner inbox for the "quote accepted" alert; falls back to the
  // client-facing reply-to address when not set explicitly.
  const ownerInbox = process.env.QUOTE_ACCEPT_NOTIFY_TO?.trim() || replyTo;
  return { apiKey, from, replyTo, appBaseUrl, ownerInbox };
}

function buildQuoteNotifier(): QuoteNotificationPort {
  const config = emailConfigFromEnv();
  if (config) {
    return new ResendQuoteNotificationAdapter(config);
  }

  log.warn(
    "Configurazione email incompleta (RESEND_API_KEY / QUOTE_FROM_EMAIL / " +
      "QUOTE_REPLY_TO / APP_BASE_URL) — uso NullQuoteNotificationAdapter."
  );
  return new NullQuoteNotificationAdapter();
}
