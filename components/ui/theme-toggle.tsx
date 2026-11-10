"use client";

import { Moon, Sun } from "lucide-react";

import { DARK_MODE_ENABLED, usePrefs } from "@/lib/prefs";

/**
 * Light/dark switch. Dark mode is paused (round 3 answers, item 49), so this renders nothing and
 * the header, footer and account sheet no longer place it. Kept for when dark mode returns.
 */
export function ThemeToggle({ size = "sm" }: { size?: "sm" | "md" }) {
  const { isDark, toggleTheme } = usePrefs();
  if (!DARK_MODE_ENABLED) return null;
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
