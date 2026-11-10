"use client";

import { ArrowLeft, BadgeCheck } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import type { DemoState } from "@/lib/store";
import type { Role, Thread } from "@/lib/types";

import { Messages } from "./messages";
import { counterpart, sideLabel, threadContext } from "./thread-meta";

/**
 * One open conversation: who it's with, what it's about (with a link to the job or the order),
 * then the messages and the composer. On phones it fills the screen under the header, with Back.
 */
export function Conversation({
  s,
  side,
  showSide,
  thread,
}: {
  s: DemoState;
  side: Role;
  /** Say which side you're on (accounts that order and make). */
  showSide: boolean;
  thread: Thread;
}) {
  const other = counterpart(s, thread, side);
  const verified = other.kind === "creator" ? other.creator?.verified : other.business?.verified;
  const profileHref = other.kind === "creator" && other.creator ? paths.creator(other.creator.handle) : undefined;
  const context = threadContext(s, side, thread);
  const line = [showSide ? sideLabel(side) : null, context?.kind, context?.status].filter(Boolean).join(" · ");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-none items-center gap-3 border-b border-(--y-line) px-3 py-3 md:px-5">
        <Link
          href={paths.messages()}
          scroll={false}
          className="y-round flex-none lg:hidden"
          data-tone-btn="ghost"
          aria-label="Back to all messages"
        >
          <ArrowLeft size={20} aria-hidden className="y-flip" />
        </Link>
        {other.kind === "creator" ? (
          <FaceAvatar id={thread.creatorId} name="" size={40} />
        ) : other.business ? (
          <BusinessLogo business={other.business} size={40} />
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
            {verified ? <BadgeCheck size={16} role="img" aria-label="Verified" className="flex-none" /> : null}
          </h2>
          {line ? <p className="y-small y-fg-2 truncate">{line}</p> : null}
        </div>
        {context ? (
          <PillButton
            href={context.href}
            variant="soft"
            size="sm"
            className="flex-none"
            aria-label={`${context.linkLabel}: ${context.title}`}
          >
            {context.linkLabel}
          </PillButton>
        ) : null}
      </header>
      <Messages key={thread.id} threadId={thread.id} role={side} />
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col gap-4 p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 !rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-3 py-4">
        <Skeleton className="h-12 w-3/5 !rounded-[18px]" />
        <Skeleton className="ms-auto h-12 w-1/2 !rounded-[18px]" />
        <Skeleton className="h-16 w-2/3 !rounded-[18px]" />
      </div>
      <Skeleton className="h-10 w-full !rounded-full" />
    </div>
  );
}
