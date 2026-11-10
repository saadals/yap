"use client";

import { Block } from "@/components/ui/block";
import { Page } from "@/components/ui/page";

/**
 * The calm "it's live" moment after an order or campaign goes out: a line icon at most (no
 * characters in confirmations, round 3 answers item 15), the title, one green action, then details.
 */
export function SuccessScreen({
  icon,
  title,
  lead,
  primary,
  secondary,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  lead: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Page width="narrow">
      <Block tone="paper" pad="lg" className="mx-auto flex max-w-[600px] flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {icon ? (
            <span className="grid size-14 place-items-center rounded-full bg-(--y-mist)" aria-hidden>
              {icon}
            </span>
          ) : null}
          <h1
            className="y-display y-t-display outline-none"
            tabIndex={-1}
            ref={(node) => node?.focus({ preventScroll: true })}
            aria-live="polite"
          >
            {title}
          </h1>
          <p className="y-body y-fg-2 max-w-[46ch]">{lead}</p>
        </div>
        {children ? <div className="border-t border-(--b-line) pt-6">{children}</div> : null}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <div className="flex flex-1 flex-col">{primary}</div>
          {secondary ? <div className="flex flex-col sm:flex-1">{secondary}</div> : null}
        </div>
      </Block>
    </Page>
  );
}
