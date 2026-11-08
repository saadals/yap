"use client";

import { BadgeCheck, ChevronDown, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { PriceSummary, paymentLabel } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { useToast } from "@/components/ui/toast";
import { compact, dueLabel, relativeDay, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { useDemo } from "@/lib/store";
import { CAMPAIGN_DEADLINE_DAYS } from "@/lib/taxonomy";

import { cash, paymentWords, type Workspace } from "./helpers";

/**
 * The one slim side block: who, how much, when, revisions left and a way to get help.
 * Key dates live in the Activity tab; the price breakdown opens from the money row.
 * Campaign slots: the slot price with no fee, no due date yet, and "Remove creator" in place of
 * cancel (no extensions; the slot reopens for someone else instead).
 */
export function SidePanels({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const toast = useToast();
  const { commission, side, creatorName, businessName, totals, slot } = ws;
  const status = commission.status;
  const payment = commission.payment.status;
  const method = s.paymentMethods.find((m) => m.id === commission.payment.methodId);
  const ended = ["completed", "cancelled", "declined"].includes(status);
  // A creator's open offer already shows money, due date and revisions in the header.
  const offerShown = side === "creator" && status === "offered";
  // A slot that ended without approval earns the creator nothing: no money row.
  const endedSlotForCreator = Boolean(slot) && side === "creator" && status === "cancelled";
  const showDue = !offerShown && !ended && status !== "delivered" && status !== "disputed";
  const showRevisions = !offerShown && !ended;
  const canExtend = !slot && side === "business" && (status === "in_progress" || status === "revision");
  const canReport = ["in_progress", "delivered", "revision"].includes(status);
  const canCancel = !slot && side === "business" && status === "in_progress" && commission.deliveries.length === 0;
  const canRemove = Boolean(slot) && side === "business" && status === "in_progress" && commission.deliveries.length === 0;
  const due = dueLabel(commission.dueDate);
  const left = commission.revisionsIncluded - commission.revisionsUsed;
  const amount = slot ? commission.price : side === "business" ? totals.total : totals.creatorEarns;

  const protection =
    payment === "held"
      ? slot
        ? side === "business"
          ? `Paid from the campaign budget Yapp holds. ${creatorName} is paid only when you approve.`
          : `Paid from the campaign budget Yapp holds. It moves to your wallet when ${businessName} approves.`
        : side === "business"
          ? `Payment protected: released to ${creatorName} only when you approve.`
          : `Payment secured: paid to you when ${businessName} approves, or 3 days after delivery.`
      : payment === "authorized" && side === "business"
        ? `Payment protected: charged only if ${creatorName} accepts.`
        : null;

  const getHelp = () => {
    if (canReport) {
      ws.openSheet("report");
      return;
    }
    toast({
      message:
        status === "disputed"
          ? "Yapp support is already on it. Replies arrive in Messages."
          : "Yapp support will reply in your messages within a few hours.",
      tone: "info",
    });
  };

  const row = "flex items-baseline justify-between gap-4 border-t border-(--b-line) py-3";

  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-4">
      <h2 id="details-title" className="y-head">
        Details
      </h2>

      <Party ws={ws} />

      <div className="flex flex-col">
        {offerShown || endedSlotForCreator ? null : (
          <details className="group border-t border-(--b-line)">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="y-small y-fg-2">
                {side === "creator" ? "You earn" : slot ? "Price per video" : "Total"}
              </span>
              <span className="y-small inline-flex items-baseline gap-1.5 text-end">
                <span className="y-num font-semibold">{cash(amount)}</span>
                <span className="y-fg-2">· {paymentWords(payment, side)}</span>
                <ChevronDown
                  size={14}
                  aria-hidden
                  className="y-fg-2 translate-y-0.5 self-center transition-transform group-open:rotate-180"
                />
              </span>
            </summary>
            <div className="flex flex-col gap-3 pb-4">
              <PriceSummary
                price={commission.price}
                priceLabel={
                  side === "business" ? (slot ? "Price per video" : `${creatorName}'s price`) : "Your price"
                }
                addons={commission.addons}
                feeRate={commission.feeRate}
                perspective={side}
                showRights={side === "business"}
              />
              {side === "business" && slot ? (
                <p className="y-micro y-fg-2">No service fee on campaigns. Set by the campaign&apos;s follower tier.</p>
              ) : side === "business" && method ? (
                <p className="y-micro y-fg-2">Paid with {paymentLabel(method)}</p>
              ) : null}
            </div>
          </details>
        )}

        {showDue && slot ? (
          CAMPAIGN_DEADLINE_DAYS === null ? (
            <div className={row}>
              <span className="y-small y-fg-2">Deadline</span>
              <span className="y-small y-fg-2">Not set yet</span>
            </div>
          ) : null
        ) : showDue ? (
          <div className={row}>
            <span className="y-small y-fg-2">Due</span>
            <span className="y-small inline-flex flex-wrap items-baseline justify-end gap-x-1.5 text-end">
              <span className={`font-semibold ${due.urgency === "late" ? "text-(--y-danger)" : ""}`}>
                {weekdayDate(commission.dueDate)}
              </span>
              <span className="y-fg-2">· {relativeDay(commission.dueDate)}</span>
              {canExtend ? (
                <button type="button" className="y-link font-semibold" onClick={() => ws.openSheet("extend")}>
                  Extend
                </button>
              ) : null}
            </span>
          </div>
        ) : null}

        {showRevisions ? (
          <div className={row}>
            <span className="y-small y-fg-2">{slot ? "Change rounds" : "Revisions"}</span>
            <span className="y-small y-num font-semibold">
              {left >= 0 ? `${left} of ${commission.revisionsIncluded} left` : `${-left} extra used`}
            </span>
          </div>
        ) : null}

        {protection ? (
          <p className="y-micro y-fg-2 inline-flex items-start gap-1.5 border-t border-(--b-line) pt-3">
            <ShieldCheck size={14} aria-hidden className="mt-px flex-none" />
            {protection}
          </p>
        ) : null}
      </div>

      <p className="y-small flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" className="y-link font-semibold" onClick={getHelp}>
          Get help
        </button>
        {canCancel ? (
          <button type="button" className="y-link y-fg-2" onClick={() => ws.openSheet("cancel")}>
            Cancel commission
          </button>
        ) : null}
        {canRemove ? (
          <button type="button" className="y-link y-fg-2" onClick={() => ws.openSheet("removeCreator")}>
            Remove creator
          </button>
        ) : null}
      </p>
    </Block>
  );
}

/** The other side in one row, with the one or two facts that build trust. */
function Party({ ws }: { ws: Workspace }) {
  const { side, creator, business, slot } = ws;
  if (side === "business") {
    if (!creator) return null;
    // Campaigns: the platform and verified followers (what the tier is about), never an external link.
    const meta = slot?.social
      ? `${slot.platformName} · ${compact(slot.social.followers)} ${slot.social.verified ? "verified " : ""}followers · ★ ${creator.rating.toFixed(1)}`
      : `★ ${creator.rating.toFixed(1)} · ${creator.onTimeRate}% on time · replies in ~${creator.responseHours}h`;
    return (
      <div className="flex items-center gap-3">
        <FaceAvatar id={creator.id} name="" size={40} />
        <div className="flex min-w-0 flex-col">
          <Link href={paths.creator(creator.handle)} className="y-small y-link inline-flex w-fit items-center gap-1 font-semibold">
            {creator.name}
            {slot?.social?.verified ? <BadgeCheck size={14} role="img" aria-label="Followers verified" /> : null}
          </Link>
          <span className="y-micro y-fg-2 y-num">{meta}</span>
        </div>
      </div>
    );
  }
  if (!business) return null;
  return (
    <div className="flex items-center gap-3">
      <BusinessLogo business={business} size={40} />
      <div className="flex min-w-0 flex-col">
        <span className="y-small font-semibold">{business.name}</span>
        <span className="y-micro y-fg-2 y-num">
          ★ {business.clientRating.toFixed(1)} client rating · {business.hires} hires
          {business.paymentVerified ? " · Payment verified" : ""}
        </span>
      </div>
    </div>
  );
}
