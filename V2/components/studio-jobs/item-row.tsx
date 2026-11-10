"use client";

import "@/app/styles/studio-business.css";

import { ChevronRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/**
 * A list row for the Studio business pages (Jobs, Earnings). Like `Row` from components/ui/list,
 * but the title is a stretched link, so the row can also hold a menu button at the end, and the
 * status chip moves under the meta line on phones (the end keeps only the amount there).
 */
export function ItemRow({
  href,
  lead,
  title,
  meta,
  chip,
  amount,
  menu,
}: {
  href?: string;
  lead?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** One status chip. */
  chip?: React.ReactNode;
  /** The row's one number (what you earn, a payout). */
  amount?: React.ReactNode;
  /** A <RowMenu> for the row's secondary actions. */
  menu?: React.ReactNode;
}) {
  return (
    <div role="listitem" className={`y-row ${href ? "sb-linkrow" : ""}`}>
      {lead ? <span className="flex-none">{lead}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {href ? (
          <Link href={href} className="sb-stretch truncate font-medium">
            {title}
          </Link>
        ) : (
          <span className="truncate font-medium">{title}</span>
        )}
        {meta ? <span className="y-small y-fg-2 truncate">{meta}</span> : null}
        {chip ? (
          <span className="mt-1 flex items-center justify-between gap-3 sm:hidden">
            {chip}
            {amount !== undefined ? <span className="y-num font-semibold">{amount}</span> : null}
          </span>
        ) : null}
      </span>
      {chip || amount !== undefined ? (
        <span className={`flex-none items-center gap-4 ${chip ? "hidden sm:flex" : "flex"}`}>
          {chip}
          {amount !== undefined ? <span className="sb-amount y-num font-semibold">{amount}</span> : null}
        </span>
      ) : null}
      {menu ? (
        <span className="relative z-[2] -me-2 flex-none">{menu}</span>
      ) : href ? (
        <span aria-hidden className="-me-1 flex w-7 flex-none justify-center">
          <ChevronRight size={18} className="y-fg-3 y-flip" />
        </span>
      ) : null}
    </div>
  );
}

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  tone?: "danger";
};

const subscribeNoop = () => () => {};

type Anchor = { top: number; start: number; up: boolean; rtl: boolean };

/**
 * "More" button with a small menu of secondary actions (withdraw a pitch, remove a payout method).
 * The menu renders in a portal so a list card's rounded clipping never cuts it off. Arrow keys
 * move between items, Escape closes and returns focus to the button, scrolling closes it.
 */
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const host = useSyncExternalStore(
    subscribeNoop,
    () => document.getElementById("yapp-root") ?? document.body,
    () => null,
  );
  const open = anchor !== null;

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setAnchor(null);
    };
    // Close when the page really moves (not for the nudge a tap or focus can cause).
    const startY = window.scrollY;
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      if (event.target === document && Math.abs(window.scrollY - startY) < 48) return;
      setAnchor(null);
    };
    const onResize = () => setAnchor(null);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setAnchor(null);
      return;
    }
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const rtl = document.documentElement.dir === "rtl";
    const up = window.innerHeight - rect.bottom < 64 + items.length * 48;
    setAnchor({
      top: up ? rect.top - 6 : rect.bottom + 6,
      start: rtl ? rect.left : window.innerWidth - rect.right,
      up,
      rtl,
    });
  };

  const close = () => {
    setAnchor(null);
    buttonRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      setAnchor(null);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      nodes[(index + step + nodes.length) % nodes.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      nodes[event.key === "Home" ? 0 : nodes.length - 1]?.focus();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="y-round"
        data-tone-btn="ghost"
        data-size="sm"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open && host
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              className="sb-menu"
              data-up={anchor.up || undefined}
              style={{ top: anchor.top, ...(anchor.rtl ? { left: anchor.start } : { right: anchor.start }) }}
              onKeyDown={onKeyDown}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  data-tone={item.tone}
                  onClick={() => {
                    close();
                    item.onSelect();
                  }}
                >
                  {item.icon ? (
                    <span aria-hidden className="flex flex-none">
                      {item.icon}
                    </span>
                  ) : null}
                  {item.label}
                </button>
              ))}
            </div>,
            host,
          )
        : null}
    </>
  );
}
