import { Check } from "lucide-react";

import type { CampaignPost, CommissionStatus } from "@/lib/types";

const customStages = ["Agreed", "In production", "Review", "Approved & paid"];
/** Campaign slots: the creator posts the approved video on their own account. */
const campaignStages = ["Slot taken", "Filming", "Review", "Approved", "Posted"];

export function stageIndex(status: CommissionStatus): number {
  switch (status) {
    case "offered":
      return 0;
    case "in_progress":
      return 1;
    case "delivered":
    case "revision":
    case "disputed":
      return 2;
    case "completed":
      return 4;
    default:
      return -1;
  }
}

/** Campaign slot progress: Slot taken → Filming → Review → Approved → Posted (verified). */
export function campaignStageIndex(status: CommissionStatus, post?: CampaignPost): number {
  switch (status) {
    case "in_progress":
      return 1;
    case "delivered":
    case "revision":
    case "disputed":
      return 2;
    case "completed":
      return post?.status === "live" ? 5 : 4;
    default:
      return -1;
  }
}

/**
 * Commission progress: Agreed → In production → Review → Approved & paid.
 * With `campaign`, a campaign slot's track: Slot taken → Filming → Review → Approved → Posted.
 * `compact` renders a thin segmented bar with the current label only.
 */
export function StageTrack({
  status,
  campaign,
  compact = false,
  className = "",
}: {
  status: CommissionStatus;
  /** Campaign slot: pass the post (or `{}` before there is one). */
  campaign?: { post?: CampaignPost };
  compact?: boolean;
  className?: string;
}) {
  const stages = campaign ? campaignStages : customStages;
  const current = campaign ? campaignStageIndex(status, campaign.post) : stageIndex(status);
  const ended = current === -1;
  const label = ended
    ? status === "declined"
      ? "Offer declined"
      : "Cancelled"
    : current >= stages.length
      ? stages[stages.length - 1]
      : stages[current];

  if (compact) {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <span className="flex gap-1" role="img" aria-label={`Stage: ${label}`}>
          {stages.map((stage, index) => (
            <span
              key={stage}
              className={`h-1.5 flex-1 rounded-full ${
                ended
                  ? "bg-(--b-line)"
                  : index < current || current >= stages.length
                    ? "bg-(--b-fg)"
                    : index === current
                      ? "bg-(--b-fg) opacity-45"
                      : "bg-(--b-line)"
              }`}
            />
          ))}
        </span>
      </div>
    );
  }

  return (
    <ol className={`flex items-start gap-1 ${className}`} aria-label={campaign ? "Slot progress" : "Commission progress"}>
      {stages.map((stage, index) => {
        const done = !ended && (index < current || current >= stages.length);
        const active = !ended && index === current;
        return (
          <li key={stage} className="flex flex-1 flex-col items-center gap-2 text-center">
            <span className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${index === 0 ? "opacity-0" : done || active ? "bg-(--b-fg)" : "bg-(--b-line)"}`} />
              <span
                className={`grid size-9 flex-none place-items-center rounded-full ${
                  done
                    ? "bg-(--b-fg) text-(--b-bg)"
                    : active
                      ? "shadow-[inset_0_0_0_2.5px_var(--b-fg)]"
                      : "shadow-[inset_0_0_0_1.5px_var(--b-line)]"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <Check size={16} strokeWidth={3} aria-hidden />
                ) : active ? (
                  <span className="size-2.5 rounded-full bg-(--b-fg)" />
                ) : null}
              </span>
              <span className={`h-0.5 flex-1 ${index === stages.length - 1 ? "opacity-0" : done ? "bg-(--b-fg)" : "bg-(--b-line)"}`} />
            </span>
            <span className={`y-micro ${active ? "font-semibold" : "y-fg-2"}`}>
              {stage}
              <span className="sr-only">{done ? " (done)" : active ? " (current)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
