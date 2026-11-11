"use client";

import { BadgeCheck, FileText } from "lucide-react";

import { paymentLabel } from "@/components/domain/money";
import { StarRow } from "@/components/domain/stars";
import { PillButton } from "@/components/ui/pill-button";
import { plural, quoted, relativeDay, shortDate, timeOf, weekdayDate } from "@/lib/format";
import { openComments, reliabilityFigures, requestedComments } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import {
  addonById,
  AUTO_APPROVE_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  CAMPAIGN_RESTORE_HOURS,
  FEE_PCT,
} from "@/lib/taxonomy";

import { BusinessCompleted, CreatorCompleted, type CompletedFlow } from "./completed";
import { ago, autoApproveDate, cash, includedLine, possessive, revisionsLeft, type Job } from "./helpers";
import { PostStep } from "./post-step";
import { Checklist, Note, Panel, Quote } from "./panel";
import { ReviewArea } from "./review-area";

/**
 * The top of the main column: what this job needs right now, from the viewer's side. Its content
 * follows status × side; the header's button (desktop) and the phone bar carry the one next step,
 * so the panel holds the context and the secondary actions.
 */
export function StagePanel({ job, flow }: { job: Job; flow: CompletedFlow }) {
  const { commission: c, side, slot } = job;
  if (c.status === "disputed") return <Disputed job={job} />;
  if (c.status === "declined" || c.status === "cancelled") return <Ended job={job} />;

  if (side === "business") {
    switch (c.status) {
      case "offered":
        return <BusinessOffered job={job} />;
      case "in_progress":
        return <BusinessMaking job={job} />;
      case "delivered":
        return <BusinessReview job={job} />;
      case "revision":
        return <BusinessRevision job={job} />;
      case "completed":
        return slot ? <BusinessSlotDone job={job} /> : <BusinessCompleted job={job} flow={flow} />;
    }
  }
  switch (c.status) {
    case "offered":
      return <CreatorOffer job={job} />;
    case "in_progress":
      return <CreatorMaking job={job} />;
    case "revision":
      return <CreatorRevision job={job} />;
    case "delivered":
      return <CreatorWaiting job={job} />;
    case "completed":
      return slot ? <PostStep job={job} /> : <CreatorCompleted job={job} flow={flow} />;
  }
}

/* -------------------------------------------------------------------------- */
/* Ordering side                                                               */
/* -------------------------------------------------------------------------- */

function BusinessOffered({ job }: { job: Job }) {
  const s = useDemo();
  const { commission: c, creator, creatorName, totals } = job;
  const method = s.paymentMethods.find((m) => m.id === c.payment.methodId);
  return (
    <Panel
      title={`Waiting for ${creatorName} to accept`}
      line={`Offer sent ${ago(c.createdAt)}.${creator ? ` ${creatorName} usually replies within ${plural(creator.responseHours, "hour")}.` : ""}`}
    >
      {c.offerMessage ? <Quote text={c.offerMessage} by="Your message" /> : null}
      <Note>
        {cash(totals.total)} is authorized{method ? ` on ${paymentLabel(method)}` : ""}. You&apos;re only charged if{" "}
        {creatorName} accepts.
      </Note>
      <div>
        <PillButton variant="outline" size="sm" onClick={() => job.openSheet("withdraw")}>
          Withdraw offer
        </PillButton>
      </div>
    </Panel>
  );
}

function BusinessMaking({ job }: { job: Job }) {
  const { commission: c, creatorName, slot, adCopy } = job;
  const what = adCopy ? "your ad copy" : c.brief.videoCount > 1 ? `your ${c.brief.videoCount} videos` : "your video";
  if (slot) {
    return (
      <Panel
        title={`${creatorName} is filming`}
        line={`Their review copy comes here, watermarked until you approve it. Due ${weekdayDate(c.dueDate)}, ${relativeDay(c.dueDate)}.`}
      >
        {c.deliveries.length === 0 ? (
          <div>
            <PillButton variant="outline" size="sm" onClick={() => job.openSheet("removeCreator")}>
              Remove creator
            </PillButton>
          </div>
        ) : null}
      </Panel>
    );
  }
  return (
    <Panel
      title={`${creatorName} is ${adCopy ? "writing" : "making"} ${what}`}
      line={`Due ${weekdayDate(c.dueDate)}, ${relativeDay(c.dueDate)}. ${adCopy ? "The copy" : "Version 1"} comes here for review, and you'll have ${AUTO_APPROVE_DAYS} days to look at it.`}
    >
      <div>
        <PillButton variant="outline" size="sm" onClick={() => job.openSheet("extend")}>
          Extend deadline
        </PillButton>
      </div>
    </Panel>
  );
}

