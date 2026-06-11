import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/infrastructure/db/generated/client";

/**
 * Prisma client singleton (driver adapter: node-postgres).
 * Cached on globalThis so Next.js dev hot-reload doesn't exhaust
 * the connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
