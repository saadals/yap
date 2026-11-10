"use client";

import { ArrowLeft, CloudCheck, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { ProgressBar } from "@/components/ui/progress";

export type WizardStep = { id: string; label: string };

/**
 * "Saved" feel for multi-step forms: flips to "Saving…" when `version` changes and settles a
 * moment later. State lives in the page; this only reflects it.
 */
export function useAutosave(version: number) {
  const [settled, setSettled] = useState(version);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(version), 650);
    return () => window.clearTimeout(timer);
  }, [version]);
  return settled === version ? "saved" : "saving";
}

function SavedIndicator({ state }: { state: "saved" | "saving" }) {
  return (
    <span className="y-micro y-fg-2 inline-flex items-center gap-1.5 whitespace-nowrap">
      {state === "saving" ? (
        <LoaderCircle size={14} aria-hidden className="animate-spin" />
      ) : (
        <CloudCheck size={15} aria-hidden />
      )}
      {state === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

/**
 * V2 focused flow: a narrow column with one question per step, a step line and a thin progress
 * bar above it, an optional live preview beside it on desktop (below it on phones), and one sticky
 * glass bar at the bottom with Back, Skip and Continue. The actions render once, so there is one
 * green button.
 */
export function FlowLayout({
  steps,
  current,
  title,
  description,
  saved,
  aside,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  busy = false,
  onSkip,
  skipLabel = "Skip for now",
  countKnown = true,
}: {
  steps: WizardStep[];
  current: number;
  title: React.ReactNode;
  description?: React.ReactNode;
  saved?: "saved" | "saving";
  /** A live preview: beside the step on desktop, under it on phones. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  busy?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  /** False until the number of steps is settled (the first question picks the path). */
  countKnown?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(current);
  const total = Math.max(1, steps.length);

  // Move focus and scroll to the new step's heading (not on first load).
  useEffect(() => {
    if (shownStep.current === current) return;
    shownStep.current = current;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    headingRef.current?.focus({ preventScroll: true });
  }, [current]);

  return (
    <form
      noValidate
      className="y-flow"
      data-aside={aside ? "true" : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy) onNext();
      }}
    >
      <div className="y-flow-main flex min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="y-small y-fg-2 font-medium">
              {countKnown ? (
                <>
                  Step {current + 1} of {total}
                  <span aria-hidden> · </span>
                </>
              ) : null}
              {steps[current]?.label}
            </p>
            {saved ? <SavedIndicator state={saved} /> : null}
          </div>
          <ProgressBar
            value={countKnown ? (current + 1) / total : 0.08}
            label={countKnown ? `Step ${current + 1} of ${total}` : "Getting started"}
          />
          <h1 ref={headingRef} tabIndex={-1} className="y-display y-t-display pt-4 outline-none">
            {title}
          </h1>
          {description ? <p className="y-body y-fg-2 max-w-[56ch]">{description}</p> : null}
        </div>
        <div className="flex flex-col gap-7">{children}</div>
      </div>

      {aside ? <aside className="y-flow-aside flex flex-col gap-2">{aside}</aside> : null}

      <div className="y-flow-bar">
        <div className="y-bar mx-auto flex w-full max-w-[640px] items-center gap-2 rounded-full p-2">
          {onBack ? (
            <PillButton variant="ghost" onClick={onBack} icon={<ArrowLeft size={18} aria-hidden className="y-flip" />}>
              Back
            </PillButton>
          ) : null}
          <span className="flex-1" />
          {onSkip ? (
            <PillButton variant="ghost" onClick={onSkip} className="max-sm:!px-3">
              {skipLabel}
            </PillButton>
          ) : null}
          <PillButton type="submit" variant="neon" disabled={busy} aria-busy={busy || undefined} className="min-w-32">
            {nextLabel}
          </PillButton>
        </div>
      </div>
    </form>
  );
}

/** Wizard form state with a change counter for the "Saved" indicator. */
export function useWizardData<T extends object>(initial: T | (() => T)) {
  const [data, setData] = useState<T>(initial);
  const [version, setVersion] = useState(0);
  const update = useCallback((patch: Partial<T> | ((current: T) => Partial<T>)) => {
    setData((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));
    setVersion((v) => v + 1);
  }, []);
  return { data, update, version };
}

/** After a failed Continue: move focus to the first invalid control so the error is heard. */
export function focusFirstError() {
  window.requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(
      "#main [aria-invalid='true'], #main [data-invalid='true']",
    );
    if (!target) return;
    const focusable = target.matches("input, textarea, select, button")
      ? target
      : target.querySelector<HTMLElement>("button, input, select, textarea");
    focusable?.focus();
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
