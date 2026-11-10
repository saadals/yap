"use client";

import { Moon, Sun } from "lucide-react";

import { usePrefs } from "@/lib/prefs";

export function ThemeToggle({ size = "sm" }: { size?: "sm" | "md" }) {
  const { isDark, toggleTheme } = usePrefs();
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="y-round"
      data-tone-btn="soft"
      data-size={size}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
