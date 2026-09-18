/**
 * Shared Clerk `appearance` used by the custom sign-in dialog and the
 * standalone /sign-in page, so the two stay visually identical.
 *
 * Colors are mapped through the app's own design tokens via `var()`: they live
 * on `:root`/`.dark` and cascade into Clerk's components, so the auth UI
 * follows the active theme (dark/light) without any sync logic.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--accent)",
    colorTextOnPrimary: "var(--on-accent)",
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
  },
};