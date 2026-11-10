"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Simulated network latency: true for `ms` after `key` changes (e.g. a filter string), then false.
 * Safe under StrictMode and on the server (starts as loading).
 */
export function useSimulatedLoading(key: string, ms = 520): boolean {
  const [doneKey, setDoneKey] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setDoneKey(key), ms);
    return () => window.clearTimeout(timer);
  }, [key, ms]);
  return doneKey !== key;
}
