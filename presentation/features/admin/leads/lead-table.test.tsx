import "@testing-library/jest-dom";
import { cleanup, screen, within } from "@testing-library/react";
import type { Lead } from "@/domain/lead/lead.types";
import {
  BREAKPOINTS,
  DEVICE_PROFILES,
} from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { LeadTable, type LeadTableRow } from "./lead-table";

// External seams only — the table, card grid, badges and icon chips stay real
// so the responsive contract is asserted on the actual DOM produced by
// LeadTable. jsdom has no layout engine (no CSS cascade, no computed display),
// so visibility is expressed through the Tailwind class contract, exactly like
// MS-2.2: `hidden` = display:none, `max-[820px]:hidden` = hide below 820,
// `hidden max-[820px]:grid` = grid below 820, plain node otherwise.
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("sort=score-asc"),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock("next/link", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const MockNextLink = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentProps<"a"> & { children?: React.ReactNode }
  >((props, ref) => <a ref={ref} {...props} />);
  MockNextLink.displayName = "MockNextLink";
  return { __esModule: true, default: MockNextLink };
});

jest.mock("@/application/lead/admin.actions", () => ({
  deleteLeadAction: jest.fn(),
  createQuoteFromLeadAction: jest.fn(),
  toggleLeadFavoriteAction: jest.fn(),
}));

jest.mock("@/presentation/features/admin/leads/lead-quote-draft", () => ({
  storeLeadQuoteInput: jest.fn(),
}));

// Row click opens LeadDetailDialog, which fires async server actions and
// manages its own data fetching — out of scope for MS-2.3 (desktop vs card DOM).
jest.mock("./lead-detail-dialog", () => ({
  LeadDetailDialog: () => null,
}));

const LEAD: Lead = {
  id: "lead-1",
  companyName: "Acme S.r.l.",
  website: "https://acme.example.com",
  city: "Milano",
  source: "google_maps",
  status: "qualified",
  outreachStatus: "in_talks",
  techStack: ["WordPress", "jQuery", "React"],
  copyright: "© 2020 Acme",
  adsTrackers: ["Google Ads"],
  favorite: true,
  createdAt: "2026-01-10T00:00:00.000Z",
  updatedAt: "2026-01-10T00:00:00.000Z",
};

const ROWS: LeadTableRow[] = [{ lead: LEAD, score: 42 }];

/** Desktop table column widths, in DOM order (col 1 → 9). */
const HEADER_WIDTHS = [
  "w-[25%]",
  "w-[8%]",
  "w-[20%]",
  "w-[7%]",
  "w-[8%]",
  "w-[7%]",
  "w-[9%]",
  "w-[9%]",
  "w-[7%]",
] as const;

/** The mobile card grid `<div>` (`hidden max-[820px]:grid`). */
function getCardGrid(container: HTMLElement): HTMLElement {
  const grid = container.querySelector<HTMLElement>(
    '[class*="max-[820px]:grid"]'
  );
  if (!grid) throw new Error("lead card grid not found in rendered DOM");
  return grid;
}



// Radix prints its advisory "Missing `Description`/`Title`" for content-based
// surfaces; it is a dev-only console.warn, not a failure. Tooltips in
// TechStackCell/LeadAdsBadge are closed on mount (no portal, no content), so
// this guard keeps the suite output clean if any advisory does fire.
const originalConsoleWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Missing `Description`") ||
        args[0].includes("Missing `Title`"))
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };
});
afterAll(() => {
  console.warn = originalConsoleWarn;
});

afterEach(() => {
  cleanup();
  cleanupMatchMediaMock();
});

