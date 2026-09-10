import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Mirror Next.js env precedence for the Prisma CLI (migrate / generate / seed).
// Next.js loads `.env.local` over `.env`; the Prisma CLI does not, so by default
// it would read `.env` — which here holds PRODUCTION credentials. Loading
// `.env.local` first (dotenv never overrides an already-set var) makes local
// `migrate dev` target the dev database, never production. On Vercel neither
// file exists and the platform env vars are already set, so this is a no-op
// there and `migrate deploy` still runs against the production datasource.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// Vercel does not expose DATABASE_URL during the `npm install` step, and the
// installed Node version runs `postinstall` (`prisma generate`) there. In Prisma
// 7, `env("DATABASE_URL")` throws as soon as the variable is missing, killing
// the build. `generate` never connects, so fall back to a placeholder URL when
// neither DIRECT_URL nor DATABASE_URL is set — real URLs are still required and
// used for `migrate deploy` / runtime (config sees them when they exist).
const fallbackUrlForGenerate =
  "postgresql://postgres:postgres@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI operations (migrate, seed) need the DIRECT connection on Neon;
    // falls back to DATABASE_URL for local/single-URL setups.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      fallbackUrlForGenerate,
  },
});
