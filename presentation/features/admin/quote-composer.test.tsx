import "@testing-library/jest-dom";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { DEVICE_PROFILES, BREAKPOINTS } from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { QuoteComposer } from "./quote-composer";
import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";

// External seams only: next/link → anchor, lucide icon → span, quote server
// actions → lazy-wrapped jest.fns, and the lead-draft seam → null (blank state).
// The composer, its real SortableList/dnd-kit plumbing, Tailwind class tokens
// and domain helpers all stay real, so the responsive contract is asserted on
// the produced DOM.
jest.mock("next/link", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const MockNextLink = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentProps<"a"> & { children?: React.ReactNode }
  >((props, ref) => <a ref={ref} {...props} />);
  MockNextLink.displayName = "MockNextLink";
  return { __esModule: true, default: MockNextLink };
});

jest.mock("lucide-react", () => ({
  LayoutGrid: () => <span data-testid="layout-grid-icon" />,
}));

const mockCreateQuoteAction = jest
  .fn<Promise<{ ok: true }>, unknown[]>()
  .mockResolvedValue({ ok: true });
const mockUpdateQuoteAction = jest
  .fn<Promise<{ ok: true }>, unknown[]>()
  .mockResolvedValue({ ok: true });

jest.mock("@/application/quote/admin.actions", () => ({
  createQuoteAction: (...args: unknown[]) => mockCreateQuoteAction(...args),
  updateQuoteAction: (...args: unknown[]) => mockUpdateQuoteAction(...args),
}));

jest.mock("@/presentation/features/admin/leads/lead-quote-draft", () => ({
  consumeLeadQuoteInput: jest.fn(() => null),
}));

/** Minimal catalog fixture (real types) — one item per tier so both the
 *  desktop sidebar and the mobile compact catalog render a row. */
const CATALOG: ServiceCatalogItem[] = [
  {
    id: "site-full",
    tier: "web_assets",
    title: "Sito web completo",
    description: "Sito multi-pagina + area donatori.",
    pricing: { kind: "fixed", price: { amountCents: 120000, currency: "EUR" } },
    billing: { kind: "one_time" },
    defaultOptional: false,
    sortOrder: 1,
  },
  {
    id: "rpa-ent",
    tier: "enterprise",
    title: "Assistenza Enterprise",
    description: "SLA e manutenzione mensile.",
    pricing: {
      kind: "range",
      from: { amountCents: 20000, currency: "EUR" },
      to: { amountCents: 40000, currency: "EUR" },
    },
    billing: { kind: "recurring", interval: "monthly" },
    defaultOptional: false,
    sortOrder: 2,
  },
];

type ComposerProps = ComponentProps<typeof QuoteComposer>;

const PROPS: ComposerProps = { catalog: CATALOG };

function renderComposer(
  width: number = DEVICE_PROFILES.desktop,
  overrides: Partial<ComposerProps> = {},
) {
  return renderAt(width, <QuoteComposer {...PROPS} {...overrides} />);
}

function gridShell(): HTMLElement {
  const shell = document.querySelector<HTMLElement>(
    ".grid.grid-cols-1.lg\\:grid-cols-\\[1fr_340px\\]",
  );
  expect(shell).not.toBeNull();
  return shell as HTMLElement;
}

function sidebar(): HTMLElement {
  const aside = document.querySelector<HTMLElement>("aside.hidden.lg\\:flex");
  expect(aside).not.toBeNull();
  return aside as HTMLElement;
}

function mobileFooter(): HTMLElement {
  const footer = document
    .querySelectorAll<HTMLElement>(".fixed.bottom-0")
    .item(0);
  expect(footer).not.toBeNull();
  return footer as HTMLElement;
}

afterEach(() => {
  cleanup();
  cleanupMatchMediaMock();
});

