import "@testing-library/jest-dom";
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { DEVICE_PROFILES } from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { expectSheetWidth } from "@/presentation/__mocks__/expect-sheet-width";
import { LeadJobDrawer } from "./lead-job-drawer";
import type { ToolbarJob } from "./lead-filter-bar";

// External seams only — the Sheet (Radix Dialog), LeadJobStatus and its
// favourite/delete/rerun buttons stay real so the drawer DOM, sorting and
// actions are exercised. The three server actions are the only things mocked.
jest.mock("next/link", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const MockNextLink = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentProps<"a"> & { children?: React.ReactNode }
  >((props, ref) => <a ref={ref} {...props} />);
  MockNextLink.displayName = "MockNextLink";
  return { __esModule: true, default: MockNextLink };
});

const mockToggleJobFavoriteAction = jest
  .fn<Promise<{ ok: true }>, unknown[]>()
  .mockResolvedValue({ ok: true });
const mockDeleteJobAction = jest
  .fn<Promise<{ ok: true }>, unknown[]>()
  .mockResolvedValue({ ok: true });
const mockRerunLeadGenerationAction = jest
  .fn<Promise<{ ok: true }>, unknown[]>()
  .mockResolvedValue({ ok: true });

// Lazy wrappers: the factory runs on the hoisted module load, before the
// consts above are initialised, so the mocks must be referenced inside a
// function body (deferred up to call time), never eagerly.
jest.mock("@/application/lead/admin.actions", () => ({
  toggleJobFavoriteAction: (...args: unknown[]) =>
    mockToggleJobFavoriteAction(...args),
  deleteJobAction: (...args: unknown[]) => mockDeleteJobAction(...args),
  rerunLeadGenerationAction: (...args: unknown[]) =>
    mockRerunLeadGenerationAction(...args),
}));

/** Job fixtures (ToolbarJob, exported by lead-filter-bar) consumed by the real
 *  LeadJobDrawer: a completed favourite (with tech/copyright, no error), a
 *  running job without favourite, and a failed job carrying an error. */
const JOB_PORTFOLIO: ToolbarJob & { techStack: string; copyright: string } = {
  id: "job-2",
  query: "Website Portfolio",
  location: "Milano",
  status: "completed",
  totalFound: 123,
  analyzed: 98,
  qualified: 45,
  favorite: true,
  techStack: "react",
  copyright: "© 2025",
  createdAt: "2026-08-12T09:00:00.000Z",
};

const JOB_RUNNING: ToolbarJob = {
  id: "job-3",
  query: "Studio Dentistici",
  location: "Torino",
  status: "running",
  totalFound: 54,
  analyzed: 12,
  qualified: 3,
  favorite: false,
  createdAt: "2026-08-13T09:00:00.000Z",
};

const JOB_FAILED: ToolbarJob = {
  id: "job-1",
  query: "Parrucchieri Milano",
  location: "Milano",
  status: "failed",
  totalFound: 0,
  analyzed: 0,
  qualified: 0,
  favorite: false,
  error: "Limite API Google superato: riprova domani.",
  createdAt: "2026-08-11T09:00:00.000Z",
};

const JOBS: ToolbarJob[] = [JOB_PORTFOLIO, JOB_RUNNING, JOB_FAILED];

interface DrawerOptions {
  jobs?: ToolbarJob[];
  activeJobId?: string;
  onOpenChange?: (open: boolean) => void;
}

/** Mount the drawer already open (controlled) at the given viewport width. */
function renderDrawer(width: number, options: DrawerOptions = {}) {
  const { jobs = JOBS, activeJobId, onOpenChange = jest.fn() } = options;
  return renderAt(
    width,
    <LeadJobDrawer
      open
      jobs={jobs}
      activeJobId={activeJobId}
      onOpenChange={onOpenChange}
    />,
  );
}

/** The job card root for a query: the closest shrink-0 ancestor of its Link. */
function cardByQuery(query: string): HTMLElement {
  const link = screen.getByRole("link", { name: new RegExp(query) });
  const card = link.closest<HTMLElement>("[class*='shrink-0']");
  if (!card) throw new Error(`job card not found for query "${query}"`);
  return card;
}

