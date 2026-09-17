import "dotenv/config";
import { PrismaCatalogRepository } from "../infrastructure/catalog/prisma-catalog.repository";
import { CATALOG_SEED, seedCatalog } from "../infrastructure/catalog/catalog.seed";
import { PrismaQuoteRepository } from "../infrastructure/quote/prisma-quote.repository";
import { AVIS_QUOTE } from "../infrastructure/quote/quote.seed";
import {
  FIXTURE_LEAD_COUNT,
  seedLeadFixture,
  seedQuoteFixture
} from "./fixture";

async function main() {
  const quoteRepository = new PrismaQuoteRepository();
  await quoteRepository.save(AVIS_QUOTE);
  console.log(`Seeded quote ${AVIS_QUOTE.number} (${AVIS_QUOTE.id})`);

  const catalogRepository = new PrismaCatalogRepository();
  await seedCatalog(catalogRepository);
  console.log(`Seeded ${CATALOG_SEED.length} catalog items`);

  // MS-4.4 decision (b): deterministic E2E fixture (leads + analyses + job + 16
  // quotes). Fully idempotent (upsert per stable id). On a FRESH database this
  // produces the exact schema+data the 9 screenshot baselines were captured
  // against; on a DB that already holds other data the fixture is added without
  // removing anything (but the DB no longer matches the baselines — that's the
  // documented strategy-(b) contract: see `docs/testing/responsive-ui-testing-ROADMAP.md`).
  await seedQuoteFixture();
  await seedLeadFixture();
  console.log(`Seeded E2E fixture: ${FIXTURE_LEAD_COUNT} leads + analyses + 16 quotes`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
