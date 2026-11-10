"use client";

import { Block } from "@/components/ui/block";
import { Celebrate } from "@/components/ui/celebrate";
import { Page } from "@/components/ui/page";

/** The calm "it's live" moment after an order or campaign goes out: one green action, then details. */
export function SuccessScreen({
  title,
  lead,
  primary,
  secondary,
  children,
}: {
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
          <Celebrate className="h-28 w-44" />
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
