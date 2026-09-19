"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/presentation/components/ui/button";
import { useMounted } from "@/presentation/lib/use-mounted";

/**
 * Dark/light toggle. Rendered inside next-themes' provider; dark is the
 * on-brand default, light is the explicit opt-in. Renders an empty placeholder
 * until mounted so the icon never mismatches the server-rendered theme.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return <div className="size-9 rounded-[8px]" aria-hidden />;
  }

  const dark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={dark ? "Attiva il tema chiaro" : "Attiva il tema scuro"}
      title={dark ? "Tema chiaro" : "Tema scuro"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="rounded-[8px] text-soft hover:bg-raised hover:text-accent cursor-pointer"
    >
      {dark ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
    </Button>
  );
}