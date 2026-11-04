"use client";

import {
  CalendarClock,
  Clapperboard,
  Eye,
  FileText,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { StarRow } from "@/components/domain/stars";
import { Badge } from "@/components/ui/badge";
import { Block, type BlockTone } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { BusinessLogo } from "@/components/domain/business-logo";
import { plural, relativeDay, shortDate, timeOf, weekdayDate } from "@/lib/format";
import { reviewById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { addonById } from "@/lib/taxonomy";

import { ago, autoApproveDate, cash, revisionsLeft, type Workspace } from "./helpers";

/** "Fri 6 Nov at 20:00" */
const when = (iso: string) => `${weekdayDate(iso)} at ${timeOf(iso)}`;

function Shell({
  tone = "night",
  eyebrow,
  title,
  icon,
  children,
  actions,
}: {
  tone?: BlockTone;
  eyebrow: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Block
      as="section"
      tone={tone}
      pad="md"
      aria-labelledby="next-step-title"
      className="flex flex-col gap-5"
    >
      <div className="flex items-start gap-4">
        {icon ? (
          <span
            aria-hidden
            className="grid size-12 flex-none place-items-center rounded-full bg-(--b-chip) text-(--b-chip-fg)"
          >
            {icon}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="y-micro y-fg-2">{eyebrow}</p>
          <h2 id="next-step-title" className="y-display y-title">
            {title}
          </h2>
        </div>
      </div>
      {children}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </Block>
  );
}

function SupportButton({ tone = "ghost" }: { tone?: "ghost" | "soft" }) {
  const toast = useToast();
  return (
    <PillButton
      variant={tone}
      icon={<LifeBuoy size={18} aria-hidden />}
      onClick={() =>
        toast({
          message: "Yapp support will reply in your messages within a few hours.",
          tone: "info",
        })
      }
    >
      Contact support
    </PillButton>
  );
}

/** The one block that says what happens next, by role × status. */
export function NextStep({ ws }: { ws: Workspace }) {
  return ws.role === "business" ? <BusinessNextStep ws={ws} /> : <CreatorNextStep ws={ws} />;
}

/* -------------------------------------------------------------------------- */
/* Business                                                                    */
/* -------------------------------------------------------------------------- */

function BusinessNextStep({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const { commission, creator, creatorName, latest, totals } = ws;
  const nextVersion = commission.deliveries.length + 1;

  switch (commission.status) {
    case "offered":
      return (
        <Shell
          tone="paper"
          eyebrow="Offer sent"
          title={`Waiting for ${creatorName} to accept`}
          icon={<CalendarClock size={22} />}
          actions={
            <>
              <PillButton variant="contrast" icon={<MessageCircle size={18} aria-hidden />} onClick={ws.goToMessages}>
                Message {creatorName}
              </PillButton>
              <PillButton variant="ghost" onClick={() => ws.openSheet("withdraw")}>
                Withdraw offer
              </PillButton>
            </>
          }
        >
          <p className="y-body y-fg-2 max-w-[62ch]">
            You sent this offer {ago(commission.createdAt)}.
            {creator ? ` ${creatorName} usually replies within ${plural(creator.responseHours, "hour")}.` : ""}{" "}
            {cash(totals.total)} is only authorised on your card. You&apos;re charged when {creatorName} accepts, and
            the money stays protected until you approve the video.
          </p>
        </Shell>
      );

    case "in_progress":
    case "revision": {
      const revising = commission.status === "revision";
      return (
        <Shell
          eyebrow={revising ? "Changes in progress" : "In production"}
          title={
            revising
              ? `${creatorName} is working on your changes`
              : `${creatorName} is making version ${nextVersion}`
          }
          icon={<Clapperboard size={22} />}
          actions={
            <>
              <PillButton variant="contrast" icon={<MessageCircle size={18} aria-hidden />} onClick={ws.goToMessages}>
                Message {creatorName}
              </PillButton>
              <PillButton
                variant="soft"
                icon={<CalendarClock size={18} aria-hidden />}
                onClick={() => ws.openSheet("extend")}
              >
                Extend deadline
              </PillButton>
            </>
          }
        >
          <p className="y-body y-fg-2 max-w-[62ch]">
            Version {nextVersion} is due <strong className="font-semibold text-(--b-fg)">{when(commission.dueDate)}</strong>{" "}
            ({relativeDay(commission.dueDate)}).{" "}
            {revising && latest
              ? `You asked for changes on version ${latest.version}${latest.comments.length ? ` with ${plural(latest.comments.length, "note")}` : ""}. `
              : ""}
            We&apos;ll let you know the moment it&apos;s delivered. Then you have 3 days to review.
          </p>
        </Shell>
      );
    }

    case "delivered": {
      const auto = autoApproveDate(commission, latest);
      const left = revisionsLeft(commission);
      return (
        <Shell
          eyebrow="Your turn"
          title={`Review version ${latest?.version ?? 1} from ${creatorName}`}
          icon={<Eye size={22} />}
          actions={
            <PillButton variant="contrast" arrow onClick={ws.goToReview}>
              Go to the review
            </PillButton>
          }
        >
          <div className="flex flex-col gap-2">
            {auto ? (
              <p className="y-body font-semibold">
                Auto-approves on {weekdayDate(auto)} if you don&apos;t respond.
              </p>
            ) : null}
            <p className="y-body y-fg-2 max-w-[62ch]">
              Watch it, add notes at the exact second, then approve to release payment or ask for changes.{" "}
              {left
                ? `You have ${plural(left, "revision round")} left.`
                : "You've used all included revision rounds."}
            </p>
          </div>
        </Shell>
      );
    }

    case "completed": {
      const review = commission.reviewId ? reviewById(s, commission.reviewId) : undefined;
      if (!review) {
        return (
          <Shell
            tone="paper"
            eyebrow={commission.completedAt ? `Approved and paid ${shortDate(commission.completedAt)}` : "Approved and paid"}
            title={`How did ${creatorName} do?`}
            icon={creator ? <FaceAvatar id={creator.id} name="" size={48} /> : undefined}
            actions={
              <PillButton variant="neon" arrow onClick={() => ws.openSheet("review")}>
                Leave a review
              </PillButton>
            }
          >
            <p className="y-body y-fg-2 max-w-[62ch]">
              A short review helps other teams find {creatorName}. Save what you learned and it carries into your
              next brief{ws.product ? ` for ${ws.product.name}` : ""}, so the next video starts ahead.
            </p>
          </Shell>
        );
      }
      return (
        <Shell
          tone="paper"
          eyebrow="Completed and reviewed"
          title={`Your review of ${creatorName}`}
          icon={creator ? <FaceAvatar id={creator.id} name="" size={48} /> : undefined}
          actions={
            creator ? (
              <PillButton
                variant="neon"
                arrow
                href={`/creators/${creator.handle}/commission?repeat=${commission.id}`}
              >
                Commission {creatorName} again
              </PillButton>
            ) : null
          }
        >
          <figure className="y-tile flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StarRow value={review.rating} size={18} />
              <span className="y-micro y-fg-2">
                Quality {review.quality} · Communication {review.communication} · On time {review.timeliness}
              </span>
            </div>
            <blockquote className="y-body max-w-[62ch]">&ldquo;{review.text}&rdquo;</blockquote>
            <figcaption className="y-micro y-fg-2">
              {review.authorName} · {shortDate(review.createdAt)}
              {review.wouldRehire ? " · Would hire again" : ""}
            </figcaption>
          </figure>
          <p className="y-small y-fg-2 max-w-[62ch]">
            Starting again keeps the same brief, product context and everything you saved as learnings.
          </p>
        </Shell>
      );
    }

    case "declined":
      return (
        <Shell
          tone="paper"
          eyebrow="Offer declined"
          title={`${creatorName} can't take this one`}
          actions={
            <>
              <PillButton variant="neon" arrow href="/creators">
                Find another creator
              </PillButton>
              <SupportButton />
            </>
          }
        >
          <EndedCopy
            reason={commission.cancelReason}
            money={`Your card authorisation of ${cash(totals.total)} was released. You weren't charged.`}
          />
        </Shell>
      );

    case "cancelled":
      return (
        <Shell
          tone="paper"
          eyebrow="Cancelled"
          title="This commission was cancelled"
          actions={
            <>
              <PillButton variant="neon" arrow href="/creators">
                Find a creator
              </PillButton>
              <SupportButton />
            </>
          }
        >
          <EndedCopy
            reason={commission.cancelReason}
            money={
              commission.acceptedAt
                ? `${cash(totals.total)} was refunded in full to your card. Refunds take 3–5 working days to show.`
                : `Your card authorisation of ${cash(totals.total)} was released. You weren't charged.`
            }
          />
        </Shell>
      );

    case "disputed":
      return <DisputedStep ws={ws} />;
  }
}

/* -------------------------------------------------------------------------- */
/* Creator                                                                     */
/* -------------------------------------------------------------------------- */

function CreatorNextStep({ ws }: { ws: Workspace }) {
  const { commission, business, businessName, latest, totals } = ws;
  const nextVersion = commission.deliveries.length + 1;

  switch (commission.status) {
    case "offered":
      return (
        <Shell
          tone="paper"
          eyebrow={`New offer · sent ${ago(commission.createdAt)}`}
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
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="y-tile col-span-2 flex flex-col gap-1 p-4 md:col-span-1">
              <span className="y-micro y-fg-2">You earn</span>
              <span className="y-display y-num text-[34px] leading-none font-semibold tracking-[-0.03em]">
                {cash(totals.creatorEarns)}
              </span>
            </div>
            <div className="y-tile flex flex-col gap-1 p-4">
              <span className="y-micro y-fg-2">Due</span>
              <span className="y-small font-semibold">{weekdayDate(commission.dueDate)}</span>
              <span className="y-micro y-fg-2">{relativeDay(commission.dueDate)}</span>
            </div>
            <div className="y-tile flex flex-col gap-1 p-4">
              <span className="y-micro y-fg-2">Revisions</span>
              <span className="y-small font-semibold">{commission.revisionsIncluded} included</span>
            </div>
            <div className="y-tile col-span-2 flex flex-col gap-1 p-4 md:col-span-1">
              <span className="y-micro y-fg-2">Your price</span>
              <span className="y-small font-semibold">
                {cash(commission.price)}
                {commission.addons.length ? ` + ${plural(commission.addons.length, "add-on")}` : ""}
              </span>
            </div>
          </div>

          {commission.addons.length ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Add-ons included">
              {commission.addons.map((addon) => {
                const info = addonById[addon.id];
                const Icon = info.icon;
                return (
                  <li key={addon.id} className="y-chip">
                    <Icon size={14} aria-hidden /> {info.name} · {cash(addon.price)}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {commission.offerMessage ? (
            <figure className="flex items-start gap-3">
              {business ? <BusinessLogo business={business} size={36} /> : null}
              <div className="flex flex-col gap-1">
                <blockquote className="y-body max-w-[62ch]">&ldquo;{commission.offerMessage}&rdquo;</blockquote>
                <figcaption className="y-micro y-fg-2">{businessName}</figcaption>
              </div>
            </figure>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="y-small inline-flex items-start gap-2 font-medium">
              <ShieldCheck size={18} aria-hidden className="mt-px flex-none" />
              Payment is already authorised — you&apos;re paid when they approve.
            </p>
            <button type="button" className="y-small y-link inline-flex items-center gap-1.5 font-semibold" onClick={() => ws.showTab("brief")}>
              <FileText size={16} aria-hidden /> Read the full brief
            </button>
          </div>
        </Shell>
      );

    case "in_progress":
    case "revision": {
      const revising = commission.status === "revision";
      const open = latest?.comments.filter((c) => !c.resolved && c.author === "business").length ?? 0;
      return (
        <Shell
          eyebrow={revising ? "Changes requested" : "Your turn"}
          title={revising ? `${businessName} asked for changes` : `Make and deliver version ${nextVersion}`}
          icon={<Upload size={22} />}
          actions={
            <>
              <PillButton variant="neon" size="lg" arrow onClick={() => ws.openSheet("deliver")}>
                Upload version {nextVersion}
              </PillButton>
              {revising ? (
                <PillButton variant="soft" icon={<Eye size={18} aria-hidden />} onClick={ws.goToReview}>
                  See the notes
                </PillButton>
              ) : (
                <PillButton variant="soft" icon={<MessageCircle size={18} aria-hidden />} onClick={ws.goToMessages}>
                  Message {businessName}
                </PillButton>
              )}
            </>
          }
        >
          <p className="y-body y-fg-2 max-w-[62ch]">
            {revising && latest
              ? `${open ? `${plural(open, "note")} to address on version ${latest.version}. ` : `Notes on version ${latest.version} are all ticked off. `}`
              : ""}
            Version {nextVersion} is due{" "}
            <strong className="font-semibold text-(--b-fg)">{when(commission.dueDate)}</strong> (
            {relativeDay(commission.dueDate)}). {businessName} has 3 days to review, and you&apos;re paid{" "}
            {cash(totals.creatorEarns)} as soon as they approve.
          </p>
        </Shell>
      );
    }

    case "delivered": {
      const auto = autoApproveDate(commission, latest);
      return (
        <Shell
          tone="paper"
          eyebrow={latest ? `Version ${latest.version} delivered ${ago(latest.deliveredAt)}` : "Delivered"}
          title={`Waiting for ${businessName}'s review`}
          icon={<Eye size={22} />}
          actions={
            <PillButton variant="contrast" icon={<MessageCircle size={18} aria-hidden />} onClick={ws.goToMessages}>
              Message {businessName}
            </PillButton>
          }
        >
          <p className="y-body y-fg-2 max-w-[62ch]">
            {auto
              ? `If they don't respond, it auto-approves on ${weekdayDate(auto)} and ${cash(totals.creatorEarns)} is released to you. `
              : ""}
            If they ask for changes, their notes show up here with timestamps.
          </p>
        </Shell>
      );
    }

    case "completed":
      return <CreatorPaid ws={ws} />;

    case "declined":
      return (
        <Shell
          tone="paper"
          eyebrow="Offer declined"
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
        </Shell>
      );

    case "cancelled":
      return (
        <Shell
          tone="paper"
          eyebrow="Cancelled"
          title="This commission was cancelled"
          actions={
            <>
              <PillButton variant="contrast" arrow href="/creator/opportunities">
                Find new work
              </PillButton>
              <SupportButton />
            </>
          }
        >
          <EndedCopy
            reason={commission.cancelReason}
            money={`${businessName} was refunded. If you'd already started and think you should be paid for it, contact support and we'll look at it with you.`}
          />
        </Shell>
      );

    case "disputed":
      return <DisputedStep ws={ws} />;
  }
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
  const { commission, businessName, totals } = ws;
  const review = commission.reviewId ? reviewById(s, commission.reviewId) : undefined;
  const feedback = commission.clientFeedback;
  return (
    <Shell
      tone="butter"
      eyebrow={commission.completedAt ? `Released ${shortDate(commission.completedAt)}` : "Released"}
      title={
        <>
          Paid <span className="y-num">{cash(totals.creatorEarns)}</span>
        </>
      }
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
      <p className="y-body y-fg-2 max-w-[62ch]">
        {businessName} approved version {ws.latest?.version ?? 1}. The money is in your available balance, ready to
        withdraw.
      </p>
      {review ? (
        <figure className="y-tile flex flex-col gap-2 p-4">
          <div className="flex items-center gap-3">
            <StarRow value={review.rating} />
            <span className="y-micro y-fg-2">Their review of you</span>
          </div>
          <blockquote className="y-small max-w-[62ch]">&ldquo;{review.text}&rdquo;</blockquote>
          <figcaption className="y-micro y-fg-2">
            {review.authorName}, {review.authorTitle}
          </figcaption>
        </figure>
      ) : null}
      {feedback ? (
        <p className="y-small inline-flex flex-wrap items-center gap-2">
          <span className="font-semibold">You rated {businessName}</span>
          <StarRow value={feedback.rating} size={14} />
          <span className="y-fg-2">Only Yapp sees this.</span>
        </p>
      ) : null}
    </Shell>
  );
}

function DisputedStep({ ws }: { ws: Workspace }) {
  return (
    <Shell
      tone="paper"
      eyebrow="In resolution"
      title="Yapp support is on it"
      icon={<LifeBuoy size={22} />}
      actions={
        <>
          <PillButton variant="contrast" icon={<MessageCircle size={18} aria-hidden />} onClick={ws.goToMessages}>
            Message {ws.otherName}
          </PillButton>
          <SupportButton tone="soft" />
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <Badge tone="info" icon={<ShieldCheck size={14} aria-hidden />} className="w-fit">
          Payment protected
        </Badge>
        <p className="y-body y-fg-2 max-w-[62ch]">
          {ws.role === "business"
            ? `Your payment stays held while we help. We'll read the brief, the versions and your messages, and reply in this conversation within 24 hours. If ${ws.creatorName} can't deliver what was agreed, you get a full refund.`
            : `The payment stays held while we help. We'll read the brief, the versions and your messages, and reply in this conversation within 24 hours. If the work matches what was agreed, you get paid in full.`}
        </p>
      </div>
    </Shell>
  );
}

function EndedCopy({ reason, money }: { reason?: string; money: string }) {
  return (
    <div className="flex flex-col gap-2">
      {reason ? (
        <p className="y-body max-w-[62ch]">
          <span className="y-fg-2">Reason: </span>
          {reason}
        </p>
      ) : null}
      <p className="y-small inline-flex items-start gap-2 font-medium">
        <ShieldCheck size={18} aria-hidden className="mt-px flex-none" />
        {money}
      </p>
    </div>
  );
}
