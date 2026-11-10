"use client";

import { Info } from "lucide-react";
import { useEffect, useRef } from "react";

import { Celebrate } from "@/components/ui/celebrate";
import { List, Row } from "@/components/ui/list";
import { PillButton } from "@/components/ui/pill-button";

export type NextStep = { href: string; label: string; meta?: string; icon: React.ReactNode };

/** The end of onboarding: a small celebration, where you are now, and what to do next. */
export function OnboardingDone({
  title,
  lead,
  primary,
  others,
  note,
  children,
}: {
  title: React.ReactNode;
  lead: React.ReactNode;
  /** The one green action. */
  primary: { href: string; label: string };
  others: NextStep[];
  /** One line about the demo continuing in a seeded account. */
  note: React.ReactNode;
  /** Optional summary under the lead. */
  children?: React.ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="y-enter mx-auto flex w-full max-w-[560px] flex-col gap-8 pb-12">
      <div className="flex flex-col items-start gap-5">
        <Celebrate className="h-28 w-44 md:h-32 md:w-52" />
        <div className="flex flex-col gap-2">
          <h1 ref={headingRef} tabIndex={-1} className="y-display y-t-display outline-none">
            {title}
          </h1>
          <p className="y-body y-fg-2 max-w-[52ch]">{lead}</p>
          {children}
        </div>
        <PillButton href={primary.href} variant="neon" size="lg" arrow>
          {primary.label}
        </PillButton>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="y-head">Next steps</h2>
        <List label="Next steps">
          {others.map((step) => (
            <Row
              key={step.href}
              href={step.href}
              lead={
                <span aria-hidden className="y-tile grid size-10 place-items-center !rounded-full">
                  {step.icon}
                </span>
              }
              title={step.label}
              meta={step.meta}
            />
          ))}
        </List>
      </div>

      <p className="y-micro y-fg-2 flex gap-1.5">
        <Info size={14} aria-hidden className="mt-px flex-none" />
        <span>{note}</span>
      </p>
    </div>
  );
}
