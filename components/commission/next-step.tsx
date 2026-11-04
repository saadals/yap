"use client";

import { ShieldCheck } from "lucide-react";

import { StarRow } from "@/components/domain/stars";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { plural, relativeDay, shortDate, weekdayDate } from "@/lib/format";
import { reviewById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { addonById } from "@/lib/taxonomy";

import { ago, autoApproveDate, cash, type Workspace } from "./helpers";

/**
 * What happens next, by role × status. Rendered inside the workspace header: one title, one
 * sentence, at most one primary action. Dates, money and revisions live in the Details block.
 */
export function NextStep({ ws }: { ws: Workspace }) {
  return ws.role === "business" ? <BusinessNextStep ws={ws} /> : <CreatorNextStep ws={ws} />;
}

function Step({
  title,
  children,
  actions,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="next-step-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 id="next-step-title" className="y-display y-title">
          {title}
        </h2>
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="y-body y-fg-2 max-w-[62ch]">{children}</p>;
}

/* -------------------------------------------------------------------------- */
/* Business                                                                    */
/* -------------------------------------------------------------------------- */

function BusinessNextStep({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const { commission, creator, creatorName, latest } = ws;
  const nextVersion = commission.deliveries.length + 1;

  switch (commission.status) {
    case "offered":
      return (
        <Step
          title={`Waiting for ${creatorName} to accept`}
          actions={
            <PillButton variant="outline" onClick={() => ws.openSheet("withdraw")}>
              Withdraw offer
            </PillButton>
          }
        >
          <Line>
            Sent {ago(commission.createdAt)}.
            {creator ? ` ${creatorName} usually replies within ${plural(creator.responseHours, "hour")}.` : ""}
          </Line>
        </Step>
      );

    case "in_progress":
      return (
        <Step title={`${creatorName} is making version ${nextVersion}`}>
          <Line>We&apos;ll let you know the moment it&apos;s delivered. Then you have 3 days to review.</Line>
        </Step>
      );

    case "revision":
      return (
        <Step title={`${creatorName} is working on your changes`}>
          <Line>
            {latest
              ? `You asked for changes on version ${latest.version}${latest.comments.length ? ` with ${plural(latest.comments.length, "note")}` : ""}. `
              : ""}
            Version {nextVersion} comes back here for review.
          </Line>
        </Step>
      );

    case "delivered": {
      const auto = autoApproveDate(commission, latest);
      return (
        <Step title={`Review version ${latest?.version ?? 1} from ${creatorName}`}>
          <Line>
            Watch it below.
            {auto ? ` It auto-approves on ${weekdayDate(auto)} if you don't respond.` : ""}
          </Line>
        </Step>
      );
    }

    case "completed": {
      const review = commission.reviewId ? reviewById(s, commission.reviewId) : undefined;
      if (!review) {
        return (
          <Step
            title={`How did ${creatorName} do?`}
            actions={
              <PillButton variant="neon" arrow onClick={() => ws.openSheet("review")}>
                Leave a review
              </PillButton>
            }
          >
            <Line>
              Approved and paid
              {commission.completedAt ? ` ${shortDate(commission.completedAt)}` : ""}. A short review helps other teams
              find {creatorName}, and what you learn carries into your next brief.
            </Line>
          </Step>
        );
      }
      return (
        <Step
          title={`Your review of ${creatorName}`}
          actions={
            creator ? (
              <PillButton variant="neon" arrow href={`/creators/${creator.handle}/commission?repeat=${commission.id}`}>
                Commission {creatorName} again
              </PillButton>
            ) : null
          }
        >
          <figure className="flex flex-col gap-2">
            <StarRow value={review.rating} size={18} />
            <blockquote className="y-body max-w-[62ch]">&ldquo;{review.text}&rdquo;</blockquote>
            <figcaption className="y-micro y-fg-2">
              {review.authorName} · {shortDate(review.createdAt)}
              {review.wouldRehire ? " · Would hire again" : ""}
            </figcaption>
          </figure>
        </Step>
      );
    }

    case "declined":
      return (
        <Step
          title={`${creatorName} can't take this one`}
          actions={
            <PillButton variant="neon" arrow href="/creators">
              Find another creator
            </PillButton>
          }
        >
          <EndedCopy
            reason={commission.cancelReason}
            money="The authorisation on your card was released. You weren't charged."
          />
        </Step>
      );

    case "cancelled":
      return (
        <Step
          title="This commission was cancelled"
          actions={
            <PillButton variant="neon" arrow href="/creators">
              Find a creator
            </PillButton>
          }
        >
          <EndedCopy
            reason={commission.cancelReason}
            money={
              commission.acceptedAt
                ? "Refunded in full to your card. Refunds take 3–5 working days to show."
                : "The authorisation on your card was released. You weren't charged."
            }
          />
        </Step>
      );

    case "disputed":
      return <DisputedStep ws={ws} />;
  }
}

/* -------------------------------------------------------------------------- */
/* Creator                                                                     */
/* -------------------------------------------------------------------------- */

function CreatorNextStep({ ws }: { ws: Workspace }) {
  const { commission, businessName, latest } = ws;
  const nextVersion = commission.deliveries.length + 1;

  switch (commission.status) {
    case "offered":
      return <OfferStep ws={ws} />;

    case "in_progress":
    case "revision": {
      const revising = commission.status === "revision";
      const open = latest?.comments.filter((c) => !c.resolved && c.author === "business").length ?? 0;
      return (
        <Step
          title={revising ? `${businessName} asked for changes` : `Make and deliver version ${nextVersion}`}
          actions={
            <PillButton variant="neon" size="lg" arrow onClick={() => ws.openSheet("deliver")}>
              Upload version {nextVersion}
            </PillButton>
          }
        >
          <Line>
            {revising && latest
              ? open
                ? `${plural(open, "note")} to address on version ${latest.version}, pinned to the video below.`
                : `Notes on version ${latest.version} are all ticked off.`
              : `Upload it here when it's ready. ${businessName} then approves it or asks for changes.`}
          </Line>
        </Step>
      );
    }

    case "delivered": {
      const auto = autoApproveDate(commission, latest);
      return (
        <Step title={`Waiting for ${businessName}'s review`}>
          <Line>
            {latest ? `Version ${latest.version} went in ${ago(latest.deliveredAt)}. ` : ""}
            {auto ? `If they don't respond, it auto-approves on ${weekdayDate(auto)}.` : ""}
          </Line>
        </Step>
      );
    }

    case "completed":
      return <CreatorPaid ws={ws} />;

    case "declined":
      return (
        <Step
          title="You declined this offer"
          actions={
            <PillButton variant="neon" arrow href="/creator/opportunities">
              Find new work
            </PillButton>
          }
        >
          <EndedCopy
            reason={commission.cancelReason}
            money={`${businessName} was told, and the authorisation on their card was released.`}
          />
        </Step>
      );

    case "cancelled":
      return (
        <Step
          title="This commission was cancelled"
          actions={
            <PillButton variant="contrast" arrow href="/creator/opportunities">
              Find new work
            </PillButton>
          }
        >
          <EndedCopy
            reason={commission.cancelReason}
            money={`${businessName} was refunded. If you'd already started, use Get help and we'll look at it with you.`}
          />
        </Step>
      );

    case "disputed":
      return <DisputedStep ws={ws} />;
  }
}

/** The whole offer in one place: what you earn, when, the client's message, accept or decline. */
function OfferStep({ ws }: { ws: Workspace }) {
  const { commission, businessName, totals } = ws;
  const meta = `Due ${weekdayDate(commission.dueDate)} (${relativeDay(commission.dueDate)}) · ${plural(commission.revisionsIncluded, "revision")}`;
  const includes = commission.addons.map((addon) => `${addonById[addon.id].name} (${cash(addon.price)})`).join(", ");

  return (
    <Step
      title={`${businessName} wants to work with you`}
      actions={
        <>
          <AcceptButton ws={ws} />
          <PillButton variant="outline" size="lg" onClick={() => ws.openSheet("decline")}>
            Decline
          </PillButton>
        </>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        <div className="flex flex-col gap-1">
          <p className="y-micro y-fg-2">You earn</p>
          <p className="y-display y-num text-[40px] leading-none font-semibold tracking-[-0.03em]">
            {cash(totals.creatorEarns)}
          </p>
          <p className="y-small y-fg-2 pt-1">
            {meta}
            {includes ? (
              <>
                <br />
                Includes {includes}
              </>
            ) : null}
          </p>
        </div>
        {commission.offerMessage ? (
          <figure className="flex flex-col gap-1 border-s-2 border-(--b-line) ps-4">
            <blockquote className="y-body max-w-[62ch]">&ldquo;{commission.offerMessage}&rdquo;</blockquote>
            <figcaption className="y-micro y-fg-2">{businessName}</figcaption>
          </figure>
        ) : null}
        <p className="y-small inline-flex items-start gap-2 font-medium">
          <ShieldCheck size={18} aria-hidden className="mt-px flex-none" />
          Payment is already authorised. You&apos;re paid when they approve.
        </p>
      </div>
    </Step>
  );
}

function AcceptButton({ ws }: { ws: Workspace }) {
  const toast = useToast();
  return (
    <PillButton
      variant="neon"
      size="lg"
      arrow
      onClick={() => {
        actions.acceptOffer(ws.commission.id);
        toast({
          message: `Offer accepted. ${cash(ws.totals.creatorEarns)} is secured for you. Time to make version 1.`,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      Accept offer
    </PillButton>
  );
}

function CreatorPaid({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const { commission, businessName } = ws;
  const review = commission.reviewId ? reviewById(s, commission.reviewId) : undefined;
  const feedback = commission.clientFeedback;
  return (
    <Step
      title="You've been paid"
      actions={
        feedback ? (
          <PillButton variant="contrast" arrow href="/creator/earnings">
            See your earnings
          </PillButton>
        ) : (
          <>
            <PillButton variant="neon" arrow onClick={() => ws.openSheet("clientFeedback")}>
              Rate this client
            </PillButton>
            <PillButton variant="ghost" href="/creator/earnings">
              See your earnings
            </PillButton>
          </>
        )
      }
    >
      <Line>
        {businessName} approved version {ws.latest?.version ?? 1}
        {commission.completedAt ? ` on ${shortDate(commission.completedAt)}` : ""}. It&apos;s in your available balance.
      </Line>
      {review ? (
        <figure className="flex flex-col gap-2 pt-3">
          <StarRow value={review.rating} />
          <blockquote className="y-body max-w-[62ch]">&ldquo;{review.text}&rdquo;</blockquote>
          <figcaption className="y-micro y-fg-2">
            {review.authorName}, {review.authorTitle}
          </figcaption>
        </figure>
      ) : null}
      {feedback ? (
        <p className="y-small inline-flex flex-wrap items-center gap-2 pt-1">
          <span className="font-semibold">You rated {businessName}</span>
          <StarRow value={feedback.rating} size={14} />
          <span className="y-fg-2">Only Yapp sees this.</span>
        </p>
      ) : null}
    </Step>
  );
}

function DisputedStep({ ws }: { ws: Workspace }) {
  return (
    <Step title="Yapp support is on it">
      <Line>
        {ws.role === "business"
          ? `We're reading the brief, the versions and your messages, and will reply in Messages within 24 hours. If ${ws.creatorName} can't deliver what was agreed, you get a full refund.`
          : "We're reading the brief, the versions and your messages, and will reply in Messages within 24 hours. If the work matches what was agreed, you get paid in full."}
      </Line>
    </Step>
  );
}

function EndedCopy({ reason, money }: { reason?: string; money: string }) {
  return (
    <Line>
      {reason ? (
        <>
          <span className="text-(--b-fg)">{reason}</span>
          {/[.!?]$/.test(reason) ? " " : ". "}
        </>
      ) : null}
      {money}
    </Line>
  );
}
