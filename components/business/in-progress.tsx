"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { CommissionBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { dueLabel, money } from "@/lib/format";
import { businessSpend, commissionTotals, commissionsForBusiness, creatorById, isActive } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { Commission } from "@/lib/types";

/** Shared look for a compact dashboard row: the whole row links, hover tints it. */
export const rowClass =
  "relative -mx-3 flex items-center gap-3 rounded-(--y-r-tile) px-3 py-3 transition-colors duration-(--y-dur-1) hover:bg-(--b-chip)";
export const stretched = "after:absolute after:inset-0 after:rounded-(--y-r-tile) after:content-['']";

/** Block heading with a count and a quiet "View all" link. */
export function BlockHeader({
  id,
  title,
  count,
  href,
  linkLabel = "View all",
}: {
  id: string;
  title: string;
  count?: number;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="y-display y-title">
        {title} {count ? <span className="y-fg-3 y-num">{count}</span> : null}
      </h2>
      <PillButton
        href={href}
        variant="ghost"
        size="sm"
        className="-me-3"
        icon={<ArrowRight size={16} aria-hidden className="y-flip order-last" />}
      >
        {linkLabel}
      </PillButton>
    </div>
  );
}

function CommissionRow({ commission }: { commission: Commission }) {
  const s = useDemo();
  const creator = creatorById(s, commission.creatorId);
  const due = dueLabel(commission.dueDate);
  const when = commission.status === "offered" ? "Waiting for them to accept" : due.text;
  const late = commission.status !== "offered" && due.urgency === "late";
  return (
    <li className={rowClass}>
      {creator ? <FaceAvatar id={creator.id} name="" size={40} /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="y-body truncate font-semibold">
          <Link href={`/business/commissions/${commission.id}`} className={stretched}>
            {commission.title}
          </Link>
        </h3>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CommissionBadge status={commission.status} />
          <span className={`y-micro ${late ? "text-(--y-danger)" : "y-fg-2"}`}>
            {creator?.firstName ? `${creator.firstName} · ` : ""}
            {when}
          </span>
        </p>
      </div>
      <span className="y-display y-num flex-none self-start pt-0.5 text-[18px] font-semibold tracking-[-0.02em]">
        {money(commissionTotals(commission).total)}
      </span>
    </li>
  );
}

/** Commissions in flight (the ones that need you first) and the money protected for them. */
export function InProgress({ className = "", limit = 3 }: { className?: string; limit?: number }) {
  const s = useDemo();
  const active = commissionsForBusiness(s).filter(isActive);
  const spend = businessSpend(s);
  const protectedNow = spend.held + spend.authorized;

  return (
    <Block as="section" aria-labelledby="progress-title" tone="paper" pad="md" className={`flex flex-col gap-3 ${className}`}>
      <BlockHeader id="progress-title" title="In progress" count={active.length} href="/business/commissions" />

      {active.length ? (
        <ul className="flex flex-col">
          {active.slice(0, limit).map((commission) => (
            <CommissionRow key={commission.id} commission={commission} />
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2">Nothing in production. Work shows up here the moment it starts.</p>
      )}

      {protectedNow ? (
        <p className="y-small y-fg-2 flex items-center gap-2 border-t border-(--b-line) pt-4">
          <ShieldCheck size={16} aria-hidden className="flex-none" />
          <span className="min-w-0 flex-1">
            <span className="y-num font-semibold text-(--b-fg)">{money(protectedNow)}</span> protected
            until you approve
          </span>
          <Link href="/business/billing" className="y-link font-semibold text-(--b-fg)">
            Billing
          </Link>
        </p>
      ) : null}
    </Block>
  );
}
