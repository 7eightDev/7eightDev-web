import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import {
  AD_BUDGET_SCENARIOS_EUR,
  conversionLossRate,
  estMonthlyAdWaste,
  formatEur,
} from "@/domain/lead/lead.impact";

/** The "ads budget wasted" section is shown when ads are live AND the site is slow. */
export function isAdsWasteRelevant(
  hasAds: boolean | undefined,
  performanceScore: number | undefined
): boolean {
  return hasAds === true && performanceScore !== undefined && performanceScore < 50;
}

/**
 * Branded, print-ready HTML template for the lead performance report.
 * Rendered to PDF by the Puppeteer adapter (A4). Self-contained by design:
 * no remote fonts/assets, inline CSS only — Puppeteer renders it offscreen.
 */

interface RenderReportOpts {
  readonly lead: Lead;
  readonly analysis: LeadAnalysis;
  readonly generatedAt: string;
}

export function renderLeadReportHtml(opts: RenderReportOpts): string {
  const { lead, analysis, generatedAt } = opts;

  const score = analysis.performanceScore;
  const vitals = [
    {
      label: "LCP",
      value: analysis.lcp,
      unit: "s",
      ideal: "≤ 2.5 s",
      good: 2.5,
      poor: 4,
    },
    {
      label: "FCP",
      value: analysis.fcp,
      unit: "s",
      ideal: "≤ 1.8 s",
      good: 1.8,
      poor: 3,
    },
    {
      label: "CLS",
      value: analysis.cls,
      ideal: "≤ 0.1",
      good: 0.1,
      poor: 0.25,
    },
    {
      label: "TBT",
      value: analysis.tbt,
      unit: "ms",
      ideal: "≤ 200 ms",
      good: 200,
      poor: 600,
    },
  ];

  const scoreBand =
    score === undefined
      ? "—"
      : score < 30
      ? "Critico"
      : score < 50
      ? "Mediocre"
      : score < 90
      ? "Buono"
      : "Ottimo";

  const lossRate = conversionLossRate(analysis);
  const showAdsWaste =
    isAdsWasteRelevant(lead.hasAds, analysis.performanceScore) &&
    lossRate > 0;

  const techStack = lead.techStack ?? [];
  const copyrightYear = extractCopyrightYear(lead.copyright);

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<title>Audit Performance Web — ${escapeHtml(lead.companyName)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  a {
    color: #C7F94E;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  a:visited { color: #C7F94E; }
  html, body {
    background: #0A0B0D;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #EEF1F5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 296mm;
    padding: 14mm 14mm 10mm;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-mark {
    width: 30px; height: 30px; border-radius: 8px;
    background: #C7F94E; color: #0A0B0D;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 14px; letter-spacing: -0.5px;
  }
  .brand-name { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
  .brand-name .dev { color: #C7F94E; }
  .header { display: flex; justify-content: space-between; align-items: center; }
  .eyebrow {
    font-size: 9px; text-transform: uppercase; letter-spacing: 1.6px;
    color: #8B93A1; font-weight: 600;
  }
  .header-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-top: 3px; }
  .meta-date {
    font-size: 10px; color: #8B93A1; text-align: right; line-height: 1.5;
  }
  .card {
    background: #14161A; border: 1px solid #23262E; border-radius: 14px;
    padding: 16px 18px;
  }
  .card-label {
    font-size: 9px; text-transform: uppercase; letter-spacing: 1.6px;
    color: #8B93A1; font-weight: 700; margin-bottom: 10px;
  }
  .company-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 22px; }
  .company-field {}
  .company-field-label {
    font-size: 8.5px; text-transform: uppercase; letter-spacing: 1.4px;
    color: #6B7280; font-weight: 700; margin-bottom: 2px;
  }
  .company-field-value { font-size: 14px; font-weight: 600; color: #EEF1F5; }
  .company-field-value a { color: #C7F94E; text-decoration: none; }
  .hero { display: grid; grid-template-columns: 170px 1fr; gap: 20px; align-items: center; }
  .score-num {
    font-size: 64px; font-weight: 800; letter-spacing: -2px; line-height: 1; text-align: center;
  }
  .score-band {
    display: inline-block; margin-top: 6px; font-size: 9px; text-transform: uppercase;
    letter-spacing: 1.6px; font-weight: 700;
    color: #0A0B0D; background: #C7F94E; border-radius: 999px; padding: 4px 12px;
  }
  .score-band.bad { background: #FF6B6B; }
  .score-band.warn { background: #F5B84A; }
  .hero-note { font-size: 12.5px; line-height: 1.6; color: #AAB2BF; }
  .hero-note strong { color: #EEF1F5; }
  .gauge-track { margin-top: 12px; height: 8px; border-radius: 999px; background: #23262E; overflow: hidden; }
  .gauge-fill { height: 100%; border-radius: 999px; background: #C7F94E; }
  .vitals-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .vital { border: 1px solid #23262E; border-radius: 12px; padding: 12px 14px; background: #101216; }
  .vital-label {
    font-size: 8.5px; text-transform: uppercase; letter-spacing: 1.4px;
    color: #8B93A1; font-weight: 700; margin-bottom: 5px;
  }
  .vital-value { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .vital-value .unit { font-size: 12px; color: #8B93A1; font-weight: 600; }
  .vital-ideal { font-size: 9px; color: #6B7280; margin-top: 3px; }
  .ok   { color: #C7F94E; }
  .warn { color: #F5B84A; }
  .bad  { color: #FF6B6B; }
  .muted { color: #6B7280; }
  .align-top { vertical-align: top; }
  .ads-warn { border: 1px solid #FF6B6B; background: rgba(255,107,107,0.08); }
  .ads-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 800; color: #FF6B6B; margin-bottom: 6px;
  }
  .ads-copy { font-size: 12px; line-height: 1.55; color: #AAB2BF; }
  .ads-copy strong { color: #EEF1F5; }
  table.scenarios { margin-top: 12px; width: 100%; border-collapse: collapse; }
  table.scenarios th, table.scenarios td {
    text-align: left; padding: 8px 10px; font-size: 12px;
    border-top: 1px solid #23262E;
  }
  table.scenarios th {
    font-size: 9px; text-transform: uppercase; letter-spacing: 1.3px;
    color: #8B93A1; font-weight: 700; border-top: none;
  }
  table.scenarios td.lost { color: #FF6B6B; font-weight: 800; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    font-size: 11px; color: #C7F94E; border: 1px solid #23262E;
    border-radius: 999px; padding: 4px 12px; background: #101216; font-weight: 600;
  }
  .footer {
    margin-top: auto; padding-top: 16px; border-top: 1px solid #23262E;
    display: flex; justify-content: space-between; gap: 12px;
    font-size: 9.5px; color: #6B7280; line-height: 1.6;
  }
  .cta-note { font-size: 11px; color: #8B93A1; line-height: 1.6; }
  .cta-note strong { color: #C7F94E; }
  .spacer { flex: 1; }
</style>
</head>
<body>
  <div class="page">
    <div class="brand">
      <div class="brand-mark">7D</div>
      <div class="brand-name">7eight<span class="dev">Dev</span></div>
    </div>

    <div class="header">
      <div>
        <div class="eyebrow">Audit Performance Web</div>
        <div class="header-title">${escapeHtml(lead.companyName)}</div>
      </div>
      <div class="meta-date">
        Generato il ${formatDateIt(generatedAt)}<br />
        Analisi ${escapeHtml(analysis.strategy)} · ${formatDateIt(analysis.analyzedAt)}
      </div>
    </div>

    <div class="card">
      <div class="card-label">Azienda analizzata</div>
      <div class="company-grid">
        <div class="company-field">
          <div class="company-field-label">Sito web</div>
          <div class="company-field-value">
            ${lead.website ? `<a href="${escapeAttr(lead.website)}">${escapeHtml(displayDomain(lead.website))}</a>` : '<span class="muted">—</span>'}
          </div>
        </div>
        <div class="company-field">
          <div class="company-field-label">Categoria</div>
          <div class="company-field-value">${escapeHtml(lead.category ?? "—")}</div>
        </div>
        <div class="company-field">
          <div class="company-field-label">Città</div>
          <div class="company-field-value align-top">${escapeHtml(lead.city ?? "—")}</div>
        </div>
        <div class="company-field">
          <div class="company-field-label">Telefono</div>
          <div class="company-field-value">${escapeHtml(lead.phone ?? "—")}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="hero">
        <div style="text-align:center;">
          <div class="score-num ${score !== undefined && score < 50 ? "bad" : score !== undefined && score < 90 ? "warn" : ""}">
            ${score !== undefined ? escapeHtml(String(score)) : "—"}
          </div>
          <span class="score-band ${score !== undefined && score < 50 ? "bad" : score !== undefined && score < 90 ? "warn" : ""}">${escapeHtml(scoreBand)}</span>
        </div>
        <div>
          <div class="hero-note">
            Il <strong>performance score</strong> ${score !== undefined ? `${escapeHtml(String(score))} / 100` : "non disponibile"} è il risultato dei Core Web Vitals misurati su dispositivi mobili di ${escapeHtml(displayDomain(lead.website ?? lead.companyName))}. Un punteggio sotto 50 indica che <strong>il sito carica troppo lentamente per gli standard Google</strong>: perdi visitatori, posizionamento e — se fai advertising — una parte del tuo budget pubblicitario.
          </div>
          <div class="gauge-track">
            <div class="gauge-fill" style="width:${score !== undefined ? clamp(score, 0, 100) : 0}%"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-label">Core Web Vitals</div>
      <div class="vitals-grid">
        ${vitals.map(vitalCard).join("")}
      </div>
    </div>

    ${showAdsWaste ? renderAdsWaste(lossRate) : ""}

    <div class="spacer"></div>

    <div class="card">
      <div class="card-label">Segnali tecnici rilevati</div>
      <div class="chips">
        ${techStack.length > 0 ? techStack.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("") : `<span class="muted" style="font-size:12px;">Nessuna tecnologia rilevata.</span>`}
        ${
          copyrightYear !== undefined
            ? `<span class="chip">Copyright ${escapeHtml(String(copyrightYear))}</span>`
            : ""
        }
        ${
          lead.hasAds === true
            ? `<span class="chip" style="color:#FF6B6B;border-color:#FF6B6B;">Campagne Ads attive</span>`
            : ""
        }
      </div>
      ${
        copyrightYear !== undefined && copyrightYear < new Date().getUTCFullYear()
          ? `<div class="ads-copy" style="margin-top:10px;">Il <strong>copyright del sito risale al ${escapeHtml(String(copyrightYear))}</strong>: un segnale che la piattaforma non riceve aggiornamenti costanti.</div>`
          : ""
      }
    </div>

    <div class="card">
      <div class="cta-note">
        Questa analisi è gratuita e basata su dati pubblicamente misurabili dal tuo sito. Vuoi capire <strong>quanto ti costa oggi la lentezza</strong> del tuo sito e cosa si può fare? Basta rispondere a questa email: ti mostro nel dettaglio gli interventi che recuperano clienti e budget.
      </div>
    </div>

    <div class="footer">
      <div>7eightDev · Engineering-first web &amp; software<br />Dati rilevati con Google PageSpeed Insights.</div>
      <div>Report generato automaticamente · ${escapeHtml(formatDateIt(generatedAt))}</div>
    </div>
  </div>
</body>
</html>`;
}

function vitalCard(v: {
  label: string;
  value: number | undefined;
  unit?: string;
  ideal: string;
  good: number;
  poor: number;
}): string {
  const tone =
    v.value === undefined || v.value === null
      ? "muted"
      : v.value >= v.poor
      ? "bad"
      : v.value > v.good
      ? "warn"
      : "ok";

  return `<div class="vital">
    <div class="vital-label">${v.label}</div>
    <div class="vital-value ${tone}">
      ${v.value === undefined || v.value === null ? "<span class='muted'>—</span>" : `${formatNumber(v.value)}${v.unit ? ` <span class="unit">${v.unit}</span>` : ""}`}
    </div>
    <div class="vital-ideal">ideale ${v.ideal}</div>
  </div>`;
}

function renderAdsWaste(lossRate: number): string {
  const rows = AD_BUDGET_SCENARIOS_EUR.map((budget) => {
    const lost = estMonthlyAdWaste(lossRate, budget);
    return `<tr>
      <td>${escapeHtml(formatEur(budget))}</td>
      <td class="lost">${escapeHtml(formatEur(lost))} / mese</td>
      <td>${escapeHtml(formatEur(lost * 12))} / anno</td>
    </tr>`;
  }).join("");

  const pct = Math.round(lossRate * 100);

  return `<div class="card ads-warn">
    <div class="ads-title">⚠ Budget pubblicitario sprecato su un sito lento</div>
    <div class="ads-copy">
      Hai <strong>campagne pubblicitarie attive</strong> (Google Ads / Meta / Tracking) ma il sito converte una parte di quei clic a causa della lentezza rilevata. A parità di investimento, un sito lento come il tuo perde circa il <strong>${pct}%</strong> delle conversioni potenziali:
    </div>
    <table class="scenarios">
      <tr><th>Budget medio mensile</th><th>Perdita stimata</th><th>In un anno</th></tr>
      ${rows}
    </table>
    <div class="ads-copy" style="margin-top:8px;">
      Stima indicativa basata sul ritardo di caricamento misurato (LCP). Ogni mese che passa, questa perdita si somma al budget investito.
    </div>
  </div>`;
}

function displayDomain(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Extracts the 4-digit year from a copyright string, if present. */
function extractCopyrightYear(copyright: string | undefined): number | undefined {
  if (!copyright) return undefined;
  const match = copyright.match(/(19|20)\d{2}/);
  return match ? parseInt(match[0], 10) : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Long Italian date, e.g. "10 settembre 2026". */
export function formatDateIt(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}