"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { LeadSearchForm } from "@/presentation/features/admin/leads/lead-search-form";

/**
 * Dialog shown over the leads list when "Nuova ricerca" is opened via client
 * navigation (intercepted route at `@modal/(.)new`). Closing — Escape, click
 * on the overlay, the × button or submitting the form — navigates back to the
 * previous URL, which unmounts the slot.
 */
export function NewLeadDialog() {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogTitle className="font-space text-xl font-semibold tracking-[-0.02em]">
          Nuova ricerca lead
        </DialogTitle>
        <LeadSearchForm />
      </DialogContent>
    </Dialog>
  );
}