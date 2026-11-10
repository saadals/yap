import { CheckCircle2, Clock } from "lucide-react";
import type { ReactNode } from "react";

import { Progress } from "./progress";

/**
 * The "next step" box in an order's header (Work spec 6.8.2): a label, one sentence, a clock line
 * with an optional countdown track, and the action buttons. The sentence and buttons follow the
 * order's status (answers, item 47). The clock is amber within 24 hours (`warning`), red when due
 * today or late (`danger`), green once done (`success`), muted otherwise. `look="quiet"` drops the
 * green wash for states with nothing to do (waiting, cancelled). On phones the buttons move under
 * the text; pass `phoneActions={false}` when a `StickyActionBar` carries them instead.
 */
export function NextStep({
  label = "Next step",
  children,
  clock,
  actions,
  look = "green",
  phoneActions = true,
  className = "",
}: {
  label?: ReactNode;
  /** One sentence. */
  children: ReactNode;
  clock?: {
    text: ReactNode;
    tone?: "warning" | "danger" | "neutral" | "success";
    /** Elapsed share of the window, 0 to 1: draws the countdown track. */
    progress?: number;
  };
  actions?: ReactNode;
  look?: "green" | "quiet";
  phoneActions?: boolean;
  className?: string;
}) {
  const tone = clock?.tone ?? "warning";
  return (
    <div
      className={`y-next ${className}`}
      data-look={look}
      data-phone-actions={phoneActions ? undefined : "false"}
    >
      <div className="y-next-main">
        <div className="y-next-label">{label}</div>
        <p className="y-next-text">{children}</p>
        {clock ? (
          <>
            <div className="y-next-clock" data-look={tone}>
              {tone === "success" ? (
                <CheckCircle2 size={14} strokeWidth={2} aria-hidden />
              ) : (
                <Clock size={14} strokeWidth={2} aria-hidden />
              )}
              <span>{clock.text}</span>
            </div>
            {clock.progress !== undefined ? <Progress value={clock.progress} /> : null}
          </>
        ) : null}
      </div>
      {actions ? <div className="y-next-actions">{actions}</div> : null}
    </div>
  );
}
