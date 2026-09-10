import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import type { LeadReportPort } from "@/domain/lead/lead-report.port";
import type { LeadNotificationPort } from "@/domain/lead/lead-notification.port";
import type { GeneratedReport } from "@/domain/lead/lead-report.port";
import { InMemoryLeadRepository } from "@/infrastructure/lead/in-memory-lead.repository";
import {
  sendLeadPresentation,
  type SendLeadPresentationDeps,
} from "@/application/lead/send-lead-presentation";

const LEAD: Lead = {
  id: "00000000-0000-4000-8000-000000000001",
  companyName: "ACME Srl",
  website: "https://acme.example",
  email: "info@acme.example",
  source: "google_maps",
  status: "qualified",
  outreachStatus: "not_contacted",
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z",
};

const ANALYSIS: LeadAnalysis = {
  id: "00000000-0000-4000-8000-000000000002",
  leadId: LEAD.id,
  strategy: "mobile",
  performanceScore: 34,
  lcp: 5.8,
  analyzedAt: "2026-09-10T00:00:00.000Z",
};

const REPORT: GeneratedReport = {
  pdf: Buffer.from("%PDF-fake"),
  filename: "audit-7eightdev-acme-2026-09-10.pdf",
};

class FakeReportGenerator implements LeadReportPort {
  constructor(private readonly fail = false) {}

  async generateReport(): Promise<GeneratedReport> {
    if (this.fail) throw new Error("boom");
    return REPORT;
  }
}

class FakeNotifier implements LeadNotificationPort {
  ok = true;
  sent: Array<{ to: string; reportFilename: string }> = [];

  async sendPresentationEmail(input: {
    to: string;
    reportFilename: string;
    reportPdf: Buffer;
  }) {
    if (!this.ok) return { ok: false as const, error: "SMTP down" };
    this.sent.push({ to: input.to, reportFilename: input.reportFilename });
    return { ok: true as const, messageId: "msg-1" };
  }
}

function makeDeps(
  overrides: Partial<SendLeadPresentationDeps> = {}
): SendLeadPresentationDeps {
  return {
    leadRepository: new InMemoryLeadRepository(),
    reportGenerator: new FakeReportGenerator(),
    notifier: new FakeNotifier(),
    now: () => new Date("2026-09-10T12:00:00.000Z"),
    ...overrides,
  };
}

async function seedLead(deps: SendLeadPresentationDeps) {
  await deps.leadRepository.save(LEAD);
  await deps.leadRepository.saveAnalysis(ANALYSIS);
}

describe("sendLeadPresentation", () => {
  it("sends the email to the client email and marks the lead as audit_sent", async () => {
    const deps = makeDeps();
    await seedLead(deps);

    const result = await sendLeadPresentation(deps, LEAD.id);

    expect(result).toEqual({ ok: true, messageId: "msg-1" });
    expect((deps.notifier as FakeNotifier).sent).toEqual([
      {
        to: "info@acme.example",
        reportFilename: REPORT.filename,
      },
    ]);
    const saved = await deps.leadRepository.findById(LEAD.id);
    expect(saved?.outreachStatus).toBe("audit_sent");
    expect(saved?.lastContactedAt).toBe("2026-09-10T12:00:00.000Z");
  });

  it("supports an explicit recipient override", async () => {
    const deps = makeDeps();
    await seedLead(deps);

    const result = await sendLeadPresentation(deps, LEAD.id, "altro@example.com");

    expect(result.ok).toBe(true);
    expect((deps.notifier as FakeNotifier).sent[0].to).toBe("altro@example.com");
  });

  it("fails cleanly when the lead has no email", async () => {
    const deps = makeDeps();
    await deps.leadRepository.save({ ...LEAD, email: undefined });
    await deps.leadRepository.saveAnalysis(ANALYSIS);

    const result = await sendLeadPresentation(deps, LEAD.id);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("indirizzo email");
  });

  it("does NOT mark the lead as contacted when delivery fails", async () => {
    const deps = makeDeps();
    (deps.notifier as FakeNotifier).ok = false;
    await seedLead(deps);

    const result = await sendLeadPresentation(deps, LEAD.id);

    expect(result).toEqual({ ok: false, error: "SMTP down" });
    const saved = await deps.leadRepository.findById(LEAD.id);
    expect(saved?.outreachStatus).toBe("not_contacted");
    expect(saved?.lastContactedAt).toBeUndefined();
  });

  it("surfaces a report generation failure without sending", async () => {
    const deps = makeDeps({ reportGenerator: new FakeReportGenerator(true) });
    await seedLead(deps);

    const result = await sendLeadPresentation(deps, LEAD.id);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("boom");
    expect((deps.notifier as FakeNotifier).sent).toHaveLength(0);
    const saved = await deps.leadRepository.findById(LEAD.id);
    expect(saved?.outreachStatus).toBe("not_contacted");
  });

  it("does not downgrade a lead already further along the funnel", async () => {
    const deps = makeDeps();
    await deps.leadRepository.save({ ...LEAD, outreachStatus: "in_talks" });
    await deps.leadRepository.saveAnalysis(ANALYSIS);

    const result = await sendLeadPresentation(deps, LEAD.id);

    expect(result.ok).toBe(true);
    const saved = await deps.leadRepository.findById(LEAD.id);
    expect(saved?.outreachStatus).toBe("in_talks");
    expect(saved?.lastContactedAt).toBe("2026-09-10T12:00:00.000Z");
  });

  it("errors when the lead or its analysis does not exist", async () => {
    const missingLead = await sendLeadPresentation(makeDeps(), "00000000-0000-4000-8000-000000000099");
    expect(missingLead).toEqual({ ok: false, error: "Lead non trovato." });

    const deps = makeDeps();
    await deps.leadRepository.save(LEAD); // no analysis
    const missingAnalysis = await sendLeadPresentation(deps, LEAD.id);
    expect(missingAnalysis.ok).toBe(false);
    if (!missingAnalysis.ok) {
      expect(missingAnalysis.error).toContain("Nessuna analisi");
    }
  });
});