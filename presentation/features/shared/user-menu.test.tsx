import "@testing-library/jest-dom";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { DEVICE_PROFILES } from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { expectSheetWidth } from "@/presentation/__mocks__/expect-sheet-width";
import { UserMenu } from "./user-menu";

// The UserMenu is a Sheet (real Radix Dialog) over Clerk hooks: only the two
// @clerk/nextjs seams are mocked, everything else (Sheet, Button, Hugeicons,
// next/link) renders for real.
const mockUseUser = jest.fn();
const mockUseClerk = jest.fn();

jest.mock("@clerk/nextjs", () => ({
  useUser: (...args: unknown[]) => mockUseUser(...args),
  useClerk: (...args: unknown[]) => mockUseClerk(...args),
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

const mockOpenUserProfile = jest.fn();
const mockSignOut = jest.fn();

const signedInUser = {
  firstName: "Mario",
  lastName: "Rossi",
  fullName: "Mario Rossi",
  username: "mariorossi",
  primaryEmailAddress: { emailAddress: "mario@7eight.dev" },
  imageUrl: "https://img.clerk.com/avatar.png",
  hasImage: true,
};

beforeEach(() => {
  mockUseUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: signedInUser,
  });
  mockUseClerk.mockReturnValue({
    openUserProfile: mockOpenUserProfile,
    signOut: mockSignOut,
  });
});

afterEach(() => {
  cleanup();
  cleanupMatchMediaMock();
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe("UserMenu (features/shared/user-menu.tsx) — account drawer", () => {
  describe("auth states", () => {
    it("renders an avatar-sized skeleton while Clerk is loading (no trigger)", () => {
      mockUseUser.mockReturnValue({ isLoaded: false, isSignedIn: undefined, user: undefined });
      renderAt(DEVICE_PROFILES.desktop, <UserMenu />);

      expect(
        screen.queryByRole("button", { name: "Apri menu account" }),
      ).not.toBeInTheDocument();
      expect(document.querySelector('[aria-hidden="true"]')).not.toBeNull();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders nothing when signed out", () => {
      mockUseUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
      renderAt(DEVICE_PROFILES.desktop, <UserMenu />);

      expect(
        screen.queryByRole("button", { name: "Apri menu account" }),
      ).not.toBeInTheDocument();
    });

    it("falls back to initials when the user has no avatar image", () => {
      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: { ...signedInUser, hasImage: false },
      });
      renderAt(DEVICE_PROFILES.desktop, <UserMenu />);

      const trigger = screen.getByRole("button", { name: "Apri menu account" });
      expect(within(trigger).getByText("MR")).toBeInTheDocument();
      expect(trigger.querySelector("img")).toBeNull();
    });
  });

  describe("drawer open/close", () => {
    it("shows the avatar trigger on mount and no dialog", () => {
      renderAt(DEVICE_PROFILES.desktop, <UserMenu />);

      const trigger = screen.getByRole("button", { name: "Apri menu account" });
      const avatar = trigger.querySelector("img");
      expect(avatar).not.toBeNull();
      expect(avatar).toHaveAttribute("src", signedInUser.imageUrl);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute("data-slot", "sheet-trigger");
    });

    it("opens a right drawer with the profile header (name + email) and closes on Escape", () => {
      renderAt(DEVICE_PROFILES.desktop, <UserMenu />);
      fireEvent.click(screen.getByRole("button", { name: "Apri menu account" }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAccessibleName("Account");
      expect(within(dialog).getByText("Mario Rossi")).toBeInTheDocument();
      expect(within(dialog).getByText("mario@7eight.dev")).toBeInTheDocument();
      expect(dialog).toHaveClass("right-0", "inset-y-0", "h-full");

      fireEvent.keyDown(dialog, {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        charCode: 27,
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("caps the drawer at 85vw on mobile and 320px on desktop (R3)", () => {
      renderAt(DEVICE_PROFILES.mobile, <UserMenu />);
      fireEvent.click(screen.getByRole("button", { name: "Apri menu account" }));

      const mobileDialog = screen.getByRole("dialog");
      expectSheetWidth(mobileDialog, DEVICE_PROFILES.mobile);
      expect(mobileDialog.getBoundingClientRect().width).toBeCloseTo(
        0.85 * DEVICE_PROFILES.mobile,
        5,
      );

      cleanup();
      cleanupMatchMediaMock();

      renderAt(DEVICE_PROFILES.desktop, <UserMenu />);
      fireEvent.click(screen.getByRole("button", { name: "Apri menu account" }));

      const desktopDialog = screen.getByRole("dialog");
      expectSheetWidth(desktopDialog, DEVICE_PROFILES.desktop);
      expect(desktopDialog.getBoundingClientRect().width).toBe(320);
    });
  });

  describe("actions", () => {
    it("renders the custom links and closes the drawer on click", () => {
      renderAt(
        DEVICE_PROFILES.desktop,
        <UserMenu
          links={[
            { href: "/admin/quotes", label: "Area Admin" },
            { href: "/", label: "Vai al sito" },
          ]}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Apri menu account" }));

      const dialog = screen.getByRole("dialog");
      const areaAdmin = within(dialog).getByRole("link", { name: "Area Admin" });
      expect(areaAdmin).toHaveAttribute("href", "/admin/quotes");
      expect(within(dialog).getByRole("link", { name: "Vai al sito" })).toHaveAttribute(
        "href",
        "/",
      );

      fireEvent.click(areaAdmin);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens the Clerk profile modal only after the drawer closes", () => {
      jest.useFakeTimers();
      renderAt(DEVICE_PROFILES.desktop, <UserMenu />);
      fireEvent.click(screen.getByRole("button", { name: "Apri menu account" }));

      const dialog = screen.getByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Gestisci account" }));
      expect(mockOpenUserProfile).not.toHaveBeenCalled();

      jest.advanceTimersByTime(200);
      expect(mockOpenUserProfile).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("signs out with the default redirectUrl '/', or a custom one", () => {
      renderAt(DEVICE_PROFILES.desktop, <UserMenu />);
      fireEvent.click(screen.getByRole("button", { name: "Apri menu account" }));
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Esci" }),
      );
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: "/" });

      renderAt(
        DEVICE_PROFILES.desktop,
        <UserMenu signOutRedirectUrl="/custom" />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Apri menu account" }));
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Esci" }),
      );
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: "/custom" });
    });
  });
});