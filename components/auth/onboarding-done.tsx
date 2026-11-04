"use client";

import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Block } from "@/components/ui/block";
import { Celebrate } from "@/components/ui/celebrate";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";

export type NextStep = {
  href: string;
  label: string;
  body: string;
  icon: React.ReactNode;
};

/** Success moment after onboarding: the cast, a clear headline, and where to go next. */
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
  /** The one neon action. */
  primary: NextStep;
  others: NextStep[];
  /** One line about the demo continuing in a seeded workspace. */
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
    <Page>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <Block
          tone="lavender"
          pad="lg"
          className="y-enter flex flex-col items-start gap-6 lg:col-span-7"
        >
          <Celebrate className="h-36 w-56 md:h-44 md:w-72" />
          <div className="flex flex-col gap-3">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="y-display y-t-display max-w-[16ch] outline-none"
            >
              {title}
            </h1>
            <p className="y-lead y-fg-2 max-w-[52ch]">{lead}</p>
          </div>
          {children}
        </Block>
        <Block tone="paper" pad="lg" className="flex flex-col gap-5 lg:col-span-5">
          <h2 className="y-display y-title">Next steps</h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 rounded-(--y-r-tile) bg-(--b-chip) p-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid size-11 flex-none place-items-center rounded-full bg-(--b-bg)"
                >
                  {primary.icon}
                </span>
                <p className="y-small y-fg-2 pt-0.5">{primary.body}</p>
              </div>
              <PillButton
                href={primary.href}
                variant="neon"
                size="lg"
                arrow
                className="justify-between ps-6"
              >
                {primary.label}
              </PillButton>
            </div>
            <ul className="flex flex-col gap-2">
              {others.map((step) => (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    className="y-tile y-hoverable flex min-h-18 items-center gap-3 p-4"
                  >
                    <span
                      aria-hidden
                      className="grid size-11 flex-none place-items-center rounded-full bg-(--b-bg)"
                    >
                      {step.icon}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="y-head">{step.label}</span>
                      <span className="y-small y-fg-2">{step.body}</span>
                    </span>
                    <ArrowRight size={18} aria-hidden className="y-flip flex-none" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="y-micro y-fg-3 mt-auto flex gap-1.5">
            <Info size={14} aria-hidden className="mt-px flex-none" />
            <span>{note}</span>
          </p>
        </Block>
      </div>
    </Page>
  );
}
