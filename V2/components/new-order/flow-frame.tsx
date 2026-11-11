"use client";

import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { Page } from "@/components/ui/page";

import { Spinner } from "./parts";

export type FlowStep = { key: string; label: string };

/**
 * The frame of a focused ordering flow: a close link, the flow's name, a step indicator with the
 * current question as the page title, a main column (one question per card), a live preview on
 * desktop, and a glass bar at the bottom with Back and Continue (always visible, all widths).
 * Put it inside `<AppShell focus>`.
 */
export function FlowFrame({
  flowName,
  closeHref,
  closeLabel,
  steps,
  step,
  maxStep,
  onStep,
  title,
  lead,
  status,
  banner,
  children,
  preview,
  previewLabel,
  bar,
  headingRef,
}: {
  flowName: string;
  closeHref: string;
  closeLabel: string;
  steps: readonly FlowStep[];
  step: number;
  maxStep: number;
  onStep: (index: number) => void;
  /** The current question, as the page's h1. */
  title: string;
  /** One line under the question. */
  lead?: React.ReactNode;
  /** Save state or similar, top end. */
  status?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
  preview?: React.ReactNode;
  previewLabel?: string;
  bar: React.ReactNode;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <>
      <Page>
        {/* pb: room for the fixed bar, so the last card never sits under it. */}
        <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-12 [&>*]:min-w-0">
          <div className="flex flex-col gap-3 lg:col-span-7">
            <div className="flex flex-col gap-4 pb-2">
              <div className="flex items-center gap-3">
                <Link
                  href={closeHref}
                  className="y-round flex-none"
                  data-tone-btn="soft"
                  data-size="sm"
                  aria-label={closeLabel}
                  title={closeLabel}
                >
                  <X size={18} aria-hidden />
                </Link>
                <p className="y-small y-fg-2 min-w-0 flex-1 truncate">
                  <span className="font-semibold text-(--y-ink)">{flowName}</span>
                  <span aria-hidden> · </span>
                  Step {step + 1} of {steps.length}
                </p>
                {status}
              </div>
              <StepIndicator steps={steps} step={step} maxStep={maxStep} onStep={onStep} />
              <div className="flex flex-col gap-1">
                <h1 id="flow-title" ref={headingRef} tabIndex={-1} className="y-display y-t-display outline-none">
                  {title}
                </h1>
                {lead ? <p className="y-body y-fg-2 max-w-[60ch]">{lead}</p> : null}
              </div>
            </div>
            {banner}
            <div key={step} className="y-enter flex flex-col gap-3">
              {children}
            </div>
          </div>
          {preview ? (
            <aside className="hidden lg:col-span-5 lg:block" aria-label={previewLabel ?? "Preview"}>
              <div className="y-rail flex flex-col gap-3">{preview}</div>
            </aside>
          ) : null}
        </div>
      </Page>
      <FlowBar>{bar}</FlowBar>
    </>
  );
}

