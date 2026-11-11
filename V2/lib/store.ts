"use client";

/**
 * Prototype data store. No backend: the seed in lib/data is copied into module state, every flow
 * mutates it through `actions`, and the result is persisted to localStorage so the demo survives
 * reloads (Account menu → "Reset demo data" restores the seed).
 *
 * Read with `useDemo()` (whole snapshot, stable until something changes) and derive with the pure
 * helpers in lib/selectors.ts. Never mutate the snapshot directly.
 *
 * One account type: every account can order (its buyer profile, `businessId`) and make videos (its
 * creator profile, `creatorId`, once set up). The demo has two people, Nour and Layla, sharing this
 * one store; `activeAccountId` says who this tab is signed in as. It is tab-local (sessionStorage),
 * so two windows can play both sides at once.
 */

import { useSyncExternalStore } from "react";

import {
  allBrandHandles,
  brandHandleFor,
  campaignMoney,
  eligibility,
  isCampaign,
  occupiesSlot,
  openSlotNumbers,
  platformList,
  postLinkProblem,
  slotHistory,
  slotPlatform,
} from "./campaigns";
import { HOUR, NOW, addDays, at } from "./clock";
import { commentsAreGeneralOnly, commentsOpen, isLatestDelivery } from "./comments";
import { maskContacts } from "./contact";
import * as seedData from "./data";
import { extensionOf } from "./files";
import { clock, creatorNet, money, moneyExact, priceBreakdown, shortDate } from "./format";
import { hashString } from "./hash";
import { paths } from "./paths";
import { isPreviewMode, onPreviewModeChange, previewAccountId } from "./preview";
import {
  AD_COPY_DOCUMENT_TYPES,
  AUTO_APPROVE_DAYS,
  CAMPAIGN_FEE_RATE,
  CAMPAIGN_OPEN_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  CHANGE_NOTE_MIN_CHARS,
  COMMENT_MIN_CHARS,
  DEFAULT_LANGUAGE,
  DEFAULT_USAGE,
  FEE_PCT,
  ORDER_OPEN_DAYS,
  PRICE_MAX_PER_YAPP,
  PRICE_MIN_PER_YAPP,
  SERVICE_FEE_RATE,
  campaignPlatformById,
  formatById,
} from "./taxonomy";
import type {
  Account,
  AddonId,
  Attachment,
  Brief,
  Business,
  CampaignPlatformId,
  Commission,
  CommissionEvent,
  CommentReply,
  ContentRequest,
  Creator,
  CreatorKind,
  Delivery,
  DeliveryComment,
  DeliveryFile,
  FollowerTierId,
  LanguageId,
  FormatId,
  Learning,
  LedgerEntry,
  Message,
  Notification,
  PaymentMethod,
  Payout,
  PayoutMethod,
  Pitch,
  Product,
  Review,
  Role,
  Settings,
  SocialAccount,
  TeamMember,
  Thread,
  UsageOptionId,
  Video,
} from "./types";

export { enterPreviewMode, isPreviewMode, usePreviewMode, PREVIEW_PATH } from "./preview";

const STORAGE_KEY = "yapp2-demo";
/** Tab-local signed-in account (sessionStorage) and the cross-tab default (cookie). */
const SESSION_KEY = "yapp2-account";
export const ACCOUNT_COOKIE = "yapp2_account";
/**
 * 7: round 3 stage 2 money (20% from the creator's side, brand-set campaign prices, usage options).
 * 8: two-way comments, ad copy jobs, campaign platforms, brand handles, order drafts, closing dates,
 *    five reliability figures, Layla's earlier history.
 */
const VERSION = 9;

/** The previous request wizard's autosave (components/requests/wizard.tsx), one per account. */
export type RequestDraft = {
  step: number;
  title: string;
  brief: Partial<Brief>;
  budget: { min: number; max: number };
  dueInDays: number;
  visibility: "public" | "invite";
  invitedCreatorIds: string[];
  preferredKinds: CreatorKind[];
  savedAt: string;
};

/** The two kinds of order a draft can be for (paths.ts `OrderType`). */
export type OrderDraftKind = "custom" | "campaign";

/**
 * A saved, unposted order from the new-order form, one per kind per account. `data` is whatever the
 * form needs to restore itself: the store keeps it as given (it must survive JSON), and never reads
 * it. `title` and `step` are optional, for a "Draft, not posted · saved 2h ago" row.
 */
export type OrderDraft<T = unknown> = {
  kind: OrderDraftKind;
  data: T;
  title?: string;
  step?: number;
  savedAt: string;
};

export type DemoState = {
  version: number;
  /** Real wall-clock ms when this state was created; runtime timestamps advance from NOW. */
  epoch: number;
  lastStamp: number;
  /** Sequence counters for routed ids (see `uid`). */
  counters?: Record<string, number>;
  accounts: Account[];
  /** Who this tab is signed in as (tab-local; see the header comment). */
  activeAccountId: string;
  creators: Creator[];
  videos: Video[];
  businesses: Business[];
  team: TeamMember[];
  products: Product[];
  requests: ContentRequest[];
  pitches: Pitch[];
  commissions: Commission[];
  threads: Thread[];
  reviews: Review[];
  notifications: Notification[];
  paymentMethods: PaymentMethod[];
  payoutMethods: PayoutMethod[];
  payouts: Payout[];
  /** Saved creators, per account. */
  saved: Record<string, string[]>;
  /** Settings, per account. */
  settings: Record<string, Settings>;
  /** Request wizard autosave, per account (the previous wizard). */
  requestDrafts: Record<string, RequestDraft | null>;
  /** New-order form drafts, per account, one per kind (`actions.saveOrderDraft`, `me.orderDraft`). */
  orderDrafts: Record<string, Partial<Record<OrderDraftKind, OrderDraft>>>;
  /** Orders an account dismissed from its feed and Explore, per account. */
  hidden: Record<string, string[]>;
};

function fromSeed(): DemoState {
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  return {
    version: VERSION,
    epoch: 0,
    lastStamp: NOW,
    accounts: clone(seedData.accounts),
    activeAccountId: seedData.DEFAULT_ACCOUNT_ID,
    creators: clone(seedData.creators),
    videos: clone(seedData.videos),
    businesses: clone(seedData.businesses),
    team: clone(seedData.team),
    products: clone(seedData.products),
    requests: clone(seedData.requests),
    pitches: clone(seedData.pitches),
    commissions: clone(seedData.commissions),
    threads: clone(seedData.threads),
    reviews: clone(seedData.reviews),
    notifications: clone(seedData.notifications),
    paymentMethods: clone(seedData.paymentMethods),
    payoutMethods: clone(seedData.payoutMethods),
    payouts: clone(seedData.payouts),
    saved: clone(seedData.savedCreatorIds),
    settings: clone(seedData.settings),
    requestDrafts: {},
    orderDrafts: {},
    hidden: {},
  };
}

const seedState = fromSeed();
let state: DemoState = seedState;
let hydrated = false;
/** Monotonic runtime clock (ms); kept outside `state` so updates can't rewind it. */
let lastStamp = NOW;
/** Sequence counters for routed ids; kept outside `state` like `lastStamp`. */
let counters: Record<string, number> = {};
const listeners = new Set<() => void>();

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** The account this tab should be signed in as: tab session, then the last sign-in, then default. */
function initialAccount(accounts: Account[], persisted?: string): string {
  let fromSession: string | null = null;
  try {
    fromSession = window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  const candidates = [fromSession, readCookie(ACCOUNT_COOKIE), persisted, seedData.DEFAULT_ACCOUNT_ID];
  return candidates.find((id) => id && accounts.some((a) => a.id === id)) ?? accounts[0].id;
}

const mergeCounters = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) out[key] = Math.max(out[key] ?? 0, value);
  return out;
};

/** Preview mode (lib/preview.ts): the seed in memory, signed in as the preview's account. */
function previewState(): DemoState {
  const wanted = previewAccountId();
  const accountId = seedState.accounts.some((a) => a.id === wanted) ? wanted! : seedData.DEFAULT_ACCOUNT_ID;
  return { ...seedState, epoch: 0, activeAccountId: accountId };
}

// Turned on after the store already loaded: drop to the seed in memory and stop writing.
if (typeof window !== "undefined") {
  onPreviewModeChange(() => {
    window.clearTimeout(saveTimer);
    hydrated = true;
    lastStamp = NOW;
    counters = {};
    state = previewState();
    listeners.forEach((listener) => listener());
  });
}

function load() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  if (isPreviewMode()) {
    // Never read the visitor's storage or cookies.
    state = previewState();
    return;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === VERSION) {
        state = { ...parsed, activeAccountId: initialAccount(parsed.accounts, parsed.activeAccountId) };
        lastStamp = Math.max(lastStamp, parsed.lastStamp ?? NOW);
        counters = parsed.counters ?? {};
        return;
      }
    }
  } catch {
    /* private mode or corrupt data: fall back to the seed */
  }
  state = { ...seedState, epoch: Date.now(), activeAccountId: initialAccount(seedState.accounts) };
}

let saveTimer: number | undefined;
function persist() {
  if (typeof window === "undefined" || isPreviewMode()) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode: the demo keeps working in memory */
    }
  }, 120);
}

function set(next: DemoState) {
  state = { ...next, lastStamp, counters };
  persist();
  listeners.forEach((listener) => listener());
}

