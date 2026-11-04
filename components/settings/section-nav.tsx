"use client";

import { useState, useSyncExternalStore } from "react";

import { FilterChip } from "@/components/ui/chip";

export type SettingsAnchor = { id: string; label: string };

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

/**
 * Which settings section is showing (one at a time). It starts from the URL hash, so links like
 * `/creator/settings#account` open that section; `aliases` maps retired anchors to their new home.
 */
export function useSettingsSection(sections: SettingsAnchor[], aliases: Record<string, string> = {}) {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const [picked, setPicked] = useState<string | null>(null);
  const fromHash = aliases[hash] ?? hash;
  const active = picked ?? (sections.some((section) => section.id === fromHash) ? fromHash : sections[0]?.id);
  const select = (id: string) => {
    setPicked(id);
    window.history.replaceState(null, "", `#${id}`);
  };
  return [active, select] as const;
}

/** Section switcher for settings: a chip row on mobile, a sticky column on desktop. */
export function SectionNav({
  sections,
  active,
  onSelect,
  label = "Settings sections",
}: {
  sections: SettingsAnchor[];
  active: string;
  onSelect: (id: string) => void;
  label?: string;
}) {
  return (
    <nav aria-label={label} className="lg:sticky lg:top-24">
      <ul className="y-scroll-x -mx-(--y-gutter) flex gap-1.5 px-(--y-gutter) pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
        {sections.map((section) => (
          <li key={section.id} className="flex-none">
            <FilterChip
              pressed={active === section.id}
              onClick={() => onSelect(section.id)}
              className="lg:w-full lg:justify-start"
            >
              {section.label}
            </FilterChip>
          </li>
        ))}
      </ul>
    </nav>
  );
}
