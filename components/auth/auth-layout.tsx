"use client";

import { Check } from "lucide-react";

import { Block } from "@/components/ui/block";
import { Cast, duoCast } from "@/components/ui/character";
import { Page } from "@/components/ui/page";

/**
 * Auth composition: the form block on the start side and one aside block on the end side.
 * Mobile: form first, then the aside (if it shows on mobile at all).
 */
export function AuthLayout({
  aside,
  children,
}: {
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Page>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <Block
          tone="paper"
          pad="lg"
          className="flex flex-col justify-center lg:col-span-7 lg:min-h-[calc(100dvh-112px)]"
        >
          <div className="mx-auto flex w-full max-w-md flex-col gap-6">{children}</div>
        </Block>
        {aside ? <div className="flex flex-col lg:col-span-5">{aside}</div> : null}
      </div>
    </Page>
  );
}

/** Lavender brand moment for sign-up (desktop only): a headline, three points and the duo cast. */
export function AuthVisual({ title, points }: { title: React.ReactNode; points: string[] }) {
  return (
    <Block
      tone="lavender"
      pad="lg"
      className="relative hidden h-full flex-col justify-between gap-10 overflow-hidden !pb-0 lg:flex"
    >
      <div className="flex flex-col gap-6 pt-4">
        <p className="y-display y-title max-w-[20ch] lg:text-[34px] lg:leading-[1.06]">{title}</p>
        <ul className="flex flex-col gap-3">
          {points.map((point) => (
            <li key={point} className="y-small flex items-center gap-2 font-medium">
              <span
                aria-hidden
                className="grid size-6 flex-none place-items-center rounded-full bg-(--y-on-color) text-(--y-lavender)"
              >
                <Check size={14} strokeWidth={3} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
      <Cast
        members={duoCast}
        viewBox="-10 -6 196 136"
        animate
        className="-mb-px h-36 w-auto flex-none self-end"
      />
    </Block>
  );
}
