import { join } from "node:path";
import { expect, test as setup, chromium } from "@playwright/test";

/**
 * Auth bridge (MS-3.2): lifts the Clerk admin session into a storageState so
 * every Playwright project (Desktop/Tablet/Mobile Safari/Mobile Chrome) starts
 * authenticated — replacing MS-1.3's per-run persistent-profile workaround.
 *
 * LOCAL (MS-3.2): Google OAuth is a manual one-time step, so the session lives
 * in the persistent Chromium profile created by `scripts/ghost-scroll-audit.mjs
 * --login`. This setup opens that profile headlessly, confirms the session is
 * accepted (no redirect to /sign-in), and snapshots it into
 * `.e2e/storage-state/fullAdmin.json`.
 *
 * CI (MS-4.4): OAuth cannot run headless, so the workflow injects a Clerk TEST
 * TOKEN (Dashboard → API Keys → Test tokens, for a test user whose email is in
 * ADMIN_EMAILS so the allowlist passes). The token is a Clerk-signed JWT for
 * the instance; this setup drops it into the `__session` cookie on the
 * localhost origin and verifies the proxy accepts it (no /sign-in bounce) the
 * same way, producing the identical storageState with zero interactive login.
 *
 * Clerk dev-instance handshake: on test/dev keys, Clerk's middleware
 * (`@clerk/backend`) requires a `__clerk_db_jwt` (dev-browser) cookie BEFORE
 * it checks the session token (chunk-M54YMIAO.mjs:6503-6504). This cookie can
 * only be created by Clerk itself: it is bootstrapped when the Clerk frontend
 * JS calls FAPI `/v1/dev_browser` on a page that mounts ClerkProvider. The CI
 * branch therefore:
 *   1. Navigates to "/" (public route, ClerkProvider mounts). The middleware
 *      first runs the DevBrowserMissing FAPI-handshake loop (up to 3 round
 *      trips, then bails to a normal 200 response) and the Clerk JS then sets
 *      `__clerk_db_jwt` (+ suffixed variant) on the localhost origin.
 *   2. Waits for that dev-browser cookie to appear (polling `context.cookies()`),
 *      then injects `__session` (the test-token JWT) and `__client_uat=1` (a
 *      truthy timestamp ≤ the JWT's `iat` so the middleware's
 *      SessionTokenWithoutClientUAT (line 6513) and SessionTokenIATBeforeClientUAT
 *      (line 6523) checks pass; the suffixed-cookie logic keeps reading our
 *      unsuffixed values because no suffixed `__session` exists).
 *   3. Navigates to the protected page — all cookies are present so the
 *      middleware evaluates SignedIn and auth.protect() allows the request.
 *   4. Rebuilds a normalized (unsuffixed only) cookie jar before saving the
 *      storageState: the verify navigation lets Clerk JS reset __client_uat to
 *      0 and add suffixed cookies without a suffixed __session, which would
 *      flip usesSuffixedCookies() back to suffixed mode on replay and make
 *      every downstream project read an empty suffixed __session (→ /sign-in).
 */

const ROOT = join(__dirname, "..");
const PROFILE_DIR = process.env.E2E_AUTH_PROFILE ?? join(ROOT, ".e2e", "ghost-scroll-profile");
const STORAGE_STATE = join(ROOT, ".e2e", "storage-state", "fullAdmin.json");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const TEST_TOKEN = process.env.CLERK_TEST_TOKEN;

/** Clerk session cookie name (Next.js clerkMiddleware reads the JWT from it). */
const SESSION_COOKIE = "__session";

