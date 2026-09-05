"use client";

import { useOptimistic, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";
import { toggleJobFavoriteAction } from "@/application/lead/admin.actions";
import { cn } from "@/presentation/lib/utils";

interface LeadJobFavoriteButtonProps {
  jobId: string;
  favorite: boolean;
}

/** Star toggle on a recent-search card: pins the job to the top of the
 *  sidebar. Optimistic so the flip is instant; the server persists it. */
export function LeadJobFavoriteButton({
  jobId,
  favorite,
}: LeadJobFavoriteButtonProps) {
  const [pending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic<
    boolean,
    boolean
  >(favorite, (_state, next) => next);

  const toggle = () => {
    startTransition(async () => {
      setOptimisticFavorite(!optimisticFavorite);
      await toggleJobFavoriteAction(jobId);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={
        optimisticFavorite
          ? "Rimuovi dai preferiti"
          : "Aggiungi ai preferiti"
      }
      aria-pressed={optimisticFavorite}
      title={optimisticFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      className={cn(
        "inline-flex items-center justify-center size-7 rounded-md text-dim cursor-pointer transition-all duration-150",
        "hover:bg-foreground/[0.06] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        optimisticFavorite && "text-accent hover:text-accent",
        pending && "opacity-50 cursor-wait"
      )}
    >
      <HugeiconsIcon icon={StarIcon} size={15} aria-hidden />
    </button>
  );
}