import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import {
  LeadReportPreviewPanel,
  type RenderedReportScenario,
} from "./lead-report-preview-panel";

/**
 * Contratto di idratazione del pannello di anteprima.
 *
 * Il tema vive solo sul client (next-themes legge `localStorage` già al primo
 * render), mentre il markup del server non lo conosce: se il pannello leggesse
 * il tema risolto subito, i due `srcDoc` divergerebbero e React fallirebbe
 * l'idratazione. Qui si asserisce che il passaggio renderizzato dal server è
 * SEMPRE chiaro — qualunque cosa dica next-themes — perché è quello che il
 * client deve poter riprodurre identico, ed è anche la versione che il lead
 * riceve davvero.
 */

let mockResolvedTheme: string | undefined = "dark";

jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme }),
}));

jest.mock("@/application/lead/lead-email.actions", () => ({
  sendLeadTestEmailAction: jest.fn(),
}));

const SCENARIO: RenderedReportScenario = {
  id: "fixture:demo",
  label: "Demo · Studio",
  subject: "Audit performance",
  emailHtml:
    '<!doctype html><html lang="it"><head><style>@media (prefers-color-scheme: dark) { .email-card { background-color: #14161A !important; } }</style></head><body class="email-body"></body></html>',
  reportHtml: '<!doctype html><html lang="it"><head></head><body></body></html>',
  text: "Gentile Studio,",
  reportDate: "10 settembre 2026",
  downloadHref: "/admin/leads/report/pdf?fixture=demo",
};

const panel = () => (
  <LeadReportPreviewPanel scenarios={[SCENARIO]} defaultRecipient="a@b.it" />
);

afterEach(cleanup);

describe("LeadReportPreviewPanel · idratazione", () => {
  it.each(["dark", "light", undefined])(
    "rende il tema chiaro sul server anche con tema %s",
    (theme) => {
      mockResolvedTheme = theme;

      expect(renderToString(panel())).toContain("data-theme=&quot;light&quot;");
    }
  );

  it("passa al tema scuro dopo il mount, senza divergere dal server", () => {
    mockResolvedTheme = "dark";

    // Il markup del server non dipende dal tema…
    expect(renderToString(panel())).not.toContain("data-theme=&quot;dark&quot;");

    // …ma una volta montato il pannello segue il tema dell'app.
    render(panel());
    expect(screen.getByTitle("Anteprima email")).toHaveAttribute(
      "srcdoc",
      expect.stringContaining('data-theme="dark"')
    );
  });

  it("resta chiaro dopo il mount quando l'app è in tema chiaro", () => {
    mockResolvedTheme = "light";

    render(panel());
    expect(screen.getByTitle("Anteprima email")).toHaveAttribute(
      "srcdoc",
      expect.stringContaining('data-theme="light"')
    );
  });
});
