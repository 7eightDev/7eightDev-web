"use client";

import { useCallback, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/presentation/components/ui/dialog";
import { clerkAppearance } from "./clerk-appearance";

/**
 * Custom sign-in modal: a Radix Dialog whose content hosts Clerk's own
 * <SignIn /> flow (email + verification code). The dialog chrome (overlay,
 * close, focus trap, animations) is ours; the auth form is mounted
 * imperatively via `clerk.mountSignIn` because this Clerk version only
 * supports `routing: 'path' | 'hash'` (no `'virtual'`), and `'hash'` keeps the
 * flow on the current page without a full navigation.
 */
export function SignInDialog() {
  const { isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);
  const mountedNodeRef = useRef<HTMLDivElement | null>(null);

  // Mount/unmount Clerk's sign-in form on the dialog content itself: the
  // ref fires during the commit phase, so the node is guaranteed fresh (a
  // useEffect keyed on `open` could race the portal mount in React 19).
  const mountRef = useCallback(
    (el: HTMLDivElement | null) => {
      const prev = mountedNodeRef.current;
      if (prev) {
        clerk.unmountSignIn(prev);
        mountedNodeRef.current = null;
      }
      if (el) {
        mountedNodeRef.current = el;
        clerk.mountSignIn(el, {
          routing: "hash",
          appearance: clerkAppearance,
        });
      }
    },
    [clerk],
  );

  // Once the user is signed in the whole dialog unmounts (this component
  // renders null), which in turn unmounts Clerk's form via the ref callback.
  if (isLoaded && isSignedIn) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Accedi"
          className="flex cursor-pointer items-center justify-center border-none bg-transparent p-2 text-soft transition-colors duration-150 hover:text-foreground"
        >
          <User size={20} />
        </button>
      </DialogTrigger>
      <DialogContent
        closeButtonClassName="top-5 right-5"
        className="gap-0 overflow-hidden p-0 sm:max-w-[420px]"
      >
        <DialogTitle className="sr-only">Accedi</DialogTitle>
        <DialogDescription className="sr-only">
          Accedi con email e codice di verifica.
        </DialogDescription>
        <div
          ref={mountRef}
          className="[&_.cl-card]:w-full [&_.cl-card]:max-w-none"
        />
      </DialogContent>
    </Dialog>
  );
}