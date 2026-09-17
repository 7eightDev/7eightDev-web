import "@testing-library/jest-dom";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { DEVICE_PROFILES } from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { expectSheetWidth } from "@/presentation/__mocks__/expect-sheet-width";
import {
  LeadFilterBar,
  type ToolbarJob,
} from "./lead-filter-bar";

// External seams only — the toolbar, its buttons, the collapsible panel, the
// Radix Sheet/Button/Tooltip/AlertDialog and LeadJobDrawer/LeadJobStatus all
// stay real, so the responsive contract is asserted on the produced DOM.
const mockPush = jest.fn();
let mockSearchParams: URLSearchParams;

beforeEach(() => {
  mockPush.mockClear();
  mockSearchParams = new URLSearchParams();
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
  usePathname: () => "/admin/leads",
  useSearchParams: () => mockSearchParams,
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

// Thin framer-motion seam: the advanced panel's height animation is motion
// plumbing, not part of the responsive contract. AnimatePresence renders its
// children as-is, motion.div becomes a plain div, and reduced-motion is off so
// no act-warning path fires when the panel opens/closes.
jest.mock("framer-motion", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const MockMotionDiv = ({ className, children }: { className?: string; children?: React.ReactNode }) =>
    React.createElement("div", { className }, children);
  MockMotionDiv.displayName = "MockMotionDiv";
  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: { div: MockMotionDiv },
    useReducedMotion: jest.fn(() => false),
  };
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

type LeadFilterBarProps = ComponentProps<typeof LeadFilterBar>;

const BASE_PROPS: LeadFilterBarProps = {
  status: "all",
  outreach: "all",
  favorite: "all",
  score: "all",
  source: "all",
  ads: "all",
  q: "",
  jobs: JOBS,
  activeJobId: undefined,
  techStack: [],
  copyrightFrom: undefined,
  copyrightTo: undefined,
  availableTechStacks: ["React", "WordPress"],
  availableYears: [2018, 2019, 2020],
  totalResults: 320,
};

function renderBar(
  width: number = DEVICE_PROFILES.desktop,
  overrides: Partial<LeadFilterBarProps> = {},
) {
  return renderAt(width, <LeadFilterBar {...BASE_PROPS} {...overrides} />);
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

afterEach(() => {
  cleanup();
  cleanupMatchMediaMock();
});

describe("LeadFilterBar — two-tier sticky toolbar, URL-driven state (MS-2.5)", () => {
  describe("desktop 1280 — action header", () => {
    it("renders the toolbar with h1, job selector, favourites, CSV export and new-search CTA", () => {
      mockSearchParams = new URLSearchParams("?job=job-2&status=qualified");
      renderBar(DEVICE_PROFILES.desktop, {
        status: "qualified",
        activeJobId: "job-2",
      });

      const toolbar = screen.getByRole("toolbar", { name: "Filtri lead" });
      expect(toolbar).not.toHaveAttribute("data-pending");

      const heading = screen.getByRole("heading", { level: 1, name: "Lead" });
      expect(heading).toHaveClass("text-2xl", "sm:text-3xl");

      // Job selector: title mirrors the active query (+ location), counts the
      // active job's persisted found count, and opens the drawer dialog.
      const selector = screen.getByRole("button", { name: /Website Portfolio/ });
      expect(selector).toHaveAttribute("aria-haspopup", "dialog");
      expect(selector).toHaveAttribute("aria-expanded", "false");
      expect(selector).toHaveAttribute("title", "Website Portfolio (Milano)");
      expect(selector).toHaveClass("max-w-[200px]", "sm:max-w-[300px]");
      expect(within(selector).getByText("(123)")).toBeInTheDocument();

      // Favourites toggle: label visible from sm up (hidden sm:inline).
      const favourite = screen.getByRole("button", { name: "Preferiti" });
      expect(favourite).toHaveAttribute("aria-pressed", "false");
      expect(within(favourite).getByText("Preferiti")).toHaveClass(
        "hidden",
        "sm:inline",
      );

      // CSV export mirrors the URL context (job + active filters).
      const exportLinks = screen.getAllByRole("link", { name: "Esporta CSV" });
      const desktopExport = exportLinks.find((el) =>
        el.classList.contains("sm:inline-flex"),
      );
      expect(desktopExport).toBeDefined();
      expect(desktopExport).toHaveClass("hidden", "sm:inline-flex");
      expect(desktopExport).toHaveAttribute(
        "href",
        "/admin/leads/export?job=job-2&status=qualified",
      );

      // New-search CTA with the full label on desktop.
      const newSearch = screen.getByRole("link", { name: /Nuova ricerca/ });
      expect(newSearch).toHaveAttribute("href", "/admin/leads/new");
      expect(within(newSearch).getByText("+ Nuova ricerca")).toBeInTheDocument();
    });

    it("hides the job selector entirely when there are no jobs", () => {
      renderBar(DEVICE_PROFILES.desktop, { jobs: [] });

      expect(screen.getByRole("heading", { level: 1, name: "Lead" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Tutte/ })).not.toBeInTheDocument();
    });
  });

  describe("sm flip 639/641 — export icon vs text, favourites label", () => {
    it("below sm (639) the CSV export is icon-only and the favourites label collapses to a star", () => {
      renderBar(639, { activeJobId: "job-2" });

      const exportLinks = screen.getAllByRole("link", { name: "Esporta CSV" });
      const mobileExport = exportLinks.find((el) =>
        el.classList.contains("sm:hidden"),
      );
      expect(mobileExport).toBeDefined();
      expect(mobileExport).toHaveClass("inline-flex", "sm:hidden", "w-9", "h-9");
      expect(mobileExport).toHaveAttribute("aria-label", "Esporta CSV");
      // Icon-only: no visible "Esporta CSV" text node inside the mobile button.
      expect(within(mobileExport!).queryByText("Esporta CSV")).not.toBeInTheDocument();

      // Favourites label is display-hidden below sm (token contract).
      const favourite = screen.getByRole("button", { name: "Preferiti" });
      expect(within(favourite).getByText("Preferiti")).toHaveClass(
        "hidden",
        "sm:inline",
      );
    });

    it("at sm (641) the desktop export text and the favourites label are active", () => {
      renderBar(641, { activeJobId: "job-2" });

      const exportLinks = screen.getAllByRole("link", { name: "Esporta CSV" });
      const desktopExport = exportLinks.find((el) =>
        el.classList.contains("sm:inline-flex"),
      );
      expect(desktopExport).toBeDefined();
      expect(desktopExport).toHaveClass("hidden", "sm:inline-flex");
      expect(within(desktopExport!).getByText("Esporta CSV")).toBeInTheDocument();

      const favourite = screen.getByRole("button", { name: "Preferiti" });
      expect(within(favourite).getByText("Preferiti")).toHaveClass(
        "hidden",
        "sm:inline",
      );

      const newSearch = screen.getByRole("link", { name: /Nuova ricerca/ });
      expect(within(newSearch).getByText("+ Nuova ricerca")).toBeInTheDocument();
    });
  });

  describe("filter band — two selects + clear-all, nowrap contract (MS-1.4)", () => {
    it("with an active filter the clear-all appears and the row keeps flex-nowrap + shrink-0", () => {
      const { container } = renderBar(DEVICE_PROFILES.mobile, {
        status: "qualified",
      });

      const row = container.querySelector<HTMLElement>('[class*="flex-nowrap"]');
      expect(row).not.toBeNull();
      expect(row).toHaveClass("flex", "flex-nowrap", "items-end", "justify-center", "gap-3");

      // R5 rectified by MS-1.4: the two w-[170px] selects flex-shrink instead
      // of overflowing at 375. Lock the DOM contract (nowrap row + a clear that
      // must NOT shrink) without asserting any overflow.
      expect(row!.querySelectorAll('[class*="w-[170px]"]')).toHaveLength(2);

      const selects = within(row!).getAllByRole("combobox");
      expect(selects).toHaveLength(2);
      expect(selects[0]).toHaveAccessibleName("Filtro per stato audit");
      expect(selects[1]).toHaveAccessibleName("Filtro per stato vendita");

      const clear = within(row!).getByRole("button", { name: "Rimuovi filtri" });
      expect(clear).toHaveClass("shrink-0");
    });

    it("with all-default filters the clear-all is absent", () => {
      const { container } = renderBar(DEVICE_PROFILES.mobile);

      const row = container.querySelector<HTMLElement>('[class*="flex-nowrap"]');
      expect(row).not.toBeNull();
      expect(
        within(row!).queryByRole("button", { name: "Rimuovi filtri" }),
      ).not.toBeInTheDocument();
      expect(
        within(row!).queryByRole("searchbox", { name: "Cerca lead" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("job selector opens the real LeadJobDrawer", () => {
    it("opens the left Sheet, expands the trigger, R3-widths it and closes on Escape", () => {
      renderBar(DEVICE_PROFILES.mobile);

      const selector = screen.getByRole("button", { name: /Tutte/ });
      fireEvent.click(selector);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAccessibleName("Ricerche");
      expect(selector).toHaveAttribute("aria-expanded", "true");

      // R3: w-[340px] fixed candidate vs max-w-[85vw] cap → min(340, 318.75).
      expectSheetWidth(dialog, DEVICE_PROFILES.mobile);
      expect(dialog.getBoundingClientRect().width).toBeCloseTo(
        0.85 * DEVICE_PROFILES.mobile,
        5,
      );

      fireEvent.keyDown(dialog, {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        charCode: 27,
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(selector).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("advanced filters panel", () => {
    it("toggles via the chevron and renders score/source/ads/copyright selects + tech chips", () => {
      renderBar(DEVICE_PROFILES.tablet, {
        availableTechStacks: ["React", "WordPress"],
        availableYears: [2018, 2019],
      });

      const chevron = screen.getByRole("button", { name: "Apri filtri avanzati" });
      expect(chevron).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(chevron);
      expect(chevron).toHaveAttribute("aria-expanded", "true");
      expect(chevron).toHaveAttribute("aria-label", "Chiudi filtri avanzati");

      expect(screen.getByRole("combobox", { name: "Filtro per score" })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: "Filtro per sorgente" })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: "Filtro per inserzioni ads" })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: "Anno copyright minimo" })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: "Anno copyright massimo" })).toBeInTheDocument();

      const chip = screen.getByRole("button", { name: "React" });
      expect(chip).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("debounced live search (350ms router.push)", () => {
    it("shows the clear button for a URL-provided q and pushes the debounced value", () => {
      jest.useFakeTimers();
      try {
        mockSearchParams = new URLSearchParams("q=agenzia");
        renderBar(DEVICE_PROFILES.mobile, { q: "agenzia" });

        const input = screen.getByRole("searchbox", { name: "Cerca lead" });
        expect(input).toHaveValue("agenzia");
        expect(
          screen.getByRole("button", { name: "Cancella ricerca" }),
        ).toBeInTheDocument();

        fireEvent.change(input, { target: { value: "design studio" } });
        expect(mockPush).not.toHaveBeenCalled();

        act(() => {
          jest.advanceTimersByTime(350);
        });

        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith(
          "/admin/leads?q=design+studio",
          { scroll: false },
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });
});