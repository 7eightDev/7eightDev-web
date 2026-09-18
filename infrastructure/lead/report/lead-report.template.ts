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
 *
 * Colors are CSS custom properties with the light palette as the shipped
 * default (the look leads receive by email and download); the dark palette
 * stays available via `data-theme="dark"`. Printing uses CSS `@page` margins
 * (A4, 15mm all around) and the footer is pinned to the bottom of the single
 * page with `margin-top: auto`. Every key box guards against page-break
 * splitting (`break-inside: avoid`), and the header carries the official 7eightDev
 * SVG logo mark + mono wordmark. `mode: "preview"` additionally injects a fit
 * script that scales the A4 sheet to the iframe viewport (no scrollbars),
 * restoring the full-bleed 210mm page box.
 */

export type LeadReportRenderMode = "pdf" | "preview";

const PREVIEW_STYLES = `
  .page { width: 210mm; height: auto; min-height: 296mm; padding: 14mm 14mm 16mm; border: 1px solid var(--border); border-radius: 8px; }
  .footer { position: static; margin-top: auto; }
  body { padding: 0 0 24px; }
`;

const PREVIEW_FIT_SCRIPT = `
<script>
(function () {
  var page = document.querySelector(".page");
  if (!page) return;
  function fit() {
    var availW = Math.max(1, document.documentElement.clientWidth - 16);
    var k = Math.min(1, availW / page.offsetWidth);
    page.style.transformOrigin = "top left";
    page.style.transform = "scale(" + k + ")";
    var w = Math.floor(page.offsetWidth * k);
    var h = Math.ceil(page.offsetHeight * k);
    document.body.style.width = w + "px";
    document.body.style.height = h + "px";
    document.body.style.margin = "0 auto";
  }
  fit();
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fit);
  }
})();
</script>
`;

interface RenderReportOpts {
  readonly lead: Lead;
  readonly analysis: LeadAnalysis;
  readonly generatedAt: string;
}