/** Steps as thin segments (labels on desktop). Reached steps can be jumped to. */
export function StepIndicator({
  steps,
  step,
  maxStep,
  onStep,
}: {
  steps: readonly FlowStep[];
  step: number;
  maxStep: number;
  onStep: (index: number) => void;
}) {
  return (
    <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Steps">
      {steps.map((item, index) => {
        const reachable = index <= maxStep && index !== step;
        return (
          <li key={item.key}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onStep(index)}
              aria-current={index === step ? "step" : undefined}
              aria-label={`${item.label}${index < step ? ", done" : index === step ? ", current step" : index <= maxStep ? "" : ", not reached yet"}`}
              className="group flex w-full flex-col gap-1.5 py-1 text-start disabled:cursor-default"
            >
              <span
                aria-hidden
                className={`h-1 rounded-full transition-colors ${
                  index <= step ? "bg-(--y-ink)" : index <= maxStep ? "bg-(--y-line-strong) group-hover:bg-(--y-ink-2)" : "bg-(--y-line)"
                }`}
              />
              <span
                aria-hidden
                className={`y-micro hidden truncate sm:block ${index === step ? "font-semibold" : "y-fg-2"}`}
              >
                {item.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Glass bar fixed to the bottom edge. Its content spans the page's whole column, so Back sits at
 * the page's start edge and Continue at its end edge: `flow` and `wide` line up with the 1200px
 * page (a flow's main column and preview together; the checkout), `narrow` with a 760px page.
 * Children sit in one row that may wrap (FlowActions puts its phone hint on a line of its own).
 */
export function FlowBar({ children, width = "flow" }: { children: React.ReactNode; width?: "flow" | "narrow" | "wide" }) {
  return (
    <div className="y-bar fixed inset-x-0 bottom-0 z-40 !rounded-none !border-x-0 !border-b-0 pb-[env(safe-area-inset-bottom)]">
      <div
        className={`mx-auto flex min-w-0 flex-wrap items-center gap-x-2 px-(--y-gutter) py-3 md:flex-nowrap ${
          width === "narrow" ? "max-w-[calc(760px+var(--y-gutter)*2)]" : "max-w-[calc(1200px+var(--y-gutter)*2)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Back (round on phones, labelled on desktop), a hint, and the one green Continue.
 *
 * Continue is always at full strength: pressing it with something missing is how the step shows
 * its errors and moves focus to the first one, so it never looks disabled (only `busy` dims it).
 * The hint sits beside Continue on wider screens; on phones it shows only when it says what's
 * missing (`blocked`), as a line of its own above the buttons. It is one live region for both.
 */
export function FlowActions({
  backLabel,
  onBack,
  hint,
  continueLabel,
  nextLabel,
  onContinue,
  busy = false,
  blocked = false,
  final = false,
  secondary,
}: {
  /** Name of the previous step ("Product"); omit on the first step. */
  backLabel?: string;
  onBack?: () => void;
  hint?: React.ReactNode;
  continueLabel: string;
  /** Next step's name, shown after the label on wide screens. */
  nextLabel?: string;
  onContinue: () => void;
  busy?: boolean;
  /** Something on this step still needs an answer (the button explains on press). */
  blocked?: boolean;
  final?: boolean;
  secondary?: React.ReactNode;
}) {
  return (
    <>
      {onBack && backLabel ? (
        <>
          <button
            type="button"
            className="y-round flex-none sm:hidden"
            data-tone-btn="soft"
            aria-label={`Back to ${backLabel}`}
            onClick={onBack}
            disabled={busy}
          >
            <ArrowLeft size={18} aria-hidden className="y-flip" />
          </button>
          <button
            type="button"
            className="y-pill hidden flex-none sm:inline-flex"
            data-variant="ghost"
            onClick={onBack}
            disabled={busy}
          >
            <ArrowLeft size={16} aria-hidden className="y-flip" />
            Back
          </button>
        </>
      ) : null}
      {/* Phones: first in the wrapped row, full width, up to two lines, and no height while empty. */}
      <div
        className={`y-small min-w-0 max-md:order-first max-md:basis-full max-md:line-clamp-2 max-md:[&:not(:empty)]:mb-2 md:flex-1 md:truncate md:px-2 md:text-end ${
          blocked ? "font-medium text-(--y-danger)" : "y-fg-2 max-md:hidden"
        }`}
        aria-live="polite"
      >
        {hint}
      </div>
      {secondary}
      <button
        type="button"
        className="y-pill ms-auto min-w-0 flex-1 justify-between md:flex-none md:min-w-52"
        data-variant="neon"
        data-arrow="true"
        data-size="lg"
        aria-disabled={busy ? "true" : undefined}
        onClick={onContinue}
      >
        <span className="min-w-0 truncate">
          {continueLabel}
          {nextLabel ? <span className="hidden font-medium lg:inline"> · {nextLabel}</span> : null}
        </span>
        <span aria-hidden className="y-arrow">
          {busy ? <Spinner /> : final ? <Check size={20} /> : <ArrowRight size={20} className="y-flip" />}
        </span>
      </button>
    </>
  );
}

/** Loading state while the saved store hydrates. */
export function FlowSkeleton({ label }: { label: string }) {
  return (
    <Page>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-busy="true" aria-label={label}>
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 !rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-9 w-3/5" />
          <div className="y-block y-pad-md flex flex-col gap-3" data-tone="paper">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
            <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
          </div>
        </div>
        <div className="hidden lg:col-span-5 lg:block">
          <div className="y-block y-pad-md flex flex-col gap-3" data-tone="paper">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full !rounded-(--y-r-tile)" />
          </div>
        </div>
      </div>
    </Page>
  );
}
