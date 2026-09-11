"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Dark/light toggle. Rendered inside next-themes' provider; dark is the
 * on-brand default, light is the explicit opt-in. Renders an empty placeholder
 * until mounted so the icon never mismatches the server-rendered theme.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-9 rounded-[9px]" aria-hidden />;
  }

  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={dark ? "Attiva il tema chiaro" : "Attiva il tema scuro"}
      title={dark ? "Tema chiaro" : "Tema scuro"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex items-center justify-center size-9 rounded-[9px] text-soft hover:text-accent transition-colors duration-150 border border-border hover:border-accent bg-transparent cursor-pointer"
    >
      {dark ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
    </button>
  );
}