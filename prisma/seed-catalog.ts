import "dotenv/config";
import { PrismaCatalogRepository } from "../infrastructure/catalog/prisma-catalog.repository";
import { CATALOG_SEED, seedCatalog } from "../infrastructure/catalog/catalog.seed";

/**
 * Catalog-only seed for ad-hoc provisioning of an environment's Service Catalog.
 *
 * Unlike `prisma/seed.ts` (the `prisma db seed` entrypoint, which also inserts
 * the AVIS example quote and resolves to the dev database via `.env.local`),
 * this script seeds ONLY the catalog and targets whatever `DATABASE_URL` is in
 * the loaded environment — typically production via `.env`.
 *
 * Guard rails (it writes to whatever DATABASE_URL points at — often prod):
 *  - It ALWAYS prints the target host first.
 *  - It is a DRY RUN by default: nothing is written unless `--yes` is passed
 *    (`npm run db:seed:catalog -- --yes`). This makes an accidental run a no-op.
 *
 * Seeding is idempotent (upsert by id): existing rows are overwritten with the
 * seed definition. Because the catalog is also admin-editable, prefer the
 * deploy-time "seed only if empty" step for routine provisioning and reserve
 * this script for deliberate, one-off baseline resets.
 */
function targetHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const host = targetHost();
  const confirmed = process.argv.includes("--yes");

  console.log(`Target database: ${host}`);

  if (!confirmed) {
    console.log(
      `Dry run — nothing was written. To seed ${CATALOG_SEED.length} catalog ` +
        `items into the host above, re-run with: npm run db:seed:catalog -- --yes`
    );
    return;
  }

  const repository = new PrismaCatalogRepository();
  await seedCatalog(repository);
  console.log(`Seeded ${CATALOG_SEED.length} catalog items into ${host}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
