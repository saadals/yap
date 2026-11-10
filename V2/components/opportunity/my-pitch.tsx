"use client";

import { Check, MessageCircle, Pencil, Search, Undo2, X } from "lucide-react";
import { useState } from "react";

import { PitchBadge } from "@/components/domain/status-badge";
import { VideoThumb } from "@/components/domain/video-thumb";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { money, plural, priceWithNet, quoted, timeAgo } from "@/lib/format";
import { paths } from "@/lib/paths";
import { videoById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Business, ContentRequest, Pitch, PitchStatus, Video } from "@/lib/types";

import { canEditPitch, canWithdrawPitch, commissionForPitch, pitchNextStep, replyWindow } from "./pitch-helpers";

type Step = { label: string; state: "done" | "current" | "todo" | "failed"; note?: string };

function stepsFor(status: PitchStatus, sentAt: string): Step[] {
  if (status === "declined") {
    return [
      { label: "Sent", state: "done", note: timeAgo(sentAt) },
      { label: "Viewed", state: "done" },
      { label: "Not selected", state: "failed" },
    ];
  }
  const order: PitchStatus[] = ["sent", "viewed", "shortlisted", "hired"];
  const index = order.indexOf(status);
  return [{ label: "Sent", note: timeAgo(sentAt) }, { label: "Viewed" }, { label: "Shortlisted" }, { label: "Hired" }].map(
    (step, i) => ({
      ...step,
      state: i < index ? "done" : i === index ? (status === "hired" ? "done" : "current") : "todo",
    }),
  );
}

