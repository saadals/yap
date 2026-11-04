"use client";

import { useEffect, useRef, useState } from "react";

import { FilterChip } from "@/components/ui/chip";
import { useReducedMotion } from "@/lib/hooks";

export type SettingsAnchor = { id: string; label: string; icon?: React.ReactNode };

/**
 * Anchor tabs for a long settings page: a scrolling chip row on mobile, a sticky column on
 * desktop. The chip for the section in view is pressed (scrollspy).
 */
export function SectionNav({ sections, label = "Settings sections" }: { sections: SettingsAnchor[]; label?: string }) {
  const [active, setActive] = useState(sections[0]?.id);
  const reduced = useReducedMotion();
  /** After a click, let the smooth scroll settle before the scrollspy takes over again. */
  const locked = useRef(false);
  const unlockTimer = useRef<number | undefined>(undefined);
  const ids = sections.map((section) => section.id).join(",");

  useEffect(() => {
    const nodes = ids
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.boundingClientRect.top : Infinity);
        if (locked.current) return;
        const best = [...visible.entries()]
          .filter(([, top]) => top !== Infinity)
          .sort((a, b) => a[1] - b[1])[0];
        if (best) setActive(best[0]);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    const timer = unlockTimer;
    return () => {
      observer.disconnect();
      window.clearTimeout(timer.current);
    };
  }, [ids]);

  const go = (id: string) => {
    setActive(id);
    locked.current = true;
    window.clearTimeout(unlockTimer.current);
    unlockTimer.current = window.setTimeout(() => {
      locked.current = false;
    }, 900);
    const node = document.getElementById(id);
    if (!node) return;
    node.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
    const heading = node.querySelector<HTMLElement>("h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  };

  return (
    <nav aria-label={label} className="lg:sticky lg:top-24">
      <ul className="y-scroll-x -mx-(--y-gutter) flex gap-1.5 px-(--y-gutter) pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
        {sections.map((section) => (
          <li key={section.id} className="flex-none">
            <FilterChip
              pressed={active === section.id}
              onClick={() => go(section.id)}
              icon={section.icon}
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
