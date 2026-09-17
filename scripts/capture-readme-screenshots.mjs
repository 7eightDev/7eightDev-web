/**
 * README screenshots — cattura mirata di alta qualità per la documentazione.
 *
 * NON fa parte della matrice E2E: è un tool manuale che produce materiale
 * marketing. La sessione admin viene ottenuta in modo DETERMINISTICO:
 * il CLERK_TEST_TOKEN viaggia con `cat` di test-token (rifiutato dal middleware
 * di questa versione Clerk), quindi si minia un VERO session token per l'utente
 * test tramite Backend API (`POST /v1/sessions/{id}/tokens`), lo si inietta nei
 * cookie insieme al dev-browser cookie generato su "/".
 *
 * Uso:  node scripts/capture-readme-screenshots.mjs
 * Precondizioni: dev server su :3000, dotenv con CLERK_SECRET_KEY, DATABASE_URL.
 */
import { chromium } from "@playwright/test";
import { createClerkClient } from "@clerk/backend";
import dotenv from "dotenv";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

dotenv.config({ path: ".env.local", quiet: true });

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots");
const TEST_USER_ID = process.env.CLERK_TEST_USER_ID ?? "user_3EzDTPkUoNcGcvBedwYSPAniRdO";
const publicQuoteUuid = process.env.PUBLIC_QUOTE_UUID;

mkdirSync(OUT_DIR, { recursive: true });

// Viewport ampio per README + scale 2 per nitidezza al 50%.
const VIEWPORT = { width: 1440, height: 900 };

/** Fixture fissa per il badge quota — nessuna dipendenza dal contatore DB. */
const QUOTA_FIXTURE = {
  date: "2026-09-01",
  buckets: {
    "places-text-search": { used: 7, limit: 32, available: true },
    "places-autocomplete": { used: 88, limit: 322, available: true },
  },
};

/** Nasconde l'overlay dev di Next.js (non esiste in produzione). */
const DEV_TOOLS_HIDE_CSS = `
  nextjs-portal,
  [data-nextjs-portal],
  #__next_devtools,
  [data-nextjs-dev-tools] { display: none !important; }
`;

function assertNotSignIn(page, label) {
  if (/\/sign-in/.test(page.url())) {
    throw new Error(`Rimbalzo a /sign-in su "${label}" — sessione non valida.`);
  }
}

async function waitForStable(page, withQuota = false) {
  await page.evaluate(() => document.fonts.ready);
  if (withQuota) {
    await page.waitForResponse((r) => r.url().includes("/admin/api/google-quota"));
  }
  await page.waitForFunction(
    () =>
      document.images.length === 0 ||
      Array.from(document.images).every((img) => img.complete),
    null,
    { timeout: 15_000 }
  );
  await page.waitForTimeout(900);
}

async function setupPageBasics(page, { reducedMotion = false, quota = false } = {}) {
  await page.addInitScript((css) => {
    const style = document.createElement("style");
    style.textContent = css;
    document.documentElement.appendChild(style);
  }, DEV_TOOLS_HIDE_CSS);
  await page.emulateMedia({
    colorScheme: "dark",
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
  });
  if (quota) {
    await page.route("**/admin/api/google-quota", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(QUOTA_FIXTURE),
      })
    );
  }
}

/** Re-iniezione post-navigazione: il CSS da addInitScript viene potato dal runtime dev. */
async function hideDevOverlay(page) {
  await page.addStyleTag({ content: DEV_TOOLS_HIDE_CSS });
}

/** Minia un vero session token per l'utente test (categoria sessione, ~24 min). */
async function mintSessionToken() {
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const session = await client.sessions.createSession({ userId: TEST_USER_ID });
  const res = await fetch(`https://api.clerk.com/v1/sessions/${session.id}/tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Mint token HTTP ${res.status}: ${await res.text()}`);
  const { jwt } = await res.json();
  writeFileSync("/tmp/7eightdev-minted-session.jwt", jwt);
  console.log("🔑 session token minted (", jwt.length, "chars ) — sid:", session.id);
  return jwt;
}

/** Bootstrap del dev-browser cookie su "/" (richiesto dal middleware in dev). */
async function getDevBrowserCookie(context, page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: "load", timeout: 30_000 });
  let cookie = null;
  for (let i = 0; i < 40; i++) {
    cookie =
      (await context.cookies(`${BASE_URL}/`)).find((c) =>
        c.name.startsWith("__clerk_db_jwt")
      ) ?? null;
    if (cookie) break;
    await page.waitForTimeout(500);
  }
  if (!cookie) throw new Error("__clerk_db_jwt non impostato da /");
  return cookie.value;
}

