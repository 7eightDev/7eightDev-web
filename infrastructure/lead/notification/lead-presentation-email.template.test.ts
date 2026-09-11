import { renderLeadPresentationEmail } from "./lead-presentation-email.template";
import { findLeadReportScenario } from "@/infrastructure/lead/lead-email-preview.fixtures";

const SCENARIO = findLeadReportScenario("slow-ads");
if (!SCENARIO) throw new Error("Scenario fixture slow-ads mancante");

const REAL_ORIGIN = process.env.EMAIL_APP_BASE_URL;
afterEach(() => {
  if (REAL_ORIGIN === undefined) delete process.env.EMAIL_APP_BASE_URL;
  else process.env.EMAIL_APP_BASE_URL = REAL_ORIGIN;
});

describe("lead presentation email logo origin", () => {
  it("never embeds a loopback origin for the logo", () => {
    delete process.env.EMAIL_APP_BASE_URL;
    const { html } = renderLeadPresentationEmail(
      SCENARIO.lead,
      SCENARIO.analysis,
      "audit-7eightdev-test.pdf",
      "http://localhost:3000"
    );
    expect(html).toContain("https://7eightdev.com/icon-192.png");
    expect(html).not.toContain("localhost");
  });

  it("honors EMAIL_APP_BASE_URL when set", () => {
    process.env.EMAIL_APP_BASE_URL = "https://7eightdev-web.vercel.app";
    const { html } = renderLeadPresentationEmail(
      SCENARIO.lead,
      SCENARIO.analysis,
      "audit-7eightdev-test.pdf",
      "http://localhost:3000"
    );
    expect(html).toContain("https://7eightdev-web.vercel.app/icon-192.png");
  });
});

describe("lead presentation email layout", () => {
  it("keeps the email fully light with no dark backgrounds", () => {
    const { html } = renderLeadPresentationEmail(
      SCENARIO.lead,
      SCENARIO.analysis,
      "audit-7eightdev-test.pdf",
      "http://localhost:3000"
    );
    expect(html).not.toContain("background:#0A0B0D");
    expect(html).not.toContain('bgcolor="#0A0B0D"');
    expect(html).not.toContain("background:#101216");
    expect(html).not.toContain('bgcolor="#101216"');
    expect(html).toContain('bgcolor="#FFFFFF"');
  });

  it("renders the brand header above the white content card", () => {
    const { html } = renderLeadPresentationEmail(
      SCENARIO.lead,
      SCENARIO.analysis,
      "audit-7eightdev-test.pdf",
      "http://localhost:3000"
    );
    const cardStart = html.indexOf('bgcolor="#FFFFFF"');
    const wordmark = html.indexOf("7eight<span");
    expect(wordmark).toBeGreaterThan(-1);
    expect(wordmark).toBeLessThan(cardStart);
  });

  it("links the site domain with a readable green on the light background", () => {
    const { html } = renderLeadPresentationEmail(
      SCENARIO.lead,
      SCENARIO.analysis,
      "audit-7eightdev-test.pdf",
      "http://localhost:3000"
    );
    expect(html).toContain(
      '<a href="https://www.studiosorriso.it" style="color:#15803D;'
    );
    // No client-default link color (Gmail's #1155CC) — the anchor carries its
    // own inline color so mail clients can't repaint it.
    expect(html).not.toContain("rgb(17, 85, 204)");
  });

  it("renders the LCP figure in seconds with an Italian format", () => {
    const { html, text } = renderLeadPresentationEmail(
      SCENARIO.lead,
      SCENARIO.analysis,
      "audit-7eightdev-test.pdf",
      "http://localhost:3000"
    );
    expect(html).toContain("5,8 s (ideale ≤ 2,5 s)");
    expect(text).toContain("5,8 s (ideale ≤ 2,5 s)");
  });
});