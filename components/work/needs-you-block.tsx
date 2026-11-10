import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

import { Progress } from "@/components/ui/progress";

import type { NeedsYou } from "./needs-you";

/**
 * Work's "Needs you" (Work spec 6.4.1, round 3 answers item 13): the single most urgent thing for
 * this account across both sides, as one white card with a narrow accent bar (not a green block),
 * its countdown and a dark button. The whole card is one link. `showSide` adds "You ordered" /
 * "You're making" for accounts that work on both sides. Render nothing when nothing is urgent.
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
  const side = step.side === "business" ? "You ordered" : "You're making";
  return (
    <section aria-label="Needs you" className={className}>
      <Link href={step.href} data-tone="paper" className="y-block y-needs">
        <span className="y-needs-main">
          <span className="y-needs-ey">
            <span aria-hidden className="y-needs-dot" />
            Needs you
            <span className="y-needs-ctx">
              {" "}
              · {step.eyebrow}
              {showSide ? ` · ${side}` : ""}
            </span>
          </span>
          <span className="y-display y-needs-t">{step.title}</span>
          <span className="y-needs-line">{step.line}</span>
          {step.clock ? (
            <span className="y-needs-clock">
              {step.clock.progress !== undefined ? (
                <Progress value={step.clock.progress} size="md" className="y-needs-track" />
              ) : null}
              <span className="y-needs-when" data-look={step.clock.look}>
                <Clock size={14} strokeWidth={2} aria-hidden className="flex-none" />
                {step.clock.text}
              </span>
            </span>
          ) : null}
        </span>
        <span className="y-pill y-needs-go" data-variant="contrast" data-size="lg" data-arrow="true">
          <span className="min-w-0 truncate">{step.action}</span>
          <span aria-hidden className="y-arrow">
            <ArrowRight size={20} strokeWidth={2.25} className="y-flip" />
          </span>
        </span>
      </Link>
    </section>
  );
}