/** Sent → viewed → shortlisted → hired (or not selected), as a compact track. */
export function PitchSteps({ pitch }: { pitch: Pitch }) {
  const steps = stepsFor(pitch.status, pitch.sentAt);
  return (
    <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => (
        <li key={step.label} className="flex flex-col gap-1.5" aria-current={step.state === "current" ? "step" : undefined}>
          <span className="flex items-center gap-1" aria-hidden>
            <span
              className={`grid size-5 flex-none place-items-center rounded-full ${
                step.state === "done"
                  ? "bg-(--y-ink) text-(--y-paper)"
                  : step.state === "failed"
                    ? "bg-(--y-danger-soft) text-(--y-danger)"
                    : step.state === "current"
                      ? "shadow-[inset_0_0_0_2px_var(--y-ink)]"
                      : "bg-(--y-mist)"
              }`}
            >
              {step.state === "done" ? (
                <Check size={12} strokeWidth={3} />
              ) : step.state === "failed" ? (
                <X size={12} strokeWidth={3} />
              ) : null}
            </span>
            {index < steps.length - 1 ? (
              <span className={`h-[2px] flex-1 rounded-full ${step.state === "done" ? "bg-(--y-ink)" : "bg-(--y-line-strong)"}`} />
            ) : null}
          </span>
          <span className={`y-micro ${step.state === "todo" ? "y-fg-2" : "font-semibold"}`}>
            {step.label}
            <span className="sr-only">
              {step.state === "done" ? " (done)" : step.state === "current" ? " (current step)" : step.state === "todo" ? " (not yet)" : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Your pitch on this order: where it stands, what you sent, and what you can still do (edit while
 * they haven't shortlisted it, withdraw until they hire, open the job once hired).
 */
export function MyPitch({
  pitch,
  request,
  business,
  onEdit,
  justSent = false,
}: {
  pitch: Pitch;
  request: ContentRequest;
  business?: Business;
  onEdit: () => void;
  justSent?: boolean;
}) {
  const s = useDemo();
  const brandName = business?.name ?? "The brand";
  const job = pitch.status === "hired" ? commissionForPitch(s, pitch) : undefined;
  const samples = pitch.sampleIds.map((id) => videoById(s, id)).filter((v): v is Video => Boolean(v));
  const closedForOthers = request.status !== "open" && pitch.status !== "hired";
  const thread = s.threads.find(
    (t) => t.requestId === request.id && t.creatorId === pitch.creatorId && !t.commissionId && t.messages.length > 0,
  );

  return (
    <div className="flex flex-col gap-5" id="my-pitch">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="y-head">Your pitch</h2>
          <p className="y-small y-fg-2 y-num">
            {priceWithNet(pitch.price)} · first version in {plural(pitch.deliveryDays, "day")}
          </p>
        </div>
        <PitchBadge status={pitch.status} />
      </div>

      <PitchSteps pitch={pitch} />

      <p className="y-small" aria-live="polite">
        {justSent && pitch.status === "sent"
          ? `Sent. ${brandName} usually replies ${replyWindow(business)}, and we'll tell you when they open it.`
          : closedForOthers && pitch.status !== "declined"
            ? `${brandName} closed this order, so it's no longer taking pitches.`
            : pitchNextStep(pitch.status, brandName)}
      </p>

      <div className="flex flex-wrap gap-2">
        {pitch.status === "hired" ? (
          <PillButton href={job ? paths.job(job.id) : paths.studioJobs()} variant="neon" arrow>
            Open the job
          </PillButton>
        ) : null}
        {canEditPitch(pitch, request) ? (
          <PillButton variant="outline" icon={<Pencil size={16} aria-hidden />} onClick={onEdit}>
            Edit pitch
          </PillButton>
        ) : null}
        {pitch.status === "shortlisted" ? (
          <PillButton href={paths.messages(thread?.id)} variant="outline" icon={<MessageCircle size={16} aria-hidden />}>
            Messages
          </PillButton>
        ) : null}
        {canWithdrawPitch(pitch, request) ? (
          <WithdrawPitchButton pitch={pitch} requestTitle={request.title} brandName={brandName} />
        ) : null}
        {pitch.status === "declined" || closedForOthers ? (
          <PillButton href={paths.findWork()} variant="outline" icon={<Search size={16} aria-hidden />}>
            Find similar work
          </PillButton>
        ) : null}
      </div>
      {pitch.status === "shortlisted" ? (
        <p className="y-micro y-fg-2">
          Shortlisted pitches are locked, so {brandName} compares the version they picked. Message them if
          something needs to change.
        </p>
      ) : null}
      <div className="y-tile flex flex-col gap-3 p-4" aria-label="What you sent">
        <p className="y-small font-medium">{quoted(pitch.angle)}</p>
        <p className="y-micro y-fg-2 line-clamp-4 whitespace-pre-line">{pitch.message}</p>
        {samples.length ? (
          <div className="grid max-w-[240px] grid-cols-3 gap-1.5">
            {samples.map((video) => (
              <VideoThumb key={video.id} video={video} frame="9:16" showHook={false} showMeta={false} decorative />
            ))}
          </div>
        ) : null}
      </div>

    </div>
  );
}

/** Confirm, then withdraw. The brand stops seeing the pitch straight away. */
export function WithdrawPitchButton({
  pitch,
  requestTitle,
  brandName,
}: {
  pitch: Pitch;
  requestTitle: string;
  brandName: string;
}) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <>
      <PillButton variant="ghost" icon={<Undo2 size={16} aria-hidden />} onClick={() => setOpen(true)}>
        Withdraw
      </PillButton>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        side="center"
        width="sm"
        title="Withdraw this pitch?"
        description={`${brandName} will no longer see your ${money(pitch.price)} pitch for “${requestTitle}”.`}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton variant="ghost" onClick={() => setOpen(false)}>
              Keep my pitch
            </PillButton>
            <PillButton
              variant="contrast"
              onClick={() => {
                actions.withdrawPitch(pitch.id);
                setOpen(false);
                toast({ message: "Pitch withdrawn. You can pitch again while the order is open." });
              }}
            >
              Withdraw pitch
            </PillButton>
          </div>
        }
      >
        <p className="y-small y-fg-2">
          You can&apos;t undo this, but you can send a fresh pitch as long as the order is open.
        </p>
      </Sheet>
    </>
  );
}
