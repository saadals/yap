"use client";

import { useEffect, useSyncExternalStore } from "react";

import { paths } from "./paths";
import type { Account, Role } from "./types";

/**
 * V2 shows one side of the marketplace at a time, on one account (the Fiverr / Airbnb pattern):
 * - "order": Ordering. Find creators, place orders, review and approve, the video library.
 * - "studio": Studio. Find work, pitch, take campaign slots, deliver, earnings, your profile.
 *
 * The mode lives in the URL wherever it can (/studio/* is Studio; the ordering pages are
 * Ordering), so links, notifications and Back always land in the right place. A shared page that
 * belongs to one deal (an order, a job) takes the mode from the viewer's side of that deal and
 * passes it to <AppShell mode>. Pages that belong to neither (messages, account, settings) keep
 * the mode this tab was last in, remembered per account in sessionStorage.
 */
export type Mode = "order" | "studio";

export const modeLabel: Record<Mode, string> = { order: "Ordering", studio: "Studio" };

/** The side of a deal each mode acts on. */
export const sideForMode: Record<Mode, Role> = { order: "business", studio: "creator" };
export const modeForSide = (side: Role): Mode => (side === "creator" ? "studio" : "order");

export const homeFor = (mode: Mode) => (mode === "studio" ? paths.studio : paths.home);

const ORDER_PREFIXES = ["/home", "/discover", "/creators", "/library", "/products", "/billing"];

/** The mode a route belongs to, or null for shared pages (an order, a job, messages, account, settings). */
export function modeOfPath(pathname: string): Mode | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/studio" || path.startsWith("/studio/")) return "studio";
  if (path === "/orders" || path === "/orders/new") return "order";
  if (ORDER_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return "order";
  return null;
}

/**
 * Where an account starts: a personal account with a creator profile is mostly making videos
 * (Layla), everyone else is mostly ordering (Nour).
 */
export function defaultMode(account: Pick<Account, "kind" | "creatorId">): Mode {
  return account.kind === "personal" && account.creatorId ? "studio" : "order";
}

/* ------------------------------------------------------------------ remembered mode (tab-local) */

const KEY = "yapp2-mode";
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function readAll(): Record<string, Mode> {
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}") as Record<string, Mode>;
  } catch {
    return {};
  }
}

let cacheRaw: string | null = null;
let cache: Record<string, Mode> = {};
function snapshot(): Record<string, Mode> {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = readAll();
  }
  return cache;
}
const EMPTY: Record<string, Mode> = {};

/** Remember the mode this tab is in for an account (called by the shell; safe to call often). */
export function rememberMode(accountId: string, mode: Mode) {
  const all = readAll();
  if (all[accountId] === mode) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...all, [accountId]: mode }));
  } catch {
    /* private mode: the URL still carries the mode on most pages */
  }
  listeners.forEach((listener) => listener());
}

/** The mode this tab was last in for an account, if any. */
export function useRememberedMode(accountId: string): Mode | undefined {
  const all = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  return all[accountId];
}

/**
 * The mode to show: an explicit one (a shared page's side of the deal), else the route's, else the
 * remembered one, else the account's default. Remembers whatever was explicit or route-based.
 */
export function useMode(
  account: Pick<Account, "id" | "kind" | "creatorId">,
  pathname: string,
  explicit?: Mode,
): Mode {
  const fromPath = modeOfPath(pathname);
  const remembered = useRememberedMode(account.id);
  const definite = explicit ?? fromPath ?? undefined;
  const mode = definite ?? remembered ?? defaultMode(account);
  useEffect(() => {
    if (definite) rememberMode(account.id, definite);
  }, [account.id, definite]);
  return mode;
}
