"use client";

import { useSyncExternalStore } from "react";

/**
 * Region and currency, as device preferences (the More page; Site-wide 5.6.2). The launch markets
 * are Canada and the United States (round 3 answers, item 23); prices are in US dollars for now.
 * Remembered on this device only and nothing else changes with it: the footer and the More page
 * show the choice. Stored as data, so adding a country is one row.
 */

export type RegionId = "CA" | "US";

export const regions: { id: RegionId; name: string }[] = [
  { id: "CA", name: "Canada" },
  { id: "US", name: "United States" },
];

export const DEFAULT_REGION: RegionId = "CA";

/** Prices are shown in US dollars everywhere for now; the list grows when a currency is added. */
export const currencies = [{ id: "USD", name: "US dollars", symbol: "$" }] as const;

const KEY = "yapp-region-v1";
const listeners = new Set<() => void>();
/** When storage is blocked, the choice lasts until the page closes. */
let memory: RegionId | null = null;

const read = (): RegionId => {
  try {
    const value = window.localStorage.getItem(KEY);
    if (value === "CA" || value === "US") return value;
  } catch {
    /* storage blocked */
  }
  return memory ?? DEFAULT_REGION;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

export function useRegion(): RegionId {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_REGION);
}

export function setRegion(id: RegionId) {
  memory = id;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* storage blocked: `memory` keeps it until the page closes */
  }
  listeners.forEach((listener) => listener());
}

export const regionName = (id: RegionId) => regions.find((r) => r.id === id)?.name ?? "Canada";