/**
 * Normalizza il cookie jar allo stato non-suffixed PRIMA di ogni navigazione
 * admin. Clerk JS, dopo il primo load, rimette `__client_uat` a 0 e scrive
 * cookie suffixed (`__client_uat_<suffix>`, `__clerk_db_jwt_<suffix>`) senza un
 * `__session_<suffix>` corrispondente: il middleware passa in suffixed-mode e
 * legge un `__session` mancante → /sign-in. Reset esplicito → sempre unsuffixed.
 */
async function normalizeAuthCookies(context, sessionToken, dbJwt) {
  await context.clearCookies();
  await context.addCookies([
    { name: "__session", value: sessionToken, domain: "localhost", path: "/", sameSite: "Lax" },
    { name: "__client_uat", value: "1", domain: "localhost", path: "/", sameSite: "Lax" },
    {
      name: "__clerk_db_jwt",
      value: dbJwt,
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    },
  ]);
}

/** Prepara un context autenticato con il session token minted. */
async function createAuthedContext(browser, sessionToken) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const bootstrap = await context.newPage();
  const dbJwt = await getDevBrowserCookie(context, bootstrap);
  await bootstrap.close();
  await normalizeAuthCookies(context, sessionToken, dbJwt);
  return { context, dbJwt };
}

const browser = await chromium.launch();
const sessionToken = await mintSessionToken();

const publicContext = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
});
const publicPage = await publicContext.newPage();
const adminContextSetup = await createAuthedContext(browser, sessionToken);
const adminContext = adminContextSetup.context;
const adminDbJwt = adminContextSetup.dbJwt;
const adminPage = await adminContext.newPage();

const shots = [];

async function shot(page, name, fn) {
  const target = path.join(OUT_DIR, `${name}.png`);
  await fn();
  await hideDevOverlay(page);
  await page.screenshot({ path: target });
  shots.push(name);
  console.log(`✓ ${name}.png`);
}

/** Normalizza i cookie e naviga a una route admin. */
async function gotoAdmin(pathname) {
  await normalizeAuthCookies(adminContext, sessionToken, adminDbJwt);
  await adminPage.goto(`${BASE_URL}${pathname}`, { waitUntil: "commit" });
  await adminPage.getByRole("heading", { level: 1 }).first().waitFor();
  assertNotSignIn(adminPage, pathname);
  await waitForStable(adminPage, true);
}

try {
  // 1. Landing page — full page, reduced motion (Aurora statica)
  await setupPageBasics(publicPage, { reducedMotion: true });
  await shot(publicPage, "landing", async () => {
    await publicPage.goto(`${BASE_URL}/`, { waitUntil: "commit" });
    await publicPage.getByRole("heading", { level: 1 }).first().waitFor();
    await waitForStable(publicPage);
  });
  await hideDevOverlay(publicPage);
  await publicPage.screenshot({ path: path.join(OUT_DIR, "landing-full.png"), fullPage: true });
  shots.push("landing-full");
  console.log("✓ landing-full.png");

  // 2. Admin — lead table
  await setupPageBasics(adminPage, { quota: true });
  await shot(adminPage, "admin-leads", () => gotoAdmin("/admin/leads"));

  // 3. Admin — lead detail
  const LEAD_ID = process.env.LEAD_DETAIL_ID ?? "e40b1fb8-3c3f-42a5-9398-7a1f1169ce53";
  await shot(adminPage, "lead-detail", () => gotoAdmin(`/admin/leads/${LEAD_ID}`));

  // 4. Admin — quote composer (new)
  await shot(adminPage, "quote-composer", () => gotoAdmin("/admin/quotes/new"));

  // 5. Admin — quote list
  await shot(adminPage, "quote-list", () => gotoAdmin("/admin/quotes"));

  // 6. Admin — catalog
  await shot(adminPage, "catalog", () => gotoAdmin("/admin/catalog"));

  // 7. Public quote — /p/[uuid] (nessuna auth)
  if (publicQuoteUuid) {
    await setupPageBasics(publicPage);
    await shot(publicPage, "public-quote", async () => {
      await publicPage.goto(`${BASE_URL}/p/${publicQuoteUuid}`, { waitUntil: "commit" });
      await publicPage.getByRole("heading", { level: 1 }).first().waitFor();
      await waitForStable(publicPage);
    });
  }

  console.log(`\n${shots.length} screenshot → ${OUT_DIR}`);
} finally {
  await browser.close();
}