import type { LeadAnalysis } from "@/domain/lead/lead.types";
import {
  AD_BUDGET_SCENARIOS_EUR,
  CWV_LCP_GOOD_SECONDS,
  conversionLossRate,
  estMonthlyAdWaste,
  formatEur,
} from "@/domain/lead/lead.impact";

function analysis(lcp: number | undefined): LeadAnalysis {
  return {
    id: "a1",
    leadId: "l1",
    strategy: "mobile",
    performanceScore: 50,
    lcp,
    analyzedAt: "2026-09-10T00:00:00.000Z",
  };
}

describe("conversionLossRate", () => {
  it("returns 0 for a fast site (LCP at the good threshold)", () => {
    expect(conversionLossRate(analysis(CWV_LCP_GOOD_SECONDS))).toBe(0);
  });

  it("returns 0 for an undefined LCP", () => {
    expect(conversionLossRate(analysis(undefined))).toBe(0);
  });

  it("applies the 20% per-second penalty for slower sites", () => {
    // 5.8s → (5.8 - 2.5) * 0.20 = 0.66
    expect(conversionLossRate(analysis(5.8))).toBeCloseTo(0.66, 5);
  });

  it("caps the penalty at 80%", () => {
    // (8 - 2.5) * 0.20 = 1.1 → capped at 0.8
    expect(conversionLossRate(analysis(8))).toBe(0.8);
  });

  it("returns 0 for a slightly fast site", () => {
    expect(conversionLossRate(analysis(2.2))).toBe(0);
  });
});

describe("estMonthlyAdWaste", () => {
  it("rounds the lost budget to whole euros", () => {
    const loss = conversionLossRate(analysis(5.8)); // 0.66
    expect(estMonthlyAdWaste(loss, 1000)).toBe(660);
  });

  it("is 0 when the site converts fine", () => {
    expect(estMonthlyAdWaste(0, AD_BUDGET_SCENARIOS_EUR[1])).toBe(0);
  });
});

describe("formatEur", () => {
  it("formats a whole value with the euro symbol", () => {
    expect(formatEur(350)).toBe("350 €");
  });
});