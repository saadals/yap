"use client";

import { useSyncExternalStore } from "react";

import { isPreviewMode } from "./preview";

/**
 * Accounts remembered on this device, for one-tap sign-in after logging out (like Instagram's
 * "Continue as …"). Non-secret fields only, newest first, at most five. Prototype note: the list
 * starts with the two demo people, which is how a reviewer gets in without typing anything.
 */

export type SignInMethod = "phone" | "apple" | "tiktok" | "instagram" | "google";

export type SavedAccount = {
  accountId: string;
  method: SignInMethod;
  /** Masked: "+1 ••• ••• 4821", "@laylatalks". */
  identifier: string;
};

/** v2: the seed moved to +1 numbers (round 3), so an older saved list is dropped. */
export const SAVED_ACCOUNTS_KEY = "yapp-saved-accounts-v2";
const MAX_SAVED = 5;

const seed: SavedAccount[] = [
  { accountId: "nour", method: "phone", identifier: "+1 ••• ••• 4821" },
  { accountId: "layla", method: "instagram", identifier: "@laylatalks" },
];

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

let cache: { raw: string | null; list: SavedAccount[] } | null = null;

function readRaw(): string | null {
  // Preview mode (lib/preview.ts) never reads this visitor's storage: the seed list shows.
  if (isPreviewMode()) return null;
  try {
    return window.localStorage.getItem(SAVED_ACCOUNTS_KEY);
  } catch {
    return null;
  }
}

/** Stable between changes, as useSyncExternalStore needs. */
function snapshot(): SavedAccount[] {
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.list;
  let list = seed;
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed as SavedAccount[];
    } catch {
      /* corrupt value: fall back to the seed */
    }
  }
  cache = { raw, list };
  return list;
}

function write(list: SavedAccount[]) {
  if (isPreviewMode()) return;
  try {
    window.localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* private mode or storage blocked: the list just won't persist */
  }
  cache = null;
  listeners.forEach((listener) => listener());
}

const noSaved: SavedAccount[] = [];
const serverSnapshot = () => noSaved;

export function useSavedAccounts(): SavedAccount[] {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export const savedAccounts = {
  /** Put an account at the top of the list (after a sign-in). */
  remember(account: SavedAccount) {
    write([account, ...snapshot().filter((a) => a.accountId !== account.accountId)].slice(0, MAX_SAVED));
  },
  /** Remember this account's existing row, or do nothing if it was forgotten. */
  touch(accountId: string) {
    const list = snapshot();
    const row = list.find((a) => a.accountId === accountId);
    if (row) write([row, ...list.filter((a) => a !== row)]);
  },
  forget(accountId: string) {
    write(snapshot().filter((a) => a.accountId !== accountId));
  },
  /** Settings: "Remove saved accounts from this device". */
  clear() {
    write([]);
  },
};
