import puppeteer, { type PuppeteerNode } from "puppeteer";
import type {
  GeneratedReport,
  LeadReportData,
  LeadReportPort,
} from "@/domain/lead/lead-report.port";
import { renderLeadReportHtml } from "@/infrastructure/lead/report/lead-report.template";

/**
 * Adapter: renders the lead report HTML to a PDF via headless Chrome
 * (Puppeteer). This is the default implementation and the only one that
 * produces the bytes fully in-house.
 *
 * Scalability note: this adapter is swappable behind {@link LeadReportPort}.
 * A future integration (n8n workflow, a hosted HTML-to-PDF service, Canva
 * Connect, NotebookLM…) only needs a new adapter — the port contract, the
 * report template, the email flow and the admin UI stay untouched.
 *
 * Chromium availability: `puppeteer` ships its own Chrome, so it works out of
 * the box locally and on any Node host. On Vercel serverless the bundled
 * browser is not present unless provisioned (e.g. `@sparticuz/chromium` with
 * `puppeteer-core`); swap the binding in `container.ts` when that matters.
 */
export class PuppeteerLeadReportAdapter implements LeadReportPort {
  private readonly puppeteer: PuppeteerNode;

  constructor() {
    this.puppeteer = puppeteer;
  }

  async generateReport(data: LeadReportData): Promise<GeneratedReport> {
    const html = renderLeadReportHtml(data);

    const browser = await this.puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "load",
        timeout: 30_000,
      });
      const pdf = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
      });
      const filename = reportFilename(data);
      return { pdf: Buffer.from(pdf), filename };
    } finally {
      await browser.close();
    }
  }
}

/** Deterministic-safe filename for the report attachment/download. */
export function reportFilename(data: LeadReportData): string {
  const slug = slugify(data.lead.companyName);
  const date = data.generatedAt.slice(0, 10);
  return `audit-7eightdev-${slug}-${date}.pdf`;
}

function slugify(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "lead";
}