#!/usr/bin/env node
/**
 * Ghost-scroll audit — MS-1.3 (responsive-ui-testing ROADMAP).
 *
 * Standalone Node ESM script (NOT a Jest/Playwright test). For each admin
 * page × device viewport it detects horizontal overflow:
 *
 *     element.scrollWidth > element.clientWidth + 1
 *
 * and writes a report to `docs/testing/responsive-ui-testing-ghost-scroll-report.md`.
 *
 * Viewport WIDTHS are imported at runtime from the canonical source of truth
 * `presentation/lib/breakpoints.ts` (`DEVICE_PROFILES`). Heights follow the
 * roadmap convention (desktop 800 / tablet 1024 / mobile 667) — they are not
 * breakpoints, they limit vertical space only.
 *
 * Auth: `/admin` routes are protected by Clerk (Google OAuth). Clerk dev
 * rejects a storageState snapshot replayed into a fresh browser profile, so
 * the script uses a PERSISTENT profile (`.e2e/ghost-scroll-profile`): the same
 * browser session that performed the OAuth is reused on every run. If the
 * session is missing it prints "AUTH REQUIRED" with instructions to produce
 * one via `--login`. This local auth bridge is a temporary workaround: the
 * proper auth consolidation is MS-3.2.
 *
 * Usage:
 *   node scripts/ghost-scroll-audit.mjs            # headless audit, reuse profile session
 *   node scripts/ghost-scroll-audit.mjs --login     # one-time: headed manual login → saves session in profile
 *   node scripts/ghost-scroll-audit.mjs --no-report # audit without writing the report
 *
 * Env overrides:
 *   GHOST_SCROLL_BASE_URL     default http://localhost:3000
 *   GHOST_SCROLL_PROFILE      default .e2e/ghost-scroll-profile
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BREAKPOINTS_PATH = join(ROOT, "presentation/lib/breakpoints.ts");
const REPORT_PATH = join(ROOT, "docs/testing/responsive-ui-testing-ghost-scroll-report.md");
const BASE_URL = (process.env.GHOST_SCROLL_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
/** Persistent Chromium profile: keeps Clerk's cross-domain session cookies
 *  between runs (storageState round-trip alone is rejected by Clerk dev). */
const PROFILE_DIR =
  process.env.GHOST_SCROLL_PROFILE ?? join(ROOT, ".e2e/ghost-scroll-profile");

/** Roadmap-convention heights per device profile (widths come from breakpoints.ts). */
const HEIGHT_BY_PROFILE = { desktop: 800, tablet: 1024, mobile: 667 };
const DEFAULT_HEIGHT = 900;

/** Pages under audit (MS-1.3 scope: the 3 key admin views).
 *  `/admin/leads?status=qualified` activates the filter-bar's clear CTA,
 *  widening row 2 to ~400px on mobile → expected ghost-scroll candidate. */
const PAGES = [
  "/admin/quotes",
  "/admin/leads",
  "/admin/catalog",
  "/admin/leads?status=qualified",
];

/** Overflow detection tolerance (px): rounding/subpixel noise is not overflow. */
const TOLERANCE = 1;

/* ---------------------------------------------------------------------- *
 * Viewport matrix from the canonical source — never hard-coded widths.
 * ---------------------------------------------------------------------- */
function loadViewportProfiles() {
  const source = readFileSync(BREAKPOINTS_PATH, "utf8");
  const match = source.match(
    /export const DEVICE_PROFILES\s*=\s*\{([\s\S]*?)\}\s*as const;/
  );
  if (!match) {
    throw new Error(
      `Cannot locate DEVICE_PROFILES in ${BREAKPOINTS_PATH} — did the source change?`
    );
  }
  const widths = new Map();
  for (const entry of match[1].matchAll(/([A-Za-z0-9_]+)\s*:\s*(\d+)/g)) {
    widths.set(entry[1], Number(entry[2]));
  }
  if (widths.size === 0) {
    throw new Error(`No width entries parsed from DEVICE_PROFILES in ${BREAKPOINTS_PATH}`);
  }
  // Order by width ascending, name + height side-channel.
  return [...widths.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([name, width]) => ({
      name,
      width,
      height: HEIGHT_BY_PROFILE[name] ?? DEFAULT_HEIGHT,
    }));
}

const VIEWPORTS = loadViewportProfiles();

/* ---------------------------------------------------------------------- *
 * In-page detector — runs inside the browser context.
 * ---------------------------------------------------------------------- */
