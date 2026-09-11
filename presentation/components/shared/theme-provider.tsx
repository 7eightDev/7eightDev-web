"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Client wrapper around next-themes. Attribute-based ("class") theming, so the
 * dark palette lives under `.dark` and light under `:root` in globals.css.
 * Dark is the on-brand default; only an explicit user toggle flips to light.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}