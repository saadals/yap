"use client";

import { ArrowLeft, BadgeCheck, ChevronRight } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { ThreadView } from "@/components/domain/thread-view";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { commissionById, requestById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { commissionStatus, pitchStatus, requestStatus } from "@/lib/taxonomy";
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
  const verified = other.kind === "creator" ? other.creator?.verified : other.business?.verified;
  const profileHref = other.kind === "creator" && other.creator ? `/creators/${other.creator.handle}` : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3 border-b border-(--b-line) pb-3">
        <RoundIconButton href={backHref} label="Back to all messages" size="sm" className="flex-none lg:!hidden">
          <ArrowLeft size={20} aria-hidden className="y-flip" />
        </RoundIconButton>
        {other.kind === "creator" ? (
          <FaceAvatar id={thread.creatorId} name="" size={44} />
        ) : other.business ? (
          <BusinessLogo business={other.business} size={44} />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="y-head flex items-center gap-1.5">
            {profileHref ? (
              <Link href={profileHref} className="truncate hover:underline">
                {other.name}
              </Link>
            ) : (
              <span className="truncate">{other.name}</span>
            )}
            {verified ? <BadgeCheck size={18} role="img" aria-label="Verified" className="flex-none" /> : null}
          </h2>
          <ContextLine s={s} role={role} thread={thread} />
        </div>
      </div>

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

/** One quiet line under the name: what this conversation is about, linking to it. */
function ContextLine({ s, role, thread }: { s: DemoState; role: Role; thread: Thread }) {
  const context = threadContext(s, role, thread);
  if (!context) return null;
  const { href, title, status, label } = context;

  return (
    <Link
      href={href}
      className="y-micro y-fg-2 flex min-w-0 items-center gap-1 hover:text-(--b-fg) hover:underline"
    >
      <span className="sr-only">{label}: </span>
      <span className="truncate">{title}</span>
      <span aria-hidden className="max-sm:hidden">·</span>
      <span className="flex-none max-sm:sr-only">{status}</span>
      <ChevronRight size={14} aria-hidden className="y-flip flex-none" />
    </Link>
  );
}

function threadContext(s: DemoState, role: Role, thread: Thread) {
  const commission = thread.commissionId ? commissionById(s, thread.commissionId) : undefined;
  if (commission) {
    return {
      href: `/${role}/commissions/${commission.id}`,
      title: commission.title,
      status:
        commission.status === "offered" && role === "creator" ? "New offer" : commissionStatus[commission.status].label,
      label: "Open commission",
    };
  }
  const request = thread.requestId ? requestById(s, thread.requestId) : undefined;
  if (!request) return null;
  const pitch = s.pitches.find(
    (p) => p.requestId === request.id && p.creatorId === thread.creatorId && p.status !== "withdrawn",
  );
  return {
    href: role === "business" ? `/business/requests/${request.id}` : `/creator/opportunities/${request.id}`,
    title: request.title,
    status: pitch ? `Pitch ${pitchStatus[pitch.status].label.toLowerCase()}` : requestStatus[request.status].label,
    label: role === "business" ? "Open request" : "Open opportunity",
  };
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
      <div className="flex flex-1 flex-col justify-end gap-3 py-4">
        <Skeleton className="h-12 w-3/5 !rounded-[20px]" />
        <Skeleton className="ms-auto h-12 w-1/2 !rounded-[20px]" />
        <Skeleton className="h-16 w-2/3 !rounded-[20px]" />
      </div>
      <Skeleton className="h-11 w-full !rounded-full" />
    </div>
  );
}
