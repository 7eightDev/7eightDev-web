import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Mirror Next.js env precedence for the Prisma CLI (migrate / generate / seed).
// Next.js loads `.env.local` over `.env`; the Prisma CLI does not, so by default
// it would read `.env` — which here holds PRODUCTION credentials. Loading
// `.env.local` first (dotenv never overrides an already-set var) makes local
// `migrate dev` target the dev database, never production. On Vercel neither
// file exists and the platform env vars are already set, so this is a no-op
// there and `migrate deploy` still runs against the production datasource.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI operations (migrate, seed) need the DIRECT connection on Neon;
    // falls back to DATABASE_URL for local/single-URL setups.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});