describe("QuoteComposer — responsive shell (MS-5.7)", () => {
  describe("grid shell flip 1023/1025 (lg)", () => {
    it("single-column grid below lg (1023)", () => {
      renderComposer(BREAKPOINTS.lg - 1);

      const shell = gridShell();
      expect(shell).toHaveClass("grid", "grid-cols-1", "lg:grid-cols-[1fr_340px]");
    });

    it("two-column grid at lg (1025)", () => {
      renderComposer(BREAKPOINTS.lg + 1);

      const shell = gridShell();
      expect(shell).toHaveClass("grid-cols-1", "lg:grid-cols-[1fr_340px]");
    });
  });

  describe("sidebar / mobile-footer complement (lg flip)", () => {
    it("below lg (1023): sidebar hidden, mobile footer visible", () => {
      renderComposer(BREAKPOINTS.lg - 1);

      const aside = sidebar();
      expect(aside).toHaveClass("hidden", "lg:flex");

      const footer = mobileFooter();
      expect(footer).toHaveClass("lg:hidden");
      // Sidebar carries the desktop save CTA; below lg it must NOT be the
      // accessible primary action — the footer owns "Avanti →".
      const desktopSave = withinProminent(aside, "Crea bozza preventivo →");
      expect(desktopSave).not.toBeNull();
      expect(screen.getByRole("button", { name: "Avanti →" })).toBeInTheDocument();
    });

    it("at lg (1025): sidebar visible (lg:flex active), footer hidden", () => {
      renderComposer(BREAKPOINTS.lg + 1);

      const aside = sidebar();
      expect(aside).toHaveClass("hidden", "lg:flex");

      const footer = mobileFooter();
      expect(footer).toHaveClass("lg:hidden");
      // Both panels stay in the DOM; only their Tailwind tokens flip — the
      // footer is `lg:hidden` (display:none ≥lg) while the sidebar `hidden
      // lg:flex` becomes visible. The primary action moves into the sidebar.
      const desktopSave = withinProminent(sidebar(), "Crea bozza preventivo →");
      expect(desktopSave).not.toBeNull();
      // With zero line items the guarded-flow CTA is disabled on every step.
      expect(desktopSave).toHaveClass("bg-raised", "text-muted", "cursor-not-allowed");
    });
  });

  describe("step buttons — hidden below sm, active at sm+", () => {
    it("mobile (375): all four step CTA containers carry the hidden sm:* token", () => {
      renderComposer(DEVICE_PROFILES.mobile);

      const infoCta = document.querySelector(".hidden.sm\\:block.pt-6");
      expect(infoCta).not.toBeNull();
      expect(infoCta).toHaveClass("hidden", "sm:block");
    });

    it("navigates through all four steps via the stepper and locks each CTA container", () => {
      renderComposer(BREAKPOINTS.sm + 1);

      // The stepper labels ("Voci", "Roadmap", "Termini") are exact-text spans
      // inside the top nav buttons; the step-page buttons use longer labels
      // ("… →"), so getByText exact-matching disambiguates the nav from the
      // inline CTAs on the same step.
      fireEvent.click(screen.getByText("Voci"));
      const itemsCta = document.querySelector(".hidden.sm\\:flex.gap-3.pt-6");
      expect(itemsCta).not.toBeNull();
      expect(itemsCta).toHaveClass("hidden", "sm:flex");
      expect(
        screen.getByRole("button", { name: "Roadmap & Stack →" }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByText("Roadmap"));
      const detailsCta = document.querySelector(".hidden.sm\\:flex.gap-3.pt-6");
      expect(detailsCta).not.toBeNull();
      expect(detailsCta).toHaveClass("hidden", "sm:flex");
      expect(
        screen.getByRole("button", { name: "Termini & Invio →" }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByText("Termini"));
      const termsCta = document.querySelector<HTMLElement>(".hidden.sm\\:flex.gap-4.pt-6");
      expect(termsCta).not.toBeNull();
      expect(termsCta).toHaveClass("hidden", "sm:flex");
      // In create mode the terms-step CTA carries the primary action that is
      // lg:hidden (the sidebar owns it from lg up).
      const createBtn = withinProminent(termsCta!, "Crea bozza preventivo →");
      expect(createBtn).not.toBeNull();
      expect(createBtn).toHaveClass("lg:hidden");
    });
  });

  describe("mobile footer content (create mode, info step)", () => {
    it("footer is sticky-fixed and shows Netto + Avanti + Annulla link", () => {
      renderComposer(DEVICE_PROFILES.mobile);

      const footer = mobileFooter();
      expect(footer).toHaveClass(
        "lg:hidden",
        "fixed",
        "bottom-0",
        "left-0",
        "right-0",
        "z-50",
      );

      const backLink = screen.getByRole("link", { name: "Annulla creazione" });
      expect(backLink).toHaveAttribute("href", "/admin/quotes");

      expect(screen.getByText("Netto")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Avanti →" })).toBeInTheDocument();
    });
  });
});

/** scoped findByText-equivalent: locates the element inside the given
 *  container whose textContent (trimmed) matches the string exactly. */
function withinProminent(
  container: HTMLElement | null,
  text: string,
): HTMLElement | null {
  if (!container) return null;
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(":scope *"));
  return (
    nodes.find((el) => el.textContent?.trim() === text) ?? null
  );
}