"use client";

import { ArrowRight, Repeat2 } from "lucide-react";
import Link from "next/link";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { dueLabel, money, shortDate } from "@/lib/format";
import { businessById, commissionTotals, creatorById, needsAction } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { commissionStatus, formatById } from "@/lib/taxonomy";
import type { Commission, Role } from "@/lib/types";

import { BusinessLogo } from "./business-logo";
import { CommissionBadge, DueBadge } from "./status-badge";
import { StageTrack } from "./stage-track";

/** A commission as a card, from either side. Whole card links to the workspace. */
export function CommissionCard({
  commission,
  role,
  className = "",
}: {
  commission: Commission;
  role: Role;
  className?: string;
}) {
  const s = useDemo();
  const creator = creatorById(s, commission.creatorId);
  const business = businessById(s, commission.businessId);
  const totals = commissionTotals(commission);
  const format = formatById[commission.brief.format];
  const due = dueLabel(commission.dueDate);
  const actionable = needsAction(commission, role);
  const ended = ["completed", "cancelled", "declined"].includes(commission.status);
  const href = `/${role}/commissions/${commission.id}`;

  return (
    <article data-tone="paper" className={`y-block y-hoverable relative flex flex-col gap-4 p-5 ${className}`}>
      <div className="flex items-start gap-3">
        {role === "business" && creator ? (
          <FaceAvatar id={creator.id} name="" size={44} />
        ) : business ? (
          <BusinessLogo business={business} size={44} />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="y-micro y-fg-2 truncate">
            {role === "business" ? creator?.name : business?.name} · {format.name}
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
        <span className="y-display y-num flex-none text-[22px] font-semibold tracking-[-0.02em]">
          {money(role === "business" ? totals.total : totals.creatorEarns)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <CommissionBadge status={commission.status} />
        {!ended && commission.status !== "offered" ? <DueBadge {...due} /> : null}
        {ended ? (
          <span className="y-micro y-fg-2">
            {commission.status === "completed" && commission.completedAt
              ? `Completed ${shortDate(commission.completedAt)}`
              : commission.cancelReason}
          </span>
        ) : null}
      </div>

      <StageTrack status={commission.status} compact />

      <p className={`y-small flex items-center justify-between gap-2 ${actionable ? "font-semibold" : "y-fg-2"}`}>
        <span>
          {role === "business" ? commissionStatus[commission.status].business : commissionStatus[commission.status].creator}
        </span>
        {actionable ? <ArrowRight size={18} aria-hidden className="y-flip flex-none" /> : null}
      </p>
    </article>
  );
}
