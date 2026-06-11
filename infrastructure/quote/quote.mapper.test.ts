import { quoteToRow, rowToQuote } from "@/infrastructure/quote/quote.mapper";
import { AVIS_QUOTE } from "@/infrastructure/quote/quote.seed";

describe("Quote mapper", () => {
  it("round-trips a quote without losing information", () => {
    const row = quoteToRow(AVIS_QUOTE);
    const back = rowToQuote(row);
    expect(back).toEqual(AVIS_QUOTE);
  });

  it("serializes dates as Date objects in the row", () => {
    const row = quoteToRow(AVIS_QUOTE);
    expect(row.issuedAt).toBeInstanceOf(Date);
    expect(row.issuedAt.toISOString()).toBe(AVIS_QUOTE.issuedAt);
  });

  it("maps a missing acceptance to null and back to undefined", () => {
    const row = quoteToRow(AVIS_QUOTE);
    expect(row.acceptance).toBeNull();
    expect(rowToQuote(row).acceptance).toBeUndefined();
  });

  it("defaults metadata to an empty object when null in the row", () => {
    const row = { ...quoteToRow(AVIS_QUOTE), metadata: null };
    expect(rowToQuote(row).metadata).toEqual({});
  });
});