export function renderLeadReportHtml(
  opts: RenderReportOpts,
  mode: LeadReportRenderMode = "pdf"
): string {
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
  @page { size: A4 portrait; margin: 15mm; }
  :root {
    --bg: #ffffff;
    --surface: #ffffff;
    --raised: #f1f5f9;
    --border: #e2e8f0;
    --text: #0f172a;
    --muted: #64748b;
    --dim: #6b7280;
    --soft: #475569;
    --accent: #15803d;
    --on-accent: #ffffff;
    --bad: #c2410c;
    --warn: #b45309;
  }
  [data-theme="dark"] {
    --bg: #0a0b0d;
    --surface: #14161a;
    --raised: #101216;
    --border: #23262e;
    --text: #eef1f5;
    --muted: #8b93a1;
    --dim: #6b7280;
    --soft: #aab2bf;
    --accent: #c7f94e;
    --on-accent: #0a0b0d;
    --bad: #ff6b6b;
    --warn: #f5b84a;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  a {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  a:visited { color: var(--accent); }
  html, body {
    background: var(--bg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--text);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    height: 267mm;
    display: flex;
    flex-direction: column;
  }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .logo-mark { display: block; }
  .brand-name {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 15px; font-weight: 700; letter-spacing: -0.4px; line-height: 1;
  }
  .brand-name .dev { color: var(--accent); }
  .header {
    display: flex; justify-content: space-between; align-items: flex-end;
    margin-bottom: 2rem;
  }
  .eyebrow {
    font-size: 8.5px; text-transform: uppercase; letter-spacing: 1.6px;
    color: var(--muted); font-weight: 700;
  }
  .header-title { font-size: 19px; font-weight: 800; letter-spacing: -0.5px; margin-top: 4px; line-height: 1.15; }
  .meta-date {
    font-size: 9px; color: var(--muted); text-align: right; line-height: 1.55;
  }
  .keep-together, .card, .cta-box, .footer {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 13px 15px; margin-bottom: 11px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .card-label {
    font-size: 8.5px; text-transform: uppercase; letter-spacing: 1.6px;
    color: var(--muted); font-weight: 700; margin-bottom: 9px;
  }
  .company-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .company-field {}
  .company-field-label {
    font-size: 8px; text-transform: uppercase; letter-spacing: 1.4px;
    color: var(--dim); font-weight: 700; margin-bottom: 2px;
  }
  .company-field-value { font-size: 13px; font-weight: 600; color: var(--text); }
  .company-field-value a { color: var(--accent); text-decoration: none; }
  .hero { display: grid; grid-template-columns: 160px 1fr; gap: 24px; align-items: center; }
  .score-num {
    font-size: 52px; font-weight: 800; letter-spacing: -2px; line-height: 1; text-align: center;
  }
  .score-band {
    display: inline-block; margin-top: 6px; font-size: 8.5px; text-transform: uppercase;
    letter-spacing: 1.6px; font-weight: 700;
    color: var(--on-accent); background: var(--accent); border-radius: 999px; padding: 3px 11px;
  }
  .score-band.bad { background: var(--bad); }
  .score-band.warn { background: var(--warn); }
  .hero-note { font-size: 11.5px; line-height: 1.55; color: var(--soft); }
  .hero-note strong { color: var(--text); }
  .gauge-track { margin-top: 10px; height: 7px; border-radius: 999px; background: var(--border); overflow: hidden; }
  .gauge-fill { height: 100%; border-radius: 999px; background: var(--accent); }
  .vitals-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .vital { border: 1px solid var(--border); border-radius: 10px; padding: 11px 12px; background: var(--raised); break-inside: avoid; page-break-inside: avoid; }
  .vital-label {
    font-size: 8px; text-transform: uppercase; letter-spacing: 1.4px;
    color: var(--muted); font-weight: 700; margin-bottom: 4px;
  }
  .vital-value { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .vital-value .unit { font-size: 11px; color: var(--muted); font-weight: 600; }
  .vital-ideal { font-size: 8.5px; color: var(--dim); margin-top: 2px; }
  .ok   { color: var(--accent); }
  .warn { color: var(--warn); }
  .bad  { color: var(--bad); }
  .muted { color: var(--dim); }
  .align-top { vertical-align: top; }
  .ads-warn {
    border: 1px solid var(--bad);
    background: color-mix(in srgb, var(--bad) 8%, transparent);
  }
  .ads-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 12.5px; font-weight: 800; color: var(--bad); margin-bottom: 5px;
  }
  .ads-copy { font-size: 11.5px; line-height: 1.5; color: var(--soft); }
  .ads-copy strong { color: var(--text); }
  table.scenarios { margin-top: 10px; width: 100%; border-collapse: collapse; }
  table.scenarios th, table.scenarios td {
    text-align: left; padding: 6px 9px; font-size: 11.5px;
    border-top: 1px solid var(--border);
    break-inside: avoid; page-break-inside: avoid;
  }
  table.scenarios th {
    font-size: 8.5px; text-transform: uppercase; letter-spacing: 1.3px;
    color: var(--muted); font-weight: 700; border-top: none;
  }
  table.scenarios td.lost { color: var(--bad); font-weight: 800; }
  .tech-card { margin-top: 24px; margin-bottom: 24px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip {
    font-size: 10.5px; color: var(--accent); border: 1px solid var(--border);
    border-radius: 999px; padding: 3px 11px; background: var(--raised); font-weight: 600;
  }
  .footer {
    margin-top: auto;
    padding-top: 7px; border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; gap: 12px;
    font-size: 8.5px; color: var(--muted); line-height: 1.55;
  }
  .cta-note { font-size: 10.5px; color: var(--muted); line-height: 1.6; }
  .cta-note strong { color: var(--accent); }
  ${mode === "preview" ? PREVIEW_STYLES : ""}
</style>
</head>
<body>
  <div class="page">
    <div class="brand">
      <svg class="logo-mark" width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="46" height="46" rx="7" fill="var(--surface)" stroke="var(--border)" stroke-width="1.5" />
        <path d="M16 15l-5 9 5 9" stroke="#4a5160" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M28 14l-8 20" stroke="var(--accent)" stroke-width="3.4" stroke-linecap="round" />
        <path d="M32 15l5 9-5 9" stroke="#4a5160" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
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

    <div class="card tech-card">
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
            ? `<span class="chip" style="color:var(--bad);border-color:var(--bad);">Campagne Ads attive</span>`
            : ""
        }
      </div>
      ${
        copyrightYear !== undefined && copyrightYear < new Date().getUTCFullYear()
          ? `<div class="ads-copy" style="margin-top:10px;">Il <strong>copyright del sito risale al ${escapeHtml(String(copyrightYear))}</strong>: un segnale che la piattaforma non riceve aggiornamenti costanti.</div>`
          : ""
      }
    </div>

    <div class="card cta-box">
      <div class="cta-note">
        Questa analisi è gratuita e basata su dati pubblicamente misurabili dal tuo sito. Vuoi capire <strong>quanto ti costa oggi la lentezza</strong> del tuo sito e cosa si può fare? Basta rispondere a questa email: ti mostro nel dettaglio gli interventi che recuperano clienti e budget.
      </div>
    </div>

    <div class="footer">
      <div>7eightDev · Engineering-first web &amp; software<br />Dati rilevati con Google PageSpeed Insights.</div>
      <div>Report generato automaticamente · ${escapeHtml(formatDateIt(generatedAt))}</div>
    </div>
  </div>
  ${mode === "preview" ? PREVIEW_FIT_SCRIPT : ""}
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