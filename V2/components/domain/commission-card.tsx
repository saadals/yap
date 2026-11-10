"use client";

import { ArrowRight, Repeat2 } from "lucide-react";
import Link from "next/link";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { dueLabel, money, shortDate, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, commissionTotals, creatorById, needsAction } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { commissionStatus, formatById } from "@/lib/taxonomy";
import type { Commission, Role } from "@/lib/types";

import { BusinessLogo } from "./business-logo";
import { CommissionBadge, SlotBadge, slotStatus } from "./status-badge";

/**
 * A commission as a card, from the viewer's side of the deal (`role`: "business" = they ordered
 * it, "creator" = they're making it). Whole card links to the workspace.
 */
export function CommissionCard({
  commission,
  role,
  className = "",
}: {
  commission: Commission;
  role: Role;
  className?: string;
}) {
  const campaign = commission.source === "campaign";
  const s = useDemo();
  const creator = creatorById(s, commission.creatorId);
  const business = businessById(s, commission.businessId);
  const totals = commissionTotals(commission);
  const format = formatById[commission.brief.format];
  const due = dueLabel(commission.dueDate);
  const actionable = needsAction(commission, role);
  const ended = ["completed", "cancelled", "declined"].includes(commission.status);
  const href = paths.commission(commission.id);

  const when = campaign
    ? commission.status === "completed"
      ? commission.post?.status === "live"
        ? commission.payment.status === "pending" && commission.withdrawableFrom
          ? `Post verified · paid ${shortDate(commission.withdrawableFrom)}`
          : "Post verified"
        : "Post it to unlock your pay"
      : commission.status === "cancelled"
        ? "Slot ended"
        : commission.status === "in_progress" && commission.deliveries.length === 0
          ? `Slot ${commission.campaignSlot ?? ""} · upload by ${shortDate(commission.dueDate)}`
          : `Slot ${commission.campaignSlot ?? ""} · Campaign`
    : commission.status === "completed" && commission.completedAt
      ? `Completed ${shortDate(commission.completedAt)}`
      : ended
        ? commission.status === "declined"
          ? "Declined"
          : "Cancelled"
        : commission.status === "offered"
          ? role === "business"
            ? "Waiting for them to accept"
            : `Due ${shortDate(commission.dueDate)} if you accept`
          : commission.status === "delivered" && commission.autoApproveAt
            ? `Auto-approves ${weekdayDate(commission.autoApproveAt)}`
            : due.text;

  return (
    <article data-tone="paper" className={`y-block y-hoverable relative flex flex-col gap-3 p-5 ${className}`}>
      <div className="flex items-start gap-3">
        {role === "business" && creator ? (
          <FaceAvatar id={creator.id} name="" size={40} />
        ) : business ? (
          <BusinessLogo business={business} size={40} />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="y-micro y-fg-2 truncate">
            {role === "business" ? creator?.name : business?.name} · {campaign ? "UGC campaign" : format.name}
            {commission.source === "repeat" ? (
              <span className="ms-1 inline-flex items-center gap-0.5">
                · <Repeat2 size={12} aria-hidden /> Repeat
              </span>
            ) : null}
          </p>
          <h3 className="y-head mt-0.5">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']">
              {commission.title}
            </Link>
          </h3>
        </div>
        <span className="y-display y-num flex-none text-[20px] font-semibold tracking-[-0.02em]">
          {money(campaign ? commission.price : role === "business" ? totals.total : totals.creatorEarns)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {campaign ? <SlotBadge commission={commission} side={role} /> : <CommissionBadge status={commission.status} side={role} />}
        <span
          className={`y-micro ${!ended && due.urgency === "late" && commission.status !== "offered" ? "text-(--y-danger)" : "y-fg-2"}`}
        >
          {when}
        </span>
      </div>

      {actionable ? (
        <p className="y-small flex items-center justify-between gap-2 border-t border-(--b-line) pt-3 font-semibold">
          <span>
            {campaign
              ? role === "business"
                ? "Review the copy"
                : commission.status === "completed"
                  ? "Post it with the brand tag"
                  : slotStatus(commission).label === "Filming"
                    ? "Film and upload your review copy"
                    : "Make the requested changes"
              : role === "business"
                ? commissionStatus[commission.status].business
                : commissionStatus[commission.status].creator}
          </span>
          <ArrowRight size={18} aria-hidden className="y-flip flex-none" />
        </p>
      ) : null}
    </article>
  );
}