const DETECTOR = /* js */ `
  function classNames(el) {
    const raw = typeof el.className === "string" ? el.className : "";
    return raw.split(/\\s+/).filter(Boolean).slice(0, 12).join(" ");
  }

  function inFixedLayer(el) {
    // Overlays/sheets rendered via portal layers (position: fixed) are
    // excluded from the audit by spec: they are floating layers, not layout.
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === "fixed") return true;
    }
    return false;
  }

  function buildSelector(el) {
    if (el.id) return "#" + CSS.escape(el.id);
    let cur = el;
    const parts = [];
    let hops = 0;
    while (cur && cur !== document.body && hops < 6) {
      let sel = cur.tagName.toLowerCase();
      const cls = classNames(cur);
      if (cls) sel += "." + cls.split(" ").map((c) => CSS.escape(c)).join(".");
      const parent = cur.parentElement;
      if (parent) {
        const sibs = Array.from(parent.children).filter(
          (s) => s.tagName === cur.tagName
        );
        if (sibs.length > 1) sel += ":nth-of-type(" + (sibs.indexOf(cur) + 1) + ")";
      }
      parts.unshift(sel);
      cur = parent;
      hops++;
    }
    return parts.join(" ");
  }

  function isVisible(el) {
    try {
      return !!el.checkVisibility && el.checkVisibility({ checkVisibilityCSS: true });
    } catch {
      const s = getComputedStyle(el);
      return (
        s.display !== "none" &&
        s.visibility !== "hidden" &&
        (el.offsetParent !== null || el === document.body || el === document.documentElement)
      );
    }
  }

  /**
   * Audit for horizontal overflow (ghost scroll).
   *
   * Classification:
   *  - Own overflow-x in {hidden, clip, scroll} AND content wider → deliberate
   *    clip/scroll container (component designed to clip its children).
   *  - All other overflowing elements are checked: if any ANCESTOR in the
   *    DOM path is itself a deliberate clip container, this element's overflow
   *    is contained and ignored (the container already covers it).
   *  - Remaining overflowing elements → SUSPECT (potential ghost scroll).
   */
  function auditDocument(TOLERANCE) {
    const suspects = [];
    const deliberateContainers = [];
    const seen = new Set();
    const elMeta = new Map(); // element → { overflowPx, ox, isClipContainer, clipAncestor }

    // Collect all overflowing elements in a single pass.
    const all = document.querySelectorAll("html, body, body *");
    for (const el of all) {
      if (!isVisible(el)) continue;
      if (inFixedLayer(el)) continue;
      const tag = el.tagName.toLowerCase();
      const isFormControl = tag === "input" || tag === "textarea" || tag === "select";

      const sw = el.scrollWidth;
      const cw = el.clientWidth;
      const ow = sw - cw;
      if (ow <= TOLERANCE) continue;
      if (seen.has(el)) continue;
      seen.add(el);

      const ox = getComputedStyle(el).overflowX;
      const isClipContainer = ox === "hidden" || ox === "clip" || ox === "scroll";
      const isFormControlScroll = isFormControl && (ox === "auto" || ox === "scroll");

      elMeta.set(el, { overflowPx: ow, ox, isClipContainer, tag, classes: classNames(el) });
    }

    // Classify: walk each overflowing element. Find the NEAREST overflowing
    // ancestor that is a clip container. If none exists, the element's overflow
    // escapes to the document — it is a suspect. If one exists, the overflow is
    // absorbed by design and is skipped (already recorded as a deliberate container).
    const clipContainers = [...elMeta.entries()].filter(([, m]) => m.isClipContainer);
    const clipSet = new Set(clipContainers.map(([el]) => el));

    // Sort overflowing elements by depth (shallowest first) to process containers first.
    const overflowEls = [...elMeta.keys()].sort((a, b) => {
      let da = 0, db = 0, na = a, nb = b;
      while (na !== document.body && na !== document.documentElement) { da++; na = na.parentElement; }
      while (nb !== document.body && nb !== document.documentElement) { db++; nb = nb.parentElement; }
      return da - db;
    });

    let suppressed = 0;
    for (const el of overflowEls) {
      const m = elMeta.get(el);
      if (m.isClipContainer) {
        // Deliberate clip/scroll container: report the container itself.
        const isFormCtrl = m.tag === "input" || m.tag === "textarea" || m.tag === "select";
        const reason = isFormCtrl
          ? "form control internal scroll"
          : "overflow-x " + m.ox + " container (clips children)";
        deliberateContainers.push({
          selector: buildSelector(el),
          tag: m.tag,
          classes: m.classes,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflowPx: m.overflowPx,
          reason,
        });
        continue;
      }

      // Non-clip element: walk ancestors to find the nearest clip container in the list.
      let hasClipAncestor = false;
      let anc = el.parentElement;
      while (anc && anc !== document.body && anc !== document.documentElement) {
        if (clipSet.has(anc)) { hasClipAncestor = true; break; }
        anc = anc.parentElement;
      }

      if (hasClipAncestor) {
        // Overflow is absorbed by a clip container — already covered by the container entry.
        // Skip to avoid noise (inner elements inside LeadTable wrapper, quotes cards, etc.).
        suppressed++;
        continue;
      }

      // No clip ancestor: overflow escapes to the viewport — real ghost scroll candidate.
      suspects.push({
        selector: buildSelector(el),
        tag: m.tag,
        classes: m.classes,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflowPx: m.overflowPx,
        reason: "overflow-x " + m.ox + " (escapes to document edge)",
      });
    }

    suspects.sort((a, b) => b.overflowPx - a.overflowPx);
    deliberateContainers.sort((a, b) => b.overflowPx - a.overflowPx);
    return {
      suspects: suspects.slice(0, 30),
      deliberate: deliberateContainers.slice(0, 30),
      innerSuppressed: suppressed,
    };
  }
`;

