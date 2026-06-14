import "dotenv/config";
import { PrismaCatalogRepository } from "../infrastructure/catalog/prisma-catalog.repository";
import { CATALOG_SEED, seedCatalog } from "../infrastructure/catalog/catalog.seed";
import { PrismaQuoteRepository } from "../infrastructure/quote/prisma-quote.repository";
import { AVIS_QUOTE } from "../infrastructure/quote/quote.seed";

async function main() {
  const quoteRepository = new PrismaQuoteRepository();
  await quoteRepository.save(AVIS_QUOTE);
  console.log(`Seeded quote ${AVIS_QUOTE.number} (${AVIS_QUOTE.id})`);

  const catalogRepository = new PrismaCatalogRepository();
  await seedCatalog(catalogRepository);
  console.log(`Seeded ${CATALOG_SEED.length} catalog items`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
