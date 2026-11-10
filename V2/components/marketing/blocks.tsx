"use client";

import { Check, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";

/**
 * Marketing building blocks (V2): the landing page, How it works and For creators. Generous
 * spacing, the marketing type scale (`y-hero`, `y-t-section`), white cards on the canvas.
 */

/** Marketing page container: 1200px, sections stacked with marketing rhythm. */
export function MarketingMain({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[calc(1200px+var(--y-gutter)*2)] flex-col px-(--y-gutter) ${className}`}
    >
      {children}
    </div>
  );
}

/** A marketing section: 72px above on phones, 112px on desktop, with an optional heading row. */
export function Section({
  id,
  eyebrow,
  title,
  sub,
  action,
  children,
  className = "",
}: {
  id: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={title ? `${id}-title` : undefined} className={`scroll-mt-24 pt-18 md:pt-28 ${className}`}>
      {title ? (
        <div className="flex flex-col gap-5 pb-8 md:flex-row md:items-end md:justify-between md:pb-10">
          <div className="flex max-w-[44rem] flex-col gap-3">
            {eyebrow ? <p className="y-eyebrow">{eyebrow}</p> : null}
            <h2 id={`${id}-title`} className="y-display y-t-section text-balance">
              {title}
            </h2>
            {sub ? <p className="y-lead y-fg-2 max-w-[58ch]">{sub}</p> : null}
          </div>
          {action ? <div className="flex flex-none flex-wrap gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Ticked points; the tick takes the block's foreground so it works on any tone. */
export function CheckList({
  items,
  className = "",
  size = "body",
}: {
  items: ReactNode[];
  className?: string;
  size?: "body" | "small";
}) {
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span
            aria-hidden
            className={`grid flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg) ${size === "body" ? "mt-0.5 size-5" : "mt-px size-[18px]"}`}
          >
            <Check size={size === "body" ? 12 : 11} strokeWidth={3} />
          </span>
          <span className={size === "body" ? "y-body" : "y-small"}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Square icon tile for feature rows. */
export function IconTile({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-10 flex-none place-items-center rounded-(--y-r-sm) bg-(--b-chip) text-(--b-chip-fg) ${className}`}
    >
      {children}
    </span>
  );
}

/** Step numeral in a small round badge. */
export function StepNumber({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`y-num grid size-8 flex-none place-items-center rounded-full bg-(--b-fg) text-[13px] font-semibold text-(--b-bg) ${className}`}
    >
      {n}
    </span>
  );
}

export type FaqItem = { q: string; a: ReactNode };

/** Accordion built on <details>: keyboard and screen-reader support for free. */
export function Faq({ items, className = "" }: { items: FaqItem[]; className?: string }) {
  return (
    <div className={`flex flex-col ${className}`}>
      {items.map((item) => (
        <details key={item.q} className="group border-b border-(--b-line) last:border-b-0">
          <summary className="flex min-h-15 cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
            <span className="y-head">{item.q}</span>
            <span
              aria-hidden
              className="y-round flex-none transition-transform duration-(--y-dur-2) group-open:rotate-45"
              data-tone-btn="ghost"
              data-size="sm"
            >
              <Plus size={18} />
            </span>
          </summary>
          <div className="y-body y-fg-2 flex max-w-[64ch] flex-col gap-3 pe-12 pb-5">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

/**
 * Where the marketing buttons go. Signed out, through sign-in with the door that was used (Nour
 * for ordering, Layla for making in the demo) and `next` as the page after it. Signed in, straight
 * to the page: a new order, or Studio.
 */
export function useStartLinks() {
  const { account } = usePrefs();
  const signedIn = Boolean(account);
  return {
    order: (next?: string) => (signedIn ? (next ?? paths.newOrder()) : paths.signIn({ intent: "order", next })),
    make: (next?: string) => (signedIn ? (next ?? paths.studio) : paths.signIn({ intent: "make", next })),
  };
}
