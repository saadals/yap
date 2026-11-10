"use client";

import { useEffect, useState } from "react";

export type SectionLink = { id: string; label: string };

/**
 * In-page navigation as chips. Sticky under the header on desktop, a horizontal scroller on
 * mobile. Highlights the section currently under the header (black chip, never neon).
 * Pass a module-level `items` array so the scroll listener isn't re-bound every render.
 */
export function SectionNav({
  items,
  label,
  className = "",
}: {
  items: SectionLink[];
  label: string;
  className?: string;
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let current = items[0]?.id ?? "";
      for (const item of items) {
        const element = document.getElementById(item.id);
        if (element && element.getBoundingClientRect().top <= 200) current = item.id;
      }
      // at the very bottom, the last section wins even if it's short
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = items[items.length - 1]?.id ?? current;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  return (
    <nav
      aria-label={label}
      className={`z-30 -mx-(--y-gutter) px-(--y-gutter) lg:pointer-events-none lg:sticky lg:top-[72px] lg:mx-0 lg:px-0 ${className}`}
    >
      <ul className="y-scroll-x pointer-events-auto flex gap-2 py-1.5 lg:w-fit lg:rounded-full lg:border lg:border-(--y-glass-border) lg:bg-(--y-glass-strong) lg:p-1.5 lg:shadow-(--y-glass-shadow) lg:[-webkit-backdrop-filter:var(--y-glass-blur)] lg:[backdrop-filter:var(--y-glass-blur)]">
        {items.map((item) => (
          <li key={item.id} className="flex-none">
            <a
              href={`#${item.id}`}
              className="y-filter"
              aria-current={active === item.id ? "true" : undefined}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
