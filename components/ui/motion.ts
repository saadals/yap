"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True when the visitor asked for less motion. False on the server and during hydration. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/**
 * True once the element has been on screen, and it stays true (Discover spec 4.1.7: reveal
 * effects run once and are never re-observed). Without IntersectionObserver it turns true at once.
 */
export function useSeenOnce(
  ref: RefObject<Element | null>,
  rootMargin = "0px 0px -30px 0px",
): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setSeen(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, seen, rootMargin]);
  return seen;
}