// The drawer uses only a SheetTitle and no SheetDescription, so Radix prints
// its well-known dev-only advisory ("Missing `Description`"). Swallow just that
// console.warn (never act warnings) to keep the suite output clean.
const originalConsoleWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Missing `Description`")
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };
});
afterAll(() => {
  console.warn = originalConsoleWarn;
});

beforeEach(() => {
  mockToggleJobFavoriteAction.mockClear();
  mockDeleteJobAction.mockClear();
  mockRerunLeadGenerationAction.mockClear();
});

afterEach(() => {
  cleanup();
  cleanupMatchMediaMock();
});

describe("LeadJobDrawer — left slide-over with recent searches (MS-2.5)", () => {
  describe("Sheet structure & content", () => {
    it("renders an accessible 'Ricerche' dialog anchored left with the drawer width tokens", () => {
      renderDrawer(DEVICE_PROFILES.mobile);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAccessibleName("Ricerche");
      expect(
        within(dialog).getByText(/Ogni ricerca è una sessione di scraping/),
      ).toBeInTheDocument();

      expect(dialog).toHaveClass("inset-y-0", "left-0", "h-full");
      expect(dialog).toHaveClass("w-[340px]", "max-w-[85vw]");
      // tw-merge drops the primitive defaults in favour of the drawer tokens.
      expect(dialog).not.toHaveClass("w-3/4");
      expect(dialog).not.toHaveClass("max-w-md");

      const newSearch = screen.getByRole("link", { name: "+ Nuova ricerca" });
      expect(newSearch).toHaveAttribute("href", "/admin/leads/new");
    });
  });

  describe("aria-current selection", () => {
    it("marks 'Tutte' aria-current=page when no job is active", () => {
      renderDrawer(DEVICE_PROFILES.mobile);
      expect(
        screen.getByRole("link", { name: /Tutte/ }),
      ).toHaveAttribute("aria-current", "page");
    });

    it("moves aria-current=page to the active job card when one is selected", () => {
      renderDrawer(DEVICE_PROFILES.mobile, { activeJobId: "job-3" });

      expect(screen.getByRole("link", { name: /Tutte/ })).not.toHaveAttribute(
        "aria-current",
      );
      expect(
        screen.getByRole("link", { name: /Studio Dentistici/ }),
      ).toHaveAttribute("aria-current", "page");
    });
  });

  describe("sorting", () => {
    it("lists favourites first, then jobs by id descending", () => {
      renderDrawer(DEVICE_PROFILES.mobile);

      const dialog = screen.getByRole("dialog");
      const jobLinks = within(dialog)
        .getAllByRole("link")
        .filter((el) => el.getAttribute("href")?.startsWith("/admin/leads?job="));

      expect(jobLinks.map((el) => el.getAttribute("href"))).toEqual([
        "/admin/leads?job=job-2", // favourite first
        "/admin/leads?job=job-3", // then id desc
        "/admin/leads?job=job-1",
      ]);
    });
  });

  describe("job card content", () => {
    it("renders status pills, stats with tooltips, tech/© chips and the error alert", () => {
      renderDrawer(DEVICE_PROFILES.mobile);

      const portfolioCard = cardByQuery("Website Portfolio");
      expect(within(portfolioCard).getByText("completato")).toBeInTheDocument();
      expect(
        within(portfolioCard).getByTitle("Lead trovati"),
      ).toBeInTheDocument();
      expect(within(portfolioCard).getByText("123")).toBeInTheDocument();
      expect(
        within(portfolioCard).getByTitle("Lead analizzati"),
      ).toBeInTheDocument();
      expect(within(portfolioCard).getByText("98")).toBeInTheDocument();
      expect(
        within(portfolioCard).getByTitle("Lead qualificati"),
      ).toBeInTheDocument();
      expect(within(portfolioCard).getByText("45")).toBeInTheDocument();
      expect(within(portfolioCard).getByText("tech: react")).toBeInTheDocument();
      expect(within(portfolioCard).getByText("©: © 2025")).toBeInTheDocument();
      expect(
        within(portfolioCard).queryByRole("alert"),
      ).not.toBeInTheDocument();

      expect(
        within(cardByQuery("Studio Dentistici")).getByText("in corso"),
      ).toBeInTheDocument();

      const failedCard = cardByQuery("Parrucchieri Milano");
      expect(within(failedCard).getByText("fallito")).toBeInTheDocument();
      expect(within(failedCard).getByRole("alert")).toHaveTextContent(
        "Limite API Google superato: riprova domani.",
      );
    });
  });

  describe("R3 width over viewports", () => {
    it("caps the drawer at 85vw on narrow viewports (min(340px, 85vw))", () => {
      const narrow = (width: number, expected: number) => {
        const { unmount } = renderDrawer(width);
        const dialog = screen.getByRole("dialog");
        expectSheetWidth(dialog, width);
        expect(dialog.getBoundingClientRect().width).toBeCloseTo(expected, 5);
        unmount();
      };
      narrow(DEVICE_PROFILES.mobile, 0.85 * DEVICE_PROFILES.mobile); // 318.75
      narrow(320, 0.85 * 320); // 272
    });

    it("holds the fixed 340px width on desktop (85vw = 1088 exceeds it)", () => {
      const { unmount } = renderDrawer(DEVICE_PROFILES.desktop);
      const dialog = screen.getByRole("dialog");
      expectSheetWidth(dialog, DEVICE_PROFILES.desktop);
      expect(dialog.getBoundingClientRect().width).toBe(340);
      unmount();
    });
  });

  describe("overflow DOM contract", () => {
    it("scrolls the job list without lateral width tokens: min-h-0 flex-1 overflow-y-auto", () => {
      renderDrawer(DEVICE_PROFILES.mobile);

      const list = document.querySelector<HTMLElement>(
        '[class*="overflow-y-auto"]',
      );
      expect(list).not.toBeNull();
      expect(list).toHaveClass("flex", "flex-col", "min-h-0", "flex-1", "overflow-y-auto");
      // The list itself carries no lateral width token — the 340/85vw contract
      // lives only on the SheetContent, never on the scrolling internals.
      expect(list!.querySelectorAll('[class*="w-["]')).toHaveLength(0);

      const portfolioLink = screen.getByRole("link", { name: /Website Portfolio/ });
      expect(within(portfolioLink).getByText("Website Portfolio")).toHaveClass(
        "truncate",
      );
      expect(within(portfolioLink).getByText("Milano")).toHaveClass("truncate");
    });
  });

  describe("job actions", () => {
    it("wires favourite/delete/rerun with the right labels and calls the server action", async () => {
      renderDrawer(DEVICE_PROFILES.mobile);

      const favourite = screen.getByRole("button", {
        name: "Rimuovi dai preferiti",
      });
      // Both the failed and the running jobs are unpinned → label repeated.
      expect(
        within(cardByQuery("Studio Dentistici")).getByRole("button", {
          name: "Aggiungi ai preferiti",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", {
          name: 'Elimina la ricerca «Website Portfolio»',
        }),
      ).toBeInTheDocument();

      // Rerun: only on completed/failed cards, never on a running one.
      expect(
        within(cardByQuery("Website Portfolio")).getByRole("button", {
          name: "↻ Ripeti ricerca",
        }),
      ).toBeInTheDocument();
      expect(
        within(cardByQuery("Parrucchieri Milano")).getByRole("button", {
          name: "↻ Ripeti ricerca",
        }),
      ).toBeInTheDocument();
      expect(
        within(cardByQuery("Studio Dentistici")).queryByRole("button", {
          name: "↻ Ripeti ricerca",
        }),
      ).not.toBeInTheDocument();

      fireEvent.click(favourite);
      await waitFor(() =>
        expect(mockToggleJobFavoriteAction).toHaveBeenCalledWith("job-2"),
      );
    });

    it("closes the drawer when a job card body is clicked", () => {
      const onOpenChange = jest.fn();
      renderDrawer(DEVICE_PROFILES.mobile, { onOpenChange });

      fireEvent.click(screen.getByRole("link", { name: /Website Portfolio/ }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});