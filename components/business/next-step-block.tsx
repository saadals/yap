"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

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
      className={`y-block y-pad-md group flex flex-col gap-6 transition-transform active:scale-[0.99] ${className}`}
    >
      <div className="flex flex-col gap-2">
        <span className="y-display y-title">{step.title}</span>
        <span className="y-small y-fg-2">{step.line}</span>
      </div>
      <span className="y-small flex items-center justify-between gap-3 font-semibold">
        {step.action}
        <span
          aria-hidden
          className="grid size-12 flex-none place-items-center rounded-full bg-(--y-on-color) text-(--y-neon) transition-transform duration-(--y-dur-2) group-hover:scale-105"
        >
          <ArrowRight size={22} className="y-flip" />
        </span>
      </span>
    </Link>
  );
}
