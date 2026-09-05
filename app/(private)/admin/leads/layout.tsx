/**
 * Leads section layout. Renders the section content plus the `@modal`
 * parallel slot, so "Nuova ricerca lead" can be shown as a dialog on top of
 * the leads list (intercepted route) while still being a real page at
 * /admin/leads/new for direct navigation / refresh.
 */
export default function LeadsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}