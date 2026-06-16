# Deployment — Vercel

Production hosting for `7eightdev-web` runs on **Vercel** (first-party Next.js
platform). The application code runs unchanged: Vercel natively supports the
Next.js 16 App Router, the `proxy.ts` middleware (Clerk), and the Node.js runtime
required by the Prisma `pg` driver adapter.

## Architecture on Vercel

| Concern        | Setup                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Framework      | Next.js 16 (auto-detected). Root directory: `7eightdev-web`.          |
| Runtime        | Node.js 22.x (pinned via `engines.node`). Functions region `fra1`.    |
| Database       | Neon Postgres (`eu-central-1`). Pooled URL for the app, direct URL for migrations. |
| Auth           | Clerk (`proxy.ts` + `clerkMiddleware`).                               |
| Email          | Resend.                                                               |
| Build          | `vercel-build` script: runs `prisma migrate deploy` on production only, then `next build`. |

`fra1` (Frankfurt) is selected to sit next to the Neon `eu-central-1` region and
minimise round-trip latency.

## Build pipeline

Vercel runs, in order:

1. `npm install` → triggers `postinstall` → `prisma generate`
   (the generated client lives in `infrastructure/db/generated/` and is **not**
   committed; it is regenerated on every build).
2. `npm run vercel-build`:
   - if `VERCEL_ENV === "production"` → `prisma migrate deploy` (uses
     `DIRECT_URL` via `prisma.config.ts`);
   - then `next build`.

Migrations therefore run automatically **only on production deploys**. Preview
deploys build without touching the database schema — point the Preview
environment's `DATABASE_URL`/`DIRECT_URL` at a Neon dev branch if you want
isolated preview data.

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. Scope to
Production (and Preview, with their own values, if used).

| Variable                              | Scope        | Notes                                                        |
| ------------------------------------- | ------------ | ----------------------------------------------------------- |
| `DATABASE_URL`                        | app runtime  | Neon **pooled** string (host with `-pooler`).               |
| `DIRECT_URL`                          | migrations   | Neon **direct** string (no `-pooler`).                      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | client       | `pk_test_...` for the first deploy.                         |
| `CLERK_SECRET_KEY`                    | server       | `sk_test_...` for the first deploy.                         |
| `ADMIN_EMAILS`                        | server       | Comma-separated admin allowlist (fail-closed if empty).     |
| `RESEND_API_KEY`                      | server       | All 4 Resend vars required, else the null notifier is used. |
| `QUOTE_FROM_EMAIL`                    | server       | `Name <addr>`; domain must be verified on Resend.           |
| `QUOTE_REPLY_TO`                      | server       | Client-facing reply address.                                |
| `APP_BASE_URL`                        | server       | Public origin for `/p/[uuid]` links, no trailing slash.     |
| `QUOTE_ACCEPT_NOTIFY_TO`             | server       | Optional; owner alert on acceptance.                        |

`APP_BASE_URL` must match the deployment origin. For the first test deploy use
the Vercel preview/production URL (e.g. `https://7eightdev-web.vercel.app`);
switch to `https://7eightdev.com` once the custom domain is attached.

## First deploy (test keys)

1. Create the project on Vercel from the Git repo (Git integration).
   Set **Root Directory** to `7eightdev-web`.
2. Add all env vars above with the current `pk_test`/`sk_test` Clerk keys and
   the Neon production strings.
3. Add the Vercel deployment domain to Clerk **allowed origins**, and confirm
   the session token custom claim is configured:
   Clerk → Sessions → Customize session token → `{ "email": "{{user.primary_email_address}}" }`.
4. Push the branch → Vercel builds a Preview. Merge to `main` → Production.

## Promote to production Clerk + custom domain

1. Create a **Production** instance in Clerk, swap `pk_live`/`sk_live` into the
   Production env scope.
2. Attach `7eightdev.com` in Vercel → Domains, update DNS as instructed.
3. Set `APP_BASE_URL=https://7eightdev.com` (Production scope) and redeploy.
4. Re-verify the Resend sending domain and DMARC.

## Rollback

Vercel keeps every deployment immutable. To roll back:
Vercel → Deployments → pick the last good one → **Promote to Production**.
Note this rolls back the *application*, not the database — a forward schema
migration must be reverted with a new corrective migration.
