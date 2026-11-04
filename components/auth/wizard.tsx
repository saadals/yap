"use client";

import { ArrowLeft, Check, CloudCheck, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Block } from "@/components/ui/block";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";

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
    <span className="y-micro y-fg-3 inline-flex items-center gap-1.5 whitespace-nowrap">
      {state === "saving" ? (
        <LoaderCircle size={14} aria-hidden className="animate-spin" />
      ) : (
        <CloudCheck size={15} aria-hidden />
      )}
      {state === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

/** Desktop step rail: numbers turn into checks; completed steps are clickable. */
function StepRail({
  steps,
  current,
  furthest,
  onJump,
}: {
  steps: WizardStep[];
  current: number;
  /** Furthest step reached; steps before it are done and can be revisited. */
  furthest: number;
  onJump?: (index: number) => void;
}) {
  return (
    <nav aria-label="Setup steps">
      <ol className="flex flex-col gap-1">
        {steps.map((step, index) => {
          const active = index === current;
          const done = !active && index < furthest;
          const reachable = !active && index <= furthest;
          const content = (
            <>
              <span
                aria-hidden
                className={`y-num grid size-8 flex-none place-items-center rounded-full text-sm font-semibold ${
                  active
                    ? "bg-(--b-fg) text-(--b-bg)"
                    : done
                      ? "bg-(--b-chip) text-(--b-chip-fg)"
                      : "shadow-[inset_0_0_0_1.5px_var(--b-line)] y-fg-3"
                }`}
              >
                {done ? <Check size={15} strokeWidth={3} /> : index + 1}
              </span>
              <span className={`y-small font-medium ${active ? "" : done ? "y-fg-2" : "y-fg-3"}`}>
                {step.label}
              </span>
              <span className="sr-only">
                {active ? "(current step)" : done ? "(done)" : "(to do)"}
              </span>
            </>
          );
          return (
            <li key={step.id}>
              {reachable && onJump ? (
                <button
                  type="button"
                  onClick={() => onJump(index)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-full px-1.5 text-start hover:bg-(--b-chip)"
                >
                  {content}
                </button>
              ) : (
                <div
                  aria-current={active ? "step" : undefined}
                  className="flex min-h-11 items-center gap-3 px-1.5"
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Multi-step layout. Desktop: step rail + aside on the start side, the step in a paper block.
 * Mobile: compact progress in the block and the actions in a floating paper bar at the bottom
 * (these pages have no app bottom bar). The actions render once, so there is one neon button.
 */
export function WizardLayout({
  eyebrow,
  steps,
  current,
  furthest,
  title,
  description,
  onJump,
  saved,
  aside,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  busy = false,
  onSkip,
  skipLabel = "Skip for now",
  railFooter,
}: {
  eyebrow: string;
  steps: WizardStep[];
  current: number;
  furthest?: number;
  title: React.ReactNode;
  description?: React.ReactNode;
  onJump?: (index: number) => void;
  saved?: "saved" | "saving";
  /** Extra blocks under the rail on desktop and under the step on mobile (e.g. a live preview). */
  aside?: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  busy?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  railFooter?: React.ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(current);
  const progress = Math.round(((current + 1) / steps.length) * 100);

  // Move focus and scroll to the new step's heading (not on first load).
  useEffect(() => {
    if (shownStep.current === current) return;
    shownStep.current = current;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    headingRef.current?.focus({ preventScroll: true });
  }, [current]);

  return (
    <Page className="pb-32 lg:pb-6">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-start">
        <div className="hidden flex-col gap-2 lg:col-span-4 lg:flex">
          <Block tone="paper" pad="md" className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <p className="y-micro y-fg-3">{eyebrow}</p>
              <div className="y-progress" aria-hidden>
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
            <StepRail
              steps={steps}
              current={current}
              furthest={Math.max(current, furthest ?? current)}
              onJump={onJump}
            />
            {railFooter}
          </Block>
          {aside ? <div className="flex flex-col gap-2">{aside}</div> : null}
        </div>

        <form
          noValidate
          className="flex flex-col gap-2 lg:col-span-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) onNext();
          }}
        >
          <Block tone="paper" pad="lg" className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="y-small y-fg-2 font-medium">
                  <span className="lg:hidden">{eyebrow} · </span>
                  Step {current + 1} of {steps.length}
                  <span className="lg:hidden"> · {steps[current]?.label}</span>
                </p>
                {saved ? <SavedIndicator state={saved} /> : null}
              </div>
              <div
                className="y-progress lg:hidden"
                role="progressbar"
                aria-label="Setup progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="y-display y-t-display max-w-[18ch] pt-2 outline-none"
              >
                {title}
              </h1>
              {description ? (
                <p className="y-lead y-fg-2 max-w-[56ch]">{description}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-7">{children}</div>
          </Block>

          {aside ? <div className="flex flex-col gap-2 lg:hidden">{aside}</div> : null}

          <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:static lg:p-0">
            <Block
              tone="paper"
              pad="none"
              className="mx-auto flex max-w-md items-center gap-2 !rounded-full p-2 shadow-(--y-shadow-float) lg:max-w-none lg:!rounded-(--y-r-block) lg:p-4 lg:shadow-none"
            >
              {onBack ? (
                <>
                  <RoundIconButton
                    label="Back"
                    tone="soft"
                    onClick={onBack}
                    className="lg:!hidden"
                  >
                    <ArrowLeft size={20} aria-hidden className="y-flip" />
                  </RoundIconButton>
                  <PillButton
                    variant="outline"
                    onClick={onBack}
                    icon={<ArrowLeft size={18} aria-hidden className="y-flip" />}
                    className="!hidden lg:!inline-flex"
                  >
                    Back
                  </PillButton>
                </>
              ) : null}
              {onSkip ? (
                <PillButton variant="ghost" onClick={onSkip} className="max-sm:!px-3 lg:ms-auto">
                  {skipLabel}
                </PillButton>
              ) : null}
              <PillButton
                type="submit"
                variant="neon"
                size="lg"
                arrow
                disabled={busy}
                aria-busy={busy || undefined}
                className={`flex-1 justify-between ps-6 lg:flex-none ${onSkip ? "" : "ms-auto"}`}
              >
                {nextLabel}
              </PillButton>
            </Block>
          </div>
        </form>
      </div>
    </Page>
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

/** Section heading inside a step. */
export function StepSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-t border-(--b-line) pt-7 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <h2 className="y-head">{title}</h2>
        {description ? <p className="y-small y-fg-2 max-w-[56ch]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