setup("capture Clerk admin session into storageState", async () => {
  const browser = TEST_TOKEN ? await chromium.launch({ headless: true }) : null;
  const context = browser
    ? await browser.newContext()
    : await chromium.launchPersistentContext(PROFILE_DIR, { headless: true });

  try {
    const page = context.pages()[0] ?? (await context.newPage());

    let devBrowserCookie: string | null = null;

    if (TEST_TOKEN) {
      // CI branch — Clerk dev-browser bootstrap:
      // Navigate to a PUBLIC route so ClerkProvider mounts and the Clerk
      // frontend JS can call FAPI /v1/dev_browser, which sets the
      // __clerk_db_jwt (dev-browser) cookie on the localhost origin — the one
      // cookie Clerk's middleware REQUIRES (dev-instance gate) before it even
      // considers the session token.
      await page.goto(`${BASE_URL}/`, {
        waitUntil: "load",
        timeout: 30_000,
      });

      // Wait for the dev-browser cookie to actually land in the cookie jar
      // (Clerk JS sets it asynchronously after the page hydrates).
      for (let attempt = 0; attempt < 30; attempt++) {
        devBrowserCookie =
          (await context.cookies(`${BASE_URL}/`)).find((c) =>
            c.name.startsWith("__clerk_db_jwt")
          )?.value ?? null;
        if (devBrowserCookie) break;
        await page.waitForTimeout(500);
      }
      expect(
        devBrowserCookie,
        "Clerk non ha impostato __clerk_db_jwt sulla pagina pubblica / — " +
          "il bootstrap del dev-browser su questa istanza Clerk è fallito."
      ).toBeTruthy();

      // Inject the session JWT and a client-updated-at timestamp.
      // __client_uat=1 is truthy (hasActiveClient) and ≤ the JWT's iat claim so
      // the middleware's SessionTokenWithoutClientUAT and
      // SessionTokenIATBeforeClientUAT checks both pass. (No suffixed
      // __session cookie exists, so the suffixed-cookie logic reads our
      // unsuffixed values.)
      await context.addCookies([
        {
          name: SESSION_COOKIE,
          value: TEST_TOKEN,
          domain: "localhost",
          path: "/",
          sameSite: "Lax",
        },
        {
          name: "__client_uat",
          value: "1",
          domain: "localhost",
          path: "/",
          sameSite: "Lax",
        },
      ]);
    }

    await page.goto(`${BASE_URL}/admin/leads`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // The Clerk proxy either serves /admin/* or redirects to /sign-in — that
    // redirect is the AUTH-REQUIRED banner of MS-1.3 made explicit.
    await page.waitForURL(/\/admin\/|\/sign-in/, { timeout: 30_000 });
    expect(
      new URL(page.url()).pathname,
      TEST_TOKEN
        ? "CLERK_TEST_TOKEN rifiutato dal proxy Clerk (redirect a /sign-in): " +
          "verifica che sia un test token dell'istanza, per un utente con email " +
          "in ADMIN_EMAILS e il custom claim 'email' nel session token."
        : [
            `Nessuna sessione Clerk nel profilo persistente (${PROFILE_DIR.replace(ROOT, "")}).`,
            "Esegui una tantum: node scripts/ghost-scroll-audit.mjs --login",
            "(login Google OAuth manuale) e riprova.",
          ].join(" ")
    ).toMatch(/^\/admin\//);

    // Wait for the admin product to actually render (filters toolbar h1) so a
    // client-side bounce to sign-in cannot slip past the URL check.
    await page
      .getByRole("heading", { level: 1, name: "Lead" })
      .waitFor({ timeout: 20_000 });

    // Let Clerk settle/rotate its cookies on the localhost origin first.
    await page.waitForTimeout(1500);

    if (TEST_TOKEN) {
      // Normalize the cookie jar before capturing: during the verify
      // navigation Clerk JS resets __client_uat to 0 and writes suffixed
      // cookies (__client_uat_<suffix>, __clerk_db_jwt_<suffix>) without an
      // equivalent suffixed __session. On replay that makes
      // usesSuffixedCookies() (chunk-M54YMIAO.mjs:531) return true, so the
      // middleware reads the MISSING suffixed __session and bounces every
      // downstream project to /sign-in. Rebuild the exact unsuffixed set the
      // live flow used: unsuffixed __session + __client_uat=1 +
      // __clerk_db_jwt (dev-browser gate) — keeps usesSuffixedCookies() in
      // unsuffixed mode so the injected JWT is read and verified.
      await context.clearCookies();
      await context.addCookies([
        {
          name: SESSION_COOKIE,
          value: TEST_TOKEN,
          domain: "localhost",
          path: "/",
          sameSite: "Lax",
        },
        {
          name: "__client_uat",
          value: "1",
          domain: "localhost",
          path: "/",
          sameSite: "Lax",
        },
        {
          name: "__clerk_db_jwt",
          value: devBrowserCookie!,
          domain: "localhost",
          path: "/",
          sameSite: "Lax",
          expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
        },
      ]);
    }

    await context.storageState({ path: STORAGE_STATE });
  } finally {
    await context.close();
    await browser?.close();
  }
});