"use client";

import { LayoutGrid } from "lucide-react";

import { formats } from "@/lib/taxonomy";
import type { FormatId } from "@/lib/types";

/**
 * Airbnb-style category row: icon over label, horizontally scrollable, the active one gets a
 * black underline. Selecting a format filters the results (synced to ?format=).
 */
export function CategoryBar({
  value,
  onChange,
  className = "",
}: {
  value: FormatId | null;
  onChange: (format: FormatId | null) => void;
  className?: string;
}) {
  const items = [
    { id: null, name: "All formats", icon: LayoutGrid, short: "Every format" },
    ...formats.map((f) => ({ id: f.id, name: f.name, icon: f.icon, short: f.short })),
  ];
  return (
    <div role="group" aria-label="Content format" className={`y-scroll-x flex gap-1 ${className}`}>
      {items.map((item) => {
        const active = value === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id ?? "all"}
            type="button"
            aria-pressed={active}
            title={item.short}
            onClick={() => onChange(item.id)}
            className={`group relative flex min-w-[92px] flex-none snap-start flex-col items-center gap-1.5 rounded-(--y-r-sm) px-3 pt-3 pb-3.5 transition-colors duration-(--y-dur-2) ${
              active ? "text-(--b-fg)" : "y-fg-2 hover:text-(--b-fg)"
            }`}
          >
            <Icon size={24} aria-hidden strokeWidth={active ? 2.25 : 1.75} />
            <span className="y-micro font-semibold whitespace-nowrap">{item.name}</span>
            <span
              aria-hidden
              className={`absolute inset-x-3 bottom-0 h-[3px] rounded-full transition-colors duration-(--y-dur-2) ${
                active ? "bg-(--b-fg)" : "bg-transparent group-hover:bg-(--b-line)"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