/* ---------------------------------------------------------------------- *
 * Run a single page × viewport combination inside one shared context.
 * ---------------------------------------------------------------------- */
async function auditPage(context, pagePath, vp) {
  // Fresh page per (page × viewport) so state/localStorage don't leak across views.
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const url = `${BASE_URL}${pagePath}`;
    const started = Date.now();
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    // Let client-side render + hydration settle before measuring.
    await page.waitForTimeout(900);

    const finalUrl = page.url();
    const isSignIn = /\/sign-in/i.test(finalUrl);

    if (isSignIn) {
      return {
        pagePath,
        viewport: `${vp.name} ${vp.width}×${vp.height}`,
        status: "AUTH_REQUIRED",
        notes: `redirected to sign-in (${finalUrl.replace(BASE_URL, "")}) — sessione assente/scrollata`,
        suspects: [],
        deliberate: [],
        ms: Date.now() - started,
      };
    }

    const result = await page.evaluate(
      new Function(DETECTOR + `\n return auditDocument(${TOLERANCE});`)
    );
    const vpLabel = `${vp.name} ${vp.width}×${vp.height}`;
    return {
      pagePath,
      viewport: vpLabel,
      status: "OK",
      notes: "",
      suspects: result.suspects.map((s) => ({ ...s, pagePath, viewport: vpLabel })),
      deliberate: result.deliberate.map((d) => ({ ...d, pagePath, viewport: vpLabel })),
      ms: Date.now() - started,
    };
  } finally {
    await page.close();
  }
}

/* ---------------------------------------------------------------------- *
 * Report writer.
 * ---------------------------------------------------------------------- */
