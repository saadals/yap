"use client";

import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "@/components/ui/face-avatar";
import { useDemo } from "@/lib/store";

import { nextStep } from "./next-step";

/** The one neon element on the dashboard: the most urgent thing to do, as one big link. */
export function NextStepBlock({ className = "" }: { className?: string }) {
  const s = useDemo();
  const step = nextStep(s);
  return (
    <Link
      href={step.href}
      data-tone="neon"
      className={`y-block y-pad-lg group flex flex-col justify-between gap-6 transition-transform active:scale-[0.99] ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="y-small font-semibold">{step.eyebrow}</span>
        {step.people?.length ? <AvatarStack people={step.people} size={36} max={4} /> : null}
      </div>
      <div className="flex flex-col gap-2">
        <span className="y-display y-title">{step.title}</span>
        <span className="y-small y-fg-2 max-w-[40ch]">{step.body}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        {step.deadline ? (
          <span className="y-chip min-w-0 !whitespace-normal py-1.5">
            <Clock size={14} aria-hidden className="flex-none" />
            {step.deadline}
          </span>
        ) : (
          <span />
        )}
        <span
          aria-hidden
          className="grid size-14 flex-none place-items-center rounded-full bg-(--y-on-color) text-(--y-neon) transition-transform duration-(--y-dur-2) group-hover:scale-105"
        >
          <ArrowRight size={24} className="y-flip" />
        </span>
      </div>
    </Link>
  );
}
