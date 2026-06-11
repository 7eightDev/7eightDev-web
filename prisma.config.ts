import "dotenv/config";
import { defineConfig, env } from "prisma/config";

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
