import { renderLeadReportHtml } from "./lead-report.template";
import { findLeadReportScenario } from "@/infrastructure/lead/lead-email-preview.fixtures";

const SCENARIO = findLeadReportScenario("slow-ads");
if (!SCENARIO) throw new Error("Scenario fixture slow-ads mancante");

const render = (mode: "pdf" | "preview" = "pdf"): string =>
  renderLeadReportHtml(
    {
      lead: SCENARIO.lead,
      analysis: SCENARIO.analysis,
      generatedAt: "2026-09-10T00:00:00.000Z",
    },
    mode
  );

describe("lead report html", () => {
  it("ships the light palette by default and links use the accent token", () => {
    const html = render();

    expect(html).toContain(
      '<a href="https://www.studiosorriso.it">www.studiosorriso.it</a>'
    );
    expect(html).toContain(":root");
    expect(html).toContain("--accent: #15803d");
    expect(html).toContain("a {\n    color: var(--accent);");
    expect(html).not.toContain("#0000EE");
  });

  it("keeps the dark palette available as a data-theme override", () => {
    const html = render();

    expect(html).toContain('[data-theme="dark"]');
    expect(html).toContain("--accent: #c7f94e");
  });

  it("injects width-fit preview scripts only in preview mode (vertical scroll stays on)", () => {
    const pdf = render("pdf");
    const preview = render("preview");

    expect(pdf).not.toContain('document.querySelector(".page")');
    expect(preview).not.toContain('html, body { overflow: hidden; }');
    expect(preview).toContain('document.querySelector(".page")');
    expect(preview).toContain("Math.min(1, availW / page.offsetWidth)");
  });

  it("uses the official SVG logo and mono wordmark in the header", () => {
    const html = render();

    expect(html).toContain(
      '<svg class="logo-mark" width="28" height="28" viewBox="0 0 48 48" fill="none"'
    );
    expect(html).toContain('d="M28 14l-8 20" stroke="var(--accent)"');
    expect(html).toContain('<div class="brand-name">7eight<span class="dev">Dev</span></div>');
    expect(html).not.toContain('class="brand-mark"');
  });

  it("uses @page A4 15mm margins and break-inside protection for a single-page print", () => {
    const pdf = render("pdf");

    expect(pdf).toContain("@page { size: A4 portrait; margin: 15mm; }");
    expect(pdf).toContain(".keep-together, .card, .cta-box, .footer {");
    expect(pdf).toContain("break-inside: avoid !important;");
    expect(pdf).toContain("page-break-inside: avoid !important;");
    expect(pdf).toContain("margin-bottom: 2rem;");
    expect(pdf).not.toContain("position: fixed; left: 0; right: 0; bottom: 0;");
  });

  it("frames the sheet with a fixed border only in preview mode", () => {
    const preview = render("preview");

    expect(preview).toContain(
      ".page { width: 210mm; height: auto; min-height: 296mm; padding: 14mm 14mm 16mm; }"
    );
    expect(preview).toContain("body::before {");
    expect(preview).toContain("position: fixed;");
    expect(preview).toContain(".footer { position: static; margin-top: auto; }");
  });
});