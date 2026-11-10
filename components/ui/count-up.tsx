"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion, useSeenOnce } from "./motion";

const defaultFormat = (value: number) => Math.round(value).toLocaleString("en-US");

/**
 * A number that counts up once, the first time it comes into view (1.6s, ease-out-quart), and
 * always ends exactly on `value`. It never loops and is never re-observed. Under reduced motion,
 * and before hydration, it shows the final value. Screen readers get the final value only.
 */
export function CountUp({
  value,
  format = defaultFormat,
  duration = 1600,
  className = "",
}: {
  value: number;
  /** Formats every frame and the final value, e.g. `(n) => money(n)` or `(n) => n.toFixed(1)`. */
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useSeenOnce(ref);
  const reduced = useReducedMotion();
  const started = useRef(false);
  // null = show the final value.
  const [frame, setFrame] = useState<number | null>(null);

  useEffect(() => {
    if (!seen || reduced || started.current) return;
    started.current = true;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 4);
      if (t < 1) {
        setFrame(value * eased);
        raf = requestAnimationFrame(step);
      } else {
        setFrame(null);
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      // A new value mid-count settles on the final value instead of a stale frame.
      setFrame(null);
    };
  }, [seen, reduced, value, duration]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden>{format(frame ?? value)}</span>
    </span>
  );
}
