import {
  assertTransition,
  canTransition,
  InvalidQuoteTransitionError,
} from "@/domain/quote/quote.status";
import type { QuoteStatus } from "@/domain/quote/quote.types";

describe("Quote status state machine", () => {
  it("allows the happy path: draft → sent → accepted", () => {
    expect(canTransition("draft", "sent")).toBe(true);
    expect(canTransition("sent", "accepted")).toBe(true);
  });

  it("allows sent → rejected and sent → expired", () => {
    expect(canTransition("sent", "rejected")).toBe(true);
    expect(canTransition("sent", "expired")).toBe(true);
  });

  it("forbids skipping the sent state", () => {
    expect(canTransition("draft", "accepted")).toBe(false);
  });

  it("treats accepted, rejected and expired as terminal", () => {
    const terminals: QuoteStatus[] = ["accepted", "rejected", "expired"];
    const all: QuoteStatus[] = [
      "draft",
      "sent",
      "accepted",
      "rejected",
      "expired",
    ];
    for (const from of terminals) {
      for (const to of all) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });

  it("assertTransition throws a typed error with context", () => {
    expect.assertions(3);
    try {
      assertTransition("accepted", "draft");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidQuoteTransitionError);
      const err = e as InvalidQuoteTransitionError;
      expect(err.from).toBe("accepted");
      expect(err.to).toBe("draft");
    }
  });
});
