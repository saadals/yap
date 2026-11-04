"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export type RowMenuItem = {
  label: string;
  icon?: React.ReactNode;
  /** Navigate on select… */
  href?: string;
  /** …or run an action. */
  onSelect?: () => void;
};

const itemClass =
  "y-small flex w-full items-center gap-2.5 rounded-(--y-r-sm) px-3 py-2.5 text-start font-medium outline-none hover:bg-(--b-chip) focus-visible:bg-(--b-chip)";

/**
 * "More" overflow for a list row: a round ⋯ button that opens a small menu of secondary actions.
 * Keyboard: Enter/Space opens, arrows move, Esc closes and returns focus, Tab leaves.
 */
export function RowMenu({ label, items, className = "" }: { label: string; items: RowMenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const entries = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = entries.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      entries[(index + step + entries.length) % entries.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      entries[event.key === "Home" ? 0 : entries.length - 1]?.focus();
    }
  };

  return (
    <div ref={rootRef} className={`relative flex-none ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className="y-round"
        data-tone-btn="outline"
        data-size="sm"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          data-tone="paper"
          onKeyDown={onMenuKey}
          className="y-block absolute end-0 top-full z-30 mt-2 flex min-w-56 flex-col !rounded-(--y-r-tile) p-1.5 shadow-(--y-shadow-float)"
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
