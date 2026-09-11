import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";

/**
 * Dev-only fixtures for the lead report/email preview & test tools.
 *
 * Synthetic leads mirroring the shapes the pipeline produces (slow WordPress
 * + paid ads, a healthy site, an average one). They render the report and the
 * presentation email without a real lead and never touch the database.
 */

export interface LeadReportScenario {
  /** Stable id used in the URL and the send action. */
  readonly id: string;
  readonly label: string;
  readonly lead: Lead;
  readonly analysis: LeadAnalysis;
}

const NOW = "2026-09-10T00:00:00.000Z";

const slowWordPressAds: Lead = {
  id: "00000000-0000-4000-8000-0000000000d1",
  companyName: "Studio Dentistico Sorriso",
  category: "Studio dentistico",
  website: "https://www.studiosorriso.it",
  phone: "+39 045 123 4567",
  email: "anteprima@example.com",
  address: "Via Roma 12",
  city: "Verona",
  source: "google_maps",
  status: "qualified",
  outreachStatus: "not_contacted",
  techStack: ["WordPress", "WooCommerce", "Yoast SEO"],
  copyright: "© 2022 Studio Dentistico Sorriso",
  hasAds: true,
  adsTrackers: ["Google Ads", "Meta Pixel", "GTM"],
  favorite: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const slowWordPressAdsAnalysis: LeadAnalysis = {
  id: "00000000-0000-4000-8000-0000000000d2",
  leadId: slowWordPressAds.id,
  strategy: "mobile",
  performanceScore: 34,
  lcp: 5.8,
  fcp: 3.2,
  cls: 0.34,
  tbt: 780,
  analyzedAt: NOW,
};

const fastNoAds: Lead = {
  id: "00000000-0000-4000-8000-0000000000d3",
  companyName: "Pizzeria Da Mario",
  category: "Ristorazione",
  website: "https://www.pizzeriadamario.it",
  phone: "+39 02 765 4321",
  email: "anteprima@example.com",
  address: "Via Milano 5",
  city: "Milano",
  source: "google_maps",
  status: "analyzed",
  outreachStatus: "not_contacted",
  techStack: ["Next.js"],
  copyright: "© 2026 Pizzeria Da Mario",
  hasAds: false,
  adsTrackers: [],
  favorite: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const fastNoAdsAnalysis: LeadAnalysis = {
  id: "00000000-0000-4000-8000-0000000000d4",
  leadId: fastNoAds.id,
  strategy: "mobile",
  performanceScore: 88,
  lcp: 1.9,
  fcp: 1.4,
  cls: 0.05,
  tbt: 90,
  analyzedAt: NOW,
};

const moderate: Lead = {
  id: "00000000-0000-4000-8000-0000000000d5",
  companyName: "Agenzia Viaggi Levante",
  category: "Agenzia viaggi",
  website: "https://www.agenziavante.it",
  phone: "+39 010 2468 135",
  email: "anteprima@example.com",
  address: "Via XX Settembre 22",
  city: "Genova",
  source: "google_maps",
  status: "qualified",
  outreachStatus: "not_contacted",
  techStack: ["Wix"],
  copyright: "© 2023 Agenzia Viaggi Levante",
  hasAds: true,
  adsTrackers: ["Google Ads"],
  favorite: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const moderateAnalysis: LeadAnalysis = {
  id: "00000000-0000-4000-8000-0000000000d6",
  leadId: moderate.id,
  strategy: "mobile",
  performanceScore: 47,
  lcp: 3.9,
  fcp: 2.4,
  cls: 0.18,
  tbt: 420,
  analyzedAt: NOW,
};

export const LEAD_REPORT_SCENARIOS: readonly LeadReportScenario[] = [
  {
    id: "slow-ads",
    label: "Lento + Ads · WordPress con campagne (Studio Sorriso)",
    lead: slowWordPressAds,
    analysis: slowWordPressAdsAnalysis,
  },
  {
    id: "fast-healthy",
    label: "Sano · sito veloce senza ads (Pizzeria Da Mario)",
    lead: fastNoAds,
    analysis: fastNoAdsAnalysis,
  },
  {
    id: "moderate-wix",
    label: "In bilico · Wix lento con solo Google Ads (Viaggi Levante)",
    lead: moderate,
    analysis: moderateAnalysis,
  },
];

export function findLeadReportScenario(
  id: string
): LeadReportScenario | undefined {
  return LEAD_REPORT_SCENARIOS.find((s) => s.id === id);
}