"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className, variant = "icon" }: { className?: string; variant?: "icon" | "row" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");
  if (variant === "row") {
    return (
      <button type="button" onClick={toggle} className={cn("flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-base font-medium hover:bg-muted", className)}>
        <Moon className="size-5 dark:hidden" />
        <Sun className="hidden size-5 dark:block" />
        <span className="dark:hidden">Dark mode</span>
        <span className="hidden dark:inline">Light mode</span>
      </button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className={className}
      aria-label="Toggle dark mode"
      onClick={toggle}
    >
      <Sun className="size-5 dark:hidden" />
      <Moon className="hidden size-5 dark:block" />
    </Button>
  );
}
