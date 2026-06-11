import "dotenv/config";
import { PrismaQuoteRepository } from "../infrastructure/quote/prisma-quote.repository";
import { AVIS_QUOTE } from "../infrastructure/quote/quote.seed";

async function main() {
  const repository = new PrismaQuoteRepository();
  await repository.save(AVIS_QUOTE);
  console.log(`Seeded quote ${AVIS_QUOTE.number} (${AVIS_QUOTE.id})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
