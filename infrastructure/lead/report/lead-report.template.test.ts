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

  it("poggia il foglio su un piano opaco, senza bordo proprio né overlay", () => {
    const preview = render("preview");

    expect(preview).toContain("width: 210mm");
    expect(preview).toContain("min-height: 296mm");
    expect(preview).toContain("padding: 14mm 14mm 16mm");
    // Piano (--raised) sotto, foglio (--surface) sopra: mai lo sfondo dell'app.
    expect(preview).toContain("html { background: var(--raised); }");
    expect(preview).toContain("background: var(--surface);");
    // Il filo lo dà il riquadro (iframe): sul foglio raddoppierebbe la riga.
    expect(preview).not.toMatch(/\.page \{[^}]*border:/);
    expect(preview).toContain(".footer { position: static; margin-top: auto; }");
    expect(preview).not.toContain("body::before {");
    expect(preview).not.toContain("position: fixed;");
  });

  it("scala il foglio sull'intera larghezza del riquadro, senza fascia laterale", () => {
    const preview = render("preview");

    // Qualunque sottrazione da clientWidth lascerebbe una fascia di piano ai
    // lati, che si legge come disallineamento e non come margine.
    expect(preview).toContain(
      "var availW = Math.max(1, document.documentElement.clientWidth);"
    );
  });

  it("nasconde la scrollbar nativa solo in anteprima, mai nel PDF", () => {
    expect(render("preview")).toContain("scrollbar-width: none");
    // Il PDF non ha viewport: nessuna regola di anteprima deve finirci.
    const pdf = render("pdf");
    expect(pdf).not.toContain("scrollbar-width: none");
    expect(pdf).not.toContain("html { background: var(--raised); }");
  });
});
import {
  renderLeadEmailPreviewHtml,
  renderLeadReportTextHtml,
} from "./lead-report.template";
import { renderLeadPresentationEmail } from "@/infrastructure/lead/notification/lead-presentation-email.template";

describe("lead report · text view", () => {
  it("uses the SAME .page sheet and fit script as email/report → identical width", () => {
    const text = renderLeadReportTextHtml("Ciao <b>non-render</b> &\nseconda riga");

    expect(text).toContain("<div class=\"page\">");
    expect(text).toContain("pre.lead-text {");
    expect(text).toContain("210mm");
    expect(text).toContain("Ciao &lt;b&gt;non-render&lt;/b&gt; &amp;");
    expect(text).toContain("width: 210mm");
    expect(text).toContain("min-height: 296mm");
    expect(text).toContain("document.fonts.ready.then(fit)");
    // L'incasso lo dà .page: se il <pre> lo ri-aggiunge il testo scende più
    // in basso del report e le due schede non sono più allineate.
    expect(text).toMatch(/pre\.lead-text \{[^}]*padding: 0;/);
  });

  it("stays light by default and exposes data-theme for the webapp dark toggle", () => {
    const text = renderLeadReportTextHtml("riga");

    expect(text).toContain("--bg: #ffffff");
    expect(text).toContain("[data-theme=\"dark\"]");
    // Nessun tema inchiodato nel markup: il pannello inietta `data-theme`
    // sull'`<html>` solo per l'anteprima.
    expect(text).toContain("<html lang=\"it\">");
    expect(text).not.toContain("data-theme=\"dark\">");
  });
});

describe("lead email · preview layout", () => {
  const email = renderLeadPresentationEmail(
    SCENARIO.lead,
    SCENARIO.analysis,
    "audit.pdf",
    "https://7eight.dev"
  ).html;

  it("widens the email shell to the same sheet width as report/text", () => {
    const preview = renderLeadEmailPreviewHtml(email);

    expect(preview).toContain(".email-shell { max-width: 210mm !important; }");
    // Full bleed come le altre due schede: nessuna fascia laterale.
    expect(preview).toContain("padding-left: 0 !important");
    expect(preview).toContain("padding-right: 0 !important");
    expect(preview.indexOf("<style>\n  .email-viewport")).toBeLessThan(
      preview.indexOf("</head>")
    );
  });

  it("dipinge un piano opaco: il riquadro non incornicia mai lo sfondo dell'app", () => {
    expect(renderLeadEmailPreviewHtml(email, "light")).toContain(
      "html { background: #f1f5f9; }"
    );
    expect(renderLeadEmailPreviewHtml(email, "dark")).toContain(
      "html { background: #101216; }"
    );
  });

  it("segue il tema dell'app, non quello del sistema di chi guarda", () => {
    // La media query dell'email viene spenta o accesa, mai riscritta.
    expect(renderLeadEmailPreviewHtml(email, "dark")).toContain("@media all {");
    expect(renderLeadEmailPreviewHtml(email, "light")).toContain("@media not all {");
    for (const theme of ["light", "dark"] as const) {
      const preview = renderLeadEmailPreviewHtml(email, theme);
      expect(preview).not.toContain("prefers-color-scheme");
      expect(preview).toContain(
        ".email-card { background-color: #14161A !important; border-color: #23262E !important; }"
      );
    }
  });

  it("nasconde la scrollbar nativa come le altre due schede", () => {
    expect(renderLeadEmailPreviewHtml(email, "light")).toContain("scrollbar-width: none");
  });

  it("leaves the email actually sent capped at 560px", () => {
    expect(email).toContain("max-width:560px");
    expect(email).toContain("@media (prefers-color-scheme: dark)");
    expect(email).not.toContain("210mm");
  });
});
