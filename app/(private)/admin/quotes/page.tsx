import Link from "next/link";
import { calculateQuote } from "@/application/quote/quote.service";
import type { Quote } from "@/domain/quote/quote.types";
import { formatMoney } from "@/domain/shared/money";
import { quoteRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { QuoteFilterBar } from "@/presentation/features/admin/quote-filter-bar";
import {
  filterQuotes,
  parseDueFilter,
  parseStatusFilter,
} from "@/presentation/features/admin/quote-filters";
import { QuoteRowActions } from "@/presentation/features/admin/quote-row-actions";
import { formatDateIt } from "@/presentation/lib/format-date";

export const dynamic = "force-dynamic";

// All badges share the soft border weight of the original "sent" style
// (status color mixed 45% into the base border); the text color carries
// the status meaning. Color follows the lifecycle: neutral (draft/expired),
// in-flight cyan (sent), brand lime = the win (accepted), coral (rejected).
const STATUS_STYLE: Record<Quote["status"], string> = {
  draft: "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]",
  sent: "text-accent-cyan border-[color-mix(in_oklab,var(--color-accent-cyan)_45%,var(--border))]",
  accepted: "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]",
  rejected: "text-[var(--coral)] border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]",
  expired: "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]",
};

const STATUS_LABEL: Record<Quote["status"], string> = {
  draft: "bozza",
  sent: "inviato",
  accepted: "accettato",
  rejected: "rifiutato",
  expired: "scaduto",
};

export default async function QuotesPage({
  searchParams,
}: {
  // Next.js 16: searchParams is async. Filters are read from the URL so this
  // stays a Server Component and the filtered view is shareable/bookmarkable.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const statusParam = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const dueParam = Array.isArray(params.due) ? params.due[0] : params.due;
  const filters = {
    status: parseStatusFilter(statusParam),
    due: parseDueFilter(dueParam),
  };

  const quotes = await quoteRepository.findAll();
  const visibleQuotes = filterQuotes(quotes, filters);

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
        <>
          <QuoteFilterBar status={filters.status} due={filters.due} />

          <p className="font-mono text-[12.5px] text-muted mb-3">
            {visibleQuotes.length}{" "}
            {visibleQuotes.length === 1 ? "preventivo" : "preventivi"}
            {visibleQuotes.length !== quotes.length
              ? ` su ${quotes.length}`
              : ""}
          </p>

          {visibleQuotes.length === 0 ? (
            <div className="p-10 rounded-2xl bg-surface border border-border text-center">
              <p className="font-hanken text-soft">
                Nessun preventivo corrisponde ai filtri selezionati.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
          {visibleQuotes.map((quote) => {
            const total = calculateQuote(
              quote,
              quote.acceptance?.selectedOptionalIds ?? []
            ).oneTimeTotal;
            // Surface the domain's send preconditions early in the UI so an
            // incomplete draft can't be sent by mistake. sendQuote() remains
            // the authoritative gate; this only mirrors it for UX.
            const sendBlockReason =
              quote.lineItems.length === 0
                ? "Aggiungi almeno una voce prima di inviare."
                : !quote.client.email?.trim()
                  ? "Aggiungi un'email cliente prima di inviare."
                  : undefined;
            return (
              <div
                key={quote.id}
                className="grid grid-cols-[110px_1fr_auto_150px_auto_auto] gap-5 items-center overflow-hidden rounded-xl border border-border bg-surface px-5 py-4 transition-colors duration-300 has-[button[aria-expanded=true]]:border-accent max-[820px]:grid-cols-[1fr_auto] max-[820px]:gap-x-3 max-[820px]:gap-y-3 max-[820px]:[grid-template-areas:'num_actions''client_client''price_price''meta_meta']"
              >
                <span className="font-mono text-[13px] text-muted max-[820px]:[grid-area:num]">
                  {quote.number}
                </span>
                <div className="max-[820px]:[grid-area:client]">
                  <div className="font-space text-[15.5px] font-semibold text-foreground">
                    {quote.client.name}
                  </div>
                  <div className="font-hanken text-[13.5px] text-soft">
                    {quote.project}
                  </div>
                </div>
                <span className="font-mono text-[14px] text-foreground whitespace-nowrap max-[820px]:[grid-area:price] max-[820px]:text-[18px]">
                  {formatMoney(total)}
                </span>
                {/* date + status share a row on mobile; `contents` keeps them as
                    direct grid items in the desktop 6-column layout. */}
                <div className="contents max-[820px]:flex max-[820px]:items-center max-[820px]:justify-between max-[820px]:[grid-area:meta]">
                  <span
                    className="inline-flex items-center justify-end gap-1.5 font-mono text-[12px] text-muted whitespace-nowrap"
                    title={`Scade il ${formatDateIt(quote.validUntil)}`}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                      className="opacity-70 shrink-0"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {formatDateIt(quote.validUntil)}
                  </span>
                  <span
                    className={`inline-flex items-center justify-center w-[104px] font-mono text-[11px] tracking-[0.08em] uppercase py-[5px] rounded-full border ${STATUS_STYLE[quote.status]}`}
                  >
                    {STATUS_LABEL[quote.status]}
                  </span>
                </div>
                <QuoteRowActions
                  quoteId={quote.id}
                  status={quote.status}
                  clientName={quote.client.name}
                  sendBlockReason={sendBlockReason}
                  className="max-[820px]:[grid-area:actions] max-[820px]:justify-self-end max-[820px]:self-start"
                />
              </div>
            );
          })}
            </div>
          )}
        </>
      )}
    </Container>
  );
}
