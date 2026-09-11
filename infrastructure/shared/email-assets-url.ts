/**
 * Origin of 7eightDev's public website. Emails are read in the recipient's
 * mailbox, never on the sender's machine, so a loopback origin in an `<img
 * src>` can never resolve for them — this domain is the fallback that keeps
 * the branded logo visible whenever the app runs off `http://localhost:*`.
 */
export const DEFAULT_PUBLIC_ORIGIN = "https://7eightdev.com";

function isLoopbackUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

/**
 * Origin used for images embedded in email bodies (logo) — always publicly
 * reachable. Resolution order:
 * 1. `EMAIL_APP_BASE_URL` when set (overrides everything, e.g. a Vercel
 *    deployment domain);
 * 2. {@link DEFAULT_PUBLIC_ORIGIN} when `appBaseUrl` is a loopback address
 *    (the common local-dev case: `APP_BASE_URL=http://localhost:3000`);
 * 3. the given origin as-is for every public deployment, which typically
 *    already carries `APP_BASE_URL=https://7eightdev.com`.
 *
 * Note this is distinct from `APP_BASE_URL`: app links in emails (the quote
 * CTA `/p/[uuid]`) must keep pointing at the origin the sender is using to
 * test, so they still resolve to `localhost` in dev.
 */
export function emailAssetsBaseUrl(appBaseUrl: string): string {
  const normalized = appBaseUrl.replace(/\/+$/, "");
  const override = process.env.EMAIL_APP_BASE_URL?.trim().replace(/\/+$/, "");
  if (override) return override;
  return isLoopbackUrl(normalized) ? DEFAULT_PUBLIC_ORIGIN : normalized;
}