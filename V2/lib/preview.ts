/**
 * Read-only preview mode, for the phone feed shown inside a frame on another page (`/app-preview`,
 * embedded by Discover's "Get the app"). In this mode the demo store (lib/store.ts):
 * - starts from the seed in memory and never reads or writes this visitor's localStorage,
 *   sessionStorage or cookies (so the preview can't disturb, or be disturbed by, the visitor's demo);
 * - never syncs with other tabs and never runs the campaign simulation;
 * - refuses every action: each `actions.*` call does nothing and returns `undefined`.
 * Saved sign-in accounts (lib/saved-accounts.ts) also stay on their seed.
 *
 * How a page turns it on: by being served at `PREVIEW_PATH` (detected from the URL the first time
 * anything asks, base path and trailing slash allowed), or by calling `enterPreviewMode()` before the
 * store is first read (at module scope of the page's client component). Called later, it still
 * switches the store to the seed in memory and stops all writes from then on.
 * Which account the preview shows: `?as=layla` on the URL, or `enterPreviewMode({ accountId })`;
 * otherwise the default demo account.
 *
 * How a component asks: `usePreviewMode()` in render, `isPreviewMode()` anywhere else. A component
 * in preview mode should hide or disable controls that would call an action.
 *
 * Not covered here: theme and session cookies in lib/prefs.tsx (owned elsewhere); a preview page
 * shouldn't call its setters.
 */

import { useSyncExternalStore } from "react";

export const PREVIEW_PATH = "/app-preview";

let on: boolean | undefined;
let accountId: string | undefined;
const listeners = new Set<() => void>();

function detect(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const path = window.location.pathname.replace(/\/+$/, "");
    return path === PREVIEW_PATH || path.endsWith(PREVIEW_PATH);
  } catch {
    return false;
  }
}

/** True in preview mode. Server renders are never in preview mode (the static HTML is the seed anyway). */
export function isPreviewMode(): boolean {
  if (on === undefined) {
    if (typeof window === "undefined") return false;
    on = detect();
  }
  return on;
}

/** Turn preview mode on for this document (it can't be turned off; reload without it instead). */
export function enterPreviewMode(options: { accountId?: string } = {}) {
  if (options.accountId) accountId = options.accountId;
  if (on) return;
  on = true;
  listeners.forEach((listener) => listener());
}

/** The account a preview shows: from `enterPreviewMode`, then `?as=` on the URL. */
export function previewAccountId(): string | undefined {
  if (accountId) return accountId;
  if (typeof window === "undefined") return undefined;
  try {
    return new URLSearchParams(window.location.search).get("as") ?? undefined;
  } catch {
    return undefined;
  }
}

/** Called when preview mode turns on (the store resets itself to the seed in memory). */
export function onPreviewModeChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether this page is in preview mode, for render. False on the server and in the first render. */
export function usePreviewMode(): boolean {
  return useSyncExternalStore(onPreviewModeChange, isPreviewMode, () => false);
}