function update(fn: (draft: DemoState) => DemoState) {
  load();
  if (isPreviewMode()) return;
  set(fn(state));
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  // Preview mode never syncs with other tabs.
  if (isPreviewMode()) return () => listeners.delete(listener);
  const onStorage = (event: StorageEvent) => {
    if (isPreviewMode() || event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const incoming = JSON.parse(event.newValue) as DemoState;
      if (incoming.version !== VERSION) return;
      // Another tab changed the shared data: take it, but stay signed in as this tab's account and
      // never rewind id counters or the runtime clock (two tabs must not both create `c-n1`).
      counters = mergeCounters(counters, incoming.counters);
      lastStamp = Math.max(lastStamp, incoming.lastStamp ?? NOW);
      state = { ...incoming, activeAccountId: state.activeAccountId, counters, lastStamp };
      listener();
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return state;
}

/**
 * The current state outside render: for an event handler that needs what an action just changed,
 * and for scripts. Render must use `useDemo()` instead (it re-renders on change).
 */
export function readDemo(): DemoState {
  return getSnapshot();
}

/** The whole demo state. Stable reference until an action changes something. */
export function useDemo(): DemoState {
  return useSyncExternalStore(subscribe, getSnapshot, () => seedState);
}

/**
 * True after the first client render. Use it before showing "not found" for ids that may only
 * exist in the persisted client state (e.g. a request created in this browser).
 */
const noopSubscribe = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                    */
/* -------------------------------------------------------------------------- */

export type AccountIds = {
  accountId: string;
  businessId: string;
  memberId?: string;
  creatorId?: string;
};

/** The signed-in account of this tab (falls back to the first account). */
export function activeAccount(s: DemoState): Account {
  return s.accounts.find((a) => a.id === s.activeAccountId) ?? s.accounts[0];
}

/** Ids of the signed-in account: who is acting. */
export function activeIds(s: DemoState): AccountIds {
  const a = activeAccount(s);
  return { accountId: a.id, businessId: a.businessId, memberId: a.memberId, creatorId: a.creatorId };
}

/** The demo account that owns a buyer profile or a creator profile (undefined = a seeded stranger). */
export function accountOwning(
  s: DemoState,
  party: { businessId?: string; creatorId?: string },
): Account | undefined {
  return s.accounts.find(
    (a) =>
      (party.businessId !== undefined && a.businessId === party.businessId) ||
      (party.creatorId !== undefined && a.creatorId === party.creatorId),
  );
}

/** Creators played by a demo person never act on their own (no simulated replies or deliveries). */
export const isDemoCreator = (s: DemoState, creatorId: string) =>
  s.accounts.some((a) => a.creatorId === creatorId);
export const isDemoBusiness = (s: DemoState, businessId: string) =>
  s.accounts.some((a) => a.businessId === businessId);

/* -------------------------------------------------------------------------- */
/* Typing indicator (not persisted)                                            */
/* -------------------------------------------------------------------------- */

let typing: Record<string, Role | undefined> = {};
const typingListeners = new Set<() => void>();
function setTyping(threadId: string, role: Role | undefined) {
  typing = { ...typing, [threadId]: role };
  typingListeners.forEach((listener) => listener());
}

/** Which side is currently "typing" in a thread (simulated replies). */
export function useTyping(threadId: string | undefined): Role | undefined {
  const snapshot = useSyncExternalStore(
    (listener) => {
      typingListeners.add(listener);
      return () => typingListeners.delete(listener);
    },
    () => typing,
    () => typing,
  );
  return threadId ? snapshot[threadId] : undefined;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Requests, commissions and products have their own pages, so their ids are sequential
 * (`r-n1`, `c-n1`, `p-n1`, …): the static build (GitHub Pages) pre-renders a page for each slot
 * — see lib/static-params.ts. Everything else gets a short random id.
 */
const ROUTED_PREFIXES = new Set(["r", "c", "p"]);
function uid(prefix: string) {
  if (ROUTED_PREFIXES.has(prefix)) {
    counters = { ...counters, [prefix]: (counters[prefix] ?? 0) + 1 };
    return `${prefix}-n${counters[prefix]}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Runtime timestamp: NOW plus real elapsed time (capped), always after the previous stamp. */
function nowStamp(): string {
  const elapsed = state.epoch ? Math.min(Date.now() - state.epoch, 8 * HOUR) : 0;
  lastStamp = Math.max(NOW + elapsed, lastStamp + 1000);
  return new Date(lastStamp).toISOString();
}

/** The runtime clock without advancing it (for comparisons in the simulation). */
function peekNow(): number {
  const elapsed = state.epoch ? Math.min(Date.now() - state.epoch, 8 * HOUR) : 0;
  return Math.max(NOW + elapsed, lastStamp);
}

const other = (role: Role): Role => (role === "business" ? "creator" : "business");

function replaceById<T extends { id: string }>(list: T[], id: string, fn: (item: T) => T): T[] {
  return list.map((item) => (item.id === id ? fn(item) : item));
}

function findCommission(s: DemoState, id: string) {
  const commission = s.commissions.find((c) => c.id === id);
  if (!commission) throw new Error(`Unknown commission ${id}`);
  return commission;
}

function nameOfCreator(s: DemoState, id: string) {
  return s.creators.find((c) => c.id === id)?.firstName ?? "The creator";
}
function nameOfBusiness(s: DemoState, id: string) {
  return s.businesses.find((b) => b.id === id)?.name ?? "The business";
}

function event(
  kind: CommissionEvent["kind"],
  actor: CommissionEvent["actor"],
  text: string,
): CommissionEvent {
  return { id: uid("ev"), at: nowStamp(), kind, actor, text };
}

/**
 * Notify whichever demo account owns this buyer profile or creator profile (nobody else reads
 * notifications). With `group`, repeated events merge into one unread notification
 * ("3 creators took slots on …").
 */
function notifyParty(
  s: DemoState,
  party: { businessId?: string; creatorId?: string },
  kind: Notification["kind"],
  text: string,
  href: string,
  group?: { key: string; text: (count: number) => string },
): DemoState {
  const account = accountOwning(s, party);
  if (!account) return s;
  if (group) {
    const existing = s.notifications.find(
      (n) => n.accountId === account.id && n.groupKey === group.key && n.unread,
    );
    if (existing) {
      const count = (existing.count ?? 1) + 1;
      const merged: Notification = { ...existing, count, text: group.text(count), href, at: nowStamp() };
      return { ...s, notifications: [merged, ...s.notifications.filter((n) => n.id !== existing.id)] };
    }
  }
  const item: Notification = {
    id: uid("n"),
    accountId: account.id,
    kind,
    text: group ? group.text(1) : text,
    href,
    at: nowStamp(),
    unread: true,
    groupKey: group?.key,
    count: group ? 1 : undefined,
  };
  return { ...s, notifications: [item, ...s.notifications] };
}

/** Handles a thread may mention (the campaign's brand accounts creators must tag). */
function allowedHandles(s: DemoState, threadId: string): string[] {
  const thread = s.threads.find((t) => t.id === threadId);
  const request = thread?.requestId ? s.requests.find((r) => r.id === thread.requestId) : undefined;
  return request?.campaign ? allBrandHandles(request.campaign) : [];
}

/**
 * Add a message to a thread. With `group` (system lines only), a run of lines with the same key
 * merges into the last one: `group.text(count)` rewrites it ("4 new comments on Version 1").
 */
function appendMessage(
  s: DemoState,
  threadId: string,
  message: Omit<Message, "id" | "at">,
  unreadFor?: Role,
  group?: { key: string; text: (count: number) => string },
): DemoState {
  const text =
    message.from === "system" ? message.text : maskContacts(message.text, allowedHandles(s, threadId)).text;
  return {
    ...s,
    threads: replaceById(s.threads, threadId, (thread) => {
      const last = thread.messages[thread.messages.length - 1];
      const unread =
        unreadFor && !thread.unread.includes(unreadFor) ? [...thread.unread, unreadFor] : thread.unread;
      if (group && last?.group === group.key) {
        const count = (last.count ?? 1) + 1;
        const merged: Message = { ...last, ...message, text: group.text(count), group: group.key, count, at: nowStamp() };
        return { ...thread, messages: [...thread.messages.slice(0, -1), merged], unread };
      }
      const full: Message = {
        ...message,
        text: group ? group.text(1) : text,
        id: uid("m"),
        at: nowStamp(),
        ...(group ? { group: group.key, count: 1 } : {}),
      };
      return { ...thread, messages: [...thread.messages, full], unread };
    }),
  };
}

function ensureThread(
  s: DemoState,
  input: {
    businessId: string;
    creatorId: string;
    subject: string;
    commissionId?: string;
    requestId?: string;
  },
): [DemoState, string] {
  const existing = s.threads.find(
    (thread) =>
      thread.businessId === input.businessId &&
      thread.creatorId === input.creatorId &&
      (input.commissionId
        ? thread.commissionId === input.commissionId
        : !thread.commissionId && thread.requestId === input.requestId),
  );
  if (existing) return [s, existing.id];
  const thread: Thread = {
    id: uid("t"),
    businessId: input.businessId,
    creatorId: input.creatorId,
    commissionId: input.commissionId,
    requestId: input.requestId,
    subject: input.subject,
    messages: [],
    unread: [],
  };
  return [{ ...s, threads: [thread, ...s.threads] }, thread.id];
}

/* -------------------------------------------------------------------------- */
/* Comment helpers                                                             */
/* -------------------------------------------------------------------------- */

/** The signed-in account's side of a commission (undefined = not theirs). */
function sideFor(s: DemoState, c: Pick<Commission, "businessId" | "creatorId">): Role | undefined {
  const ids = activeIds(s);
  if (c.businessId === ids.businessId) return "business";
  if (ids.creatorId && c.creatorId === ids.creatorId) return "creator";
  return undefined;
}

/** Who is writing: the team member (business accounts), the buyer profile, or the creator profile. */
function authorIdFor(s: DemoState, side: Role): string {
  const ids = activeIds(s);
  return side === "business" ? (ids.memberId ?? ids.businessId) : (ids.creatorId ?? "");
}

/** Timestamped comments in time order, then general ones in the order they were written. */
function sortComments(list: DeliveryComment[]): DeliveryComment[] {
  return [...list].sort((a, b) => {
    if (a.atSec === null && b.atSec === null) return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (a.atSec === null) return 1;
    if (b.atSec === null) return -1;
    return a.atSec - b.atSec || Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

function withDelivery(s: DemoState, commissionId: string, deliveryId: string, fn: (d: Delivery) => Delivery): DemoState {
  return {
    ...s,
    commissions: replaceById(s.commissions, commissionId, (c) => ({ ...c, deliveries: replaceById(c.deliveries, deliveryId, fn) })),
  };
}

function withComment(
  s: DemoState,
  commissionId: string,
  deliveryId: string,
  commentId: string,
  fn: (m: DeliveryComment) => DeliveryComment,
): DemoState {
  return withDelivery(s, commissionId, deliveryId, (d) => ({ ...d, comments: replaceById(d.comments, commentId, fn) }));
}

function findCommentOrReply(d: Delivery, commentId: string, replyId?: string) {
  const comment = d.comments.find((m) => m.id === commentId);
  if (!replyId) return comment;
  return comment?.replies.find((r) => r.id === replyId);
}

/**
 * Run a comment change for the signed-in account's side, if comments on this order are open. The
 * change returns the next state (or a refusal); nothing is written on a refusal.
 */
function commentAction(
  commissionId: string,
  deliveryId: string,
  change: (
    s: DemoState,
    c: Commission,
    d: Delivery,
    side: Role,
  ) => { ok: true; id: string; next: DemoState } | { ok: false; reason: CommentRefusal },
): CommentResult {
  load();
  const c = state.commissions.find((x) => x.id === commissionId);
  const d = c?.deliveries.find((x) => x.id === deliveryId);
  if (!c || !d) return { ok: false, reason: "not_found" };
  const side = sideFor(state, c);
  if (!side) return { ok: false, reason: "not_party" };
  if (!commentsOpen(c, peekNow())) return { ok: false, reason: "closed" };
  const result = change(state, c, d, side);
  if (!result.ok) return result;
  update(() => result.next);
  return { ok: true, id: result.id };
}

/**
 * Tell the other side about a new comment or reply: a grouped notification ("Daftar left 3 comments
 * on Version 1") and, outside campaigns, one grouped system line in the order's thread. Campaign
 * slot threads stay quiet, as for review copies (one thread per creator would flood the brand).
 */
function announceComment(
  s: DemoState,
  c: Commission,
  d: Delivery,
  side: Role,
  what: { kind: "comment"; atSec: number | null; commentId: string } | { kind: "reply"; parentAuthor: Role; commentId: string },
): DemoState {
  const recipient = other(side);
  const who = side === "business" ? nameOfBusiness(s, c.businessId) : nameOfCreator(s, c.creatorId);
  const version = `Version ${d.version}`;
  const href = paths.commission(c.id, { version: d.version, comment: what.commentId });
  const first =
    what.kind === "reply"
      ? `${who} replied to ${what.parentAuthor === recipient ? "your" : "a"} comment on ${version} of "${c.title}"`
      : what.atSec === null
        ? `${who} left a comment on ${version} of "${c.title}"`
        : `${who} commented at ${clock(what.atSec)} on ${version} of "${c.title}"`;
  let next = notifyParty(
    s,
    recipient === "business" ? { businessId: c.businessId } : { creatorId: c.creatorId },
    "comment",
    first,
    href,
    {
      key: `comments:${c.id}:${d.id}:${recipient}`,
      text: (n) => (n === 1 ? first : `${who} left ${n} comments on ${version} of "${c.title}"`),
    },
  );
  if (c.source !== "campaign") {
    next = appendMessage(
      next,
      c.threadId,
      {
        from: "system",
        text: "",
        link: { kind: "comments", commissionId: c.id, deliveryId: d.id, version: d.version },
      },
      recipient,
      { key: `comments:${d.id}`, text: (n) => `${n === 1 ? "1 new comment" : `${n} new comments`} on ${version}` },
    );
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Simulated replies                                                           */
/* -------------------------------------------------------------------------- */

const creatorReplies: [RegExp, string][] = [
  [/deadline|date|when|time|late|sooner/i, "That works for me. I'll keep you posted if anything moves, but I'm on track."],
  [/price|budget|cost|\$|discount/i, "Happy to make that work. If you need it cheaper I can drop the extra hooks and keep the main cut."],
  [/script|hook|line|say|wording/i, "Good call. I'll draft the opening two ways and you can pick the one you like in the next version."],
  [/access|login|account|demo/i, "Got it, I'm in. The demo account has everything I need for the screen part."],
  [/thank|great|love|perfect|amazing/i, "Thank you, that means a lot. Really enjoyed working on this one."],
  [/\?/, "Good question. Short answer: yes. I'll show you in the next version so it's easier to judge."],
];
const businessReplies: [RegExp, string][] = [
  [/deliver|draft|version|uploaded|ready/i, "Amazing, thank you. We'll review it today and come back with notes."],
  [/access|login|account|demo/i, "The demo login is in the brief's product assets. Shout if anything doesn't work."],
  [/deadline|date|extra day|extension/i, "No problem, a day or two is fine. Quality matters more than speed for us."],
  [/\?/, "Good question. Let's keep it casual, like you're telling a friend. The app should feel easy."],
];
const fallback: Record<Role, string> = {
  creator: "Perfect, noted. I'll take care of it.",
  business: "Thanks for the update, sounds good.",
};

function scheduleReply(threadId: string, replier: Role, prompt: string) {
  if (typeof window === "undefined") return;
  load();
  const thread = state.threads.find((t) => t.id === threadId);
  if (!thread) return;
  // A demo person answers for themselves (switch account to reply).
  if (replier === "creator" ? isDemoCreator(state, thread.creatorId) : isDemoBusiness(state, thread.businessId)) return;
  const rules = replier === "creator" ? creatorReplies : businessReplies;
  const text = rules.find(([pattern]) => pattern.test(prompt))?.[1] ?? fallback[replier];
  window.setTimeout(() => setTyping(threadId, replier), 900);
  window.setTimeout(() => {
    setTyping(threadId, undefined);
    update((s) => appendMessage(s, threadId, { from: replier, text }, other(replier)));
  }, 3200);
}

/**
 * Demo progression for creators other than the demo persona: after a hire/accept or a revision
 * request, they "deliver" a version on their own so the business flow can be tried end to end
 * without switching roles. Timers live only while the tab is open.
 */
function simulateDelivery(commissionId: string, delayMs: number) {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    load();
    const c = state.commissions.find((x) => x.id === commissionId);
    if (!c || isDemoCreator(state, c.creatorId)) return;
    if (c.status !== "in_progress" && c.status !== "revision") return;
    const version = c.deliveries.length + 1;
    const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 28);
    // Open comments on the previous version are marked resolved by `deliver` itself.
    if (c.brief.jobType === "ad-copy") {
      const product = state.products.find((p) => p.id === c.brief.productId);
      actions.deliver({
        commissionId,
        kind: "text",
        text: sampleAdCopy(product?.name ?? c.title, version),
        note:
          version === 1
            ? "Version 1 of the copy is ready. Headlines first, then the primary text. Tell me which lines feel most like you."
            : `Version ${version} is up. I worked through every comment you left.`,
        files: [{ name: `${slug || "ad_copy"}_v${version}.docx`, size: "28 KB", kind: "document" }],
      });
      return;
    }
    actions.deliver({
      commissionId,
      note:
        version === 1
          ? "Version 1 is ready. I kept the opening tight and showed the app within the first few seconds. Let me know what you think."
          : `Version ${version} is up. I worked through every note you left; each one is marked resolved.`,
      files: [
        {
          name: `${slug || "video"}_v${version}_${c.brief.aspect.replace(":", "x")}.mp4`,
          size: `${(38 + version * 3.4).toFixed(1)} MB`,
          kind: "video",
        },
      ],
    });
  }, delayMs);
}

/** A believable block of ad copy for simulated deliveries (and the delivery sheet's sample). */
export function sampleAdCopy(product: string, version = 1): string {
  return [
    "Headlines",
    `1. ${product}: done before your coffee cools`,
    `2. The ${product} shortcut your team will actually use`,
    version > 1 ? `3. Less busywork, more of the work you like. Meet ${product}.` : `3. Stop doing it the long way. Try ${product}.`,
    "",
    "Primary text",
    `You don't need another tool to learn. ${product} fits into what you already do, and the first result shows up in minutes.`,
    "",
    "Call to action",
    "Try it free",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A custom order. The brief carries the job type (`jobType: "ad-copy"` for ad copy; the store then
 * blanks the video-only fields), the hook, attachments and, for ad copy, `copy`.
 */
export type NewRequestInput = {
  title: string;
  brief: Brief;
  budget: { min: number; max: number };
  /** Optional with `deadlineDays` (then: the closing date plus the deadline). */
  dueDate?: string;
  /** Days the hired creator has to deliver version 1, set by the brand (ORDER_DEADLINE_OPTIONS). */
  deadlineDays?: number;
  visibility: "public" | "invite";
  invitedCreatorIds: string[];
  preferredKinds: CreatorKind[];
  /** How many creators to hire (usually 1). */
  slots?: number;
  status?: "open" | "draft";
};

export type CampaignInput = {
  title: string;
  productId: string;
  /** Talking points (brief.mustInclude), restrictions (brief.avoid), the hook and attachments live on the brief. */
  brief: Partial<Brief> & { mustInclude: string[]; avoid: string[] };
  videos: number;
  tierId: FollowerTierId;
  /** Listed price per Yapp, set by the brand ($30–5,000; guidance in lib/pricing.ts). */
  pricePerVideo: number;
  /** How the brand may use the videos (included in the price). */
  usage: UsageOptionId;
  /** Days a creator has to upload version 1 after taking a slot (ORDER_DEADLINE_OPTIONS). */
  deadlineDays: number;
  /** Where creators may post (at least one); each creator picks one of them. */
  platforms: CampaignPlatformId[];
  /** The account to tag on each listed platform; saved to the brand for next time. */
  brandHandles: Partial<Record<CampaignPlatformId, string>>;
  explainer?: { name: string; durationSec: number };
  paymentMethodId: string;
};

export type OfferInput = {
  creatorId: string;
  packageId?: string;
  title: string;
  brief: Brief;
  price: number;
  addons: { id: AddonId; price: number }[];
  revisionsIncluded: number;
  dueDate: string;
  message: string;
  paymentMethodId: string;
  previousCommissionId?: string;
};

export type ReviewInput = {
  commissionId: string;
  rating: number;
  quality: number;
  communication: number;
  timeliness: number;
  text: string;
  wouldRehire: boolean;
  /** Notes saved to the product so they carry into the next commission. */
  learnings: string[];
};

export type CreatorProfileInput = {
  name: string;
  headline: string;
  languages: LanguageId[];
  formats: FormatId[];
  cityId?: string;
};

export type TakeSlotResult =
  | { ok: true; commissionId: string; slot: number; platform: CampaignPlatformId }
  | { ok: false; reason: string };

/** Why a comment action was refused (comments are read-only, not your comment, too short, …). */
export type CommentRefusal = "closed" | "not_party" | "not_found" | "not_author" | "not_latest" | "too_short" | "general_only" | "not_allowed";
export type CommentResult = { ok: true; id: string } | { ok: false; reason: CommentRefusal };

const mask = (text: string, allow: string[] = []) => maskContacts(text, allow).text;

/** A brand handle to tag: "@", then 2–30 letters, numbers, dots or underscores (Work spec 6.11.6). */
export const BRAND_HANDLE = /^@[A-Za-z0-9._]{2,30}$/;

/** "@daftar.app" from "daftar.app" or "@daftar.app". */
const atHandle = (handle: string) => {
  const clean = handle.trim().replace(/^@+/, "");
  return clean ? `@${clean}` : "";
};

function cleanHandles(handles: Partial<Record<CampaignPlatformId, string>>, platforms?: CampaignPlatformId[]) {
  const out: Partial<Record<CampaignPlatformId, string>> = {};
  for (const [platform, handle] of Object.entries(handles) as [CampaignPlatformId, string | undefined][]) {
    if (platforms && !platforms.includes(platform)) continue;
    const at = handle ? atHandle(handle) : "";
    if (at) out[platform] = at;
  }
  return out;
}

/**
 * The video-only fields of an ad-copy brief carry no meaning: blank them so nothing downstream reads
 * a stale format, platform, length or aspect.
 */
function normalizeBrief(brief: Brief): Brief {
  if (brief.jobType !== "ad-copy" && brief.format !== "ad-copy") return { ...brief, jobType: brief.jobType ?? "video" };
  return {
    ...brief,
    jobType: "ad-copy",
    format: "ad-copy",
    platforms: [],
    aspect: "9:16",
    durationSec: 0,
    onCamera: false,
    copy: brief.copy ?? { pieces: [], placements: [] },
  };
}

function campaignBrief(input: CampaignInput, product: Product | undefined): Brief {
  return {
    productId: input.productId,
    jobType: "video",
    format: input.brief.format ?? "testimonial",
    platforms: input.platforms,
    languages: input.brief.languages?.length ? input.brief.languages : [DEFAULT_LANGUAGE],
    aspect: input.brief.aspect ?? "9:16",
    videoCount: 1,
    durationSec: input.brief.durationSec ?? 30,
    hook: input.brief.hook,
    attachments: input.brief.attachments,
    audience: input.brief.audience ?? product?.audience ?? "",
    goal: input.brief.goal ?? "",
    keyMessage: input.brief.keyMessage ?? product?.oneLiner ?? "",
    mustInclude: input.brief.mustInclude,
    avoid: input.brief.avoid,
    references: input.brief.references ?? [],
    onCamera: input.brief.onCamera ?? true,
    usage: input.usage ?? DEFAULT_USAGE,
    addons: [],
    notes: input.brief.notes,
  };
}

/**
 * A ledger entry for `amount` of listed prices on the campaign's card (negative = a refund). Nothing
 * is added for Yapp: its 20% comes out of each creator's pay when a slot is released.
 */
function ledgerEntry(amount: number, note: string, kind?: LedgerEntry["kind"]): LedgerEntry {
  return {
    id: uid("lg"),
    at: nowStamp(),
    kind: kind ?? (amount < 0 ? "refund" : "top_up"),
    amount: Math.abs(amount),
    note,
  };
}

/**
 * Ledger entry when a slot reopens and its old price is below the current price (the brand raised
 * it after the slot was taken): the difference is topped up so the reopened slot pays the new price.
 */
function repriceOnReopen(request: ContentRequest, oldPrice: number): LedgerEntry | undefined {
  const terms = request.campaign;
  if (!terms || terms.pricePerVideo === oldPrice) return undefined;
  return ledgerEntry(
    terms.pricePerVideo - oldPrice,
    `Slot reopened at the current price (${money(terms.pricePerVideo)} per Yapp)`,
  );
}

/** Re-derive "hired" (full) vs "open" after slots change. */
function syncCampaignStatus(s: DemoState, requestId: string): DemoState {
  return {
    ...s,
    requests: replaceById(s.requests, requestId, (r) => {
      if (r.status === "closed" || r.status === "draft") return r;
      return { ...r, status: openSlotNumbers(s, r).length === 0 ? "hired" : "open" };
    }),
  };
}

/**
 * Money moves when a taken slot ends unpaid. On an open campaign the slot reopens: its money stays
 * held (topped up if the price was raised since). On a closed campaign nobody can take it again, so
 * the price paid for it is refunded to the card in full.
 */
function slotEndedEntries(request: ContentRequest, c: Commission, why: string): LedgerEntry[] {
  if (request.status === "closed") return [ledgerEntry(-c.price, `Slot ${c.campaignSlot}: ${why}, refunded`)];
  const reprice = repriceOnReopen(request, c.price);
  return reprice ? [reprice] : [];
}

/**
 * A pending slot whose post came down and wasn't restored within 48 hours: it ends unpaid, its
 * money goes back to the campaign hold and the slot reopens (refunded if the campaign is closed).
 */
function returnRemovedSlot(s: DemoState, commissionId: string): DemoState {
  const c = s.commissions.find((x) => x.id === commissionId);
  const request = c?.requestId ? s.requests.find((r) => r.id === c.requestId) : undefined;
  if (!c || !request?.campaign) return s;
  const closed = request.status === "closed";
  const entries = slotEndedEntries(request, c, "the post came down and wasn't restored");
  let next: DemoState = {
    ...s,
    commissions: replaceById(s.commissions, c.id, (x) => ({
      ...x,
      status: "cancelled",
      cancelCode: "post_removed",
      payment: { ...x.payment, status: closed ? "refunded" : "returned" },
      events: [
        ...x.events,
        event(
          "cancelled",
          "system",
          `The post stayed down for more than 48 hours. ${closed ? "Its money was refunded to the business." : "The slot reopened for another creator."}`,
        ),
      ],
    })),
    requests: replaceById(s.requests, request.id, (r) => ({
      ...r,
      campaign: {
        ...r.campaign!,
        excludedCreatorIds: [...new Set([...r.campaign!.excludedCreatorIds, c.creatorId])],
        ledger: [...r.campaign!.ledger, ...entries],
      },
    })),
  };
  next = syncCampaignStatus(next, request.id);
  next = notifyParty(
    next,
    { creatorId: c.creatorId },
    "campaign",
    `Your post for "${c.title}" stayed down, so the slot and its pay went back to ${nameOfBusiness(s, c.businessId)}.`,
    paths.commission(c.id),
  );
  next = notifyParty(
    next,
    { businessId: c.businessId },
    "campaign",
    `${nameOfCreator(s, c.creatorId)}'s post for "${c.title}" stayed down. ${closed ? "Its money is on its way back to your card." : "The slot reopened, and its money is back in your campaign."}`,
    paths.order(request.id),
  );
  return next;
}

const liveActions = {
  /** Restore the original seed (clears everything done in this browser). Keeps this tab's account. */
  reset() {
    lastStamp = NOW;
    counters = {};
    try {
      // Other prototype-only keys (e.g. billing details) live beside the main state.
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith("yapp2-") && key !== STORAGE_KEY)
        .forEach((key) => window.localStorage.removeItem(key));
    } catch {
      /* ignore */
    }
    const keep = state.activeAccountId;
    set({ ...fromSeed(), epoch: Date.now(), activeAccountId: keep });
  },

  /* ---------------------------------------------------------- accounts */

  /** Sign this tab in as another demo account (prefs also sets the cross-tab cookie). */
  switchAccount(accountId: string) {
    load();
    if (!state.accounts.some((a) => a.id === accountId)) return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, accountId);
    } catch {
      /* ignore */
    }
    if (state.activeAccountId === accountId) return;
    update((s) => ({ ...s, activeAccountId: accountId }));
  },

  /** Give the signed-in account a creator profile so it can pitch and take campaign slots. */
  createCreatorProfile(input: CreatorProfileInput): string {
    load();
    const account = activeAccount(state);
    if (account.creatorId) return account.creatorId;
    const id = account.reserved.creatorId;
    update((s) => {
      const creator: Creator = {
        id,
        handle: account.reserved.handle,
        name: input.name || account.name,
        firstName: (input.name || account.name).split(" ")[0],
        kind: "presenter",
        // Where the account already orders from, unless the setup said otherwise.
        cityId: input.cityId ?? s.businesses.find((b) => b.id === account.businessId)?.cityId ?? "toronto",
        headline: input.headline || "New on Yapp",
        bio: "",
        languages: input.languages,
        formats: input.formats,
        niches: [],
        platforms: [],
        rating: 0,
        reviewCount: 0,
        completed: 0,
        repeatClientRate: 0,
        onTimeRate: 100,
        responseHours: 2,
        packages: [
          {
            id: `pk-${account.firstName.toLowerCase()}-basic`,
            tier: "basic",
            name: "One video",
            summary: "One short video for your product, filmed on my phone.",
            price: 150,
            deliveryDays: 5,
            revisions: 2,
            videos: 1,
            maxSeconds: 45,
            includes: ["One edited video", "Captions"],
          },
        ],
        addons: [],
        portfolioIds: [],
        featuredVideoId: "",
        socials: [],
        available: true,
        verified: false,
        topRated: false,
        memberSince: nowStamp(),
        equipment: [],
        tints: ["sea", "sun"],
      };
      return {
        ...s,
        creators: [...s.creators, creator],
        accounts: replaceById(s.accounts, account.id, (a) => ({ ...a, creatorId: id })),
      };
    });
    return id;
  },

  /**
   * Connect a social account read-only and "verify" real followers (simulated: the follower count
   * comes from the account seed or a deterministic estimate).
   */
  connectSocial(creatorId: string, platform: CampaignPlatformId, handle: string): SocialAccount {
    load();
    const clean = handle.replace(/^@/, "").trim() || "me";
    // Deterministic per handle, so a demo can show both outcomes (below and within campaign tiers).
    const followers = 6_000 + (hashString(`${creatorId}:${platform}:${clean}`) % 30_000);
    const social: SocialAccount = { platform, handle: clean, followers, verified: true, connectedAt: nowStamp() };
    update((s) => ({
      ...s,
      creators: replaceById(s.creators, creatorId, (c) => ({
        ...c,
        socials: [...(c.socials ?? []).filter((x) => x.platform !== platform), social],
      })),
    }));
    return social;
  },

  disconnectSocial(creatorId: string, platform: CampaignPlatformId) {
    update((s) => ({
      ...s,
      creators: replaceById(s.creators, creatorId, (c) => ({
        ...c,
        socials: (c.socials ?? []).filter((x) => x.platform !== platform),
      })),
    }));
  },

  /**
   * Edit the signed-in person's name and email. Keeps their team member record, creator profile
   * and personal buyer profile in step (it's one person).
   */
  updateAccount(patch: { name?: string; email?: string }) {
    load();
    const account = activeAccount(state);
    const name = patch.name?.trim().replace(/\s+/g, " ");
    const email = patch.email?.trim().toLowerCase();
    update((s) => ({
      ...s,
      accounts: replaceById(s.accounts, account.id, (a) => ({
        ...a,
        ...(name ? { name, firstName: name.split(" ")[0] } : {}),
        ...(email ? { email } : {}),
      })),
      team: account.memberId
        ? replaceById(s.team, account.memberId, (m) => ({ ...m, ...(name ? { name } : {}), ...(email ? { email } : {}) }))
        : s.team,
      creators: account.creatorId && name
        ? replaceById(s.creators, account.creatorId, (c) => ({ ...c, name, firstName: name.split(" ")[0] }))
        : s.creators,
      businesses: name
        ? replaceById(s.businesses, account.businessId, (b) =>
            b.kind === "personal"
              ? { ...b, name, monogram: name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() }
              : b,
          )
        : s.businesses,
    }));
  },

  /** Turn a personal buyer profile into a business account (company details, tax ID, team). */
  upgradeToBusinessAccount(input: { name: string; website?: string; industry?: Business["industry"]; teamSize?: string }) {
    load();
    const account = activeAccount(state);
    update((s) => ({
      ...s,
      accounts: replaceById(s.accounts, account.id, (a) => ({ ...a, kind: "business" })),
      businesses: replaceById(s.businesses, account.businessId, (b) => ({
        ...b,
        kind: "company",
        name: input.name || b.name,
        monogram: (input.name || b.name).slice(0, 2).toUpperCase(),
        website: input.website ?? b.website,
        industry: input.industry ?? b.industry,
        teamSize: input.teamSize ?? b.teamSize,
        tagline: b.kind === "personal" ? "" : b.tagline,
      })),
    }));
  },

  /* ------------------------------------------------------------ saved */

  toggleSavedCreator(creatorId: string): boolean {
    load();
    const accountId = state.activeAccountId;
    const saved = (state.saved[accountId] ?? []).includes(creatorId);
    update((s) => {
      const list = s.saved[accountId] ?? [];
      return {
        ...s,
        saved: { ...s.saved, [accountId]: saved ? list.filter((id) => id !== creatorId) : [creatorId, ...list] },
      };
    });
    return !saved;
  },

  /* ---------------------------------------------------------- products */

  saveProduct(
    input: Omit<Product, "id" | "businessId" | "updatedAt" | "learnings" | "assets"> & {
      id?: string;
      assets?: Product["assets"];
      learnings?: Learning[];
    },
  ): string {
    const id = input.id ?? uid("p");
    update((s) => {
      const exists = s.products.some((p) => p.id === id);
      const product: Product = {
        assets: [],
        learnings: [],
        ...(exists ? s.products.find((p) => p.id === id) : {}),
        ...input,
        id,
        businessId: activeIds(s).businessId,
        updatedAt: nowStamp(),
      } as Product;
      return {
        ...s,
        products: exists ? replaceById(s.products, id, () => product) : [product, ...s.products],
      };
    });
    return id;
  },

  deleteProduct(id: string) {
    update((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
  },

  addLearning(productId: string, text: string, meta?: { commissionId?: string; creatorId?: string }) {
    update((s) => ({
      ...s,
      products: replaceById(s.products, productId, (product) => ({
        ...product,
        updatedAt: nowStamp(),
        learnings: [
          {
            id: uid("l"),
            text,
            sourceCommissionId: meta?.commissionId,
            creatorId: meta?.creatorId,
            createdAt: nowStamp(),
          },
          ...product.learnings,
        ],
      })),
    }));
  },

  removeLearning(productId: string, learningId: string) {
    update((s) => ({
      ...s,
      products: replaceById(s.products, productId, (product) => ({
        ...product,
        learnings: product.learnings.filter((l) => l.id !== learningId),
      })),
    }));
  },

  /* ---------------------------------------------------------- requests */

  saveRequestDraft(draft: Omit<RequestDraft, "savedAt"> | null) {
    update((s) => ({
      ...s,
      requestDrafts: {
        ...s.requestDrafts,
        [s.activeAccountId]: draft ? { ...draft, savedAt: nowStamp() } : null,
      },
    }));
  },

  /**
   * Save (or clear, with `null`) the new-order form's draft of one kind for the signed-in account.
   * `data` is stored as given and must survive JSON; restore it with `me.orderDraft(s, kind)`.
   * Posting doesn't clear it: call this with `null` once the order is posted.
   */
  saveOrderDraft<T>(kind: OrderDraftKind, draft: { data: T; title?: string; step?: number } | null) {
    update((s) => {
      const mine = { ...(s.orderDrafts[s.activeAccountId] ?? {}) };
      if (draft) mine[kind] = { kind, data: draft.data, title: draft.title, step: draft.step, savedAt: nowStamp() };
      else delete mine[kind];
      return { ...s, orderDrafts: { ...s.orderDrafts, [s.activeAccountId]: mine } };
    });
  },

  /**
   * Post a custom order (video or ad copy). It closes to pitches 14 days after posting. With
   * `deadlineDays`, the hired creator has that many days from the hire to deliver version 1.
   */
  createRequest(input: NewRequestInput): string {
    const id = uid("r");
    update((s) => {
      const me = activeIds(s);
      const postedAt = nowStamp();
      const closesAt = addDays(postedAt, ORDER_OPEN_DAYS);
      const request: ContentRequest = {
        id,
        businessId: me.businessId,
        title: input.title,
        brief: normalizeBrief(input.brief),
        budget: input.budget,
        dueDate: input.dueDate ?? addDays(closesAt, input.deadlineDays ?? 7),
        postedAt,
        closesAt,
        status: input.status ?? "open",
        visibility: input.visibility,
        invitedCreatorIds: input.invitedCreatorIds,
        preferredKinds: input.preferredKinds,
        slots: input.slots ?? 1,
        views: 0,
        kind: "custom",
        deadlineDays: input.deadlineDays,
      };
      let next: DemoState = {
        ...s,
        requests: [request, ...s.requests],
        requestDrafts: { ...s.requestDrafts, [me.accountId]: null },
      };
      if (request.status === "open") next = notifyDemoCreatorsOfRequest(next, request);
      return next;
    });
    return id;
  },

  /**
   * Edit an order. For a campaign, title and brief changes (talking points, restrictions) also
   * reach creators already working on a slot; approved slots keep what they were made against.
   */
  updateRequest(id: string, patch: Partial<ContentRequest>) {
    update((s) => {
      const request = s.requests.find((r) => r.id === id);
      const next = {
        ...s,
        requests: replaceById(s.requests, id, (r) => ({
          ...r,
          ...patch,
          ...(patch.brief && !isCampaign(r) ? { brief: normalizeBrief(patch.brief) } : {}),
        })),
      };
      if (!isCampaign(request) || (!patch.brief && !patch.title)) return next;
      return {
        ...next,
        commissions: next.commissions.map((c) =>
          c.source === "campaign" && c.requestId === id && occupiesSlot(c) && c.status !== "completed"
            ? { ...c, title: patch.title ?? c.title, brief: patch.brief ?? c.brief }
            : c,
        ),
      };
    });
  },

  publishDraft(id: string) {
    update((s) => {
      const postedAt = nowStamp();
      let next: DemoState = {
        ...s,
        requests: replaceById(s.requests, id, (r) => ({
          ...r,
          status: "open",
          postedAt,
          closesAt: addDays(postedAt, ORDER_OPEN_DAYS),
        })),
      };
      const request = next.requests.find((r) => r.id === id);
      if (request) next = notifyDemoCreatorsOfRequest(next, request);
      return next;
    });
  },

  closeRequest(id: string) {
    update((s) => ({
      ...s,
      requests: replaceById(s.requests, id, (r) => ({ ...r, status: "closed" })),
    }));
  },

  reopenRequest(id: string) {
    update((s) => ({
      ...s,
      requests: replaceById(s.requests, id, (r) => ({ ...r, status: "open" })),
    }));
  },

  deleteRequest(id: string) {
    update((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== id) }));
  },

  inviteToRequest(requestId: string, creatorId: string) {
    update((s) => {
      const request = s.requests.find((r) => r.id === requestId);
      if (!request || request.invitedCreatorIds.includes(creatorId)) return s;
      let next: DemoState = {
        ...s,
        requests: replaceById(s.requests, requestId, (r) => ({
          ...r,
          invitedCreatorIds: [...r.invitedCreatorIds, creatorId],
        })),
      };
      next = notifyParty(
        next,
        { creatorId },
        "request",
        `${nameOfBusiness(s, request.businessId)} invited you to pitch: ${request.title}`,
        paths.order(requestId),
      );
      return next;
    });
  },

  /** Dismiss an order from this account's feed and Explore. */
  hideRequest(requestId: string) {
    update((s) => ({
      ...s,
      hidden: { ...s.hidden, [s.activeAccountId]: [...(s.hidden[s.activeAccountId] ?? []), requestId] },
    }));
  },

  unhideRequest(requestId: string) {
    update((s) => ({
      ...s,
      hidden: {
        ...s.hidden,
        [s.activeAccountId]: (s.hidden[s.activeAccountId] ?? []).filter((id) => id !== requestId),
      },
    }));
  },

  /* ----------------------------------------------------------- pitches */

  submitPitch(input: {
    requestId: string;
    message: string;
    angle: string;
    price: number;
    deliveryDays: number;
    sampleIds: string[];
  }): string {
    const id = uid("pt");
    update((s) => {
      const creatorId = activeIds(s).creatorId;
      const request = s.requests.find((r) => r.id === input.requestId);
      if (!creatorId || !request || accountOwning(s, { businessId: request.businessId })?.creatorId === creatorId) return s;
      const pitch: Pitch = {
        ...input,
        message: mask(input.message),
        angle: mask(input.angle),
        // The brand sets the deadline on newer orders; the pitch then just repeats it.
        deliveryDays: request.deadlineDays ?? input.deliveryDays,
        id,
        creatorId,
        status: "sent",
        sentAt: nowStamp(),
      };
      let next: DemoState = {
        ...s,
        pitches: [pitch, ...s.pitches.filter((p) => !(p.requestId === input.requestId && p.creatorId === creatorId))],
      };
      next = notifyParty(
        next,
        { businessId: request.businessId },
        "pitch",
        `${nameOfCreator(s, creatorId)} pitched on "${request.title}" for ${money(input.price)}`,
        // V2: open the pitch itself; the board may open on the shortlist, where a new pitch isn't.
        paths.order(request.id, { pitch: pitch.id }),
      );
      return next;
    });
    return id;
  },

  updatePitch(id: string, patch: Partial<Pick<Pitch, "message" | "angle" | "price" | "deliveryDays" | "sampleIds">>) {
    const clean = {
      ...patch,
      ...(patch.message !== undefined ? { message: mask(patch.message) } : {}),
      ...(patch.angle !== undefined ? { angle: mask(patch.angle) } : {}),
    };
    update((s) => ({ ...s, pitches: replaceById(s.pitches, id, (p) => ({ ...p, ...clean })) }));
  },

  withdrawPitch(id: string) {
    update((s) => ({
      ...s,
      pitches: replaceById(s.pitches, id, (p) => ({ ...p, status: "withdrawn" })),
    }));
  },

  markPitchViewed(id: string) {
    update((s) => ({
      ...s,
      pitches: replaceById(s.pitches, id, (p) => (p.status === "sent" ? { ...p, status: "viewed" } : p)),
    }));
  },

  shortlistPitch(id: string, on: boolean) {
    update((s) => {
      const pitch = s.pitches.find((p) => p.id === id);
      let next: DemoState = {
        ...s,
        pitches: replaceById(s.pitches, id, (p) => ({ ...p, status: on ? "shortlisted" : "viewed" })),
      };
      if (on && pitch) {
        const request = s.requests.find((r) => r.id === pitch.requestId);
        next = notifyParty(next, { creatorId: pitch.creatorId }, "pitch", `Your pitch was shortlisted${request ? ` for "${request.title}"` : ""}`, paths.pitches);
      }
      return next;
    });
  },

  declinePitch(id: string) {
    update((s) => {
      const pitch = s.pitches.find((p) => p.id === id);
      let next: DemoState = {
        ...s,
        pitches: replaceById(s.pitches, id, (p) => ({ ...p, status: "declined" })),
      };
      if (pitch) {
        const request = s.requests.find((r) => r.id === pitch.requestId);
        next = notifyParty(
          next,
          { creatorId: pitch.creatorId },
          "pitch",
          `${request ? nameOfBusiness(s, request.businessId) : "The business"} went with another creator${request ? ` for "${request.title}"` : ""}. Thanks for pitching.`,
          paths.pitches,
        );
      }
      return next;
    });
  },

  /** Hire from a pitch: the price is charged and held immediately (nothing on top) and work starts. */
  hirePitch(input: {
    pitchId: string;
    addons: { id: AddonId; price: number }[];
    paymentMethodId: string;
    note?: string;
  }): string {
    const commissionId = uid("c");
    update((s) => {
      const pitch = s.pitches.find((p) => p.id === input.pitchId);
      const request = pitch ? s.requests.find((r) => r.id === pitch.requestId) : undefined;
      if (!pitch || !request) return s;
      const creator = s.creators.find((c) => c.id === pitch.creatorId);
      const ensured = ensureThread(s, {
        businessId: request.businessId,
        creatorId: pitch.creatorId,
        commissionId,
        subject: request.title,
      });
      let next = ensured[0];
      const threadId = ensured[1];
      const totals = priceBreakdown(pitch.price, input.addons);
      const commission: Commission = {
        id: commissionId,
        businessId: request.businessId,
        creatorId: pitch.creatorId,
        title: request.title,
        brief: { ...request.brief, addons: input.addons.map((a) => a.id) },
        source: "request",
        requestId: request.id,
        pitchId: pitch.id,
        price: pitch.price,
        addons: input.addons,
        feeRate: SERVICE_FEE_RATE,
        revisionsIncluded: 2 + (input.addons.some((a) => a.id === "extra-revision") ? 1 : 0),
        revisionsUsed: 0,
        status: "in_progress",
        createdAt: nowStamp(),
        acceptedAt: nowStamp(),
        // The brand's deadline (or the pitch's days on older orders), from when the creator is free
        // (booked creators can be hired for later).
        dueDate: at(
          (request.deadlineDays ?? pitch.deliveryDays) +
            (creator?.availableFrom && Date.parse(creator.availableFrom) > NOW
              ? Math.ceil((Date.parse(creator.availableFrom) - NOW) / (24 * HOUR))
              : 0),
          "18:00",
        ),
        deliveries: [],
        events: [],
        threadId,
        payment: { status: "held", methodId: input.paymentMethodId },
      };
      commission.events = [
        event("hired", "business", `Hired ${creator?.firstName ?? "creator"} from their pitch`),
        event("funded", "system", `${moneyExact(totals.total)} charged and held. Released only when you approve the work.`),
      ];
      const hiredCount =
        s.pitches.filter((p) => p.requestId === request.id && p.status === "hired").length + 1;
      next = {
        ...next,
        commissions: [commission, ...next.commissions],
        pitches: replaceById(next.pitches, pitch.id, (p) => ({ ...p, status: "hired" })),
        requests: replaceById(next.requests, request.id, (r) =>
          hiredCount >= r.slots ? { ...r, status: "hired" } : r,
        ),
      };
      next = appendMessage(next, threadId, {
        from: "system",
        text: `${nameOfBusiness(s, request.businessId)} hired ${creator?.firstName ?? "the creator"}. Payment of ${moneyExact(totals.total)} is held and released when the work is approved: ${creator?.firstName ?? "the creator"} receives ${moneyExact(totals.creatorEarns)} after the ${FEE_PCT}% Yapp fee.`,
      });
      if (input.note?.trim()) {
        next = appendMessage(next, threadId, { from: "business", text: input.note.trim() }, "creator");
      }
      next = notifyParty(next, { creatorId: pitch.creatorId }, "offer", `You're hired. ${nameOfBusiness(s, request.businessId)} accepted your pitch: you earn ${moneyExact(totals.creatorEarns)}`, paths.commission(commissionId));
      return next;
    });
    const hired = state.commissions.find((c) => c.id === commissionId);
    if (hired && !isDemoCreator(state, hired.creatorId)) simulateDelivery(commissionId, 25_000);
    return commissionId;
  },

  /* ------------------------------------------------------ direct offers */

  /** Commission a creator directly (from their profile or "commission again"). */
  sendOffer(input: OfferInput): string {
    const commissionId = uid("c");
    update((s) => {
      const me = activeIds(s);
      if (me.creatorId === input.creatorId) return s; // no ordering from yourself
      const ensured = ensureThread(s, {
        businessId: me.businessId,
        creatorId: input.creatorId,
        commissionId,
        subject: input.title,
      });
      let next = ensured[0];
      const threadId = ensured[1];
      const totals = priceBreakdown(input.price, input.addons);
      const commission: Commission = {
        id: commissionId,
        businessId: me.businessId,
        creatorId: input.creatorId,
        title: input.title,
        brief: input.brief,
        source: input.previousCommissionId ? "repeat" : "direct",
        packageId: input.packageId,
        previousCommissionId: input.previousCommissionId,
        price: input.price,
        addons: input.addons,
        feeRate: SERVICE_FEE_RATE,
        revisionsIncluded: input.revisionsIncluded,
        revisionsUsed: 0,
        status: "offered",
        createdAt: nowStamp(),
        dueDate: input.dueDate,
        deliveries: [],
        events: [],
        threadId,
        payment: { status: "authorized", methodId: input.paymentMethodId },
        offerMessage: mask(input.message),
      };
      commission.events = [
        event("offer_sent", "business", `Offer sent to ${nameOfCreator(s, input.creatorId)}`),
        event("funded", "system", `${moneyExact(totals.total)} authorized on your card. You're only charged if they accept.`),
      ];
      next = { ...next, commissions: [commission, ...next.commissions] };
      next = appendMessage(
        next,
        threadId,
        {
          from: "business",
          text: input.message || `Hi ${nameOfCreator(s, input.creatorId)}, we'd love to work with you on this.`,
        },
        "creator",
      );
      next = notifyParty(next, { creatorId: input.creatorId }, "offer", `${nameOfBusiness(s, me.businessId)} sent you an offer: ${input.title} (${moneyExact(totals.total)} · you earn ${moneyExact(totals.creatorEarns)})`, paths.commission(commissionId));
      return next;
    });
    // Other creators accept on their own after a short pause so the demo keeps moving.
    if (!isDemoCreator(state, input.creatorId) && typeof window !== "undefined") {
      window.setTimeout(() => actions.acceptOffer(commissionId, "creator-auto"), 7000);
    }
    return commissionId;
  },

  acceptOffer(commissionId: string, by: "creator" | "creator-auto" = "creator") {
    update((s) => {
      const c = s.commissions.find((x) => x.id === commissionId);
      if (!c || c.status !== "offered") return s;
      const creator = s.creators.find((x) => x.id === c.creatorId);
      const pkg = creator?.packages.find((p) => p.id === c.packageId);
      const days = pkg?.deliveryDays;
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "in_progress",
          acceptedAt: nowStamp(),
          payment: { ...x.payment, status: "held" },
          events: [
            ...x.events,
            event("offer_accepted", "creator", `${creator?.firstName ?? "Creator"} accepted the offer`),
            event("funded", "system", "Payment charged and held. Released when the work is approved."),
          ],
          dueDate: days && Date.parse(x.dueDate) < Date.parse(at(days)) ? at(days, "18:00") : x.dueDate,
        })),
      };
      next = appendMessage(
        next,
        c.threadId,
        {
          from: by === "creator-auto" ? "creator" : "system",
          text:
            by === "creator-auto"
              ? `Thanks for the offer, I'm in. I'll read through the brief tonight and send any questions before I start filming.`
              : `${creator?.firstName ?? "The creator"} accepted the offer. Work has started.`,
        },
        "business",
      );
      next = notifyParty(next, { businessId: c.businessId }, "offer", `${creator?.firstName ?? "The creator"} accepted your offer: ${c.title}`, paths.commission(commissionId));
      return next;
    });
    if (by === "creator-auto") simulateDelivery(commissionId, 25_000);
  },

  declineOffer(commissionId: string, reason: string) {
    update((s) => {
      const c = findCommission(s, commissionId);
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "declined",
          cancelReason: reason,
          payment: { ...x.payment, status: "refunded" },
          events: [...x.events, event("offer_declined", "creator", `Offer declined: ${reason}`)],
        })),
      };
      next = appendMessage(next, c.threadId, { from: "system", text: `Offer declined. The authorization on your card was released.` }, "business");
      next = notifyParty(next, { businessId: c.businessId }, "offer", `${nameOfCreator(s, c.creatorId)} declined your offer: ${c.title}`, paths.commission(commissionId));
      return next;
    });
  },

  /** Business withdraws an offer before the creator accepts. */
  withdrawOffer(commissionId: string) {
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (x) => ({
        ...x,
        status: "cancelled",
        cancelReason: "Offer withdrawn",
        payment: { ...x.payment, status: "refunded" },
        events: [...x.events, event("cancelled", "business", "Offer withdrawn. Card authorization released.")],
      })),
    }));
  },

  /* -------------------------------------------------------- production */

  /**
   * Creator delivers a new version for review (campaigns: a watermarked review copy). Ad copy
   * (`kind: "text"`, required for an ad-copy job and refused otherwise) delivers the copy as `text`
   * and/or documents in `files`, and no video. Open comments on the previous version are marked
   * resolved. Returns the new delivery id ("" when refused).
   */
  deliver(input: {
    commissionId: string;
    note: string;
    files: DeliveryFile[];
    video?: Partial<Video>;
    /** "text" for ad copy. */
    kind?: "video" | "text";
    /** Ad copy: the copy itself. */
    text?: string;
  }): string {
    load();
    const current = state.commissions.find((x) => x.id === input.commissionId);
    if (!current) return "";
    const adCopy = current.brief.jobType === "ad-copy";
    const kind = input.kind ?? (adCopy ? "text" : "video");
    // Ad copy is always text; a video job never delivers text.
    if ((kind === "text") !== adCopy) return "";
    if (kind === "text" && !input.text?.trim() && !input.files.length) return "";
    // Ad copy attaches documents only (PDF, DOC, DOCX, TXT).
    if (kind === "text" && input.files.some((f) => f.kind !== "document" && !(AD_COPY_DOCUMENT_TYPES as readonly string[]).includes(extensionOf(f.name))))
      return "";
    const deliveryId = uid("d");
    update((s) => {
      const c = findCommission(s, input.commissionId);
      const creator = s.creators.find((x) => x.id === c.creatorId);
      const previous = c.deliveries[c.deliveries.length - 1];
      const product = s.products.find((p) => p.id === c.brief.productId);
      const campaign = c.source === "campaign";
      const version = c.deliveries.length + 1;
      let video: Video | undefined;
      if (kind === "video") {
        const ownVideos = s.videos.filter((v) => v.creatorId === c.creatorId);
        const template =
          previous?.video ??
          ownVideos.find((v) => v.format === c.brief.format) ??
          s.videos.find((v) => v.id === creator?.featuredVideoId) ??
          ownVideos[0] ??
          s.videos[0];
        // A new delivery has no performance yet (portfolio templates carry views).
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { stats, ...base } = template;
        video = {
          ...base,
          id: uid("v"),
          creatorId: c.creatorId,
          title: `${product?.name ?? c.title} — ${campaign ? "review copy " : ""}v${version}`,
          format: c.brief.format,
          aspect: c.brief.aspect,
          madeFor: nameOfBusiness(s, c.businessId),
          durationSec: Math.min(Math.max(c.brief.durationSec, 8), 180),
          ...input.video,
        };
      }
      const stamp = nowStamp();
      const delivery: Delivery = {
        id: deliveryId,
        version,
        ...(kind === "text" ? { kind: "text" as const, text: mask(input.text?.trim() ?? "") || undefined } : { kind: "video" as const, video }),
        note: mask(input.note),
        deliveredAt: stamp,
        status: "in_review",
        comments: [],
        files: input.files,
        reviewCopy: campaign || undefined,
      };
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, c.id, (x) => ({
          ...x,
          status: "delivered",
          autoApproveAt: at(AUTO_APPROVE_DAYS, "20:00"),
          // A new version settles what was open on the last one (its thread stays readable).
          deliveries: [
            ...x.deliveries.map((d) =>
              d.id === previous?.id
                ? {
                    ...d,
                    comments: d.comments.map((m) =>
                      m.resolved || m.deletedAt ? m : { ...m, resolved: true, resolvedAt: stamp, resolvedBy: "creator" as const },
                    ),
                  }
                : d,
            ),
            delivery,
          ],
          events: [
            ...x.events,
            event("delivered", "creator", campaign ? `Review copy uploaded (version ${delivery.version})` : `Version ${delivery.version} delivered`),
          ],
        })),
      };
      // Campaign review copies live on the slot's page; posting each one to the inbox would flood
      // the business with one thread per creator.
      if (!campaign) {
        const file = input.files[0];
        next = appendMessage(
          next,
          c.threadId,
          {
            from: "creator",
            text: input.note || `Version ${delivery.version} is up for review.`,
            attachment: video
              ? { kind: "video", name: file?.name ?? `${video.title}.mp4`, size: file?.size, videoId: video.id }
              : file
                ? { kind: "file", name: file.name, size: file.size }
                : undefined,
          },
          "business",
        );
      }
      if (campaign && c.requestId) {
        next = notifyParty(next, { businessId: c.businessId }, "campaign", "", paths.order(c.requestId), {
          key: `campaign:${c.requestId}:review`,
          text: (n) =>
            n === 1
              ? `${creator?.firstName ?? "A creator"} uploaded a review copy for "${c.title}"`
              : `${n} review copies are ready on "${c.title}"`,
        });
      } else {
        next = notifyParty(next, { businessId: c.businessId }, "delivery", `${creator?.firstName ?? "Your creator"} delivered version ${delivery.version} of "${c.title}"`, paths.commission(c.id));
      }
      return next;
    });
    return deliveryId;
  },

  /* ---------------------------------------------------------- comments */

  /**
   * Comment on a delivered version, as whichever side the signed-in account is on. `atSec: null` is
   * a general comment (ad copy only takes general ones). Any version, while comments are open (the
   * order runs, or completed under 30 days ago). Notifies the other side and adds one grouped line
   * to the order's thread. Never touches the review timer.
   */
  addComment(commissionId: string, deliveryId: string, input: { atSec: number | null; text: string }): CommentResult {
    return commentAction(commissionId, deliveryId, (s, c, d, side) => {
      const text = mask(input.text.trim());
      if (text.length < COMMENT_MIN_CHARS) return { ok: false, reason: "too_short" };
      if (input.atSec !== null && commentsAreGeneralOnly(d)) return { ok: false, reason: "general_only" };
      const id = uid("dc");
      const comment: DeliveryComment = {
        id,
        atSec: input.atSec === null ? null : Math.max(0, Math.round(input.atSec)),
        text,
        author: side,
        authorId: authorIdFor(s, side),
        resolved: false,
        createdAt: nowStamp(),
        unread: true,
        replies: [],
      };
      let next = withDelivery(s, c.id, d.id, (x) => ({ ...x, comments: sortComments([...x.comments, comment]) }));
      next = announceComment(next, c, d, side, { kind: "comment", atSec: comment.atSec, commentId: id });
      return { ok: true, id, next };
    });
  },

  /** Reply under a comment (one level deep), as the signed-in account's side. */
  replyToComment(commissionId: string, deliveryId: string, commentId: string, text: string): CommentResult {
    return commentAction(commissionId, deliveryId, (s, c, d, side) => {
      const parent = d.comments.find((m) => m.id === commentId);
      if (!parent || parent.deletedAt) return { ok: false, reason: "not_found" };
      const body = mask(text.trim());
      if (body.length < COMMENT_MIN_CHARS) return { ok: false, reason: "too_short" };
      const id = uid("dr");
      const reply: CommentReply = { id, author: side, authorId: authorIdFor(s, side), text: body, createdAt: nowStamp(), unread: true };
      let next = withComment(s, c.id, d.id, commentId, (m) => ({ ...m, replies: [...m.replies, reply] }));
      next = announceComment(next, c, d, side, { kind: "reply", parentAuthor: parent.author, commentId });
      return { ok: true, id, next };
    });
  },

  /** Edit your own comment (or, with `replyId`, your own reply) on the latest version. */
  editComment(commissionId: string, deliveryId: string, commentId: string, text: string, replyId?: string): CommentResult {
    return commentAction(commissionId, deliveryId, (s, c, d, side) => {
      if (!isLatestDelivery(c, d.id)) return { ok: false, reason: "not_latest" };
      const target = findCommentOrReply(d, commentId, replyId);
      if (!target || target.deletedAt) return { ok: false, reason: "not_found" };
      if (target.author !== side || target.authorId !== authorIdFor(s, side)) return { ok: false, reason: "not_author" };
      const body = mask(text.trim());
      if (body.length < COMMENT_MIN_CHARS) return { ok: false, reason: "too_short" };
      const editedAt = nowStamp();
      const next = withComment(s, c.id, d.id, commentId, (m) =>
        replyId
          ? { ...m, replies: replaceById(m.replies, replyId, (r) => ({ ...r, text: body, editedAt })) }
          : { ...m, text: body, editedAt },
      );
      return { ok: true, id: replyId ?? commentId, next };
    });
  },

  /**
   * Delete your own comment or reply on the latest version. Soft: the text is kept for support and
   * disputes, and a comment with replies shows as "Comment deleted". Undo with `restoreComment`.
   */
  removeComment(commissionId: string, deliveryId: string, commentId: string, replyId?: string): CommentResult {
    return commentAction(commissionId, deliveryId, (s, c, d, side) => {
      if (!isLatestDelivery(c, d.id)) return { ok: false, reason: "not_latest" };
      const target = findCommentOrReply(d, commentId, replyId);
      if (!target || target.deletedAt) return { ok: false, reason: "not_found" };
      if (target.author !== side || target.authorId !== authorIdFor(s, side)) return { ok: false, reason: "not_author" };
      const deletedAt = nowStamp();
      const next = withComment(s, c.id, d.id, commentId, (m) =>
        replyId ? { ...m, replies: replaceById(m.replies, replyId, (r) => ({ ...r, deletedAt })) } : { ...m, deletedAt },
      );
      return { ok: true, id: replyId ?? commentId, next };
    });
  },

  /** Undo a delete (the toast's "Undo"). */
  restoreComment(commissionId: string, deliveryId: string, commentId: string, replyId?: string): CommentResult {
    return commentAction(commissionId, deliveryId, (s, c, d, side) => {
      const target = findCommentOrReply(d, commentId, replyId);
      if (!target) return { ok: false, reason: "not_found" };
      if (target.author !== side || target.authorId !== authorIdFor(s, side)) return { ok: false, reason: "not_author" };
      const next = withComment(s, c.id, d.id, commentId, (m) =>
        replyId
          ? { ...m, replies: replaceById(m.replies, replyId, (r) => ({ ...r, deletedAt: undefined })) }
          : { ...m, deletedAt: undefined },
      );
      return { ok: true, id: replyId ?? commentId, next };
    });
  },

  /** Mark a comment done. Either side, any version, while comments are open. */
  resolveComment(commissionId: string, deliveryId: string, commentId: string): CommentResult {
    return commentAction(commissionId, deliveryId, (s, c, d, side) => {
      const target = d.comments.find((m) => m.id === commentId);
      if (!target || target.deletedAt) return { ok: false, reason: "not_found" };
      const next = withComment(s, c.id, d.id, commentId, (m) =>
        m.resolved ? m : { ...m, resolved: true, resolvedAt: nowStamp(), resolvedBy: side },
      );
      return { ok: true, id: commentId, next };
    });
  },

  /** Re-open a resolved comment. The business only. */
  reopenComment(commissionId: string, deliveryId: string, commentId: string): CommentResult {
    return commentAction(commissionId, deliveryId, (s, c, d, side) => {
      if (side !== "business") return { ok: false, reason: "not_allowed" };
      const target = d.comments.find((m) => m.id === commentId);
      if (!target || target.deletedAt) return { ok: false, reason: "not_found" };
      const next = withComment(s, c.id, d.id, commentId, (m) => ({ ...m, resolved: false, resolvedAt: undefined, resolvedBy: undefined }));
      return { ok: true, id: commentId, next };
    });
  },

  /**
   * The signed-in account has seen every comment and reply on this order (call it when the order
   * opens). Clears the unread badge for its side only. Works after comments close, too.
   */
  markCommentsRead(commissionId: string) {
    load();
    const c = state.commissions.find((x) => x.id === commissionId);
    const side = c ? sideFor(state, c) : undefined;
    if (!c || !side) return;
    const hasUnread = c.deliveries.some((d) =>
      d.comments.some((m) => (m.unread && m.author !== side) || m.replies.some((r) => r.unread && r.author !== side)),
    );
    if (!hasUnread) return;
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (x) => ({
        ...x,
        deliveries: x.deliveries.map((d) => ({
          ...d,
          comments: d.comments.map((m) => ({
            ...m,
            unread: m.author !== side ? undefined : m.unread,
            replies: m.replies.map((r) => (r.author !== side ? { ...r, unread: undefined } : r)),
          })),
        })),
      })),
    }));
  },

  /**
   * Business asks for changes on the latest version: sends the open comments it ticked
   * (`commentIds`) and an optional note. Needs one ticked comment, or a note of 10 characters or more.
   * Unticked comments stay open. The review timer stops until the next version arrives.
   */
  requestRevision(
    commissionId: string,
    input: { commentIds: string[]; note?: string },
  ): { ok: true } | { ok: false; reason: "pick_or_note" | "not_in_review" | "not_party" } {
    load();
    const current = state.commissions.find((x) => x.id === commissionId);
    if (!current || sideFor(state, current) !== "business") return { ok: false, reason: "not_party" };
    const latest = current.deliveries[current.deliveries.length - 1];
    if (!latest || current.status !== "delivered" || latest.status !== "in_review") return { ok: false, reason: "not_in_review" };
    const ticked = latest.comments.filter((m) => input.commentIds.includes(m.id) && !m.resolved && !m.deletedAt);
    const note = input.note?.trim() ?? "";
    if (!ticked.length && note.length < CHANGE_NOTE_MIN_CHARS) return { ok: false, reason: "pick_or_note" };
    update((s) => {
      const c = findCommission(s, commissionId);
      const count = ticked.length;
      const sentAt = nowStamp();
      const ids = new Set(ticked.map((m) => m.id));
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "revision",
          autoApproveAt: undefined,
          revisionsUsed: x.revisionsUsed + 1,
          dueDate: Date.parse(x.dueDate) < Date.parse(at(2)) ? at(2, "18:00") : x.dueDate,
          deliveries: replaceById(x.deliveries, latest.id, (d) => ({
            ...d,
            status: "changes_requested",
            comments: d.comments.map((m) => (ids.has(m.id) ? { ...m, requestedAt: sentAt } : m)),
          })),
          events: [
            ...x.events,
            event(
              "revision_requested",
              "business",
              `Changes requested on version ${latest.version}${count ? ` (${count} comment${count === 1 ? "" : "s"})` : ""}`,
            ),
          ],
        })),
      };
      next = appendMessage(
        next,
        c.threadId,
        {
          from: "business",
          text: mask(note) || `Sent ${count} comment${count === 1 ? "" : "s"} on version ${latest.version} to change. Thank you.`,
        },
        "creator",
      );
      if (isDemoCreator(s, c.creatorId)) {
        next = notifyParty(next, { creatorId: c.creatorId }, "revision", `${nameOfBusiness(s, c.businessId)} requested changes on "${c.title}"`, paths.commission(c.id));
      } else if (c.source !== "campaign") {
        // Campaign slots are driven by the simulation tick instead.
        scheduleReply(c.threadId, "creator", "thanks, notes");
        simulateDelivery(c.id, 20_000);
      }
      return next;
    });
    return { ok: true };
  },

  /**
   * Approve the latest delivery. Custom and direct work: payment is released to the creator.
   * Campaign slots: the full-quality file unlocks for the business and the creator moves on to
   * posting; the price stays held (pending, no date yet) until 7 days after the post is verified.
   */
  approve(commissionId: string, options: { rating?: number } = {}) {
    update((s) => {
      const c = findCommission(s, commissionId);
      const latest = c.deliveries[c.deliveries.length - 1];
      const totals = priceBreakdown(c.price, c.addons, c.feeRate);
      const campaign = c.source === "campaign";
      const request = c.requestId ? s.requests.find((r) => r.id === c.requestId) : undefined;
      const completedAt = nowStamp();
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "completed",
          completedAt,
          autoApproveAt: undefined,
          payment: { ...x.payment, status: campaign ? "pending" : "released" },
          deliveries: latest ? replaceById(x.deliveries, latest.id, (d) => ({ ...d, status: "approved" })) : x.deliveries,
          ...(campaign
            ? {
                withdrawableFrom: undefined,
                post: { status: "due" as const },
                quickRating: options.rating,
              }
            : {}),
          events: [
            ...x.events,
            event(
              "approved",
              "business",
              campaign
                ? `${latest ? `Version ${latest.version}` : "Video"} approved. Full-quality file unlocked.`
                : latest
                  ? `Version ${latest.version} approved`
                  : "Work approved",
            ),
            event(
              "paid",
              "system",
              campaign
                ? `${moneyExact(totals.total)} stays held until ${CAMPAIGN_RELEASE_DAYS} days after the post is verified (${nameOfCreator(s, x.creatorId)} receives ${moneyExact(totals.creatorEarns)} after the ${FEE_PCT}% Yapp fee)`
                : `${moneyExact(totals.total)} released: ${nameOfCreator(s, x.creatorId)} receives ${moneyExact(totals.creatorEarns)} after the ${FEE_PCT}% Yapp fee`,
            ),
          ],
        })),
        creators: replaceById(s.creators, c.creatorId, (cr) => ({ ...cr, completed: cr.completed + 1 })),
      };
      if (campaign) {
        next = notifyParty(
          next,
          { creatorId: c.creatorId },
          "payment",
          `Approved. Post it on your ${campaignPlatformById[slotPlatform(c, request)].name} tagging ${request?.campaign ? brandHandleFor(request.campaign, slotPlatform(c, request)) : "the brand"}: your ${moneyExact(totals.creatorEarns)} is released ${CAMPAIGN_RELEASE_DAYS} days after we verify the post.`,
          paths.commission(c.id),
        );
      } else {
        next = appendMessage(next, c.threadId, { from: "system", text: `Approved. The ${moneyExact(totals.total)} payment was released: ${nameOfCreator(s, c.creatorId)} receives ${moneyExact(totals.creatorEarns)} after the ${FEE_PCT}% Yapp fee.` }, "creator");
        next = notifyParty(next, { creatorId: c.creatorId }, "payment", `${moneyExact(totals.creatorEarns)} released by ${nameOfBusiness(s, c.businessId)}`, paths.wallet);
      }
      return next;
    });
  },

  leaveReview(input: ReviewInput): string {
    const reviewId = uid("rv");
    update((s) => {
      const c = findCommission(s, input.commissionId);
      const me = activeIds(s);
      const member = me.memberId ? s.team.find((m) => m.id === me.memberId) : undefined;
      const account = activeAccount(s);
      const business = s.businesses.find((b) => b.id === c.businessId);
      const review: Review = {
        id: reviewId,
        commissionId: c.id,
        creatorId: c.creatorId,
        businessId: c.businessId,
        rating: input.rating,
        quality: input.quality,
        communication: input.communication,
        timeliness: input.timeliness,
        text: input.text,
        wouldRehire: input.wouldRehire,
        createdAt: nowStamp(),
        authorName: member?.name ?? account.name,
        authorTitle: business?.kind === "personal" ? "Ordered in their own name" : `${member?.title ?? "Team"}, ${nameOfBusiness(s, c.businessId)}`,
        format: c.brief.format,
      };
      let next: DemoState = {
        ...s,
        reviews: [review, ...s.reviews],
        commissions: replaceById(s.commissions, c.id, (x) => ({
          ...x,
          reviewId,
          events: [...x.events, event("reviewed", "business", `Left a ${input.rating}-star review`)],
        })),
        creators: replaceById(s.creators, c.creatorId, (cr) => ({
          ...cr,
          reviewCount: cr.reviewCount + 1,
          rating: Math.round(((cr.rating * cr.reviewCount + input.rating) / (cr.reviewCount + 1)) * 100) / 100,
        })),
      };
      const productId = c.brief.productId;
      for (const text of input.learnings.filter((t) => t.trim())) {
        next = {
          ...next,
          products: replaceById(next.products, productId, (p) => ({
            ...p,
            updatedAt: nowStamp(),
            learnings: [
              { id: uid("l"), text: text.trim(), sourceCommissionId: c.id, creatorId: c.creatorId, createdAt: nowStamp() },
              ...p.learnings,
            ],
          })),
        };
      }
      next = notifyParty(next, { creatorId: c.creatorId }, "review", `${nameOfBusiness(s, c.businessId)} left you a ${input.rating}-star review`, paths.creator(s.creators.find((x) => x.id === c.creatorId)?.handle ?? ""));
      return next;
    });
    return reviewId;
  },

  /** Creator's private feedback about the business. */
  leaveClientFeedback(commissionId: string, rating: number, text: string) {
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (c) => ({ ...c, clientFeedback: { rating, text: mask(text) } })),
    }));
  },

  replyToReview(reviewId: string, reply: string) {
    update((s) => ({ ...s, reviews: replaceById(s.reviews, reviewId, (r) => ({ ...r, reply: mask(reply) })) }));
  },

  cancelCommission(commissionId: string, reason: string, by: Role) {
    update((s) => {
      const c = findCommission(s, commissionId);
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "cancelled",
          cancelReason: reason,
          payment: { ...x.payment, status: "refunded" },
          events: [...x.events, event("cancelled", by, `Cancelled: ${reason}. Payment refunded in full.`)],
        })),
      };
      next = appendMessage(next, c.threadId, { from: "system", text: `This commission was cancelled. The payment was refunded in full.` }, other(by));
      return next;
    });
  },

  openDispute(commissionId: string, reason: string, details: string, by: Role) {
    update((s) => {
      const c = findCommission(s, commissionId);
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "disputed",
          autoApproveAt: undefined,
          events: [...x.events, event("disputed", by, `Asked Yapp support for help: ${reason}`)],
        })),
      };
      next = appendMessage(
        next,
        c.threadId,
        { from: "system", text: `Yapp support has joined. Payment stays protected while we help. ${details ? `Details: "${details}"` : ""}`.trim() },
        other(by),
      );
      return next;
    });
  },

  extendDeadline(commissionId: string, days: number, by: Role) {
    update((s) => {
      const c = findCommission(s, commissionId);
      const dueDate = new Date(Date.parse(c.dueDate) + days * 24 * HOUR).toISOString();
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          dueDate,
          events: [...x.events, event("due_changed", by, `Due date moved by ${days} day${days === 1 ? "" : "s"}`)],
        })),
      };
      next = appendMessage(next, c.threadId, { from: "system", text: `Due date moved by ${days} day${days === 1 ? "" : "s"}.` }, other(by));
      return next;
    });
  },

  /* ---------------------------------------------------------- campaigns */

  /**
   * Charge and hold the full amount (videos × price, nothing on top) and publish a UGC campaign. It
   * stays open for 14 days unless the business closes it. Returns the new campaign id.
   */
  publishCampaign(input: CampaignInput): string {
    const platforms = [...new Set(input.platforms)].filter((p) => campaignPlatformById[p]);
    if (!platforms.length) return "";
    const id = uid("r");
    const price = Math.min(PRICE_MAX_PER_YAPP, Math.max(PRICE_MIN_PER_YAPP, Math.round(input.pricePerVideo)));
    const brandHandles = cleanHandles(input.brandHandles, platforms);
    update((s) => {
      const me = activeIds(s);
      const product = s.products.find((p) => p.id === input.productId);
      const postedAt = nowStamp();
      const closesAt = addDays(postedAt, CAMPAIGN_OPEN_DAYS);
      const request: ContentRequest = {
        id,
        businessId: me.businessId,
        title: input.title,
        brief: campaignBrief({ ...input, platforms }, product),
        budget: { min: price, max: price },
        dueDate: at(30, "18:00"),
        postedAt,
        closesAt,
        status: "open",
        visibility: "public",
        invitedCreatorIds: [],
        preferredKinds: [],
        slots: input.videos,
        views: 0,
        kind: "campaign",
        campaign: {
          tierId: input.tierId,
          pricePerVideo: price,
          platforms,
          brandHandles,
          explainer: input.explainer,
          deadlineDays: input.deadlineDays,
          closesAt,
          paymentMethodId: input.paymentMethodId,
          ledger: [
            ledgerEntry(input.videos * price, `${input.videos} Yapps × ${money(price)}`, "charge"),
          ],
          excludedCreatorIds: [],
          simulate: true,
        },
      };
      let next: DemoState = {
        ...s,
        requests: [request, ...s.requests],
        // The handles are saved to the brand, so the next campaign starts with them filled in.
        businesses: replaceById(s.businesses, me.businessId, (b) => ({ ...b, handles: { ...b.handles, ...brandHandles } })),
      };
      next = notifyDemoCreatorsOfRequest(next, request);
      return next;
    });
    return id;
  },

  /**
   * Save (or clear, with null) the account creators should tag on one platform, on the signed-in
   * account's buyer profile. Returns the saved "@handle" ("" when cleared or invalid).
   */
  saveBrandHandle(platform: CampaignPlatformId, handle: string | null): string {
    const value = handle ? atHandle(handle) : "";
    if (handle && !BRAND_HANDLE.test(value)) return "";
    update((s) => {
      const businessId = activeIds(s).businessId;
      return {
        ...s,
        businesses: replaceById(s.businesses, businessId, (b) => {
          const handles = { ...b.handles };
          if (value) handles[platform] = value;
          else delete handles[platform];
          return { ...b, handles };
        }),
      };
    });
    return value;
  },

  /**
   * Pick the first open slot on a campaign (first come, first served), posting on `platform`: one of
   * the campaign's platforms where this creator qualifies (default: the first that does).
   */
  acceptCampaignSlot(requestId: string, creatorId?: string, platform?: CampaignPlatformId): TakeSlotResult {
    load();
    const who = creatorId ?? activeIds(state).creatorId;
    const request = state.requests.find((r) => r.id === requestId);
    const creator = who ? state.creators.find((c) => c.id === who) : undefined;
    if (!request || !request.campaign) return { ok: false, reason: "closed" };
    const check = eligibility(state, creator, request, platform);
    if (!check.ok) return { ok: false, reason: check.reason };
    const postPlatform = check.platform;
    const slot = openSlotNumbers(state, request)[0];
    const commissionId = uid("c");
    update((s) => {
      const terms = request.campaign!;
      const takenAt = nowStamp();
      const ensured = ensureThread(s, {
        businessId: request.businessId,
        creatorId: creator!.id,
        commissionId,
        requestId,
        subject: request.title,
      });
      let next = ensured[0];
      const commission: Commission = {
        id: commissionId,
        businessId: request.businessId,
        creatorId: creator!.id,
        title: request.title,
        brief: request.brief,
        source: "campaign",
        requestId,
        price: terms.pricePerVideo,
        addons: [],
        feeRate: CAMPAIGN_FEE_RATE,
        revisionsIncluded: 2,
        revisionsUsed: 0,
        status: "in_progress",
        createdAt: takenAt,
        acceptedAt: takenAt,
        // Version 1 is due within the deadline the brand set (fixed once the campaign was posted).
        dueDate: addDays(takenAt, terms.deadlineDays),
        deliveries: [],
        events: [
          event(
            "slot_accepted",
            "creator",
            `Picked slot ${slot}, posting on ${campaignPlatformById[postPlatform].name}. Deadline set by ${nameOfBusiness(s, request.businessId)}: ${terms.deadlineDays} days.`,
          ),
        ],
        threadId: ensured[1],
        payment: { status: "held", methodId: terms.paymentMethodId },
        campaignSlot: slot,
        postPlatform,
      };
      next = { ...next, commissions: [commission, ...next.commissions] };
      next = syncCampaignStatus(next, requestId);
      next = notifyParty(next, { businessId: request.businessId }, "campaign", "", paths.order(requestId), {
        key: `campaign:${requestId}:joined`,
        text: (n) =>
          n === 1
            ? `${creator!.firstName} picked a slot on "${request.title}"`
            : `${n} creators picked slots on "${request.title}"`,
      });
      return next;
    });
    return { ok: true, commissionId, slot, platform: postPlatform };
  },

  /**
   * Business removes an accepted creator before filming; the slot reopens for others (on a closed
   * campaign its money is refunded in full instead).
   */
  removeCampaignCreator(commissionId: string, reason = "") {
    update((s) => {
      const c = findCommission(s, commissionId);
      const request = c.requestId ? s.requests.find((r) => r.id === c.requestId) : undefined;
      if (!request?.campaign || !occupiesSlot(c)) return s;
      const closed = request.status === "closed";
      const entries = slotEndedEntries(request, c, "creator removed");
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "cancelled",
          cancelCode: "replaced",
          cancelReason: reason || undefined,
          autoApproveAt: undefined,
          payment: { ...x.payment, status: closed ? "refunded" : "returned" },
          events: [
            ...x.events,
            event(
              "creator_replaced",
              "business",
              closed
                ? "Removed from the campaign. It's closed, so the slot's money was refunded."
                : "Removed from the campaign. The slot reopened for other creators.",
            ),
          ],
        })),
        requests: replaceById(s.requests, request.id, (r) => ({
          ...r,
          campaign: {
            ...r.campaign!,
            excludedCreatorIds: [...new Set([...r.campaign!.excludedCreatorIds, c.creatorId])],
            ledger: [...r.campaign!.ledger, ...entries],
          },
        })),
      };
      next = syncCampaignStatus(next, request.id);
      next = notifyParty(
        next,
        { creatorId: c.creatorId },
        "campaign",
        `${nameOfBusiness(s, c.businessId)} went with another creator for your slot on "${c.title}". Thanks for taking it.`,
        paths.commission(c.id),
      );
      return next;
    });
  },

  /**
   * Business rejects a review copy: the slot goes to another creator and the money stays held (on a
   * closed campaign it is refunded in full instead).
   */
  rejectCampaignVideo(commissionId: string, reason = "") {
    update((s) => {
      const c = findCommission(s, commissionId);
      const request = c.requestId ? s.requests.find((r) => r.id === c.requestId) : undefined;
      if (!request?.campaign || !occupiesSlot(c)) return s;
      const latest = c.deliveries[c.deliveries.length - 1];
      const closed = request.status === "closed";
      const entries = slotEndedEntries(request, c, "video not approved");
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "cancelled",
          cancelCode: "video_rejected",
          cancelReason: mask(reason) || undefined,
          autoApproveAt: undefined,
          payment: { ...x.payment, status: closed ? "refunded" : "returned" },
          deliveries: latest ? replaceById(x.deliveries, latest.id, (d) => ({ ...d, status: "rejected" })) : x.deliveries,
          events: [
            ...x.events,
            event(
              "video_rejected",
              "business",
              `Review copy rejected${reason ? `: ${reason}` : ""}. ${closed ? "The campaign is closed, so the slot's money was refunded." : "The slot reopened for another creator."}`,
            ),
          ],
        })),
        requests: replaceById(s.requests, request.id, (r) => ({
          ...r,
          campaign: {
            ...r.campaign!,
            excludedCreatorIds: [...new Set([...r.campaign!.excludedCreatorIds, c.creatorId])],
            ledger: [...r.campaign!.ledger, ...entries],
          },
        })),
      };
      next = syncCampaignStatus(next, request.id);
      next = notifyParty(
        next,
        { creatorId: c.creatorId },
        "campaign",
        `${nameOfBusiness(s, c.businessId)} didn't approve your video for "${c.title}"${reason ? `: "${reason}"` : ""}. The slot went back to the campaign.`,
        paths.commission(c.id),
      );
      return next;
    });
  },

  /**
   * Creator posts the approved video on their own account; verification runs on the next tick. A
   * restored post keeps its first verification (the 7 and 30 days don't restart).
   */
  /**
   * The link must be on the platform the creator picked (`postLinkProblem`); otherwise nothing
   * changes and the reason comes back for the sheet to show.
   */
  submitPost(commissionId: string, url: string): { ok: true } | { ok: false; reason: string } {
    load();
    const c = state.commissions.find((x) => x.id === commissionId);
    if (!c || c.source !== "campaign") return { ok: false, reason: "This isn't a campaign slot." };
    const request = c.requestId ? state.requests.find((r) => r.id === c.requestId) : undefined;
    const platform = slotPlatform(c, request);
    const problem = postLinkProblem(url, platform);
    if (problem) return { ok: false, reason: problem };
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (x) => ({
        ...x,
        post: { status: "checking", url: url.trim(), at: nowStamp(), verifiedAt: x.post?.verifiedAt },
        events: [
          ...x.events,
          event("posted", "creator", `Posted on their ${campaignPlatformById[platform].name}. Checking the tag and disclosure…`),
        ],
      })),
    }));
    return { ok: true };
  },

  /**
   * Demo control (no UI yet): pretend the creator took the post down. The pay stays held; if the
   * post isn't back within 48 hours ("Skip 7 days"), the slot goes back to the campaign.
   */
  markPostRemoved(commissionId: string) {
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (x) =>
        x.post ? { ...x, post: { ...x.post, status: "removed", removedAt: nowStamp() } } : x,
      ),
    }));
  },

  /**
   * Change the follower tier once after publishing. Tiers only decide who may pick a slot, so no
   * money moves: taken and open slots keep the price.
   */
  changeCampaignTier(requestId: string, tierId: FollowerTierId): { ok: boolean } {
    load();
    const request = state.requests.find((r) => r.id === requestId);
    const terms = request?.campaign;
    if (!request || !terms || terms.tierChangedAt || terms.tierId === tierId) return { ok: false };
    update((s) => ({
      ...s,
      requests: replaceById(s.requests, requestId, (r) => ({
        ...r,
        campaign: { ...r.campaign!, tierId, previousTierId: r.campaign!.tierId, tierChangedAt: nowStamp() },
      })),
    }));
    return { ok: true };
  },

  /**
   * Raise the price per Yapp after posting (never lower it). The unpicked slots are topped up on the
   * campaign's card and held; taken slots keep the price they were picked at. Returns the top-up.
   */
  raiseCampaignPrice(requestId: string, price: number): { ok: boolean; topUp: number } {
    load();
    const request = state.requests.find((r) => r.id === requestId);
    const terms = request?.campaign;
    const next = Math.round(price);
    if (!request || !terms || request.status === "closed" || next <= terms.pricePerVideo || next > PRICE_MAX_PER_YAPP)
      return { ok: false, topUp: 0 };
    const open = openSlotNumbers(state, request).length;
    const topUp = (next - terms.pricePerVideo) * open;
    update((s) => ({
      ...s,
      requests: replaceById(s.requests, requestId, (r) => ({
        ...r,
        budget: { min: next, max: next },
        campaign: {
          ...r.campaign!,
          pricePerVideo: next,
          postedPrice: r.campaign!.postedPrice ?? r.campaign!.pricePerVideo,
          ledger:
            topUp > 0
              ? [
                  ...r.campaign!.ledger,
                  ledgerEntry(
                    topUp,
                    `Price raised to ${money(next)} per Yapp: ${open} open slot${open === 1 ? "" : "s"} × ${money(next - terms.pricePerVideo)}`,
                  ),
                ]
              : r.campaign!.ledger,
        },
      })),
    }));
    return { ok: true, topUp };
  },

  /**
   * Stop new acceptances. Open slots are refunded in full; slots in progress carry on. A
   * campaign also closes 14 days after posting, but the demo clock is fixed, so here closing is
   * always the business's own action.
   */
  closeCampaign(requestId: string) {
    load();
    const request = state.requests.find((r) => r.id === requestId);
    if (!request?.campaign) return;
    const open = openSlotNumbers(state, request).length;
    const refund = open * request.campaign.pricePerVideo;
    update((s) => ({
      ...s,
      requests: replaceById(s.requests, requestId, (r) => ({
        ...r,
        status: "closed",
        campaign: {
          ...r.campaign!,
          ledger: refund
            ? [
                ...r.campaign!.ledger,
                ledgerEntry(-refund, `Closed with ${open} unpicked slot${open === 1 ? "" : "s"}: ${open} × ${money(request.campaign!.pricePerVideo)} refunded`),
              ]
            : r.campaign!.ledger,
        },
      })),
    }));
  },

  /**
   * Demo control ("Skip 7 days"). The demo clock is fixed (lib/clock.ts `NOW`), so this button
   * stands in for a week passing on every pending campaign slot:
   * - a verified post that is still live: its pay is released (7 days after verification);
   * - a post that came down and wasn't restored within 48 hours: the slot ends, its money goes back
   *   to the campaign and the slot reopens (refunded to the card if the campaign is closed);
   * - a post not made or not verified yet: still pending, it has no date until it's verified.
   */
  /**
   * Returns listed prices released, returned and still waiting, and `mine`: what the signed-in
   * account's own creator profile received (its net, after Yapp's fee).
   */
  skipSevenDays(): { released: number; returned: number; waiting: number; mine: number } {
    load();
    let released = 0;
    let returned = 0;
    let waiting = 0;
    /** Released to the signed-in account's own creator profile, net of the fee. */
    let mine = 0;
    update((s) => {
      let next: DemoState = s;
      const me = activeIds(s);
      const due = s.commissions.filter((c) => c.source === "campaign" && c.payment.status === "pending");
      for (const c of due) {
        if (c.post?.status === "live" && c.post.verifiedAt) {
          const totals = priceBreakdown(c.price, c.addons, c.feeRate);
          released += totals.total;
          if (c.creatorId === me.creatorId) mine += totals.creatorEarns;
          next = {
            ...next,
            commissions: replaceById(next.commissions, c.id, (x) => ({
              ...x,
              payment: { ...x.payment, status: "released" },
              events: [
                ...x.events,
                event(
                  "payout_available",
                  "system",
                  `${CAMPAIGN_RELEASE_DAYS} days since the post was verified, and it's still up: ${moneyExact(totals.total)} released (${nameOfCreator(s, x.creatorId)} receives ${moneyExact(totals.creatorEarns)} after the ${FEE_PCT}% Yapp fee)`,
                ),
              ],
            })),
          };
          next = notifyParty(next, { creatorId: c.creatorId }, "payment", "", paths.wallet, {
            key: "campaign:released",
            text: (n) => (n === 1 ? `${moneyExact(totals.creatorEarns)} from "${c.title}" is ready to withdraw` : `${n} campaign payments are ready to withdraw`),
          });
        } else if (c.post?.status === "removed") {
          returned += priceBreakdown(c.price, c.addons, c.feeRate).total;
          next = returnRemovedSlot(next, c.id);
        } else {
          waiting += priceBreakdown(c.price, c.addons, c.feeRate).total;
        }
      }
      return next;
    });
    return { released, returned, waiting, mine };
  },

  /* ----------------------------------------------------------- messages */

  sendMessage(threadId: string, from: Role, text: string, attachment?: Attachment) {
    update((s) => appendMessage(s, threadId, { from, text, attachment }, other(from)));
    scheduleReply(threadId, other(from), text);
  },

  /** Open (or reuse) a conversation between the signed-in account's buyer profile and a creator. */
  /**
   * Open (or reuse) a conversation between a buyer profile and a creator. V2: a creator asking a
   * brand about its order passes `from: "creator"` and the brand's `businessId`.
   */
  startThread(input: {
    creatorId: string;
    subject: string;
    text: string;
    requestId?: string;
    from?: Role;
    businessId?: string;
  }): string {
    let threadId = "";
    const from = input.from ?? "business";
    update((s) => {
      const [next, id] = ensureThread(s, {
        businessId: input.businessId ?? activeIds(s).businessId,
        creatorId: input.creatorId,
        requestId: input.requestId,
        subject: input.subject,
      });
      threadId = id;
      return appendMessage(next, id, { from, text: input.text }, other(from));
    });
    scheduleReply(threadId, other(from), input.text);
    return threadId;
  },

  markThreadRead(threadId: string, role: Role) {
    const thread = state.threads.find((t) => t.id === threadId);
    if (!thread || !thread.unread.includes(role)) return;
    update((s) => ({
      ...s,
      threads: replaceById(s.threads, threadId, (t) => ({ ...t, unread: t.unread.filter((r) => r !== role) })),
    }));
  },

  /* ------------------------------------------------------ notifications */

  markNotificationRead(id: string) {
    update((s) => ({
      ...s,
      notifications: replaceById(s.notifications, id, (n) => ({ ...n, unread: false })),
    }));
  },

  /** Mark all of the signed-in account's notifications read. */
  markAllNotificationsRead() {
    update((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.accountId === s.activeAccountId ? { ...n, unread: false } : n)),
    }));
  },

  /* ---------------------------------------------------- creator profile */

  updateCreator(creatorId: string, patch: Partial<Creator>) {
    update((s) => ({ ...s, creators: replaceById(s.creators, creatorId, (c) => ({ ...c, ...patch })) }));
  },

  addPortfolioVideo(creatorId: string, video: Omit<Video, "id" | "creatorId">): string {
    const id = uid("v");
    update((s) => ({
      ...s,
      videos: [{ ...video, id, creatorId }, ...s.videos],
      creators: replaceById(s.creators, creatorId, (c) => ({
        ...c,
        portfolioIds: [id, ...c.portfolioIds],
        featuredVideoId: c.featuredVideoId || id,
      })),
    }));
    return id;
  },

  removePortfolioVideo(creatorId: string, videoId: string) {
    update((s) => ({
      ...s,
      creators: replaceById(s.creators, creatorId, (c) => ({
        ...c,
        portfolioIds: c.portfolioIds.filter((id) => id !== videoId),
        featuredVideoId: c.featuredVideoId === videoId ? (c.portfolioIds.find((id) => id !== videoId) ?? "") : c.featuredVideoId,
      })),
    }));
  },

  reorderPortfolio(creatorId: string, portfolioIds: string[]) {
    update((s) => ({ ...s, creators: replaceById(s.creators, creatorId, (c) => ({ ...c, portfolioIds })) }));
  },

  /* ----------------------------------------------------------- business */

  updateBusiness(businessId: string, patch: Partial<Business>) {
    update((s) => ({ ...s, businesses: replaceById(s.businesses, businessId, (b) => ({ ...b, ...patch })) }));
  },

  updateMember(memberId: string, patch: Partial<TeamMember>) {
    update((s) => ({ ...s, team: replaceById(s.team, memberId, (m) => ({ ...m, ...patch })) }));
  },

  inviteMember(input: { name: string; email: string; title: string }): string {
    const id = uid("m");
    update((s) => ({ ...s, team: [...s.team, { ...input, id, businessId: activeIds(s).businessId }] }));
    return id;
  },

  removeMember(memberId: string) {
    update((s) => ({ ...s, team: s.team.filter((m) => m.id !== memberId) }));
  },

  /* -------------------------------------------------------------- money */

  /** Add a card to the signed-in account's buyer profile. */
  addPaymentMethod(input: Omit<PaymentMethod, "id" | "isDefault" | "businessId">, makeDefault = false): string {
    const id = uid("pm");
    update((s) => {
      const businessId = activeIds(s).businessId;
      const mine = s.paymentMethods.filter((m) => m.businessId === businessId);
      return {
        ...s,
        paymentMethods: [
          ...s.paymentMethods.map((m) => (makeDefault && m.businessId === businessId ? { ...m, isDefault: false } : m)),
          { ...input, id, businessId, isDefault: makeDefault || mine.length === 0 },
        ],
      };
    });
    return id;
  },

  removePaymentMethod(id: string) {
    update((s) => {
      const removed = s.paymentMethods.find((m) => m.id === id);
      let rest = s.paymentMethods.filter((m) => m.id !== id);
      const mine = rest.filter((m) => m.businessId === removed?.businessId);
      if (mine.length && !mine.some((m) => m.isDefault)) {
        rest = rest.map((m) => (m.id === mine[0].id ? { ...m, isDefault: true } : m));
      }
      return { ...s, paymentMethods: rest };
    });
  },

  setDefaultPaymentMethod(id: string) {
    update((s) => {
      const target = s.paymentMethods.find((m) => m.id === id);
      return {
        ...s,
        paymentMethods: s.paymentMethods.map((m) =>
          m.businessId === target?.businessId ? { ...m, isDefault: m.id === id } : m,
        ),
      };
    });
  },

  /** Add a payout destination to the signed-in account's creator profile. */
  addPayoutMethod(input: Omit<PayoutMethod, "id" | "isDefault" | "creatorId">): string {
    const id = uid("po");
    update((s) => {
      const creatorId = activeIds(s).creatorId ?? "";
      const mine = s.payoutMethods.filter((m) => m.creatorId === creatorId);
      return { ...s, payoutMethods: [...s.payoutMethods, { ...input, id, creatorId, isDefault: mine.length === 0 }] };
    });
    return id;
  },

  removePayoutMethod(id: string) {
    update((s) => {
      const removed = s.payoutMethods.find((m) => m.id === id);
      let rest = s.payoutMethods.filter((m) => m.id !== id);
      const mine = rest.filter((m) => m.creatorId === removed?.creatorId);
      if (mine.length && !mine.some((m) => m.isDefault)) {
        rest = rest.map((m) => (m.id === mine[0].id ? { ...m, isDefault: true } : m));
      }
      return { ...s, payoutMethods: rest };
    });
  },

  setDefaultPayoutMethod(id: string) {
    update((s) => {
      const target = s.payoutMethods.find((m) => m.id === id);
      return {
        ...s,
        payoutMethods: s.payoutMethods.map((m) =>
          m.creatorId === target?.creatorId ? { ...m, isDefault: m.id === id } : m,
        ),
      };
    });
  },

  requestPayout(amount: number, methodId: string): string {
    const id = uid("pay");
    update((s) => ({
      ...s,
      payouts: [{ id, creatorId: activeIds(s).creatorId ?? "", amount, methodId, status: "processing", at: nowStamp() }, ...s.payouts],
    }));
    return id;
  },

  /* ----------------------------------------------------------- settings */

  /** Update the signed-in account's settings for one side (ordering or making). */
  updateSettings<R extends Role>(role: R, patch: Partial<Settings[R]>) {
    update((s) => {
      const accountId = s.activeAccountId;
      const current = s.settings[accountId] ?? s.settings[seedData.DEFAULT_ACCOUNT_ID];
      return {
        ...s,
        settings: { ...s.settings, [accountId]: { ...current, [role]: { ...current[role], ...patch } } },
      };
    });
  },
};

