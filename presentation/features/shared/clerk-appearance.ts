/**
 * Shared Clerk `appearance` used by the custom sign-in dialog and the
 * standalone /sign-in page, so the two stay visually identical.
 *
 * Colors are mapped through the app's own design tokens via `var()`: they live
 * on `:root`/`.dark` and cascade into Clerk's components, so the auth UI
 * follows the active theme (dark/light) without any sync logic.
 *
 * Branding decisions (per committente):
 * - no Clerk logo/badge: `footerItem` (the "Secured by" pill) is hidden;
 * - registration stays off at the instance level (admin-only access), so the
 *   footer action link keeps working as the "use another method" entry point
 *   to the email-code (OTP) flow;
 * - field labels are visually hidden (sr-only), the placeholder carries the
 *   hint (this Clerk build renders both, duplicating the text);
 * - the primary button is forced to the brand accent via `colorPrimary`.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--color-accent)",
    colorTextOnPrimary: "var(--color-on-accent)",
    colorBackground: "var(--surface)",
    colorInputBackground: "var(--raised)",
    colorInputText: "var(--text)",
    colorText: "var(--text)",
    colorTextSecondary: "var(--text-soft)",
    colorDanger: "var(--coral-text)",
    colorSuccess: "var(--accent)",
    colorBorder: "var(--border)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    rootBox: { width: "100%" },
    card: { width: "100%", boxShadow: "none" },
    formButtonPrimary: {
      color: "var(--on-accent)",
      fontWeight: 600,
      border: "0",
    },
    footerItem: { display: "none" },
    formFieldLabel: {
      position: "absolute",
      width: "1px",
      height: "1px",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0 0 0 0)",
      whiteSpace: "nowrap",
      border: "0",
    },
  },
};