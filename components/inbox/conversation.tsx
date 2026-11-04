"use client";

import { ArrowLeft, BadgeCheck, BriefcaseBusiness, ChevronRight, FileText, MapPin, UserRound } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CommissionBadge, PitchBadge, RequestBadge } from "@/components/domain/status-badge";
import { ThreadView } from "@/components/domain/thread-view";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { dueLabel, money, moneyRange } from "@/lib/format";
import {
  cityLabel,
  commissionById,
  commissionTotals,
  isActive,
  requestById,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Role, Thread } from "@/lib/types";

import { counterpart } from "./thread-meta";

export function Conversation({
  s,
  role,
  thread,
  backHref,
  maxHeight,
}: {
  s: DemoState;
  role: Role;
  thread: Thread;
  backHref: string;
  maxHeight: string;
}) {
  const other = counterpart(s, thread, role);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <RoundIconButton href={backHref} label="Back to all messages" size="sm" className="flex-none lg:!hidden">
          <ArrowLeft size={20} aria-hidden className="y-flip" />
        </RoundIconButton>
        {other.kind === "creator" ? (
          <FaceAvatar id={thread.creatorId} name="" size={48} />
        ) : other.business ? (
          <BusinessLogo business={other.business} size={48} />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="y-head flex items-center gap-1.5">
            <span className="truncate">{other.name}</span>
            {(other.kind === "creator" ? other.creator?.verified : other.business?.verified) ? (
              <BadgeCheck size={18} role="img" aria-label="Verified" className="flex-none" />
            ) : null}
          </h2>
          <p className="y-micro y-fg-2 flex items-center gap-1 truncate">
            {other.kind === "creator" && other.creator ? (
              <>
                <span className="truncate">@{other.creator.handle}</span>
                <span aria-hidden>·</span>
                <span className="truncate">Usually replies within {other.creator.responseHours}h</span>
              </>
            ) : other.kind === "business" && other.business ? (
              <>
                <MapPin size={12} aria-hidden className="flex-none" />
                <span className="truncate">
                  {cityLabel(other.business.cityId)} · {other.business.tagline}
                </span>
              </>
            ) : null}
          </p>
        </div>
        {other.kind === "creator" && other.creator ? (
          <PillButton
            href={`/creators/${other.creator.handle}`}
            variant="soft"
            size="sm"
            icon={<UserRound size={16} aria-hidden />}
            className="flex-none max-sm:!px-3"
            aria-label={`View ${other.creator.firstName}'s profile`}
          >
            <span className="max-sm:sr-only">Profile</span>
          </PillButton>
        ) : null}
      </div>

      <ContextCard s={s} role={role} thread={thread} />

      <ThreadView
        key={thread.id}
        threadId={thread.id}
        role={role}
        maxHeight={maxHeight}
        className="min-h-0 flex-1"
      />
    </div>
  );
}

function ContextCard({ s, role, thread }: { s: DemoState; role: Role; thread: Thread }) {
  const commission = thread.commissionId ? commissionById(s, thread.commissionId) : undefined;
  if (commission) {
    const totals = commissionTotals(commission);
    const due = dueLabel(commission.dueDate);
    const active = isActive(commission) && commission.status !== "offered";
    return (
      <Link
        href={`/${role}/commissions/${commission.id}`}
        className="y-tile y-hoverable flex items-center gap-3 p-3 pe-4"
      >
        <span aria-hidden className="grid size-11 flex-none place-items-center rounded-full bg-(--b-bg)">
          <BriefcaseBusiness size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="y-micro y-fg-2 truncate">
            Commission · {formatById[commission.brief.format].name}
            {active ? ` · ${due.text}` : ""}
          </span>
          <span className="y-small truncate font-semibold">{commission.title}</span>
          <span className="flex flex-wrap items-center gap-2">
            <CommissionBadge status={commission.status} className="!min-h-6 !px-2 text-xs" />
            <span className="y-micro y-num font-semibold">
              {role === "business" ? `${money(totals.total)} total` : `You earn ${money(totals.creatorEarns)}`}
            </span>
          </span>
        </span>
        <ChevronRight size={18} aria-hidden className="y-flip flex-none" />
        <span className="sr-only">Open commission</span>
      </Link>
    );
  }

  const request = thread.requestId ? requestById(s, thread.requestId) : undefined;
  if (request) {
    const pitch = s.pitches.find(
      (p) => p.requestId === request.id && p.creatorId === thread.creatorId && p.status !== "withdrawn",
    );
    const href =
      role === "business" ? `/business/requests/${request.id}` : `/creator/opportunities/${request.id}`;
    return (
      <Link href={href} className="y-tile y-hoverable flex items-center gap-3 p-3 pe-4">
        <span aria-hidden className="grid size-11 flex-none place-items-center rounded-full bg-(--b-bg)">
          <FileText size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="y-micro y-fg-2 truncate">
            Content request · Budget {moneyRange(request.budget.min, request.budget.max)}
          </span>
          <span className="y-small truncate font-semibold">{request.title}</span>
          <span className="flex flex-wrap items-center gap-2">
            <RequestBadge status={request.status} className="!min-h-6 !px-2 text-xs" />
            {pitch ? (
              <span className="flex items-center gap-1.5">
                <span className="y-micro y-fg-2">{role === "business" ? "Their pitch" : "Your pitch"}</span>
                <PitchBadge status={pitch.status} className="!min-h-6 !px-2 text-xs" />
              </span>
            ) : null}
          </span>
        </span>
        <ChevronRight size={18} aria-hidden className="y-flip flex-none" />
        <span className="sr-only">{role === "business" ? "Open request" : "Open opportunity"}</span>
      </Link>
    );
  }
  return null;
}

export function ConversationSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 !rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full !rounded-(--y-r-tile)" />
      <div className="flex flex-1 flex-col justify-end gap-3 py-4">
        <Skeleton className="h-12 w-3/5 !rounded-[20px]" />
        <Skeleton className="ms-auto h-12 w-1/2 !rounded-[20px]" />
        <Skeleton className="h-16 w-2/3 !rounded-[20px]" />
      </div>
      <Skeleton className="h-11 w-full !rounded-full" />
    </div>
  );
}