describe("LeadTable — desktop table vs mobile card grid (MS-2.3)", () => {
  describe("desktop ≥ 820", () => {
    it("renders a 9-column table with sticky header and the fixed width percentages", () => {
      const { container } = renderAt(DEVICE_PROFILES.desktop, (
        <LeadTable rows={ROWS} />
      ));

      const table = screen.getByRole("table");
      expect(table).toHaveClass("max-[820px]:hidden");
      expect(table).not.toHaveClass("hidden");

      const headerCells = screen.getAllByRole("columnheader");
      expect(headerCells).toHaveLength(9);
      headerCells.forEach((th, i) => {
        expect(th).toHaveClass(HEADER_WIDTHS[i]);
      });
      // R6: the sticky column header token (STICKY_HEAD_CLASS) sits on the th.
      expect(headerCells[0]).toHaveClass("sticky", "top-0", "z-30");

      // The card grid is in the DOM but hidden by the unconditional `hidden`.
      const cardGrid = getCardGrid(container);
      expect(cardGrid).toHaveClass("hidden", "max-[820px]:grid");
    });

    it("shows the text badge pills in the table, not the icon chips", () => {
      const { container } = renderAt(DEVICE_PROFILES.desktop, (
        <LeadTable rows={ROWS} />
      ));

      const table = screen.getByRole("table");
      expect(within(table).getByText("qualificato")).toBeInTheDocument();
      expect(within(table).getByText("In trattativa")).toBeInTheDocument();
      expect(within(table).getByText("42")).toBeInTheDocument();

      // The icon-only chips live in the card grid only.
      expect(within(table).queryByTitle("qualificato")).not.toBeInTheDocument();
      const cardGrid = getCardGrid(container);
      expect(cardGrid).toHaveClass("hidden");
    });
  });

  describe("mobile < 820 — stacked card grid", () => {
    it("R1: at 819 (below the flip) the table is replaced by the card grid", () => {
      const { container } = renderAt(
        BREAKPOINTS.cardStack - 1,
        <LeadTable rows={ROWS} />,
      );

      expect(screen.getByRole("table")).toHaveClass("max-[820px]:hidden");

      const cardGrid = getCardGrid(container);
      expect(cardGrid).toHaveClass("max-[820px]:grid");
      expect(
        cardGrid.querySelector('[class*="grid-cols-[1fr_auto]"]'),
      ).not.toBeNull();
    });

    it("R1: at 821 (above the flip) the table is back and the card grid hides", () => {
      const { container } = renderAt(
        BREAKPOINTS.cardStack + 1,
        <LeadTable rows={ROWS} />,
      );

      const table = screen.getByRole("table");
      expect(table).toHaveClass("max-[820px]:hidden");
      expect(table).not.toHaveClass("hidden");

      const cardGrid = getCardGrid(container);
      expect(cardGrid).toHaveClass("hidden", "max-[820px]:grid");
    });

    it("R2: tablet 768 shows the card grid, not the table (768 < 820)", () => {
      const { container } = renderAt(DEVICE_PROFILES.tablet, (
        <LeadTable rows={ROWS} />
      ));

      expect(screen.getByRole("table")).toHaveClass("max-[820px]:hidden");

      const cardGrid = getCardGrid(container);
      expect(cardGrid).toHaveClass("max-[820px]:grid");
      expect(
        cardGrid.querySelector('[class*="grid-cols-[1fr_auto]"]'),
      ).not.toBeNull();
    });

    it("R6: no sticky header in card view — the card grid has no table semantics", () => {
      const { container } = renderAt(
        BREAKPOINTS.cardStack - 1,
        <LeadTable rows={ROWS} />,
      );

      const tableHead = container.querySelector("th");
      expect(tableHead).toHaveClass("sticky", "top-0", "z-30");

      const cardGrid = getCardGrid(container);
      expect(
        within(cardGrid).queryByRole("columnheader"),
      ).not.toBeInTheDocument();
      expect(
        within(cardGrid).queryByRole("table"),
      ).not.toBeInTheDocument();
    });
  });

  describe("badge → icon degradation (same state semantics, compact chips)", () => {
    it("renders StatusIcon + Score + OutreachStatusIcon in the mobile card row 2 (no text pills)", () => {
      const { container } = renderAt(
        BREAKPOINTS.cardStack - 1,
        <LeadTable rows={ROWS} />,
      );
      const cardGrid = getCardGrid(container);

      // Row 2 of the card = StatusIcon + LeadScoreBadge + OutreachStatusIcon.
      expect(within(cardGrid).getByTitle("qualificato")).toBeInTheDocument();
      expect(within(cardGrid).getByTitle("In trattativa")).toBeInTheDocument();
      expect(within(cardGrid).getByText("42")).toBeInTheDocument();

      // The verbose badge pills are table-only; the card uses icon-only chips.
      expect(
        within(cardGrid).queryByText("qualificato"),
      ).not.toBeInTheDocument();
      expect(
        within(cardGrid).queryByText("In trattativa"),
      ).not.toBeInTheDocument();
    });
  });

  describe("emptyRow in both states", () => {
    it("renders the empty row with colSpan=9 p-0 inside the desktop table", () => {
      renderAt(DEVICE_PROFILES.desktop, (
        <LeadTable
          rows={[]}
          emptyRow={
            <p data-testid="empty-state">Nessun lead trovato</p>
          }
        />
      ));

      const table = screen.getByRole("table");
      expect(within(table).getByText("Nessun lead trovato")).toBeInTheDocument();

      const cell = table.querySelector("td[colspan='9']");
      expect(cell).not.toBeNull();
      if (!cell) return;
      expect(cell).toHaveClass("p-0");
      expect(cell).toContainElement(within(table).getByTestId("empty-state"));
    });

    it("renders the empty row with p-10 inside the mobile card grid", () => {
      const { container } = renderAt(BREAKPOINTS.cardStack - 1, (
        <LeadTable
          rows={[]}
          emptyRow={
            <p data-testid="empty-state">Nessun lead trovato</p>
          }
        />
      ));

      const cardGrid = getCardGrid(container);
      const emptyWrap = cardGrid.querySelector('[class*="p-10"]');
      expect(emptyWrap).not.toBeNull();
      if (!emptyWrap) return;
      expect(within(cardGrid).getByText("Nessun lead trovato")).toBeInTheDocument();
      expect(emptyWrap).toContainElement(within(cardGrid).getByTestId("empty-state"));
    });
  });
});