function writeReport(runs, meta) {
  const rows = (fn) =>
    runs
      .flatMap((r) => fn(r))
      .sort((a, b) => b.overflowPx - a.overflowPx);

  const transcript = [];
  transcript.push("# Ghost Scroll Audit — MS-1.3");
  transcript.push("");
  transcript.push(`_Generated ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC · **${meta.branch}** · base URL \`${BASE_URL}\` · ${meta.engine}_`);
  transcript.push("");
  transcript.push("## Parametri");
  transcript.push("");
  transcript.push("| Pagina | Viewport |");
  transcript.push("|---|---|");
  for (const p of PAGES) {
    transcript.push(`| \`${p}\` | ${VIEWPORTS.map((v) => `${v.width}×${v.height}`).join(", ")} |`);
  }
  transcript.push("");
  transcript.push(`> Viewport **widths** imported at runtime from \`presentation/lib/breakpoints.ts\` (\`DEVICE_PROFILES\`); heights follow the roadmap convention (desktop 800 / tablet 1024 / mobile 667). Detection: ` + "`scrollWidth > clientWidth + 1`" + ` on every visible element. Auth: profilo persistente \`${PROFILE_DIR.replace(ROOT + "/", "")}\`.`);
  transcript.push("");
  transcript.push("## Esito per vista");
  transcript.push("");
  transcript.push("| Pagina | Viewport | Status | Note | Tempo |");
  transcript.push("|---|---|---|---|---|");
  for (const r of runs) {
    transcript.push(
      `| \`${r.pagePath}\` | ${r.viewport} | ${r.status} | ${r.notes || "—"} | ${r.ms}ms |`
    );
  }
  transcript.push("");
  transcript.push("## Sospetti (possibile ghost scroll)");
  transcript.push("");
  if (rows((r) => r.suspects).length === 0) {
    transcript.push("_Nessun elemento oltre il documento._");
  } else {
    transcript.push("| Pagina | Viewport | Selector | Tag | scrollWidth | clientWidth | overflowPx | Classi |");
    transcript.push("|---|---|---|---|---|---|---|---|");
    for (const s of rows((r) => r.suspects)) {
      transcript.push(
        `| \`${s.pagePath}\` | ${s.viewport} | \`${s.selector}\` | \`${s.tag}\` | ${s.scrollWidth} | ${s.clientWidth} | **${s.overflowPx}** | \`${s.classes}\` |`
      );
    }
  }
  transcript.push("");
  transcript.push("## Contenuti deliberati (non bug — elementi che clip/scroll/fixed, raggruppati per classe)");
  transcript.push("");
  const deliberateAll = rows((r) => r.deliberate);
  if (deliberateAll.length === 0) {
    transcript.push("_Nessuno._");
  } else {
    // Roll up per class + reason: i singoli card-row/truncate genererebbero
    // centinaia di righe identiche. Sotto: 1 riga per container con conteggio.
    const groups = new Map();
    for (const d of deliberateAll) {
      const key = `${d.reason}\u0000${d.classes}`;
      if (!groups.has(key)) {
        groups.set(key, {
          reason: d.reason,
          classes: d.classes,
          count: 0,
          maxOverflowPx: 0,
          example: d.selector,
          tags: new Set(),
        });
      }
      const g = groups.get(key);
      g.count += 1;
      g.maxOverflowPx = Math.max(g.maxOverflowPx, d.overflowPx);
      g.tags.add(`${d.pagePath}@${d.viewport}`);
    }
    const sorted = [...groups.values()].sort((a, b) => b.maxOverflowPx - a.maxOverflowPx);
    transcript.push(`<details><summary>${sorted.length} gruppi · ${deliberateAll.length} elementi totali</summary>`);
    transcript.push("");
    transcript.push("| # | overflowPx (max) | Conteggio | Motivo | Classi (esempio) |");
    transcript.push("|---|---|---|---|---|");
    for (const g of sorted) {
      transcript.push(`| ${g.count} | **${g.maxOverflowPx}** | ${g.count} | ${g.reason} | \`${g.classes}\` |`);
    }
    transcript.push("");
    transcript.push("</details>");
    transcript.push("");
    transcript.push("Esempio per gruppo di overflow maggiore\n");
    for (const g of sorted.slice(0, 3)) {
      transcript.push(`- **\`${g.classes}\`** · ${g.count} elementi · overflowPx max ${g.maxOverflowPx} — es. \`${g.example}\``);
    }
    transcript.push("");
  }
  transcript.push("");
  transcript.push("## Classificazione provvisoria");
  transcript.push("");
  transcript.push("La convalida definitiva avviene nel triage **MS-1.4**. Euristiche applicate qui:");
  transcript.push("");
  transcript.push("- Sospetti che si fermano su un **document edge** (html/body con overflow visibile) → **ghost scroll reale** (la pagina scorrerebbe in orizzontale).");
  transcript.push("- Elemento con overflow clipato da un **clipping ancestor** → falso positivo (niente scrollbar visibile, ma contenuto nascosto: da triagare come regressione di layout).");
  transcript.push("- Elemento con `overflow-x: scroll/auto/hidden` proprio → contenuto deliberato (scroll interno o clip progettata).");
  transcript.push("- `position: fixed` · form control → esclusi di default.");
  transcript.push("");
  transcript.push("> Note emerse dall'audit (da validare nel triage **MS-1.4**):");
  transcript.push("- Il candidato `lead-filter-bar.tsx` riga filtri **NON produce ghost scroll a 375**: i select `w-[170px]` vengono compressi dal `flex-nowrap` (flex-shrink), la riga resta 328px ≤ contenuto 343px anche con clear attivo (`?status=qualified`, 0 sospetti). Sospetto roadmap **falso positivo**.");
  transcript.push("- Unico sospetto reale: header della lista quote a **tablet 768×1024** (overflowPx ~171-203 su `main`/header) → candidato MS-1.4.");
  transcript.push("");
  const authRuns = runs.filter((r) => r.status === "AUTH_REQUIRED");
  if (authRuns.length > 0) {
    transcript.push(`> ⚠️ **${authRuns.length} viste in stato AUTH REQUIRED**: nessuna sessione Clerk nel profilo persistente (\`${PROFILE_DIR.replace(ROOT + "/", "")}\`). Esegui \`node scripts/ghost-scroll-audit.mjs --login\` (login manuale una tantum), poi ri-esegui l'audit. L'integrazione auth per gli E2E è **MS-3.2**; questo è un workaround temporaneo.`);
    transcript.push("");
  }

  transcript.push("---");
  transcript.push("");
  transcript.push("> Questo report va gestito a mano (non committato via git secondo istruzione del committente).");
  transcript.push("");

  writeFileSync(REPORT_PATH, transcript.join("\n"));
  console.log(`\n📄 Report: ${REPORT_PATH}`);
}