/**
 * Every mutation the interface may make. In preview mode (lib/preview.ts) each one is refused: it
 * does nothing, touches no storage, and returns `undefined` whatever its type says, so a preview
 * page should hide controls that call actions (`usePreviewMode()`).
 */
export const actions: typeof liveActions = Object.fromEntries(
  Object.entries(liveActions).map(([name, fn]) => [
    name,
    (...args: unknown[]) => {
      if (isPreviewMode()) {
        if (process.env.NODE_ENV !== "production") console.info(`[preview] actions.${name} refused`);
        return undefined;
      }
      return (fn as (...a: unknown[]) => unknown)(...args);
    },
  ]),
) as typeof liveActions;

/** Tell demo creators about a new open order they can act on (invited, or public and eligible). */
function notifyDemoCreatorsOfRequest(s: DemoState, request: ContentRequest): DemoState {
  let next = s;
  for (const account of s.accounts) {
    if (!account.creatorId || account.businessId === request.businessId) continue;
    const creatorId = account.creatorId;
    if (isCampaign(request)) {
      const creator = s.creators.find((c) => c.id === creatorId);
      if (!eligibility(s, creator, request).ok) continue;
      next = notifyParty(
        next,
        { creatorId },
        "campaign",
        `New UGC campaign for you: "${request.title}". ${money(request.campaign!.pricePerVideo)} per Yapp · you earn ${moneyExact(creatorNet(request.campaign!.pricePerVideo, CAMPAIGN_FEE_RATE))}, ${request.slots} slots open on ${platformList(request.campaign!.platforms)}.`,
        paths.order(request.id),
      );
      continue;
    }
    const invited = request.invitedCreatorIds.includes(creatorId);
    if (!invited && request.visibility !== "public") continue;
    next = notifyParty(
      next,
      { creatorId },
      "request",
      invited
        ? `${nameOfBusiness(s, request.businessId)} invited you to pitch: ${request.title}`
        : `New custom order that fits you: ${request.title}`,
      paths.order(request.id),
    );
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Simulation tick (campaigns)                                                 */
/* -------------------------------------------------------------------------- */

const SIM_LOCK_KEY = "yapp2-sim-lock";
const tabId = typeof window === "undefined" ? "server" : Math.random().toString(36).slice(2);

/** Only one visible tab drives the simulation, so two tabs never double-accept a slot. */
function holdsSimLock(): boolean {
  try {
    if (document.visibilityState !== "visible") return false;
    const raw = window.localStorage.getItem(SIM_LOCK_KEY);
    const lock = raw ? (JSON.parse(raw) as { tab: string; at: number }) : null;
    const now = Date.now();
    if (!lock || lock.tab === tabId || now - lock.at > 6000) {
      window.localStorage.setItem(SIM_LOCK_KEY, JSON.stringify({ tab: tabId, at: now }));
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

const SIM_JOIN_MS = 6_000;
const SIM_DELIVER_MS = 16_000;
const SIM_POST_MS = 10_000;
const SIM_VERIFY_MS = 2_500;

/**
 * Moves campaigns created in this browser along: other creators take slots (stopping one short
 * while a demo creator could still join), upload review copies, redo them after changes, and post
 * approved videos. Post verification runs for everyone, demo creators included. Resumable: it
 * reads state each tick, so a reload picks up where it left off. Mounted by <AppRoot>.
 */
export function simulationTick() {
  if (typeof window === "undefined") return;
  load();
  // Preview mode never moves (and never touches the lock in localStorage).
  if (isPreviewMode() || !holdsSimLock()) return;
  const now = peekNow();
  const since = (iso?: string) => (iso ? now - Date.parse(iso) : Number.POSITIVE_INFINITY);

  // 1. Verify posts that are being checked (any creator).
  for (const c of state.commissions) {
    if (c.source === "campaign" && c.post?.status === "checking" && since(c.post.at) > SIM_VERIFY_MS) {
      verifyPost(c.id);
      return;
    }
  }

  for (const request of state.requests) {
    const terms = request.campaign;
    if (!terms?.simulate) continue;
    const history = slotHistory(state, request.id);

    // 2. Simulated creators work on their slots.
    for (const c of history) {
      if (isDemoCreator(state, c.creatorId) || !occupiesSlot(c)) continue;
      const lastEvent = c.events[c.events.length - 1]?.at;
      if (c.status === "in_progress" && c.deliveries.length === 0 && since(c.acceptedAt) > SIM_DELIVER_MS) {
        simulatedUpload(c);
        return;
      }
      if (c.status === "revision" && since(lastEvent) > SIM_DELIVER_MS) {
        simulatedUpload(c);
        return;
      }
      if (c.status === "completed" && c.post?.status === "due" && since(c.completedAt) > SIM_POST_MS) {
        actions.submitPost(c.id, simulatedPostUrl(c, request, state.creators.find((x) => x.id === c.creatorId)?.handle ?? "creator"));
        return;
      }
    }

    // 3. Another creator takes an open slot.
    if (request.status !== "open") continue;
    const open = openSlotNumbers(state, request).length;
    const demoCouldJoin = state.accounts.some((a) => {
      if (!a.creatorId || a.businessId === request.businessId) return false;
      const creator = state.creators.find((c) => c.id === a.creatorId);
      return eligibility(state, creator, request).ok;
    });
    if (open <= (demoCouldJoin ? 1 : 0)) continue;
    const lastJoin = history.reduce((latest, c) => Math.max(latest, Date.parse(c.createdAt)), Date.parse(request.postedAt));
    if (now - lastJoin < SIM_JOIN_MS) continue;
    const candidates = state.creators
      .filter((c) => !isDemoCreator(state, c.id) && eligibility(state, c, request).ok)
      .sort((a, b) => hashString(`${request.id}:${a.id}`) - hashString(`${request.id}:${b.id}`));
    if (candidates[0]) {
      actions.acceptCampaignSlot(request.id, candidates[0].id);
      return;
    }
  }
}

/** A link of the right shape for the slot's platform. */
function simulatedPostUrl(c: Commission, request: ContentRequest, handle: string): string {
  const n = 7300000000 + (hashString(c.id) % 99999);
  switch (slotPlatform(c, request)) {
    case "instagram":
      return `https://www.instagram.com/reel/C${n.toString(36)}/`;
    case "snapchat":
      return `https://www.snapchat.com/spotlight/${n.toString(36)}`;
    default:
      return `https://www.tiktok.com/@${handle}/video/${n}`;
  }
}

function simulatedUpload(c: Commission) {
  const version = c.deliveries.length + 1;
  actions.deliver({
    commissionId: c.id,
    note:
      version === 1
        ? "Review copy is up (watermarked). I kept it natural and hit every talking point."
        : `Version ${version} is up. I fixed what you asked for.`,
    files: [{ name: `review_copy_v${version}.mp4`, size: `${(9 + version * 1.4).toFixed(1)} MB`, kind: "video" }],
  });
  // Open comments on the previous version are marked resolved by `deliver` itself.
}

/**
 * Simulated read-only check of the post: tag and paid-partnership disclosure found. The first
 * verification sets the release date (7 days later); a restored post keeps it.
 */
function verifyPost(commissionId: string) {
  update((s) => {
    const c = s.commissions.find((x) => x.id === commissionId);
    if (!c?.post) return s;
    const request = c.requestId ? s.requests.find((r) => r.id === c.requestId) : undefined;
    const handle = request?.campaign ? brandHandleFor(request.campaign, slotPlatform(c, request)) : "the brand";
    const verifiedAt = c.post.verifiedAt ?? nowStamp();
    const releaseOn = c.withdrawableFrom ?? addDays(verifiedAt, CAMPAIGN_RELEASE_DAYS);
    let next: DemoState = {
      ...s,
      commissions: replaceById(s.commissions, commissionId, (x) => ({
        ...x,
        post: { ...x.post!, status: "live", verifiedAt, removedAt: undefined, tagFound: true, disclosureFound: true },
        withdrawableFrom: releaseOn,
        events: [...x.events, event("post_verified", "system", `Post verified: ${handle} tagged, paid partnership label on`)],
      })),
    };
    next = notifyParty(next, { creatorId: c.creatorId }, "campaign", `Your post for "${c.title}" is verified. Your ${moneyExact(priceBreakdown(c.price, c.addons, c.feeRate).creatorEarns)} is released on ${shortDate(releaseOn)} if it's still up.`, paths.commission(c.id));
    if (c.requestId) {
      next = notifyParty(next, { businessId: c.businessId }, "campaign", "", paths.order(c.requestId), {
        key: `campaign:${c.requestId}:posted`,
        text: (n) =>
          n === 1
            ? `${nameOfCreator(s, c.creatorId)} posted their video for "${c.title}" (tag and disclosure verified)`
            : `${n} videos for "${c.title}" are live (tag and disclosure verified)`,
      });
    }
    return next;
  });
}

/** Format label for event texts built outside this file. */
export const formatName = (id: Brief["format"]) => formatById[id]?.name ?? id;

/** Campaign money for a request id (convenience for event texts). */
export const campaignHeld = (s: DemoState, requestId: string) => {
  const request = s.requests.find((r) => r.id === requestId);
  return request ? campaignMoney(s, request).held : 0;
};
