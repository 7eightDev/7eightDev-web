import Link from "next/link";
import { calculateQuote } from "@/application/quote/quote.service";
import type { Quote } from "@/domain/quote/quote.types";
import { formatMoney } from "@/domain/shared/money";
import { quoteRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { QuoteRowActions } from "@/presentation/features/admin/quote-row-actions";
import { formatDateIt } from "@/presentation/lib/format-date";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<Quote["status"], string> = {
  draft: "text-muted border-border",
  sent: "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]",
  accepted: "text-accent border-accent",
  rejected: "text-[var(--coral)] border-[var(--coral)]",
  expired: "text-muted border-border",
};

const STATUS_LABEL: Record<Quote["status"], string> = {
  draft: "bozza",
  sent: "inviato",
  accepted: "accettato",
  rejected: "rifiutato",
  expired: "scaduto",
};

export default async function QuotesPage() {
  const quotes = await quoteRepository.findAll();

  return (
    <Container className="max-w-[1100px] py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] text-foreground">
          Preventivi
        </h1>
        <Link
          href="/admin/quotes/new"
          className="font-mono text-sm font-semibold rounded-full bg-accent text-[#0a0b0d] transition-all duration-150 hover:brightness-105 hover:-translate-y-px flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-[9px]"
        >
          <span className="sm:hidden text-lg">+</span>
          <span className="hidden sm:inline">+ Nuovo preventivo</span>
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="p-10 rounded-2xl bg-surface border border-border text-center">
          <p className="font-hanken text-soft mb-4">
            Nessun preventivo ancora. Componi il primo dal catalogo.
          </p>
          <Link
            href="/admin/quotes/new"
            className="font-mono text-sm font-semibold text-accent hover:underline"
          >
            + Nuovo preventivo
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((quote) => {
            const total = calculateQuote(
              quote,
              quote.acceptance?.selectedOptionalIds ?? []
            ).oneTimeTotal;
            return (
              <div
                key={quote.id}
                className="grid grid-cols-[110px_1fr_auto_auto_auto] max-[820px]:grid-cols-1 gap-5 items-center px-5 py-4 rounded-xl bg-surface border border-border"
              >
                <span className="font-mono text-[13px] text-muted">
                  {quote.number}
                </span>
                <div>
                  <div className="font-space text-[15.5px] font-semibold text-foreground">
                    {quote.client.name}
                  </div>
                  <div className="font-hanken text-[13.5px] text-soft">
                    {quote.project} · scade {formatDateIt(quote.validUntil)}
                  </div>
                </div>
                <span className="font-mono text-[14px] text-foreground whitespace-nowrap">
                  {formatMoney(total)}
                </span>
                <span
                  className={`font-mono text-[11px] tracking-[0.08em] uppercase px-[10px] py-[5px] rounded-full border ${STATUS_STYLE[quote.status]}`}
                >
                  {STATUS_LABEL[quote.status]}
                </span>
                <QuoteRowActions quoteId={quote.id} status={quote.status} />
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}
