"use client";

import { useState } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { CircleUserRound, LogOut } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/presentation/components/ui/sheet";

interface UserMenuLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface UserMenuProps {
  /** Extra nav rows rendered as <Link> inside the drawer. */
  links?: UserMenuLink[];
  /** Where the user ends up after sign out. */
  signOutRedirectUrl?: string;
}

export function UserMenu({
  links = [],
  signOutRedirectUrl = "/",
}: UserMenuProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);

  if (!isLoaded) {
    return (
      <span
        className="block size-8 animate-pulse rounded-full bg-raised"
        aria-hidden
      />
    );
  }

  if (!isSignedIn || !user) {
    return null;
  }

  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((part) => part?.[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AC";

  const displayName = user.fullName ?? user.username ?? "Account";
  const email = user.primaryEmailAddress?.emailAddress;

  const openProfile = () => {
    setOpen(false);
    window.setTimeout(() => clerk.openUserProfile(), 160);
  };

  const signOut = () => {
    void clerk.signOut({ redirectUrl: signOutRedirectUrl });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Apri menu account"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 outline-offset-2 transition-opacity duration-150 hover:opacity-80"
        >
          {user.hasImage ? (
            <img
              src={user.imageUrl}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
              {initials}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[320px] max-w-[85vw] gap-0 p-0"
      >
        <SheetTitle className="sr-only">Account</SheetTitle>
        <SheetDescription className="sr-only">
          Menu account: gestisci il profilo o esci.
        </SheetDescription>

        <div className="flex items-center gap-3 border-b border-border px-5 py-5 pr-12">
          {user.hasImage ? (
            <img
              src={user.imageUrl}
              alt=""
              className="size-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 font-semibold text-accent">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-foreground">
              {displayName}
            </p>
            {email && (
              <p className="truncate text-[12.5px] text-soft">{email}</p>
            )}
          </div>
        </div>

        <nav
          aria-label="Account"
          className="flex flex-col gap-0.5 overflow-y-auto px-2 py-2"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-foreground transition-colors duration-150 no-underline hover:bg-raised"
            >
              {link.icon}
              <span className="truncate">{link.label}</span>
            </Link>
          ))}

          <button
            type="button"
            onClick={openProfile}
            className="flex cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-[13.5px] font-medium text-foreground transition-colors duration-150 hover:bg-raised"
          >
            <CircleUserRound className="size-4 shrink-0" />
            <span>Gestisci account</span>
          </button>
        </nav>

        <div className="mt-auto border-t border-border px-2 py-2">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-[13.5px] font-medium text-foreground transition-colors duration-150 hover:bg-raised"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Esci</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}