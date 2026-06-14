import Link from "next/link";
import type {
  CatalogTier,
  ServiceCatalogItem,
} from "@/domain/catalog/catalog.types";
import { formatMoney } from "@/domain/shared/money";
import { catalogRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { CatalogRowActions } from "@/presentation/features/admin/catalog-row-actions";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<CatalogTier, string> = {
  web_assets: "Web Assets · PMI",
  enterprise: "Enterprise & SaaS",
};

function priceLabel(item: ServiceCatalogItem): string {
  const suffix =
    item.billing.kind === "recurring"
      ? item.billing.interval === "yearly"
        ? " /anno"
        : " /mese"
      : "";
  switch (item.pricing.kind) {
    case "fixed":
      return formatMoney(item.pricing.price) + suffix;
    case "range":
      return `${formatMoney(item.pricing.from)}–${formatMoney(item.pricing.to)}${suffix}`;
    case "on_request":
      return "su richiesta";
  }
}

export default async function CatalogPage() {
  const items = await catalogRepository.findAll();
  const tiers: CatalogTier[] = ["web_assets", "enterprise"];

  return (
    <Container className="max-w-[1100px] py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] text-foreground">
          Catalogo servizi
        </h1>
        <Link
          href="/admin/catalog/new"
          className="font-mono text-sm font-semibold rounded-full bg-accent text-[#0a0b0d] transition-all duration-150 hover:brightness-105 hover:-translate-y-px flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-[9px]"
        >
          <span className="sm:hidden text-lg">+</span>
          <span className="hidden sm:inline">+ Nuova voce</span>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="p-10 rounded-2xl bg-surface border border-border text-center">
          <p className="font-hanken text-soft mb-4">
            Catalogo vuoto. Aggiungi la prima voce.
          </p>
          <Link
            href="/admin/catalog/new"
            className="font-mono text-sm font-semibold text-accent hover:underline"
          >
            + Nuova voce
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {tiers.map((tier) => {
            const tierItems = items.filter((i) => i.tier === tier);
            if (tierItems.length === 0) return null;
            return (
              <section key={tier} className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
                  {TIER_LABEL[tier]} · {tierItems.length}
                </h2>
                <div className="flex flex-col gap-3">
                  {tierItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_auto_auto] max-[680px]:grid-cols-1 gap-5 items-center rounded-xl border border-border bg-surface px-5 py-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-space text-[15.5px] font-semibold text-foreground">
                            {item.title}
                          </span>
                          {item.defaultOptional && (
                            <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-muted border border-border rounded-full px-2 py-[2px]">
                              opzionale
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-dim">
                            {item.id}
                          </span>
                        </div>
                        <p className="font-hanken text-[13.5px] text-soft m-0 mt-1 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                      <span className="font-mono text-[14px] text-foreground whitespace-nowrap">
                        {priceLabel(item)}
                      </span>
                      <CatalogRowActions id={item.id} title={item.title} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Container>
  );
}
