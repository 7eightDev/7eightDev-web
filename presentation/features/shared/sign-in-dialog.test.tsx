import "@testing-library/jest-dom";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { DEVICE_PROFILES } from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  renderAt,
} from "@/presentation/__mocks__/set-viewport";
import { SignInDialog } from "./sign-in-dialog";
import { clerkAppearance } from "./clerk-appearance";

// The SignInDialog is a real Radix Dialog that mounts Clerk's <SignIn /> into
// a div: only the two @clerk/nextjs seams are mocked, everything else (Dialog,
// Button, Hugeicons, lucide) renders for real.
const mockUseUser = jest.fn();
const mockUseClerk = jest.fn();

jest.mock("@clerk/nextjs", () => ({
  useUser: (...args: unknown[]) => mockUseUser(...args),
  useClerk: (...args: unknown[]) => mockUseClerk(...args),
}));

const mockMountSignIn = jest.fn();
const mockUnmountSignIn = jest.fn();

beforeEach(() => {
  mockUseUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    user: null,
  });
  mockUseClerk.mockReturnValue({
    mountSignIn: mockMountSignIn,
    unmountSignIn: mockUnmountSignIn,
  });
});

afterEach(() => {
  cleanup();
  cleanupMatchMediaMock();
  jest.clearAllMocks();
});

describe("SignInDialog (features/shared/sign-in-dialog.tsx) — custom login modal", () => {
  describe("auth states", () => {
    it("renders the account trigger while signed out", () => {
      renderAt(DEVICE_PROFILES.desktop, <SignInDialog />);

      const trigger = screen.getByRole("button", { name: "Accedi" });
      expect(trigger).toHaveAttribute("data-slot", "dialog-trigger");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders nothing when already signed in", () => {
      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: { id: "1" },
      });
      renderAt(DEVICE_PROFILES.desktop, <SignInDialog />);

      expect(screen.queryByRole("button", { name: "Accedi" })).not.toBeInTheDocument();
    });
  });

  describe("modal open/close", () => {
    it("mounts Clerk's SignIn flow with hash routing and the shared appearance", () => {
      renderAt(DEVICE_PROFILES.desktop, <SignInDialog />);
      fireEvent.click(screen.getByRole("button", { name: "Accedi" }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAccessibleName("Accedi");

      const mountNode = mockMountSignIn.mock.calls[0][0];
      const props = mockMountSignIn.mock.calls[0][1];
      expect(mountNode).toBeInstanceOf(HTMLDivElement);
      expect(dialog).toContainElement(mountNode);
      expect(props).toEqual({
        routing: "hash",
        appearance: clerkAppearance,
      });
    });

    it("unmounts Clerk's SignIn flow when the dialog closes with Escape", () => {
      renderAt(DEVICE_PROFILES.desktop, <SignInDialog />);
      fireEvent.click(screen.getByRole("button", { name: "Accedi" }));

      expect(mockMountSignIn).toHaveBeenCalledTimes(1);
      const mountNode = mockMountSignIn.mock.calls[0][0];

      fireEvent.keyDown(screen.getByRole("dialog"), {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        charCode: 27,
      });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mockUnmountSignIn).toHaveBeenCalledWith(mountNode);
    });

    it("unmounts and closes when the user successfully signs in", () => {
      const view = renderAt(DEVICE_PROFILES.desktop, <SignInDialog />);
      fireEvent.click(screen.getByRole("button", { name: "Accedi" }));

      const mountNode = mockMountSignIn.mock.calls[0][0];
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: { id: "1" },
      });
      view.rerender(<SignInDialog />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mockUnmountSignIn).toHaveBeenCalledWith(mountNode);
    });
  });
});