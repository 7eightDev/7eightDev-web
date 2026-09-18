import "@testing-library/jest-dom";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { DEVICE_PROFILES } from "@/presentation/lib/breakpoints";
import { getCurrentWidth } from "@/presentation/__mocks__/match-media";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { expectSheetWidth } from "@/presentation/__mocks__/expect-sheet-width";
import { AdminHeader } from "./admin-header";

// Third-party seams only — the Radix Sheet, Button and ThemeToggle stay real so
// open/close exercises the actual DOM (Sheet portal, Role, presence).
jest.mock("next/navigation", () => ({
  usePathname: () => "/admin/leads",
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

jest.mock("@/presentation/features/shared/user-menu", () => ({
  UserMenu: () => <div aria-label="Account utente" />,
}));

jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: jest.fn() }),
}));

jest.mock("./google-quota-badge", () => ({
  GoogleQuotaBadge: () => null,
}));

/** Nav Sheet design tokens (admin-header, consumed by the shared
 *  `expectSheetWidth` helper): `w-[85%] max-w-[340px]`. */

// The admin header intentionally renders only a sr-only SheetTitle and no
// SheetDescription, so Radix prints its well-known accessibility advisory
// ("Missing `Description`"). It is a dev-only console.warn, not a failure or an
// act warning; swallow just that line to keep the suite output clean.
const originalConsoleWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Missing `Description`")) {
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

describe("AdminHeader — responsive nav & mobile Sheet (MS-2.2)", () => {
  describe("desktop ≥ lg (1280)", () => {
    it("shows the desktop nav (hidden lg:flex) with all links and hides the hamburger (lg:hidden)", () => {
      renderAt(DEVICE_PROFILES.desktop, <AdminHeader />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("hidden", "lg:flex");
      expect(within(nav).getByRole("link", { name: "Preventivi" })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: "Catalogo" })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: "Lead" })).toBeInTheDocument();

      const hamburger = screen.getByRole("button", { name: "Apri il menu" });
      expect(hamburger).toHaveClass("lg:hidden");

      expect(screen.getByRole("button", { name: "Attiva il tema chiaro" })).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("marks the active route with aria-current=\"page\"", () => {
      renderAt(DEVICE_PROFILES.desktop, <AdminHeader />);
      expect(screen.getByRole("link", { name: "Lead" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });

  describe("mobile 375 — hamburger (no lg)", () => {
    it("shows the hamburger (lg:hidden, no unconditional display:none) and the desktop nav is hidden below lg", () => {
      renderAt(DEVICE_PROFILES.mobile, <AdminHeader />);

      const hamburger = screen.getByRole("button", { name: "Apri il menu" });
      expect(hamburger).toHaveClass("lg:hidden");
      expect(hamburger).not.toHaveClass("hidden");

      const desktopNav = screen.getByRole("navigation");
      expect(desktopNav).toHaveClass("hidden");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(getCurrentWidth()).toBe(DEVICE_PROFILES.mobile);
    });
  });

  describe("tablet 768 — R2 (lg not reached)", () => {
    it("uses the hamburger and caps the Sheet width at max-w-[340px] (85vw would be 652px)", () => {
      renderAt(DEVICE_PROFILES.tablet, <AdminHeader />);

      const hamburger = screen.getByRole("button", { name: "Apri il menu" });
      expect(hamburger).toHaveClass("lg:hidden");
      expect(screen.getByRole("navigation")).toHaveClass("hidden");

      fireEvent.click(hamburger);
      const dialog = screen.getByRole("dialog");
      expectSheetWidth(dialog, DEVICE_PROFILES.tablet);
      expect(dialog.getBoundingClientRect().width).toBe(340);
    });
  });

  describe("mobile Sheet open/close (R3)", () => {
    it("opens the right nav sheet with viewport-relative width and cleans up the DOM on close", () => {
      renderAt(DEVICE_PROFILES.mobile, <AdminHeader />);
      fireEvent.click(screen.getByRole("button", { name: "Apri il menu" }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAccessibleName("Menu di navigazione");

      const sheetNav = within(dialog).getByRole("navigation");
      expect(within(sheetNav).getByRole("link", { name: "Preventivi" })).toBeInTheDocument();
      expect(within(sheetNav).getByRole("link", { name: "Catalogo" })).toBeInTheDocument();
      expect(within(sheetNav).getByRole("link", { name: "Lead" })).toBeInTheDocument();
      expect(within(sheetNav).getByRole("link", { name: "Vai al sito" })).toBeInTheDocument();

      expectSheetWidth(dialog, DEVICE_PROFILES.mobile);
      expect(dialog.getBoundingClientRect().width).toBeCloseTo(
        0.85 * DEVICE_PROFILES.mobile,
        5,
      );

      fireEvent.click(within(sheetNav).getByRole("link", { name: "Lead" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Apri il menu" })).toBeInTheDocument();
    });

    it("closes the Sheet with the Escape key and leaves no dialog behind", () => {
      renderAt(DEVICE_PROFILES.mobile, <AdminHeader />);
      fireEvent.click(screen.getByRole("button", { name: "Apri il menu" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole("dialog"), {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        charCode: 27,
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});