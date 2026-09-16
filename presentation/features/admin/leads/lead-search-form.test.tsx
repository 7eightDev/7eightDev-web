import "@testing-library/jest-dom";
import { cleanup, screen } from "@testing-library/react";
import { DEVICE_PROFILES, BREAKPOINTS } from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { LeadSearchForm } from "./lead-search-form";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
}));

const mockStartLeadGenerationAction = jest
  .fn<Promise<{ ok: true; jobId: string }>, unknown[]>()
  .mockResolvedValue({ ok: true, jobId: "job-new" });

jest.mock("@/application/lead/admin.actions", () => ({
  startLeadGenerationAction: (...args: unknown[]) =>
    mockStartLeadGenerationAction(...args),
}));

jest.mock("./location-autocomplete", () => ({
  LocationAutocomplete: ({
    placeholder,
    inputClass: cls,
    onChange,
    onSelect,
  }: {
    placeholder?: string;
    inputClass?: string;
    onChange: (v: string) => void;
    onSelect: (v: string) => void;
  }) => (
    <input
      aria-label={placeholder}
      className={cls}
      onChange={(e) => {
        onChange(e.target.value);
        onSelect(e.target.value);
      }}
    />
  ),
}));

afterEach(() => {
  cleanup();
  cleanupMatchMediaMock();
});

describe("LeadSearchForm — responsive grid flip (MS-5.7)", () => {
  describe("mobile 375 — single-column grids", () => {
    it("renders both field groups as grid-cols-1", () => {
      renderAt(DEVICE_PROFILES.mobile, <LeadSearchForm />);

      const grids = document.querySelectorAll(
        ".grid.grid-cols-1.sm\\:grid-cols-2",
      );
      expect(grids.length).toBe(2);

      for (const grid of grids) {
        expect(grid).toHaveClass("grid", "grid-cols-1", "sm:grid-cols-2");
      }
    });

    it("section uses compact padding p-4", () => {
      renderAt(DEVICE_PROFILES.mobile, <LeadSearchForm />);

      const section = document.querySelector(
        "section.p-4.sm\\:p-6",
      );
      expect(section).not.toBeNull();
      expect(section).toHaveClass("p-4", "sm:p-6");
    });

    it("quantity input has no max-width constraint below sm", () => {
      renderAt(DEVICE_PROFILES.mobile, <LeadSearchForm />);

      const qty = screen.getByRole("spinbutton", { name: /Quantità/i });
      expect(qty).toHaveClass("sm:max-w-[220px]");
    });
  });

  describe("desktop 641 — two-column grids", () => {
    it("both field groups carry sm:grid-cols-2", () => {
      renderAt(BREAKPOINTS.sm + 1, <LeadSearchForm />);

      const grids = document.querySelectorAll(
        ".grid.grid-cols-1.sm\\:grid-cols-2",
      );
      expect(grids.length).toBe(2);

      for (const grid of grids) {
        expect(grid).toHaveClass("sm:grid-cols-2");
      }
    });

    it("section uses expanded padding sm:p-6", () => {
      renderAt(BREAKPOINTS.sm + 1, <LeadSearchForm />);

      const section = document.querySelector(
        "section.p-4.sm\\:p-6",
      );
      expect(section).toHaveClass("sm:p-6");
    });
  });

  describe("sm flip boundary 639/641", () => {
    it("below sm (639) grid is single-column, at sm (641) grid is two-column", () => {
      const { container } = renderAt(BREAKPOINTS.sm - 1, <LeadSearchForm />);

      const grids = container.querySelectorAll(
        ".grid.grid-cols-1.sm\\:grid-cols-2",
      );
      expect(grids.length).toBe(2);
      for (const grid of grids) {
        expect(grid).toHaveClass("grid-cols-1");
        expect(grid).not.toHaveClass("grid-cols-2");
      }
    });

    it("at sm (641) the grid contracts to sm:max-w-[220px] on quantity", () => {
      renderAt(BREAKPOINTS.sm + 1, <LeadSearchForm />);

      const qty = screen.getByRole("spinbutton", { name: /Quantità/i });
      expect(qty).toHaveClass("sm:max-w-[220px]");
    });
  });
});