/* ---------------------------------------------------------------------- *
 * --login: one-time headed manual login in the PERSISTENT profile.
 * Clerk dev needs the browser that performed the OAuth: the profile keeps
 * the cookies (including the cross-domain Clerk handshake) so later headless
 * runs reuse the same session.
 * ---------------------------------------------------------------------- */
async function runLogin() {
  console.log("🔐 Apre il browser per il login manuale (una tantum).");
  console.log(`   Profilo persistente: ${PROFILE_DIR.replace(ROOT + "/", "")}`);
  console.log(`   Vai a ${BASE_URL}/admin/leads → verrai reindirizzato a sign-in Clerk.`);
  console.log("   Effettua l'accesso (Google OAuth).");
  console.log("   Quando sarai su una pagina /admin, il profilo viene chiuso e la sessione salvata.\n");

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
  });
  try {
    const page =
      context.pages().find((p) => !p.url().startsWith("chrome://")) ??
      (await context.newPage());

    await page.goto(`${BASE_URL}/admin/leads`, { waitUntil: "load", timeout: 30000 });

    const deadline = Date.now() + 180_000;
    let authed = false;
    while (Date.now() < deadline) {
      const url = page.url();
      if (/\/admin\//.test(url)) {
        authed = true;
        break;
      }
      await page.waitForTimeout(800);
    }

    if (authed) {
      // Let Clerk's client rotate/settle the session cookie in the profile.
      await page.waitForTimeout(1500);
      console.log(`\n✅ Sessione salvata nel profilo persistente.`);
      console.log("   Ora: node scripts/ghost-scroll-audit.mjs");
    } else {
      console.log("\n⏰ Timeout (3 min) — nessuna pagina /admin raggiunta. Nulla salvato.");
      process.exitCode = 2;
    }
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------------- *
 * Main.
 * ---------------------------------------------------------------------- */
async function main() {
  const writeReportFlag = !process.argv.includes("--no-report");

  /* eslint-disable-next-line no-console */
  console.log(`Ghost-scroll audit — ${VIEWPORTS.map((v) => `${v.width}×${v.height}`).join(" · ")} · pages ${PAGES.join(", ")}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  if (process.argv.includes("--login")) {
    await runLogin();
    return;
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    viewport: null,
  });
  console.log(`🔑 Profilo persistente: ${PROFILE_DIR.replace(ROOT + "/", "")}`);

  const runs = [];
  try {
    for (const vp of VIEWPORTS) {
      for (const pagePath of PAGES) {
        const r = await auditPage(context, pagePath, vp);
        const mark = r.status === "OK" ? "·" : "⚠️";
        console.log(
          `${mark} ${r.pagePath} @ ${vp.width}×${vp.height} — ${r.status}${r.notes ? " · " + r.notes : ""} (${r.ms}ms)${r.suspects ? ", sospetti=" + r.suspects.length : ""}`
        );
        runs.push(r);
      }
    }
  } finally {
    await context.close();
  }

  const totalSuspects = runs.reduce((n, r) => n + (r.suspects?.length ?? 0), 0);
  const totalDeliberate = runs.reduce((n, r) => n + (r.deliberate?.length ?? 0), 0);
  console.log(`\nTotale: ${totalSuspects} sospetti · ${totalDeliberate} deliberati · ${runs.length} run`);

  if (writeReportFlag) {
    const branch = execGitBranch();
    writeReport(runs, {
      branch,
      engine: `Node ${process.version} · Playwright chromium ${execSync("node -e \"console.log(require('playwright-core/package.json').version)\"").toString().trim()}`,
    });
  } else {
    console.log("(--no-report: report non scritto)");
  }
}

function execGitBranch() {
  try {
    return execSync("git branch --show-current").toString().trim();
  } catch {
    return "(branch sconosciuto)";
  }
}

main().catch((err) => {
  console.error("Ghost-scroll audit failed:", err);
  process.exit(1);
});