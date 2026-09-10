import "@testing-library/jest-dom";
import {
  formatWebVital,
  getWebVitalTone,
  getOutreachLabel,
  getStatusBadgeClass,
  getTrackerLabel,
  isSlowWithAds,
  QUALIFICATION_LABEL,
} from "./lead-dialog-utils";

/* ── formatWebVital ── */

describe("formatWebVital", () => {
  it("rounds float noise to 2 decimals", () => {
    expect(formatWebVital(2.6500000000000001)).toBe("2.65");
  });

  it("keeps integers clean", () => {
    expect(formatWebVital(3)).toBe("3");
  });

  it("rounds to 2 decimals", () => {
    expect(formatWebVital(1.239)).toBe("1.24");
  });

  it("handles zero", () => {
    expect(formatWebVital(0)).toBe("0");
  });

  it("handles negative values", () => {
    expect(formatWebVital(-0.123)).toBe("-0.12");
  });
});

/* ── getWebVitalTone ── */

describe("getWebVitalTone", () => {
  it("returns ok when value is below good threshold", () => {
    expect(getWebVitalTone(1.5, 2.5, 4)).toBe("ok");
  });

  it("returns ok when value equals good threshold", () => {
    expect(getWebVitalTone(2.5, 2.5, 4)).toBe("ok");
  });

  it("returns warn when value is between good and poor", () => {
    expect(getWebVitalTone(3, 2.5, 4)).toBe("warn");
  });

  it("returns bad when value is at poor threshold", () => {
    expect(getWebVitalTone(4, 2.5, 4)).toBe("bad");
  });

  it("returns bad when value exceeds poor threshold", () => {
    expect(getWebVitalTone(5, 2.5, 4)).toBe("bad");
  });

  it("returns ok when value is undefined", () => {
    expect(getWebVitalTone(undefined, 2.5, 4)).toBe("ok");
  });

  it("returns ok when value is null", () => {
    expect(getWebVitalTone(null, 2.5, 4)).toBe("ok");
  });

  it("returns ok for zero value", () => {
    expect(getWebVitalTone(0, 2.5, 4)).toBe("ok");
  });
});

/* ── QUALIFICATION_LABEL ── */

describe("QUALIFICATION_LABEL", () => {
  it("maps 'new' to 'Da analizzare'", () => {
    expect(QUALIFICATION_LABEL.new).toBe("Da analizzare");
  });

  it("maps 'analyzed' to 'Analizzato'", () => {
    expect(QUALIFICATION_LABEL.analyzed).toBe("Analizzato");
  });

  it("maps 'qualified' to 'Qualificato'", () => {
    expect(QUALIFICATION_LABEL.qualified).toBe("Qualificato");
  });

  it("maps 'discarded' to 'Scartato'", () => {
    expect(QUALIFICATION_LABEL.discarded).toBe("Scartato");
  });
});

/* ── getOutreachLabel ── */

describe("getOutreachLabel", () => {
  it("returns correct label for not_contacted", () => {
    expect(getOutreachLabel("not_contacted")).toBe("Da contattare");
  });

  it("returns correct label for audit_sent", () => {
    expect(getOutreachLabel("audit_sent")).toBe("Audit inviato");
  });

  it("returns correct label for in_talks", () => {
    expect(getOutreachLabel("in_talks")).toBe("In trattativa");
  });

  it("returns correct label for closed_won", () => {
    expect(getOutreachLabel("closed_won")).toBe("Cliente");
  });

  it("returns correct label for rejected", () => {
    expect(getOutreachLabel("rejected")).toBe("Rifiutato");
  });
});

/* ── getStatusBadgeClass ── */

describe("getStatusBadgeClass", () => {
  it("returns accent class for qualified", () => {
    expect(getStatusBadgeClass("qualified")).toContain("text-accent");
  });

  it("returns coral class for discarded", () => {
    expect(getStatusBadgeClass("discarded")).toContain("coral");
  });

  it("returns muted class for new", () => {
    expect(getStatusBadgeClass("new")).toContain("text-muted");
  });

  it("returns muted class for analyzed", () => {
    expect(getStatusBadgeClass("analyzed")).toContain("text-muted");
  });
});

/* ── getTrackerLabel ── */

describe("getTrackerLabel", () => {
  it("returns full label for known tracker", () => {
    expect(getTrackerLabel("Google Ads")).toBe("Google Ads");
  });

  it("returns full label for Meta Pixel", () => {
    expect(getTrackerLabel("Meta Pixel")).toBe("Meta Pixel (FB/IG)");
  });

  it("returns full label for GTM", () => {
    expect(getTrackerLabel("GTM")).toBe("Google Tag Manager");
  });

  it("falls back to raw name for unknown tracker", () => {
    expect(getTrackerLabel("CustomTracker")).toBe("CustomTracker");
  });
});

/* ── isSlowWithAds ── */

describe("isSlowWithAds", () => {
  it("returns true when has ads and score below 50", () => {
    expect(isSlowWithAds(true, 40)).toBe(true);
  });

  it("returns false when has ads and score at 50", () => {
    expect(isSlowWithAds(true, 50)).toBe(false);
  });

  it("returns false when has ads and score above 50", () => {
    expect(isSlowWithAds(true, 80)).toBe(false);
  });

  it("returns false when no ads", () => {
    expect(isSlowWithAds(false, 30)).toBe(false);
  });

  it("returns false when hasAds is undefined", () => {
    expect(isSlowWithAds(undefined, 30)).toBe(false);
  });

  it("returns false when score is undefined", () => {
    expect(isSlowWithAds(true, undefined)).toBe(false);
  });
});
