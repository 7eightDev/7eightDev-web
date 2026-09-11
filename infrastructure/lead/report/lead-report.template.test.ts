import { renderLeadReportHtml } from "./lead-report.template";
import { findLeadReportScenario } from "@/infrastructure/lead/lead-email-preview.fixtures";

const SCENARIO = findLeadReportScenario("slow-ads");
if (!SCENARIO) throw new Error("Scenario fixture slow-ads mancante");

describe("lead report html", () => {
  it("renders the site link in the brand color on the dark canvas", () => {
    const html = renderLeadReportHtml({
      lead: SCENARIO.lead,
      analysis: SCENARIO.analysis,
      generatedAt: "2026-09-10T00:00:00.000Z",
    });

    expect(html).toContain(
      '<a href="https://www.studiosorriso.it">www.studiosorriso.it</a>'
    );
    expect(html).toContain("a {\n    color: #C7F94E;");
    expect(html).not.toContain("#0000EE");
  });
});