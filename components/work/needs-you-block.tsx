import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { NeedsYou } from "./needs-you";

/**
 * The Work page's one neon element: the most urgent thing to do, as one big link. `showSide`
 * adds "You ordered" / "You're making" for accounts that work on both sides.
 */
export function NeedsYouBlock({
  step,
  showSide = false,
  className = "",
}: {
  step: NeedsYou;
  showSide?: boolean;
  className?: string;
}) {
  return (
    <section aria-label={step.urgent ? "Needs you" : "Next step"} className={className}>
      <Link
        href={step.href}
        data-tone="neon"
        className="y-block y-pad-md group flex flex-col gap-6 transition-transform active:scale-[0.99] md:flex-row md:items-end md:justify-between"
      >
        <span className="flex min-w-0 flex-col gap-2">
          <span className="y-micro flex items-center gap-2 font-semibold">
            <span aria-hidden className="size-2 rounded-full bg-(--y-on-color)" />
            {step.urgent ? "Needs you" : step.eyebrow}
            {step.urgent ? <span className="font-medium"> · {step.eyebrow}</span> : null}
            {showSide ? (
              <span className="font-medium">· {step.side === "business" ? "You ordered" : "You're making"}</span>
            ) : null}
          </span>
          <span className="y-display y-title">{step.title}</span>
          <span className="y-small y-fg-2 max-w-[62ch]">{step.line}</span>
        </span>
        <span className="y-small flex flex-none items-center justify-between gap-3 font-semibold md:justify-end">
          {step.action}
          <span
            aria-hidden
            className="grid size-12 flex-none place-items-center rounded-full bg-(--y-on-color) text-(--y-neon) transition-transform duration-(--y-dur-2) group-hover:scale-105"
          >
            <ArrowRight size={22} className="y-flip" />
          </span>
        </span>
      </Link>
    </section>
  );
}
