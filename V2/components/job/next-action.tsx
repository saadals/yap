import { Download, MessageSquare, UploadCloud } from "lucide-react";

import { weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";

import { cash, FORM, possessive, type Job, type NextAction } from "./helpers";

/** Where a finished job's follow-ups stand for the ordering side (review → learnings → order again). */
export type FollowUp = "review" | "learnings" | "again";

export type Flow = {
  /** A review was posted on this visit: offer to save what was learned next. */
  afterReview: boolean;
  /** Learnings were saved or skipped on this visit. */
  learningsDone: boolean;
  accept: () => void;
  download: () => void;
};

export function followUp(job: Job, flow: Pick<Flow, "afterReview" | "learningsDone">): FollowUp {
  if (!job.commission.reviewId) return "review";
  if (flow.afterReview && !flow.learningsDone && job.product) return "learnings";
  return "again";
}

/**
 * The one next step for the viewer, by side × status. Waiting states get a quiet "Message" so the
 * phone bar is never empty; forms in the stage panel are submitted from the phone bar with `form=`.
 */
export function nextAction(job: Job, flow: Flow): NextAction | null {
  const { commission: c, side, slot, creatorName, businessName, otherName } = job;
  const message = (waiting: string): NextAction => ({
    label: `Message ${otherName}`,
    variant: "outline",
    icon: <MessageSquare size={16} aria-hidden />,
    run: job.focusComposer,
    waiting,
  });
  const nextVersion = c.deliveries.length + 1;

  if (side === "business") {
    switch (c.status) {
      case "offered":
        return message(`Waiting for ${creatorName} to accept`);
      case "in_progress":
        return message(slot ? `${creatorName} is filming · due ${weekdayDate(c.dueDate)}` : `${creatorName} is making it · due ${weekdayDate(c.dueDate)}`);
      case "revision":
        return message(`${creatorName} is working on ${job.noun} ${nextVersion}`);
      case "disputed":
        return message("Yapp support is on it");
      case "delivered":
        return slot
          ? { label: "Approve video", variant: "neon", arrow: true, run: () => job.openSheet("approve") }
          : {
              label: `Approve and release ${cash(job.totals.creatorEarns)}`,
              variant: "neon",
              arrow: true,
              run: () => job.openSheet("approve"),
            };
      case "completed": {
        if (slot) {
          return {
            label: "Download full quality",
            variant: "neon",
            icon: <Download size={16} aria-hidden />,
            run: flow.download,
            secondary: job.latest ? { label: "Library", href: paths.library({ video: job.latest.video.id }) } : undefined,
          };
        }
        const step = followUp(job, flow);
        if (step === "review") return { label: "Post review", variant: "neon", form: FORM.review };
        if (step === "learnings") return { label: "Save learnings", variant: "neon", form: FORM.learnings };
        return job.creator
          ? {
              label: `Order again from ${creatorName}`,
              variant: "neon",
              arrow: true,
              href: paths.orderCreator(job.creator.handle, { again: c.id }),
              secondary: job.latest ? { label: "Library", href: paths.library({ video: job.latest.video.id }) } : undefined,
            }
          : null;
      }
      case "declined":
      case "cancelled":
        if (slot && c.requestId) return { label: "Back to campaign", variant: "contrast", arrow: true, href: paths.order(c.requestId) };
        return { label: "Find another creator", variant: "neon", arrow: true, href: paths.discover() };
    }
  }

  switch (c.status) {
    case "offered":
      return {
        label: "Accept offer",
        variant: "neon",
        arrow: true,
        run: flow.accept,
        secondary: { label: "Decline", run: () => job.openSheet("decline") },
      };
    case "in_progress":
    case "revision":
      return {
        label: slot && nextVersion === 1 ? "Upload review copy" : `Upload version ${nextVersion}`,
        variant: "neon",
        icon: <UploadCloud size={16} aria-hidden />,
        run: () => job.openSheet("deliver"),
      };
    case "delivered":
      return message(`Waiting for ${possessive(businessName)} review`);
    case "disputed":
      return message("Yapp support is on it");
    case "completed":
      if (slot) {
        const post = c.post?.status;
        if (post === "due" || post === "removed" || !post) return { label: post === "removed" ? "Submit new link" : "Submit post", variant: "neon", form: FORM.post };
        if (post === "checking") return message("Checking your post");
        return c.payment.status === "released"
          ? { label: "Withdraw in Earnings", variant: "neon", arrow: true, href: paths.earnings }
          : { label: "See your earnings", variant: "contrast", arrow: true, href: paths.earnings };
      }
      if (!c.clientFeedback) return { label: "Send rating", variant: "neon", form: FORM.feedback };
      return { label: "See your earnings", variant: "contrast", arrow: true, href: paths.earnings };
    case "declined":
    case "cancelled":
      return slot
        ? { label: "Find another campaign", variant: "contrast", arrow: true, href: paths.findWork({ kind: "campaign" }) }
        : { label: "Find new work", variant: "contrast", arrow: true, href: paths.findWork() };
  }
}
