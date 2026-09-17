import "@testing-library/jest-dom";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { DEVICE_PROFILES } from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { expectSheetWidth } from "@/presentation/__mocks__/expect-sheet-width";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

/**
 * The Sheet is a pure Radix Dialog facade with no external seam: Sheet/Content/
 * Trigger/Title/Description, the Button close control and the Hugeicons icons
 * all render for real, so the DOM (role, aria, focus, portal) is exercised.
 */

interface SheetScreenOptions {
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  showCloseButton?: boolean;
  withDescription?: boolean;
}

/** Mount a Sheet at `width` and click its trigger; returns the opened dialog. */
function openSheet(
  width: number,
  opts: SheetScreenOptions = {},
): HTMLElement {
  const { side, className, showCloseButton, withDescription = false } = opts;
  renderAt(
    width,
    <Sheet>
      <SheetTrigger asChild>
        <button type="button">Apri</button>
      </SheetTrigger>
      <SheetContent
        side={side}
        className={className}
        showCloseButton={showCloseButton}
      >
        <SheetTitle>Preferenze</SheetTitle>
        {withDescription && (
          <SheetDescription>{"Impostazioni dell'account"}</SheetDescription>
        )}
      </SheetContent>
    </Sheet>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Apri" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toBeInTheDocument();
  return dialog;
}

// Only the aria tests render a SheetDescription: every other Sheet draws
// Radix's well-known dev-only advisory "Missing `Description`". Swallow just
// that console.warn (never act warnings) to keep the suite output clean.
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

describe("Sheet (ui/sheet.tsx) — side/className/showCloseButton, R3 width, focus/aria (MS-2.4)", () => {
  describe("side prop & tw-merge className", () => {
    it("defaults to side=\"right\": role dialog, w-3/4 max-w-md, R3 viewport-relative width", () => {
      const dialog = openSheet(DEVICE_PROFILES.mobile);
      expect(dialog).toHaveAttribute("data-slot", "sheet-content");
      expect(dialog).toHaveClass(
        "fixed",
        "z-50",
        "inset-y-0",
        "right-0",
        "h-full",
        "data-open:slide-in-from-right",
      );

      // Default tokens: w-3/4 ≡ 75%, max-w-md = 448px (28rem @16px).
      expectSheetWidth(dialog, DEVICE_PROFILES.mobile);
      const rect = dialog.getBoundingClientRect();
      expect(rect.width).toBeCloseTo(0.75 * DEVICE_PROFILES.mobile, 5);
      expect(rect.width).toBeLessThanOrEqual(448);
    });

    it("lets className override the width tokens via tw-merge (w-[40%] max-w-[300px] wins)", () => {
      const dialog = openSheet(DEVICE_PROFILES.desktop, {
        className: "w-[40%] max-w-[300px] gap-0 p-0",
      });
      // tw-merge drops the conflicting default tokens, the override stays.
      expect(dialog).not.toHaveClass("w-3/4");
      expect(dialog).not.toHaveClass("max-w-md");
      expect(dialog).toHaveClass("gap-0", "p-0");
      expectSheetWidth(dialog, DEVICE_PROFILES.desktop);

      const rect = dialog.getBoundingClientRect();
      // desktop 1280: 40vw = 512px → capped at the max-w-[300px] override.
      expect(rect.width).toBe(300);
    });

    it("side=\"left\" renders as a left-anchored dialog with R3 width", () => {
      const dialog = openSheet(DEVICE_PROFILES.mobile, { side: "left" });
      expect(dialog).toHaveClass("inset-y-0", "left-0", "h-full");
      expect(dialog).toHaveClass("data-open:slide-in-from-left");
      expect(dialog).not.toHaveClass("right-0");
      expectSheetWidth(dialog, DEVICE_PROFILES.mobile);
    });

    it("side=\"top\" caps the sheet height at max-h-[80vh]", () => {
      const dialog = openSheet(DEVICE_PROFILES.mobile, { side: "top" });
      expect(dialog).toHaveClass("top-0", "inset-x-0", "h-auto", "max-h-[80vh]");
      expect(dialog).toHaveClass("data-open:slide-in-from-top");
    });

    it("side=\"bottom\" caps the sheet height at max-h-[80vh]", () => {
      const dialog = openSheet(DEVICE_PROFILES.mobile, { side: "bottom" });
      expect(dialog).toHaveClass("bottom-0", "inset-x-0", "h-auto", "max-h-[80vh]");
      expect(dialog).toHaveClass("data-open:slide-in-from-bottom");
    });
  });

  describe("showCloseButton", () => {
    it("renders a close button (accessible name \"Close\") by default", () => {
      openSheet(DEVICE_PROFILES.mobile);
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("omits the close button when showCloseButton={false}", () => {
      openSheet(DEVICE_PROFILES.mobile, { showCloseButton: false });
      expect(
        screen.queryByRole("button", { name: "Close" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("focus & aria (glossario Sheet)", () => {
    it("autofocuses inside the dialog on trigger click and cleans up the DOM on Escape", () => {
      renderAt(
        DEVICE_PROFILES.mobile,
        <Sheet>
          <SheetTrigger asChild>
            <button type="button">Apri</button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetTitle>Preferenze</SheetTitle>
          </SheetContent>
        </Sheet>,
      );
      const trigger = screen.getByRole("button", { name: "Apri" });
      trigger.focus();

      fireEvent.click(trigger);

      const dialog = screen.getByRole("dialog");
      // Radix autofocuses within the dialog (first focusable = close button);
      // focus must be inside it and no longer on the trigger.
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
      expect(document.activeElement).not.toBe(trigger);

      fireEvent.keyDown(dialog, {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        charCode: 27,
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Apri" })).toBeInTheDocument();
    });

    it("wires aria-labelledby (Title) and aria-describedby (Description) to the dialog", () => {
      openSheet(DEVICE_PROFILES.mobile, { withDescription: true });
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAccessibleName("Preferenze");
      expect(dialog).toHaveAccessibleDescription("Impostazioni dell'account");
    });
  });

  describe("trigger & overlay", () => {
    it("renders a z-50 backdrop-blur overlay and a data-slot trigger", () => {
      renderAt(
        DEVICE_PROFILES.mobile,
        <Sheet>
          <SheetTrigger asChild>
            <button type="button">Apri</button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetTitle>Preferenze</SheetTitle>
          </SheetContent>
        </Sheet>,
      );
      const trigger = screen.getByRole("button", { name: "Apri" });
      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute("data-slot", "sheet-trigger");

      const overlay = document.querySelector<HTMLElement>(
        '[data-slot="sheet-overlay"]',
      );
      expect(overlay).not.toBeNull();
      expect(overlay!).toHaveClass(
        "fixed",
        "inset-0",
        "z-50",
        "bg-black/80",
        "supports-backdrop-filter:backdrop-blur-xs",
      );
    });
  });
});