function BusinessReview({ job }: { job: Job }) {
  const { commission: c, creatorName, latest, selected, slot } = job;
  const auto = autoApproveDate(c);
  const delivery = selected ?? latest;
  if (!delivery || !latest) return null;
  const left = revisionsLeft(c);
  const onLatest = delivery.id === latest.id;

  // Approve and Request changes sit together in the header (desktop) and the phone bar; what's left
  // here is the revisions count as a quiet line, and Reject for a campaign slot.
  const footer = onLatest ? (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-(--b-line) pt-4">
      <p className="y-micro y-fg-2 min-w-0 flex-1 basis-[24ch]">
        {left > 0
          ? `${plural(left, "revision")} left of ${c.revisionsIncluded}.`
          : slot
            ? "You've used the included revisions. You can still ask, or reject it to free the slot."
            : `You've used the ${plural(c.revisionsIncluded, "included revision")}. You can approve, agree a paid extra revision, or open a dispute.`}
      </p>
      {slot ? (
        <PillButton variant="ghost" size="sm" onClick={() => job.openSheet("reject")}>
          Reject
        </PillButton>
      ) : null}
    </div>
  ) : null;

  return (
    <Panel
      title={slot ? `Review ${possessive(creatorName)} copy` : `Review version ${latest.version} from ${creatorName}`}
      line={`${slot ? "Uploaded" : "Delivered"} ${ago(latest.deliveredAt)}.${auto ? ` It approves itself on ${weekdayDate(auto)} if you don't respond.` : ""}`}
    >
      <ReviewArea job={job} delivery={delivery} footer={footer} />
    </Panel>
  );
}

function BusinessRevision({ job }: { job: Job }) {
  const { commission: c, creatorName, latest, selected, slot, noun } = job;
  const sent = latest ? requestedComments(latest).length : 0;
  return (
    <Panel
      title={slot ? `${creatorName} is redoing the video` : `${creatorName} is working on version ${c.deliveries.length + 1}`}
      line={`${latest ? `You requested changes on ${noun} ${latest.version}${sent ? ` with ${plural(sent, "comment")}` : ""}. ` : ""}The next ${noun} comes back here for review. Due ${weekdayDate(c.dueDate)}.`}
    >
      {selected ? <ReviewArea job={job} delivery={selected} /> : null}
    </Panel>
  );
}

/** Ordering side of an approved campaign slot: the file, and where the creator's post stands. */
function BusinessSlotDone({ job }: { job: Job }) {
  const { commission: c, creatorName, slot, selected } = job;
  if (!slot) return null;
  const post = c.post;
  const releaseOn = c.withdrawableFrom;
  const live = post?.status === "live";
  const line = live
    ? c.payment.status === "released"
      ? `Posted on ${slot.platformName} and verified: ${slot.brandHandle} tagged, paid-partnership label on. ${creatorName} has been paid.`
      : `Posted on ${slot.platformName} and verified: ${slot.brandHandle} tagged, paid-partnership label on. ${creatorName} is paid${releaseOn ? ` on ${weekdayDate(releaseOn)}` : ""} if it's still up.`
    : post?.status === "checking"
      ? `${creatorName} posted it on ${slot.platformName}. We're checking the tag and the paid-partnership label.`
      : post?.status === "removed"
        ? `${possessive(creatorName)} post was taken down. Their pay stays held; if it isn't back within ${CAMPAIGN_RESTORE_HOURS} hours, the slot reopens and its money returns to your campaign.`
        : `${creatorName} posts it next on their ${slot.platformName} account, tagging ${slot.brandHandle} with the paid-partnership label. They're paid ${CAMPAIGN_RELEASE_DAYS} days after we verify it.`;
  const aside = (
    <div className="flex flex-col gap-3">
      <Note
        tone={post?.status === "removed" ? "warning" : "plain"}
        icon={live ? <BadgeCheck size={17} aria-hidden className="mt-px flex-none" /> : undefined}
      >
        {line}
      </Note>
      {c.quickRating ? (
        <p className="y-small y-fg-2 inline-flex flex-wrap items-center gap-2">
          You rated {creatorName} <StarRow value={c.quickRating} size={14} />
        </p>
      ) : null}
    </div>
  );
  return (
    <Panel
      title="Full-quality file unlocked"
      line={`You approved ${possessive(creatorName)} video${c.completedAt ? ` on ${shortDate(c.completedAt)}` : ""}. No watermark. ${includedLine(job)}`}
    >
      {selected ? <ReviewArea job={job} delivery={selected} aside={aside} collapsed /> : aside}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Making side                                                                 */
/* -------------------------------------------------------------------------- */

function CreatorOffer({ job }: { job: Job }) {
  const { commission: c, business, businessName, totals, adCopy } = job;
  const figures = reliabilityFigures(business);
  const includes = c.addons.map((addon) => `${addonById[addon.id]?.name ?? "Add-on"} (${cash(addon.price)})`);
  return (
    <Panel title={`${businessName} wants to work with you`}>
      <div className="flex flex-col gap-1">
        <p className="y-micro y-fg-2">You earn</p>
        <p className="y-display y-num text-[40px] leading-none tracking-[-0.03em]">{cash(totals.creatorEarns)}</p>
        <p className="y-small y-fg-2 pt-1.5">
          From the {cash(totals.total)} {includes.length ? "total" : "price"}, after Yapp&apos;s {FEE_PCT}% fee
          {includes.length ? ` · Includes ${includes.join(", ")}` : ""}
        </p>
        <p className="y-small y-fg-2">
          Due {weekdayDate(c.dueDate)} ({relativeDay(c.dueDate)}) · {plural(c.revisionsIncluded, "revision")} included
        </p>
      </div>

      {c.offerMessage ? <Quote text={c.offerMessage} by={businessName} /> : null}

      <div className="flex flex-col gap-3 border-t border-(--b-line) pt-4">
        <h3 className="y-head">The brief in short</h3>
        <dl className="flex max-w-[62ch] flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <dt className="y-micro y-fg-2">Goal</dt>
            <dd className="y-small">{c.brief.goal}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="y-micro y-fg-2">Key message</dt>
            <dd className="y-small font-medium">{quoted(c.brief.keyMessage)}</dd>
          </div>
          {adCopy && c.brief.copy?.pieces.length ? (
            <div className="flex flex-col gap-1.5">
              <dt className="y-micro y-fg-2">What to write</dt>
              <dd>
                <Checklist items={c.brief.copy.pieces} />
              </dd>
            </div>
          ) : c.brief.mustInclude.length ? (
            <div className="flex flex-col gap-1.5">
              <dt className="y-micro y-fg-2">Must include</dt>
              <dd>
                <Checklist items={c.brief.mustInclude} />
              </dd>
            </div>
          ) : null}
        </dl>
        <Note icon={<FileText size={17} aria-hidden className="mt-px flex-none" />}>{includedLine(job)}</Note>
        <p className="y-micro y-fg-2">The full brief and the product details are under Details.</p>
      </div>

      <section className="flex flex-col gap-3 border-t border-(--b-line) pt-4" aria-labelledby="offer-brand">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="offer-brand" className="y-head">
            How {businessName} works with creators
          </h3>
          {business?.paymentVerified ? (
            <span className="y-micro y-fg-2 inline-flex items-center gap-1 font-medium">
              <BadgeCheck size={14} aria-hidden /> Payment verified
            </span>
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
          {figures.map((figure) => (
            <div key={figure.id} className="flex flex-col gap-0.5" title={figure.hint}>
              <dt className="y-micro y-fg-2">{figure.label}</dt>
              <dd className={`y-small y-num font-medium ${figure.known ? "" : "y-fg-2"}`}>
                {figure.value}
                {figure.known ? null : <span className="sr-only"> (not enough data yet)</span>}
              </dd>
            </div>
          ))}
        </dl>
        <Note>Payment is already authorized. It&apos;s held when you accept and paid to you when they approve.</Note>
      </section>
    </Panel>
  );
}

function CreatorMaking({ job }: { job: Job }) {
  const { commission: c, businessName, slot, adCopy, totals } = job;
  const brief = c.brief;
  if (slot) {
    return (
      <Panel
        title={`Film your review copy by ${weekdayDate(c.dueDate)}`}
        line={`${timeOf(c.dueDate)}, ${relativeDay(c.dueDate)}. ${businessName} sees a watermarked, low-quality copy until they approve it. Then you post it on your own account.`}
      >
        {brief.mustInclude.length ? (
          <div className="flex flex-col gap-2">
            <h3 className="y-head">Talking points</h3>
            <Checklist items={brief.mustInclude} />
          </div>
        ) : null}
        {brief.avoid.length ? (
          <div className="flex flex-col gap-2">
            <h3 className="y-head">Please avoid</h3>
            <Checklist items={brief.avoid} kind="avoid" />
          </div>
        ) : null}
        <Note>
          After approval: post it on {slot.platformName}
          {slot.social ? ` from @${slot.social.handle}` : ""}, tag {slot.brandHandle} and turn on the paid-partnership
          label. Your {cash(totals.creatorEarns)} is released {CAMPAIGN_RELEASE_DAYS} days after we verify the post.
        </Note>
      </Panel>
    );
  }
  return (
    <Panel
      title={adCopy ? `Send the copy by ${weekdayDate(c.dueDate)}` : `Deliver version 1 by ${weekdayDate(c.dueDate)}`}
      line={`${timeOf(c.dueDate)}, ${relativeDay(c.dueDate)}. ${businessName} then has ${AUTO_APPROVE_DAYS} days to approve it or request changes.`}
    >
      {brief.hook ? (
        <div className="flex flex-col gap-1">
          <h3 className="y-head">{adCopy ? "The opening" : "The hook"}</h3>
          <p className="y-small max-w-[62ch]">{quoted(brief.hook)}</p>
        </div>
      ) : null}
      {adCopy && brief.copy?.pieces.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="y-head">What to write</h3>
          <Checklist items={brief.copy.pieces} />
        </div>
      ) : null}
      {brief.mustInclude.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="y-head">Must include</h3>
          <Checklist items={brief.mustInclude} />
        </div>
      ) : null}
      {brief.avoid.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="y-head">Please avoid</h3>
          <Checklist items={brief.avoid} kind="avoid" />
        </div>
      ) : null}
      <Note>
        Payment is held safely. {cash(totals.creatorEarns)} is released to you when {businessName} approves.
      </Note>
    </Panel>
  );
}

function CreatorRevision({ job }: { job: Job }) {
  const { commission: c, businessName, latest, selected, noun } = job;
  const sent = latest ? requestedComments(latest) : [];
  const asked = sent.length ? sent : latest ? openComments(latest).filter((m) => m.author === "business") : [];
  const toGo = asked.filter((m) => !m.resolved).length;
  return (
    <Panel
      title={`${businessName} requested changes`}
      line={
        latest
          ? toGo
            ? `${plural(toGo, "comment")} to work through on ${noun} ${latest.version}. Mark each one done as you go; ${businessName} sees it ticked. Due ${weekdayDate(c.dueDate)}.`
            : `Everything ${businessName} asked for on ${noun} ${latest.version} is done. Upload ${noun} ${c.deliveries.length + 1} when it's ready.`
          : "Upload a new version when it's ready."
      }
    >
      {selected ? <ReviewArea job={job} delivery={selected} /> : null}
    </Panel>
  );
}

function CreatorWaiting({ job }: { job: Job }) {
  const { commission: c, businessName, latest, selected, slot, noun, totals } = job;
  const auto = autoApproveDate(c);
  return (
    <Panel
      title={`Waiting for ${possessive(businessName)} review`}
      line={`${latest ? `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${latest.version} went in ${ago(latest.deliveredAt)}. ` : ""}${
        auto
          ? slot
            ? `If they don't respond, it's approved on ${weekdayDate(auto)}.`
            : `If they don't respond, it approves itself on ${weekdayDate(auto)} and ${cash(totals.creatorEarns)} is released to you.`
          : ""
      }`}
    >
      {selected ? <ReviewArea job={job} delivery={selected} /> : null}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Both sides                                                                  */
/* -------------------------------------------------------------------------- */

function Disputed({ job }: { job: Job }) {
  const { side, creatorName, selected } = job;
  return (
    <Panel
      title="Yapp support is on it"
      line={
        side === "business"
          ? `We're reading the brief, the versions and your messages, and a person replies here within 48 hours. The payment stays held meanwhile. If ${creatorName} can't deliver what was agreed, you get a full refund.`
          : "We're reading the brief, the versions and your messages, and a person replies here within 48 hours. The payment stays held meanwhile. If the work matches what was agreed, you're paid."
      }
    >
      {selected ? <ReviewArea job={job} delivery={selected} /> : null}
    </Panel>
  );
}

function Ended({ job }: { job: Job }) {
  const { commission: c, side, slot, creatorName, businessName } = job;
  const reason = c.cancelReason && c.cancelReason !== "Offer withdrawn" ? c.cancelReason : undefined;
  const reasonLine = reason ? `${reason}${/[.!?]$/.test(reason) ? "" : "."} ` : "";

  if (slot) {
    const slotMoney =
      c.payment.status === "refunded"
        ? "The campaign is closed, so the slot's money went back to your card in full."
        : "The slot reopened for another creator, and its money stays held in your campaign.";
    if (side === "business") {
      const title =
        c.cancelCode === "video_rejected"
          ? "You didn't approve this video"
          : c.cancelCode === "campaign_closed"
            ? "This slot ended when the campaign closed"
            : c.cancelCode === "post_removed"
              ? `${possessive(creatorName)} post stayed down`
              : `You removed ${creatorName} from this slot`;
      const line =
        c.cancelCode === "campaign_closed"
          ? "Its money went back to your campaign hold."
          : c.cancelCode === "post_removed"
            ? `It wasn't back within ${CAMPAIGN_RESTORE_HOURS} hours, so ${creatorName} wasn't paid. ${slotMoney}`
            : `${reasonLine}${slotMoney}`;
      return <Panel title={title} line={line} />;
    }
    if (c.cancelCode === "video_rejected") {
      return (
        <Panel title="This video wasn't approved" line="The slot went back to the campaign. Thanks for giving it a go. Other campaigns are open in Find work.">
          {c.cancelReason ? <Quote text={c.cancelReason} by={businessName} /> : null}
        </Panel>
      );
    }
    const title =
      c.cancelCode === "post_removed"
        ? "Your post stayed down"
        : c.cancelCode === "campaign_closed"
          ? "This campaign closed"
          : `${businessName} went with another creator for this slot`;
    const line =
      c.cancelCode === "post_removed"
        ? `It wasn't back within ${CAMPAIGN_RESTORE_HOURS} hours, so the slot and its pay went back to ${businessName}.`
        : c.cancelCode === "campaign_closed"
          ? `The slot ended when ${businessName} closed the campaign. Other campaigns are open in Find work.`
          : "Thanks for taking it. Other campaigns are open in Find work.";
    return <Panel title={title} line={line} />;
  }

  if (c.status === "declined") {
    return side === "business" ? (
      <Panel
        title={`${creatorName} can't take this one`}
        line={`${reasonLine}The authorization on your card was released. You weren't charged.`}
      />
    ) : (
      <Panel title="You declined this offer" line={`${reasonLine}${businessName} was told, and the authorization on their card was released.`} />
    );
  }

  const withdrawn = c.cancelReason === "Offer withdrawn";
  if (side === "business") {
    return (
      <Panel
        title={withdrawn ? "You withdrew this offer" : "This job was cancelled"}
        line={`${reasonLine}${
          c.acceptedAt
            ? `The ${cash(job.totals.total)} you paid was refunded in full to your card. Refunds take 3–5 working days to show.`
            : "The authorization on your card was released. You weren't charged."
        }`}
      />
    );
  }
  return (
    <Panel
      title={withdrawn ? `${businessName} withdrew this offer` : "This job was cancelled"}
      line={`${reasonLine}${
        withdrawn
          ? "Nothing to do on your side. You can still pitch on their other orders."
          : `${businessName} was refunded. If you'd already started, open Get help under Details and we'll look at it with you.`
      }`}
    />
  );
}
