"use client";

import Link from "next/link";

/**
 * Underline tabs (V2). Link tabs change the URL (`href`, marked with aria-current); button tabs
 * switch local state (`onSelect`, role="tab"). Use for 2–5 views of the same thing; a choice
 * inside a form is a SegmentedToggle instead.
 */
export type TabItem<T extends string> = { id: T; label: string; count?: number; href?: string };

export function Tabs<T extends string>({
  items,
  value,
  onSelect,
  label,
  className = "",
}: {
  items: TabItem<T>[];
  value: T;
  onSelect?: (id: T) => void;
  /** Accessible name of the tab list. */
  label: string;
  className?: string;
}) {
  return (
    <div role={onSelect ? "tablist" : undefined} aria-label={label} className={`y-tabs ${className}`}>
      {items.map((item) => {
        const selected = item.id === value;
        const body = (
          <>
            {item.label}
            {item.count !== undefined ? <span className="y-count">{item.count}</span> : null}
          </>
        );
        return item.href && !onSelect ? (
          <Link key={item.id} href={item.href} aria-current={selected ? "page" : undefined} scroll={false}>
            {body}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect?.(item.id)}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
