"use client";

import { AlertTriangle, BadgeCheck, Download, Loader2, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";

import { StarRow } from "@/components/domain/stars";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { plural, relativeDay, shortDate, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { reviewById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { addonById, CAMPAIGN_DEADLINE_DAYS, includedRights } from "@/lib/taxonomy";

import { ago, autoApproveDate, cash, type SlotContext, type Workspace } from "./helpers";

/**
 * What happens next, by side × status. Rendered inside the workspace header: one title, one
 * sentence, at most one primary action. Dates, money and revisions live in the Details block.
 * Campaign slots have their own steps (review copy, post, verified).
 */
export function NextStep({ ws }: { ws: Workspace }) {
  if (ws.slot) {
    return ws.side === "business" ? (
      <BusinessSlotStep ws={ws} slot={ws.slot} />
    ) : (
      <CreatorSlotStep ws={ws} slot={ws.slot} />
    );
  }
  return ws.side === "business" ? <BusinessNextStep ws={ws} /> : <CreatorNextStep ws={ws} />;
}

function Step({
  title,
  children,
  actions,
  live = false,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** Announce changes (async states such as "Checking your post…"). */
  live?: boolean;
}) {
  return (
    <section aria-labelledby="next-step-title" aria-live={live ? "polite" : undefined} className="flex flex-col gap-5">
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

/** Campaigns have no upload deadline yet (deferred by the PM): say so quietly, once. */
const deadlineNote = CAMPAIGN_DEADLINE_DAYS === null ? " Deadline: not set yet." : "";

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
              <PillButton variant="neon" arrow href={paths.orderCreator(creator.handle, { again: commission.id })}>
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
            <PillButton variant="neon" arrow href={paths.explore("creators")}>
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
            <PillButton variant="neon" arrow href={paths.explore("creators")}>
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
            <PillButton variant="neon" arrow href={paths.explore("orders")}>
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
            <PillButton variant="contrast" arrow href={paths.explore("orders")}>
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
          <PillButton variant="contrast" arrow href={paths.wallet}>
            See your wallet
          </PillButton>
        ) : (
          <>
            <PillButton variant="neon" arrow onClick={() => ws.openSheet("clientFeedback")}>
              Rate this client
            </PillButton>
            <PillButton variant="ghost" href={paths.wallet}>
              See your wallet
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
        {ws.side === "business"
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

/* -------------------------------------------------------------------------- */
/* Campaign slot: ordering side                                                */
/* -------------------------------------------------------------------------- */

function BusinessSlotStep({ ws, slot }: { ws: Workspace; slot: SlotContext }) {
  const toast = useToast();
  const { commission, creatorName, latest } = ws;
  const backToCampaign = commission.requestId ? (
    <PillButton variant="contrast" arrow href={paths.order(commission.requestId)}>
      Back to campaign
    </PillButton>
  ) : null;

  switch (commission.status) {
    case "in_progress":
      return (
        <Step title={`${creatorName} is filming`}>
          <Line>
            Their review copy comes here, watermarked until you approve it.{deadlineNote}
          </Line>
        </Step>
      );

    case "revision":
      return (
        <Step title={`${creatorName} is redoing the video`}>
          <Line>
            {latest
              ? `You asked for changes on review copy ${latest.version}${latest.comments.length ? ` with ${plural(latest.comments.length, "note")}` : ""}. `
              : ""}
            The new copy comes back here for review.
          </Line>
        </Step>
      );

    case "delivered": {
      const auto = autoApproveDate(commission, latest);
      return (
        <Step title={`Review ${creatorName}'s copy`}>
          <Line>
            Approve it, ask for changes or reject it below.
            {auto ? ` It auto-approves on ${weekdayDate(auto)} if you don't respond.` : ""}
          </Line>
        </Step>
      );
    }

    case "completed": {
      const post = commission.post;
      const postLine =
        post?.status === "live"
          ? `Posted on ${slot.platformName} and verified: ${slot.brandHandle} tagged, paid-partnership label on.`
          : post?.status === "checking"
            ? `${creatorName} posted it. We're checking the tag and the paid-partnership label.`
            : post?.status === "removed"
              ? `${creatorName}'s post was taken down. Their payment stays locked until it's back up.`
              : `${creatorName} will post it on their ${slot.platformName} account with the paid-partnership label, tagging ${slot.brandHandle}.`;
      return (
        <Step
          title="Full-quality file unlocked"
          actions={
            <PillButton
              variant="neon"
              icon={<Download size={18} aria-hidden />}
              onClick={() =>
                toast({
                  message: `Downloading ${latest?.files[0]?.name.replace(/review[_-]?copy[_-]?/i, "") ?? "the video"} in full quality`,
                  tone: "info",
                })
              }
            >
              Download full quality
            </PillButton>
          }
        >
          <Line>
            You approved {creatorName}&apos;s video
            {commission.completedAt ? ` on ${shortDate(commission.completedAt)}` : ""}. No watermark. {includedRights}
          </Line>
          <p className="y-small inline-flex max-w-[62ch] items-start gap-2 pt-1">
            {post?.status === "removed" ? (
              <AlertTriangle size={18} aria-hidden className="mt-px flex-none text-(--y-warning)" />
            ) : post?.status === "live" ? (
              <BadgeCheck size={18} aria-hidden className="mt-px flex-none" />
            ) : (
              <ShieldCheck size={18} aria-hidden className="mt-px flex-none" />
            )}
            {postLine}
          </p>
          {commission.quickRating ? (
            <p className="y-small y-fg-2 inline-flex flex-wrap items-center gap-2">
              You rated {creatorName} <StarRow value={commission.quickRating} size={14} />
            </p>
          ) : null}
        </Step>
      );
    }

    case "cancelled": {
      const reason = commission.cancelReason;
      if (commission.cancelCode === "video_rejected") {
        return (
          <Step title="You didn't approve this video" actions={backToCampaign}>
            <EndedCopy
              reason={reason}
              money="The slot reopened for another creator, and its money stays held in your campaign."
            />
          </Step>
        );
      }
      if (commission.cancelCode === "campaign_closed") {
        return (
          <Step title="This slot ended when the campaign closed" actions={backToCampaign}>
            <Line>Its money went back to your campaign hold.</Line>
          </Step>
        );
      }
      return (
        <Step title={`You removed ${creatorName} from this slot`} actions={backToCampaign}>
          <EndedCopy
            reason={reason}
            money="The slot reopened for another creator, and its money stays held in your campaign."
          />
        </Step>
      );
    }

    case "disputed":
      return <DisputedStep ws={ws} />;

    // Slots skip offers; keep the generic steps for odd demo states.
    case "offered":
    case "declined":
      return <BusinessNextStep ws={ws} />;
  }
}

/* -------------------------------------------------------------------------- */
/* Campaign slot: making side                                                  */
/* -------------------------------------------------------------------------- */

function CreatorSlotStep({ ws, slot }: { ws: Workspace; slot: SlotContext }) {
  const { commission, businessName, latest } = ws;
  const nextVersion = commission.deliveries.length + 1;
  const findMore = (
    <PillButton variant="contrast" arrow href={paths.explore("orders")}>
      Find another campaign
    </PillButton>
  );

  switch (commission.status) {
    case "in_progress":
      return (
        <Step
          title="Film and upload your review copy"
          actions={
            <PillButton variant="neon" size="lg" arrow onClick={() => ws.openSheet("deliver")}>
              Upload your review copy
            </PillButton>
          }
        >
          <Line>
            {businessName} sees a watermarked, low-quality copy until they approve it. The talking points are in
            the brief below.{deadlineNote}
          </Line>
        </Step>
      );

    case "revision": {
      const open = latest?.comments.filter((c) => !c.resolved && c.author === "business").length ?? 0;
      return (
        <Step
          title={`${businessName} asked for changes`}
          actions={
            <PillButton variant="neon" size="lg" arrow onClick={() => ws.openSheet("deliver")}>
              Upload version {nextVersion}
            </PillButton>
          }
        >
          <Line>
            {latest
              ? open
                ? `${plural(open, "note")} to address on review copy ${latest.version}, pinned to the video below.`
                : `Notes on review copy ${latest.version} are all ticked off.`
              : "Upload a new version when it's ready."}
          </Line>
        </Step>
      );
    }

    case "delivered": {
      const auto = autoApproveDate(commission, latest);
      return (
        <Step title={`Waiting for ${businessName}'s review`}>
          <Line>
            {latest ? `Review copy ${latest.version} went in ${ago(latest.deliveredAt)}. ` : ""}
            {auto ? `If they don't respond, it's approved automatically on ${weekdayDate(auto)}.` : ""}
          </Line>
        </Step>
      );
    }

    case "completed": {
      const post = commission.post;
      if (post?.status === "checking") {
        return (
          <Step
            live
            title={
              <span className="inline-flex items-center gap-3">
                <Loader2 size={26} aria-hidden className="animate-spin motion-reduce:animate-none" />
                Checking your post…
              </span>
            }
          >
            <Line>
              Looking for {slot.brandHandle} and the paid-partnership label. This takes a few seconds.
            </Line>
          </Step>
        );
      }
      if (post?.status === "live") {
        const released = commission.payment.status === "released";
        return (
          <Step
            live
            title={
              <span className="inline-flex items-center gap-3">
                <BadgeCheck size={28} aria-hidden className="flex-none" />
                Verified: tag found · disclosure found
              </span>
            }
            actions={
              released ? (
                <PillButton variant="neon" arrow href={paths.wallet}>
                  Withdraw in Wallet
                </PillButton>
              ) : (
                <PillButton variant="contrast" arrow href={paths.wallet}>
                  Go to Wallet
                </PillButton>
              )
            }
          >
            <Line>
              {released
                ? `${cash(commission.price)} is ready to withdraw. Thanks for keeping the post up.`
                : `${cash(commission.price)} pending, withdrawable ${commission.withdrawableFrom ? shortDate(commission.withdrawableFrom) : "at month end"} if the post stays up.`}
            </Line>
          </Step>
        );
      }
      if (post?.status === "removed") {
        return (
          <Step title="Your post was taken down">
            <div
              role="note"
              className="flex max-w-[62ch] items-start gap-3 rounded-(--y-r-tile) bg-(--y-warning-soft) p-4 text-(--y-warning)"
            >
              <AlertTriangle size={20} aria-hidden className="mt-0.5 flex-none" />
              <p className="y-small font-medium">
                The {cash(commission.price)} stays locked while the post is down. Put it back up and paste the new
                link to unlock it at month end.
              </p>
            </div>
            <PostLinkForm ws={ws} slot={slot} again />
          </Step>
        );
      }
      return <PostStep ws={ws} slot={slot} />;
    }

    case "cancelled": {
      if (commission.cancelCode === "video_rejected") {
        return (
          <Step title="This video wasn't approved" actions={findMore}>
            {commission.cancelReason ? (
              <figure className="flex flex-col gap-1 border-s-2 border-(--b-line) ps-4">
                <blockquote className="y-body max-w-[62ch]">&ldquo;{commission.cancelReason}&rdquo;</blockquote>
                <figcaption className="y-micro y-fg-2">{businessName}</figcaption>
              </figure>
            ) : null}
            <Line>The slot went back to the campaign. Thanks for giving it a go. Other campaigns are open in Explore.</Line>
          </Step>
        );
      }
      if (commission.cancelCode === "campaign_closed") {
        return (
          <Step title="This campaign closed" actions={findMore}>
            <Line>The slot ended when {businessName} closed the campaign. Other campaigns are open in Explore.</Line>
          </Step>
        );
      }
      return (
        <Step title={`${businessName} went with another creator for this slot`} actions={findMore}>
          <Line>Thanks for taking it. Other campaigns are open in Explore.</Line>
        </Step>
      );
    }

    case "disputed":
      return <DisputedStep ws={ws} />;

    case "offered":
    case "declined":
      return <CreatorNextStep ws={ws} />;
  }
}

/** Approved: post it on your own account with the tag and the disclosure, then paste the link. */
function PostStep({ ws, slot }: { ws: Workspace; slot: SlotContext }) {
  const { commission, businessName } = ws;
  const steps = [
    `Post it on ${slot.platformName} from your account${slot.social ? ` (@${slot.social.handle})` : ""}.`,
    `Tag ${slot.brandHandle} in the caption.`,
    `Turn on the ${slot.disclosure.charAt(0).toLowerCase()}${slot.disclosure.slice(1)}.`,
    `Keep it up until month end${commission.withdrawableFrom ? ` (${shortDate(commission.withdrawableFrom)})` : ""}.`,
  ];
  return (
    <Step title={`Post it to unlock ${cash(commission.price)}`}>
      <Line>{businessName} approved your video. Post it on your own account, then paste the link here.</Line>
      <ol className="flex max-w-[62ch] flex-col gap-2 pt-2">
        {steps.map((text, index) => (
          <li key={text} className="y-small flex items-start gap-3">
            <span className="y-num grid size-6 flex-none place-items-center rounded-full bg-(--b-fg) text-xs font-semibold text-(--b-bg)">
              {index + 1}
            </span>
            <span className="pt-0.5">{text}</span>
          </li>
        ))}
      </ol>
      <PostLinkForm ws={ws} slot={slot} />
    </Step>
  );
}

const looksLikeLink = (value: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\/\S+/i.test(value.trim());

function PostLinkForm({ ws, slot, again = false }: { ws: Workspace; slot: SlotContext; again?: boolean }) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [tried, setTried] = useState(false);
  const valid = looksLikeLink(url);
  const error = tried && !valid ? "Paste the full link to your post, like the one you'd share." : null;
  const example = `https://www.${slot.terms?.platform ?? "tiktok"}.com/${slot.social ? `@${slot.social.handle}/` : ""}…`;

  return (
    <form
      className="flex max-w-[62ch] flex-col gap-2 pt-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!valid) return;
        // The step itself switches to "Checking your post…" (announced politely).
        actions.submitPost(ws.commission.id, url.trim());
      }}
    >
      <label htmlFor={id} className="y-label">
        <span>{again ? "Link to the new post" : "Link to your post"}</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          className="y-input flex-1"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={example}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <PillButton type="submit" variant="neon" arrow>
          Submit post
        </PillButton>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="y-small px-1 font-medium text-(--y-danger)">
          {error}
        </p>
      ) : (
        <p className="y-micro y-fg-2 px-1">We only read the post to check the tag and the label. We never post for you.</p>
      )}
    </form>
  );
}
