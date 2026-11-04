"use client";

import { Check, Undo2, X } from "lucide-react";
import { useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { money, timeAgo } from "@/lib/format";
import { actions } from "@/lib/store";
import type { Pitch, PitchStatus } from "@/lib/types";

type Step = { label: string; state: "done" | "current" | "todo" | "failed" };

function stepsFor(status: PitchStatus, sentAt: string): (Step & { note?: string })[] {
  const order: PitchStatus[] = ["sent", "viewed", "shortlisted", "hired"];
  if (status === "declined") {
    return [
      { label: "Sent", state: "done", note: timeAgo(sentAt) },
      { label: "Viewed", state: "done" },
      { label: "Not selected", state: "failed" },
    ];
  }
  const index = order.indexOf(status);
  return [
    { label: "Sent", note: timeAgo(sentAt) },
    { label: "Viewed" },
    { label: "Shortlisted" },
    { label: "Hired" },
  ].map((step, i) => ({
    ...step,
    state: i < index ? "done" : i === index ? (status === "hired" ? "done" : "current") : "todo",
  }));
}

/** Sent → viewed → shortlisted → hired (or not selected), with the current step marked. */
export function PitchTimeline({ pitch }: { pitch: Pitch }) {
  const steps = stepsFor(pitch.status, pitch.sentAt);
  return (
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => (
        <li
          key={step.label}
          className="flex flex-col gap-2"
          aria-current={step.state === "current" ? "step" : undefined}
        >
          <span className="flex items-center gap-1.5" aria-hidden>
            <span
              className={`grid size-7 flex-none place-items-center rounded-full ${
                step.state === "done"
                  ? "bg-(--b-fg) text-(--b-bg)"
                  : step.state === "failed"
                    ? "bg-(--y-danger-soft) text-(--y-danger)"
                    : step.state === "current"
                      ? "bg-(--b-bg) text-(--b-fg) shadow-[inset_0_0_0_2px_var(--b-fg)]"
                      : "bg-(--b-chip) text-(--b-fg-3)"
              }`}
            >
              {step.state === "done" ? (
                <Check size={14} strokeWidth={3} />
              ) : step.state === "failed" ? (
                <X size={14} strokeWidth={3} />
              ) : (
                <span className="y-micro y-num font-semibold">{index + 1}</span>
              )}
            </span>
            {index < steps.length - 1 ? (
              <span
                className={`h-[3px] flex-1 rounded-full ${step.state === "done" ? "bg-(--b-fg)" : "bg-(--b-line)"}`}
              />
            ) : null}
          </span>
          <span className="flex flex-col">
            <span
              className={`y-small ${step.state === "todo" ? "y-fg-3" : "font-semibold"}`}
            >
              {step.label}
              <span className="sr-only">
                {step.state === "done"
                  ? " (done)"
                  : step.state === "current"
                    ? " (current step)"
                    : step.state === "failed"
                      ? ""
                      : " (not yet)"}
              </span>
            </span>
            {step.note ? <span className="y-micro y-fg-2">{step.note}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Confirm, then withdraw. The business stops seeing the pitch immediately. */
export function WithdrawPitchButton({
  pitch,
  requestTitle,
  businessName,
  size = "sm",
  variant = "ghost",
  onWithdrawn,
}: {
  pitch: Pitch;
  requestTitle: string;
  businessName: string;
  size?: "sm" | "md";
  variant?: "ghost" | "outline" | "soft";
  onWithdrawn?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <>
      <PillButton
        variant={variant}
        size={size}
        icon={<Undo2 size={16} aria-hidden />}
        onClick={() => setOpen(true)}
        aria-label={`Withdraw pitch for ${requestTitle}`}
      >
        Withdraw
      </PillButton>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        side="center"
        width="sm"
        title="Withdraw this pitch?"
        description={`${businessName} will no longer see your ${money(pitch.price)} pitch for "${requestTitle}".`}
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
                toast({ message: "Pitch withdrawn. You can pitch again while the request is open." });
                onWithdrawn?.();
              }}
            >
              Withdraw pitch
            </PillButton>
          </div>
        }
      >
        <p className="y-small y-fg-2">
          Withdrawing can&apos;t be undone, but you can send a fresh pitch as long as the request is
          still open.
        </p>
      </Sheet>
    </>
  );
}
