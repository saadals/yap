"use client";

import { AlertTriangle, Download, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";

import { StarRow } from "@/components/domain/stars";
import { NextStep as NextStepBox } from "@/components/ui/next-step";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { dueLabel, plural, quoted, shortDate, timeOf, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { commentsCloseAt, commentsOpen, keepLiveUntil, openComments, requestedComments, reviewById } from "@/lib/selectors";
import { actions, type DemoState, useDemo } from "@/lib/store";
import {
  addonById,
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  CAMPAIGN_RESTORE_HOURS,
  FEE_PCT,
  includedWith,
} from "@/lib/taxonomy";

import {
  ago,
  autoApproveDate,
  cancelledAt,
  cash,
  daysLeftLabel,
  revisionsLeft,
  reviewElapsed,
  type SlotContext,
  type Workspace,
  scrollMotion,
} from "./helpers";

type Clock = { text: ReactNode; tone?: "warning" | "danger" | "neutral" | "success"; progress?: number };

/**
 * What the next step says and offers, by side × status (Work spec 6.8.2, 6.9; round 3 answers,
 * item 47 for the brand). One sentence, a clock line, at most one green action. `bar` is what the
 * phone's sticky bar carries (only when there's a primary action); `after` is extra context under
 * the box (the offer's message, a review, a re-post form).
 */
export type Step = {
  label?: string;
  text: ReactNode;
  clock?: Clock;
  actions?: ReactNode;
  bar?: ReactNode;
  look?: "green" | "quiet";
  /** Announce changes politely (async states such as checking a post). */
  live?: boolean;
  after?: ReactNode;
};

type Toast = ReturnType<typeof useToast>;

/** The step for this order, from the viewer's side. */
export function useNextStep(ws: Workspace): Step {
  const s = useDemo();
  const toast = useToast();
  if (ws.slot) return ws.side === "business" ? brandSlotStep(ws, ws.slot, s, toast) : creatorSlotStep(ws, ws.slot, s, toast);
  return ws.side === "business" ? brandStep(ws, s) : creatorStep(ws, s, toast);
}

/** The next-step box inside the order's header card. */
export function OrderNextStep({ step }: { step: Step }) {
  return (
    <div aria-live={step.live ? "polite" : undefined}>
      <NextStepBox
        label={step.label ?? "Next step"}
        clock={step.clock}
        actions={step.actions}
        look={step.look ?? "green"}
        phoneActions={!step.bar}
      >
        {step.text}
      </NextStepBox>
      {step.after ? <div className="y-ord-after">{step.after}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                               */
/* -------------------------------------------------------------------------- */

const dueClock = (iso: string, prefix?: string): Clock => {
  const due = dueLabel(iso);
  const text = prefix ? `${prefix} ${weekdayDate(iso)}, ${timeOf(iso)}` : due.text === `Due ${weekdayDate(iso)}` ? due.text : `${due.text} · ${weekdayDate(iso)}`;
  return {
    text: prefix && due.urgency !== "ok" ? `${text} · ${due.text.replace(/^Due /, "").toLowerCase()}` : text,
    tone: due.urgency === "late" || due.text === "Due today" ? "danger" : due.urgency === "soon" ? "warning" : "neutral",
  };
};

const reviewClock = (ws: Workspace, suffix = ""): Clock | undefined => {
  const auto = autoApproveDate(ws.commission, ws.latest);
  if (!auto) return undefined;
  return {
    text: `Auto-approves ${weekdayDate(auto)} · ${daysLeftLabel(auto)}${suffix}`,
    // The brand has to act before then; the creator is only waiting.
    tone: ws.side === "business" ? "warning" : "neutral",
    progress: reviewElapsed(ws.commission, ws.latest),
  };
};

const Primary = ({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) =>
  href ? (
    <PillButton variant="neon" size="sm" href={href}>
      {children}
    </PillButton>
  ) : (
    <PillButton variant="neon" size="sm" onClick={onClick}>
      {children}
    </PillButton>
  );

const Secondary = ({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) =>
  href ? (
    <PillButton variant="soft" size="sm" href={href}>
      {children}
    </PillButton>
  ) : (
    <PillButton variant="soft" size="sm" onClick={onClick}>
      {children}
    </PillButton>
  );

const BarPrimary = ({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) =>
  href ? (
    <PillButton variant="neon" href={href}>
      {children}
    </PillButton>
  ) : (
    <PillButton variant="neon" onClick={onClick}>
      {children}
    </PillButton>
  );

const BarSecondary = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <PillButton variant="soft" onClick={onClick}>
    {children}
  </PillButton>
);

const message = (ws: Workspace) => (
  <Secondary onClick={ws.goToMessages}>
    <span className="inline-flex items-center gap-1.5">
      <MessageSquare size={15} aria-hidden /> Message
    </span>
  </Secondary>
);

function Quote({ text, by }: { text: string; by: string }) {
  return (
    <figure className="y-ord-quote">
      <blockquote>{quoted(text)}</blockquote>
      <figcaption>{by}</figcaption>
    </figure>
  );
}

function ReviewLine({ s, ws, mine }: { s: DemoState; ws: Workspace; mine: boolean }) {
  const review = ws.commission.reviewId ? reviewById(s, ws.commission.reviewId) : undefined;
  if (!review) return null;
  return (
    <figure className="y-ord-review">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="y-small font-semibold">{mine ? "Your review" : `${review.authorName}'s review`}</span>
        <StarRow value={review.rating} size={14} />
        {review.wouldRehire ? <span className="y-micro y-fg-2">Would hire again</span> : null}
      </div>
      <blockquote className="y-small y-fg-2 line-clamp-2">{quoted(review.text)}</blockquote>
    </figure>
  );
}

/** "Refunded in full to your card…" / "…you weren't charged": what happened to the money. */
const refundLine = (ws: Workspace) =>
  ws.commission.payment.status === "refunded"
    ? `${cash(ws.totals.total)} refunded in full to your card. Refunds take 3 to 5 working days to show`
    : "The authorization on your card was released. You weren't charged";

const withReason = (reason: string | undefined) => (reason ? `${reason.replace(/[.!?]$/, "")}. ` : "");

/* -------------------------------------------------------------------------- */
/* Brand, custom order                                                         */
/* -------------------------------------------------------------------------- */

function brandStep(ws: Workspace, s: DemoState): Step {
  const { commission: c, creator, creatorName: name, latest, adCopy } = ws;
  const next = c.deliveries.length + 1;
  switch (c.status) {
    case "offered":
      return {
        look: "quiet",
        text: (
          <>
            Waiting for {name} to accept. Sent {ago(c.createdAt)}
            {creator ? `; ${name} usually replies within ${plural(creator.responseHours, "hour")}` : ""}.
          </>
        ),
        actions: <Secondary onClick={() => ws.openSheet("withdraw")}>Withdraw offer</Secondary>,
      };

    case "in_progress":
      return {
        look: "quiet",
        text: `${name} is working on version ${next}. Due ${weekdayDate(c.dueDate)}.`,
        clock: dueClock(c.dueDate),
        actions: message(ws),
      };

    case "revision": {
      const sent = latest ? requestedComments(latest).length : 0;
      return {
        look: "quiet",
        text: (
          <>
            {name} is working on version {next}.
            {latest ? ` You sent ${sent ? plural(sent, "comment") : "your notes"} on version ${latest.version}.` : ""}
          </>
        ),
        clock: dueClock(c.dueDate),
        actions: message(ws),
      };
    }

    case "delivered": {
      const v = latest?.version ?? 1;
      const left = revisionsLeft(c);
      const open = latest ? openComments(latest).length : 0;
      return {
        text:
          left > 0 ? (
            <>
              Version {v} is in. Approve it, or request changes using your open comments
              {open ? ` (${open})` : ""}. {left} of {c.revisionsIncluded} revisions left.
            </>
          ) : (
            <>
              Version {v} is in, and you&apos;ve used the {plural(c.revisionsIncluded, "included revision")}. Approve it,
              agree a paid extra revision with {name}, or open a dispute.
            </>
          ),
        clock: reviewClock(ws),
        actions: (
          <>
            <Primary onClick={() => ws.openSheet("approve")}>Approve and release</Primary>
            <Secondary onClick={() => ws.openSheet("requestChanges")}>Request changes</Secondary>
          </>
        ),
        bar: (
          <>
            <BarPrimary onClick={() => ws.openSheet("approve")}>Approve</BarPrimary>
            <BarSecondary onClick={() => ws.openSheet("requestChanges")}>Request changes</BarSecondary>
          </>
        ),
      };
    }

    case "completed": {
      const reviewed = Boolean(c.reviewId);
      const closes = commentsCloseAt(c);
      const open = commentsOpen(c);
      const variation = creator ? paths.orderCreator(creator.handle, { again: c.id }) : undefined;
      return {
        label: "Done",
        look: "quiet",
        text: (
          <>
            Approved and paid{c.completedAt ? ` ${shortDate(c.completedAt)}` : ""}.{" "}
            {adCopy ? "The final copy is in Files." : "The clean file and raw footage are in Files."}
            {open && closes ? ` You can leave feedback until ${shortDate(closes)}.` : ""}
          </>
        ),
        actions: (
          <>
            {variation ? <Primary href={variation}>Order a variation</Primary> : null}
            {reviewed ? null : <Secondary onClick={() => ws.openSheet("review")}>Leave a review</Secondary>}
            <Secondary onClick={() => ws.showTab("files")}>Files</Secondary>
          </>
        ),
        bar: variation ? <BarPrimary href={variation}>Order a variation</BarPrimary> : undefined,
        after: reviewed ? <ReviewLine s={s} ws={ws} mine /> : undefined,
      };
    }

    case "declined":
      return {
        look: "quiet",
        label: "Closed",
        text: (
          <>
            {name} can&apos;t take this one. {withReason(c.cancelReason)}
            {refundLine(ws)}.
          </>
        ),
        actions: <Primary href={paths.explore("creators")}>Find another creator</Primary>,
      };

    case "cancelled": {
      const when = cancelledAt(c);
      return {
        look: "quiet",
        label: "Closed",
        text: (
          <>
            Cancelled{when ? ` on ${shortDate(when)}` : ""}. {withReason(c.cancelReason)}
            {c.acceptedAt || c.source === "request" ? refundLine(ws) : "The authorization on your card was released. You weren't charged"}.
          </>
        ),
      };
    }

    case "disputed":
      return disputedStep(ws);
  }
}

function disputedStep(ws: Workspace): Step {
  return {
    look: "quiet",
    label: "With Yapp support",
    text:
      ws.side === "business"
        ? `Yapp support is reading the brief, the versions, the comments and your messages. A person replies in Messages within 48 hours. If ${ws.creatorName} can't deliver what was agreed, you get a full refund.`
        : "Yapp support is reading the brief, the versions, the comments and your messages. A person replies in Messages within 48 hours. If the work matches what was agreed, you get paid in full.",
    actions: message(ws),
  };
}

/* -------------------------------------------------------------------------- */
/* Creator, custom order                                                       */
/* -------------------------------------------------------------------------- */

function creatorStep(ws: Workspace, s: DemoState, toast: Toast): Step {
  const { commission: c, businessName: brand, latest, totals, adCopy } = ws;
  const next = c.deliveries.length + 1;
  const what = adCopy ? "the copy" : `version ${next}`;
  switch (c.status) {
    case "offered": {
      const accept = () => {
        actions.acceptOffer(c.id);
        toast({ message: `Offer accepted. ${cash(totals.creatorEarns)} is held for you. Time to make version 1.` });
        window.scrollTo({ top: 0, behavior: scrollMotion() });
      };
      const includes = c.addons.map((a) => `${addonById[a.id]?.name ?? "Add-on"} (${cash(a.price)})`).join(", ");
      return {
        text: (
          <>
            {brand} wants to work with you. You earn <b>{cash(totals.creatorEarns)}</b> after the {FEE_PCT}% Yapp fee on
            their {cash(totals.total)} offer.
          </>
        ),
        clock: { text: `Due ${weekdayDate(c.dueDate)} · ${plural(c.revisionsIncluded, "revision")} included`, tone: "neutral" },
        actions: (
          <>
            <Primary onClick={accept}>Accept offer</Primary>
            <Secondary onClick={() => ws.openSheet("decline")}>Decline</Secondary>
          </>
        ),
        bar: (
          <>
            <BarPrimary onClick={accept}>Accept offer</BarPrimary>
            <BarSecondary onClick={() => ws.openSheet("decline")}>Decline</BarSecondary>
          </>
        ),
        after: (
          <>
            {c.offerMessage ? <Quote text={c.offerMessage} by={brand} /> : null}
            <p className="y-small y-fg-2">
              {includes ? `Includes ${includes}. ` : ""}
              {includedWith(c.brief.usage)} Payment is already authorized: you&apos;re paid when they approve.
            </p>
          </>
        ),
      };
    }

    case "in_progress":
      return {
        text: adCopy
          ? `Write the copy and send it here. ${brand} then approves it or asks for changes.`
          : `Make version ${next} and upload it here. ${brand} then approves it or asks for changes.`,
        clock: dueClock(c.dueDate),
        actions: (
          <>
            <Primary onClick={() => ws.openSheet("deliver")}>{adCopy ? "Send the copy" : `Upload version ${next}`}</Primary>
            <Secondary onClick={() => ws.showTab("brief")}>Brief</Secondary>
          </>
        ),
        bar: <BarPrimary onClick={() => ws.openSheet("deliver")}>{adCopy ? "Send the copy" : `Upload version ${next}`}</BarPrimary>,
      };

    case "revision": {
      const notes = latest ? openComments(latest).filter((m) => m.requestedAt || m.author === "business").length : 0;
      // (Any open comment the brand sent, or of theirs on older data.)
      return {
        text: latest
          ? notes
            ? `${brand} asked for changes on version ${latest.version}. Fix the open comments and send ${what}.`
            : `${brand} asked for changes on version ${latest.version}. Their note is in Messages; send ${what} when it's ready.`
          : `Send ${what} when it's ready.`,
        clock: dueClock(c.dueDate),
        actions: (
          <>
            <Primary onClick={() => ws.openSheet("deliver")}>Send version {next}</Primary>
            <Secondary onClick={() => ws.showTab("brief")}>Brief</Secondary>
          </>
        ),
        bar: <BarPrimary onClick={() => ws.openSheet("deliver")}>Send version {next}</BarPrimary>,
      };
    }

    case "delivered":
      return {
        look: "quiet",
        text: `Version ${latest?.version ?? 1} is with ${brand}. They ${adCopy ? "read it" : "watch it"} and comment, or approve.${latest ? ` Sent ${ago(latest.deliveredAt)}.` : ""}`,
        clock: reviewClock(ws, " if they don't respond"),
        actions: message(ws),
      };

    case "completed": {
      const rated = Boolean(c.clientFeedback);
      return {
        label: "Done",
        look: "quiet",
        text: `${brand} approved version ${latest?.version ?? 1}${c.completedAt ? ` on ${shortDate(c.completedAt)}` : ""}. ${cash(totals.creatorEarns)} is in your available balance.`,
        clock: { text: `Paid · after the ${FEE_PCT}% Yapp fee`, tone: "success" },
        actions: (
          <>
            {rated ? null : <Primary onClick={() => ws.openSheet("clientFeedback")}>Rate {brand}</Primary>}
            <Secondary href={paths.wallet}>See your wallet</Secondary>
          </>
        ),
        after: c.reviewId || c.clientFeedback ? (
          <>
            <ReviewLine s={s} ws={ws} mine={false} />
            {c.clientFeedback ? (
              <p className="y-small inline-flex flex-wrap items-center gap-2">
                <span className="font-semibold">You rated {brand}</span>
                <StarRow value={c.clientFeedback.rating} size={14} />
                <span className="y-fg-2">Only Yapp sees this.</span>
              </p>
            ) : null}
          </>
        ) : undefined,
      };
    }

    case "declined":
      return {
        look: "quiet",
        label: "Closed",
        text: (
          <>
            You declined this offer. {withReason(c.cancelReason)}
            {brand} was told, and the authorization on their card was released.
          </>
        ),
        actions: <Secondary href={paths.findWork()}>Find new work</Secondary>,
      };

    case "cancelled": {
      const when = cancelledAt(c);
      return {
        look: "quiet",
        label: "Closed",
        text: (
          <>
            Cancelled{when ? ` on ${shortDate(when)}` : ""}. {withReason(c.cancelReason)}
            {brand} was refunded. If you&apos;d already started, use Get help and we&apos;ll look at it with you.
          </>
        ),
        actions: <Secondary href={paths.findWork()}>Find new work</Secondary>,
      };
    }

    case "disputed":
      return disputedStep(ws);
  }
}

/* -------------------------------------------------------------------------- */
/* Campaign slot, brand                                                        */
/* -------------------------------------------------------------------------- */

function brandSlotStep(ws: Workspace, slot: SlotContext, s: DemoState, toast: Toast): Step {
  const { commission: c, creatorName: name, latest } = ws;
  const back = c.requestId ? <Secondary href={paths.order(c.requestId)}>Back to campaign</Secondary> : null;
  const slotMoney =
    c.payment.status === "refunded"
      ? "The campaign is closed, so the slot's money went back to your card in full."
      : "The slot reopened for another creator, and its money stays held in your campaign.";
  const next = c.deliveries.length + 1;

  switch (c.status) {
    case "in_progress":
      return {
        look: "quiet",
        text: `${name} is filming. Their review copy comes here, watermarked until you approve it.`,
        clock: dueClock(c.dueDate, "Upload by"),
        actions: message(ws),
      };

    case "revision":
      return {
        look: "quiet",
        text: `${name} is redoing the video for version ${next}.${latest ? ` You asked for changes on version ${latest.version}.` : ""}`,
        actions: message(ws),
      };

    case "delivered":
      return {
        text: `Version ${latest?.version ?? 1} is in. Approve it, request changes using your open comments, or reject it and the slot goes to another creator.`,
        clock: reviewClock(ws),
        actions: (
          <>
            <Primary onClick={() => ws.openSheet("approve")}>Approve</Primary>
            <Secondary onClick={() => ws.openSheet("requestChanges")}>Request changes</Secondary>
            <PillButton variant="ghost" size="sm" onClick={() => ws.openSheet("reject")}>
              Reject
            </PillButton>
          </>
        ),
        bar: (
          <>
            <BarPrimary onClick={() => ws.openSheet("approve")}>Approve</BarPrimary>
            <BarSecondary onClick={() => ws.openSheet("requestChanges")}>Request changes</BarSecondary>
          </>
        ),
      };

    case "completed": {
      const post = c.post;
      const download = (
        <Secondary
          onClick={() => {
            toast({ message: "Downloading the clean file", tone: "info" });
            ws.showTab("files");
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Download size={15} aria-hidden /> Files
          </span>
        </Secondary>
      );
      const rating = c.quickRating ? (
        <p className="y-small y-fg-2 inline-flex flex-wrap items-center gap-2">
          You rated {name} <StarRow value={c.quickRating} size={14} />
        </p>
      ) : null;
      if (post?.status === "live") {
        const released = c.payment.status === "released";
        return {
          label: released ? "Done" : "Next step",
          look: "quiet",
          live: true,
          text: released
            ? `Posted on ${slot.platformName} and verified. ${name} has been paid.`
            : `Posted on ${slot.platformName} and verified: ${slot.brandHandle} tagged, paid-partnership label on. ${name} is paid${c.withdrawableFrom ? ` on ${weekdayDate(c.withdrawableFrom)}` : ""} if it's still up.`,
          clock: { text: "Verified · tag and label found", tone: "success" },
          actions: (
            <>
              {download}
              {back}
            </>
          ),
          after: rating,
        };
      }
      if (post?.status === "checking") {
        return {
          look: "quiet",
          live: true,
          text: `${name} posted it. We're checking the tag and the paid-partnership label.`,
          clock: { text: "Usually under a minute", tone: "neutral" },
          actions: download,
          after: rating,
        };
      }
      if (post?.status === "removed") {
        return {
          look: "quiet",
          text: `${name}'s post was taken down. Their pay stays held; if it isn't back within ${CAMPAIGN_RESTORE_HOURS} hours, the slot reopens and its money returns to your campaign.`,
          clock: { text: `${CAMPAIGN_RESTORE_HOURS} hours to restore it`, tone: "danger" },
          actions: download,
        };
      }
      return {
        look: "quiet",
        text: `Full-quality file unlocked. ${name} posts it next on their ${slot.platformName}, tagging ${slot.brandHandle} with the paid-partnership label, and is paid ${CAMPAIGN_RELEASE_DAYS} days after we verify the post.`,
        actions: (
          <>
            {download}
            {back}
          </>
        ),
        after: rating,
      };
    }

    case "cancelled":
      return {
        look: "quiet",
        label: "Closed",
        text:
          c.cancelCode === "video_rejected" ? (
            <>
              You didn&apos;t approve this video. {withReason(c.cancelReason)}
              {slotMoney}
            </>
          ) : c.cancelCode === "campaign_closed" ? (
            "This slot ended when the campaign closed. Its money went back to your campaign hold."
          ) : c.cancelCode === "post_removed" ? (
            <>
              {name}&apos;s post stayed down: it wasn&apos;t back within {CAMPAIGN_RESTORE_HOURS} hours, so {name}
              wasn&apos;t paid.{" "}
              {c.payment.status === "refunded"
                ? "The campaign is closed, so the slot's money went back to your card in full."
                : "The slot reopened, and its money is back in your campaign."}
            </>
          ) : (
            <>
              You removed {name} from this slot. {withReason(c.cancelReason)}
              {slotMoney}
            </>
          ),
        actions: back,
      };

    case "disputed":
      return disputedStep(ws);

    // Slots skip offers; keep the custom steps for odd demo states.
    case "offered":
    case "declined":
      return brandStep(ws, s);
  }
}

/* -------------------------------------------------------------------------- */
/* Campaign slot, creator                                                      */
/* -------------------------------------------------------------------------- */

function creatorSlotStep(ws: Workspace, slot: SlotContext, s: DemoState, toast: Toast): Step {
  const { commission: c, businessName: brand, latest, totals } = ws;
  const net = cash(totals.creatorEarns);
  const next = c.deliveries.length + 1;
  const findMore = <Secondary href={paths.findWork()}>Find another campaign</Secondary>;
  const days = slot.terms?.deadlineDays;

  switch (c.status) {
    case "in_progress":
      return {
        text: (
          <>
            Film it and upload version 1.{days ? <> Deadline set by {brand}: <b>{plural(days, "day")}</b> from picking.</> : null}
          </>
        ),
        clock: dueClock(c.dueDate, "Upload by"),
        actions: (
          <>
            <Primary onClick={() => ws.openSheet("deliver")}>Upload version 1</Primary>
            <Secondary onClick={() => ws.showTab("brief")}>Brief</Secondary>
          </>
        ),
        bar: <BarPrimary onClick={() => ws.openSheet("deliver")}>Upload version 1</BarPrimary>,
      };

    case "revision":
      return {
        text: `${brand} asked for changes on version ${latest?.version ?? 1}. Fix the open comments and upload version ${next}.`,
        actions: (
          <>
            <Primary onClick={() => ws.openSheet("deliver")}>Upload version {next}</Primary>
            <Secondary onClick={() => ws.showTab("brief")}>Brief</Secondary>
          </>
        ),
        bar: <BarPrimary onClick={() => ws.openSheet("deliver")}>Upload version {next}</BarPrimary>,
      };

    case "delivered":
      return {
        look: "quiet",
        text: `Version ${latest?.version ?? 1} is with ${brand}. They watch the watermarked copy and comment, or approve.`,
        clock: reviewClock(ws, " if they don't respond"),
        actions: message(ws),
      };

    case "completed": {
      const post = c.post;
      if (post?.status === "checking") {
        return {
          look: "quiet",
          live: true,
          text: "Checking your post: the tag and the paid-partnership label…",
          clock: { text: "Usually under a minute", tone: "neutral" },
        };
      }
      if (post?.status === "live") {
        const released = c.payment.status === "released";
        const keepUntil = keepLiveUntil(c);
        return {
          label: released ? "Done" : "Next step",
          look: "quiet",
          live: true,
          text: released
            ? `Your post is live and ${net} is ready to withdraw. Keep it up until ${keepUntil ? weekdayDate(keepUntil) : `${CAMPAIGN_KEEP_LIVE_DAYS} days after verification`}.`
            : (
                <>
                  Your post is live. <b>{net}</b> is released{" "}
                  {c.withdrawableFrom ? `on ${weekdayDate(c.withdrawableFrom)}` : `${CAMPAIGN_RELEASE_DAYS} days after verification`} if
                  the post stays up. Keep it up until{" "}
                  {keepUntil ? weekdayDate(keepUntil) : `${CAMPAIGN_KEEP_LIVE_DAYS} days after verification`}.
                </>
              ),
          clock: { text: "Verified · tag and label found", tone: "success" },
          actions: released ? <Primary href={paths.wallet}>Withdraw in Wallet</Primary> : <Secondary href={paths.wallet}>Go to Wallet</Secondary>,
          bar: released ? <BarPrimary href={paths.wallet}>Withdraw in Wallet</BarPrimary> : undefined,
        };
      }
      if (post?.status === "removed") {
        return {
          text: `Your post was taken down, so your ${net} is on hold. Put it back up within ${CAMPAIGN_RESTORE_HOURS} hours and add the new link, or the slot and its pay go back to ${brand}.`,
          clock: { text: `${CAMPAIGN_RESTORE_HOURS} hours to restore it`, tone: "danger" },
          actions: <Primary onClick={() => ws.openSheet("postLink")}>Add the new link</Primary>,
          bar: <BarPrimary onClick={() => ws.openSheet("postLink")}>Add the new link</BarPrimary>,
          after: (
            <p className="y-small inline-flex items-start gap-2 text-(--y-warning)">
              <AlertTriangle size={16} aria-hidden className="mt-0.5 flex-none" /> The pay is held while the post is down.
            </p>
          ),
        };
      }
      return {
        text: `Approved. Now post it on your ${slot.platformName} with the tag and the paid-partnership label, then add the link. Your ${net} is released ${CAMPAIGN_RELEASE_DAYS} days after we verify the post.`,
        clock: { text: `Tag ${slot.brandHandle} · paid-partnership label on`, tone: "neutral" },
        actions: (
          <>
            <Primary onClick={() => ws.openSheet("postLink")}>Add post link</Primary>
            <Secondary onClick={() => ws.showTab("brief")}>Posting rules</Secondary>
          </>
        ),
        bar: <BarPrimary onClick={() => ws.openSheet("postLink")}>Add post link</BarPrimary>,
      };
    }

    case "cancelled":
      return {
        look: "quiet",
        label: "Closed",
        text:
          c.cancelCode === "post_removed"
            ? `Your post stayed down: it wasn't back within ${CAMPAIGN_RESTORE_HOURS} hours, so the slot and its pay went back to ${brand}.`
            : c.cancelCode === "video_rejected"
              ? "This video wasn't approved, and the slot went back to the campaign. Thanks for giving it a go."
              : c.cancelCode === "campaign_closed"
                ? `This slot ended when ${brand} closed the campaign.`
                : `${brand} went with another creator for this slot. Thanks for taking it.`,
        actions: findMore,
        after:
          c.cancelCode === "video_rejected" && c.cancelReason ? <Quote text={c.cancelReason} by={brand} /> : undefined,
      };

    case "disputed":
      return disputedStep(ws);

    case "offered":
    case "declined":
      return creatorStep(ws, s, toast);
  }
}
