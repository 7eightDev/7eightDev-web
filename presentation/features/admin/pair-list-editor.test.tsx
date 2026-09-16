import "@testing-library/jest-dom";
import { cleanup, screen } from "@testing-library/react";
import { DEVICE_PROFILES, BREAKPOINTS } from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { PairListEditor, makePair } from "./pair-list-editor";
import type { Pair } from "./pair-list-editor";

const PAIRS: Pair[] = [makePair("Nicchia", "Dentisti"), makePair("Zona", "Milano")];

afterEach(() => {
  cleanup();
  cleanupMatchMediaMock();
});

function rowContainer(): HTMLElement {
  const row = document.querySelector(
    ".flex-1.min-w-0.flex.flex-col.gap-2",
  );
  expect(row).not.toBeNull();
  return row as HTMLElement;
}

const PROPS = {
  label: "Fasi",
  aPlaceholder: "Fase",
  bPlaceholder: "Settimana",
};

describe("PairListEditor — responsive flip (MS-5.7)", () => {
  describe("default (bMultiline=false) — css row-flip token", () => {
    it("below sm (375) the inner container carries the stacked->row contract", () => {
      renderAt(
        DEVICE_PROFILES.mobile,
        <PairListEditor {...PROPS} value={PAIRS} onChange={jest.fn()} />,
      );

      const row = rowContainer();
      // The flip between stacked (base) and row (sm+) is pure CSS at ≥640:
      // jsdom has no cascade, so the test locks the token contract on the node
      // (base flex-col + the sm: row overrides). Layout is verified by E2E.
      expect(row).toHaveClass("flex", "flex-col", "gap-2");
      expect(row).toHaveClass("sm:flex-row", "sm:items-center", "sm:gap-3");
    });

    it("at sm (641) the same token contract is present", () => {
      renderAt(
        BREAKPOINTS.sm + 1,
        <PairListEditor {...PROPS} value={PAIRS} onChange={jest.fn()} />,
      );

      const row = rowContainer();
      expect(row).toHaveClass("flex-col", "sm:flex-row", "sm:items-center");
    });

    it("input pair locks the sm width contract (a flex-1, b fixed 150px)", () => {
      renderAt(BREAKPOINTS.sm + 1, <PairListEditor {...PROPS} value={PAIRS} onChange={jest.fn()} />);

      const aInputs = screen.getAllByPlaceholderText("Fase");
      expect(aInputs[0]).toHaveClass("sm:flex-1", "sm:min-w-0");

      const bInputs = screen.getAllByPlaceholderText("Settimana");
      expect(bInputs[0]).toHaveClass("sm:w-[150px]", "sm:shrink-0");
    });
  });

  describe("bMultiline=true — no row flip, always stacked", () => {
    it("the inner container is genuinely missing the sm: row tokens", () => {
      renderAt(
        DEVICE_PROFILES.mobile,
        <PairListEditor
          {...PROPS}
          value={PAIRS}
          onChange={jest.fn()}
          bMultiline
        />,
      );

      // Unlike the default case, bMultiline strips the sm:* row overrides from
      // the class string itself — a real DOM difference, asserted across the
      // viewport range below.
      const row = rowContainer();
      expect(row).toHaveClass("flex", "flex-col", "gap-2");
      expect(row).not.toHaveClass(
        "sm:flex-row",
        "sm:items-center",
        "sm:gap-3",
      );
    });

    it("stays stacked even at sm (641) and renders a textarea for b", () => {
      renderAt(
        BREAKPOINTS.sm + 1,
        <PairListEditor
          {...PROPS}
          value={PAIRS}
          onChange={jest.fn()}
          bMultiline
        />,
      );

      const row = rowContainer();
      expect(row).not.toHaveClass("sm:flex-row");

      const textareas = screen.getAllByPlaceholderText("Settimana");
      expect(textareas.length).toBe(PAIRS.length);
      expect(textareas[0].tagName).toBe("TEXTAREA");
      expect(textareas[0]).toHaveClass("resize-y");
    });
  });

  describe("remove button responsive contract", () => {
    it("carries self-stretch mobile + sm:self-center sm:border-transparent", () => {
      renderAt(
        DEVICE_PROFILES.mobile,
        <PairListEditor {...PROPS} value={PAIRS} onChange={jest.fn()} />,
      );

      const removeButtons = screen.getAllByRole("button", {
        name: "Rimuovi riga",
      });
      expect(removeButtons.length).toBe(PAIRS.length);

      const btn = removeButtons[0];
      expect(btn).toHaveClass(
        "self-stretch",
        "sm:self-center",
        "sm:px-2",
        "sm:py-2.5",
        "sm:border-transparent",
      );
    });
  });
});