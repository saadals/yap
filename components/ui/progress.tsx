"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useReducedMotion, useSeenOnce } from "./motion";

/** Above this many slots the bar is drawn as one track: segments would be thinner than a pixel. */
const MAX_SEGMENTS = 40;

/**
 * Campaign slots, one segment per slot: taken is dark, open is green (Work spec 6.5.9). Decorative
 * by default because the count is always written next to it ("4 taken · Closes Fri 13 Nov");
 * pass `label` when it stands alone. sm 5px (list rows), md 6px (cards), lg 8px (the job page).
 * `continuous` draws one track (taken part, open part) at any count, for narrow places such as
 * Discover's Live briefs rows; above 40 slots it is always continuous.
 */
export function SlotBar({
  total,
  taken,
  size = "md",
  label,
  continuous = false,
  className = "",
}: {
  total: number;
  taken: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  continuous?: boolean;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(total, taken));
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  if (continuous || total > MAX_SEGMENTS) {
    return (
      <div className={`y-slots ${className}`} data-size={size} data-continuous="true" {...a11y}>
        {filled > 0 ? <span data-taken="true" style={{ flexGrow: filled }} /> : null}
        {total - filled > 0 ? <span style={{ flexGrow: total - filled }} /> : null}
      </div>
    );
  }
  return (
    <div className={`y-slots ${className}`} data-size={size} {...a11y}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} data-taken={index < filled ? "true" : undefined} />
      ))}
    </div>
  );
}

/**
 * Plain track with a fill: countdowns ("Auto-approves Sat 7 Nov"), demand and audience bars. The
 * fill grows from zero the first time it's in view (instant under reduced motion). `green` is the
 * chart green, `ink` the surface's text colour (black on a green block), `gradient` pale to green.
 */
export function Progress({
  value,
  tone = "green",
  size = "md",
  label,
  className = "",
}: {
  /** 0 to 1. */
  value: number;
  tone?: "green" | "ink" | "gradient";
  /** sm 4px, md 6px, lg 8px. */
  size?: "sm" | "md" | "lg";
  /** Accessible name; without it the track is decorative (the text next to it says it). */
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeenOnce(ref);
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const a11y = label
    ? {
        role: "progressbar",
        "aria-label": label,
        "aria-valuenow": pct,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
      }
    : { "aria-hidden": true };
  return (
    <div
      ref={ref}
      className={`y-track ${className}`}
      data-size={size}
      data-fill={tone}
      data-seen={seen ? "true" : "false"}
      style={{ "--fill": `${pct}%` } as React.CSSProperties}
      {...a11y}
    >
      <span />
    </div>
  );
}

/**
 * Stage bars: thin segments with a label under each (order page header: Hired · In progress ·
 * Delivered · Approved · Paid; New order header: its six steps). Stages before `current` are done
 * (green), `current` is half filled and bold, the rest are quiet. `current >= stages.length`
 * marks every stage done.
 */
export function StageBars({
  stages,
  current,
  label = "Progress",
  className = "",
}: {
  stages: string[];
  current: number;
  label?: string;
  className?: string;
}) {
  return (
    <ol
      aria-label={label}
      className={`y-stages ${className}`}
      style={{ "--n": stages.length } as React.CSSProperties}
    >
      {stages.map((stage, index) => {
        const state = index < current ? "done" : index === current ? "current" : "upcoming";
        return (
          <li
            key={stage}
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span>
              {stage}
              <span className="sr-only">
                {state === "done" ? ", done" : state === "current" ? ", current" : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export type StepperStep = { title: string; time?: string; body?: string };

/**
 * Numbered stepper with a track (Discover "How it works", the service pages): a card of 3 or 4
 * steps. It plays through the steps (every 1.9s) while it's on screen; pointing at a step pins
 * it until the pointer leaves. No autoplay under reduced motion. Every step's text stays fully
 * legible whatever is current (the preview dimmed upcoming ones to 55%, below 4.5:1).
 * Phones: a vertical list without the track.
 */
export function Stepper({
  steps,
  label = "How it works",
  autoplay = true,
  interval = 1900,
  className = "",
}: {
  steps: StepperStep[];
  label?: string;
  autoplay?: boolean;
  interval?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const playing = autoplay && !reduced && !held && visible && steps.length > 1;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setCurrent((n) => (n + 1) % steps.length), interval);
    return () => window.clearInterval(timer);
  }, [playing, interval, steps.length]);

  const fill = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;
  return (
    <div
      ref={ref}
      data-tone="paper"
      className={`y-block y-stepper ${className}`}
      onPointerLeave={() => setHeld(false)}
    >
      <div className="y-stepper-row" style={{ "--n": steps.length } as React.CSSProperties}>
        <span aria-hidden className="y-stepper-track">
          <span style={{ "--fill": `${fill}%` } as React.CSSProperties} />
        </span>
        <ol aria-label={label} className="y-stepper-list">
          {steps.map((step, index) => {
            const state = index < current ? "done" : index === current ? "current" : "upcoming";
            return (
              <li
                key={step.title}
                className="y-step"
                data-state={state}
                onPointerEnter={() => {
                  setHeld(true);
                  setCurrent(index);
                }}
              >
                <span className="y-step-c" aria-hidden>
                  <b>{index + 1}</b>
                  <Check size={18} strokeWidth={3} />
                </span>
                <strong className="y-step-t">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </strong>
                {step.time ? <span className="y-step-time">{step.time}</span> : null}
                {step.body ? <p className="y-step-body">{step.body}</p> : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
