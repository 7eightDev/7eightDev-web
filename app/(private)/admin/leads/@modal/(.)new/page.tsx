import { NewLeadDialog } from "@/presentation/features/admin/leads/new-lead-dialog";

/**
 * Intercepted /admin/leads/new (matches the sibling `new` segment with the
 * `(.)` convention). Rendered inside the `@modal` slot when navigating to
 * /admin/leads/new from within the leads section, so the search form appears
 * as a dialog over the leads list instead of a separate page.
 */
export default function NewLeadInterceptedPage() {
  return <NewLeadDialog />;
}