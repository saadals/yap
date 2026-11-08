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

import { campaignMoney, eligibility, isCampaign, occupiesSlot, openSlotNumbers, slotHistory } from "./campaigns";
import { HOUR, NOW, at, endOfMonth, monthKey } from "./clock";
import { maskContacts } from "./contact";
import * as seedData from "./data";
import { money, priceBreakdown } from "./format";
import { hashString } from "./hash";
import { paths } from "./paths";
import {
  AUTO_APPROVE_DAYS,
  CAMPAIGN_FEE_RATE,
  SERVICE_FEE_RATE,
  formatById,
  tierById,
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
  ContentRequest,
  Creator,
  CreatorKind,
  Delivery,
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
  Video,
} from "./types";

const STORAGE_KEY = "yapp-demo-v1";
/** Tab-local signed-in account (sessionStorage) and the cross-tab default (cookie). */
const SESSION_KEY = "yapp-account";
export const ACCOUNT_COOKIE = "yapp_account";
const VERSION = 3;

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
  /** Request wizard autosave, per account. */
  requestDrafts: Record<string, RequestDraft | null>;
  /** Orders an account dismissed from its feed and Explore, per account. */
  hidden: Record<string, string[]>;
  /** Months closed with the demo "Jump to month end" control ("2026-11"). */
  closedMonths: string[];
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
    hidden: {},
    closedMonths: [],
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

function load() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
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
  if (typeof window === "undefined") return;
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
  set(fn(state));
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
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

/** Handles a thread may mention (the campaign's brand account creators must tag). */
function allowedHandles(s: DemoState, threadId: string): string[] {
  const thread = s.threads.find((t) => t.id === threadId);
  const request = thread?.requestId ? s.requests.find((r) => r.id === thread.requestId) : undefined;
  return request?.campaign ? [request.campaign.brandHandle] : [];
}

function appendMessage(
  s: DemoState,
  threadId: string,
  message: Omit<Message, "id" | "at">,
  unreadFor?: Role,
): DemoState {
  const text =
    message.from === "system" ? message.text : maskContacts(message.text, allowedHandles(s, threadId)).text;
  const full: Message = { ...message, text, id: uid("m"), at: nowStamp() };
  return {
    ...s,
    threads: replaceById(s.threads, threadId, (thread) => ({
      ...thread,
      messages: [...thread.messages, full],
      unread:
        unreadFor && !thread.unread.includes(unreadFor)
          ? [...thread.unread, unreadFor]
          : thread.unread,
    })),
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
/* Simulated replies                                                           */
/* -------------------------------------------------------------------------- */

const creatorReplies: [RegExp, string][] = [
  [/deadline|date|when|time|late|sooner/i, "That works for me. I'll keep you posted if anything moves, but I'm on track."],
  [/price|budget|cost|\$|discount/i, "Happy to make that work. If you need it cheaper I can drop the extra hooks and keep the main cut."],
  [/script|hook|line|say|wording/i, "Good call. I'll draft the opening two ways and you can pick the one you like in the next version."],
  [/access|login|account|demo/i, "Got it, I'm in. The demo account has everything I need for the screen part."],
  [/thank|great|love|perfect|amazing/i, "Thank you! That means a lot. Really enjoyed working on this one."],
  [/\?/, "Good question. Short answer: yes. I'll show you in the next version so it's easier to judge."],
];
const businessReplies: [RegExp, string][] = [
  [/deliver|draft|version|uploaded|ready/i, "Amazing, thank you. We'll review it today and come back with notes."],
  [/access|login|account|demo/i, "Sent the demo login to your email. Shout if anything doesn't work."],
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
    actions.deliver({
      commissionId,
      note:
        version === 1
          ? "Version 1 is ready! I kept the opening tight and showed the app within the first few seconds. Let me know what you think."
          : `Version ${version} is up. I worked through every note you left; each one is marked resolved.`,
      files: [
        { name: `${slug || "video"}_v${version}_${c.brief.aspect.replace(":", "x")}.mp4`, size: `${(38 + version * 3.4).toFixed(1)} MB` },
      ],
    });
    if (version > 1) {
      const latest = state.commissions.find((x) => x.id === commissionId)?.deliveries;
      const previous = latest?.[latest.length - 2];
      previous?.comments.forEach((comment) =>
        actions.updateComment(commissionId, previous.id, comment.id, { resolved: true }),
      );
    }
  }, delayMs);
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

export type NewRequestInput = {
  title: string;
  brief: Brief;
  budget: { min: number; max: number };
  dueDate: string;
  visibility: "public" | "invite";
  invitedCreatorIds: string[];
  preferredKinds: CreatorKind[];
  slots?: number;
  status?: "open" | "draft";
};

export type CampaignInput = {
  title: string;
  productId: string;
  /** Talking points (brief.mustInclude) and restrictions (brief.avoid) live on the brief. */
  brief: Partial<Brief> & { mustInclude: string[]; avoid: string[] };
  videos: number;
  tierId: FollowerTierId;
  platform: CampaignPlatformId;
  brandHandle: string;
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
  | { ok: true; commissionId: string; slot: number }
  | { ok: false; reason: string };

const mask = (text: string, allow: string[] = []) => maskContacts(text, allow).text;

function campaignBrief(input: CampaignInput, product: Product | undefined): Brief {
  return {
    productId: input.productId,
    format: "ugc-review",
    platforms: [input.platform],
    languages: input.brief.languages?.length ? input.brief.languages : ["ar-saudi", "ar-gulf"],
    aspect: "9:16",
    videoCount: 1,
    durationSec: input.brief.durationSec ?? 30,
    audience: input.brief.audience ?? product?.audience ?? "",
    goal: input.brief.goal ?? "",
    keyMessage: input.brief.keyMessage ?? product?.oneLiner ?? "",
    mustInclude: input.brief.mustInclude,
    avoid: input.brief.avoid,
    references: [],
    onCamera: true,
    addons: [],
    notes: input.brief.notes,
  };
}

/** Ledger entry when a slot reopens and its old price differs from the current tier price. */
function repriceOnReopen(request: ContentRequest, oldPrice: number): LedgerEntry | undefined {
  const terms = request.campaign;
  if (!terms || terms.pricePerVideo === oldPrice) return undefined;
  const diff = terms.pricePerVideo - oldPrice;
  return {
    id: uid("lg"),
    at: nowStamp(),
    kind: diff > 0 ? "top_up" : "refund",
    amount: Math.abs(diff),
    note: `Slot reopened at the current tier price (${money(terms.pricePerVideo)})`,
  };
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

export const actions = {
  /** Restore the original seed (clears everything done in this browser). Keeps this tab's account. */
  reset() {
    lastStamp = NOW;
    counters = {};
    try {
      // Other prototype-only keys (e.g. billing details) live beside the main state.
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith("yapp-") && key !== STORAGE_KEY)
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
        cityId: input.cityId ?? "riyadh",
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

  /** Turn a personal buyer profile into a business account (company details, VAT, team). */
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

  createRequest(input: NewRequestInput): string {
    const id = uid("r");
    update((s) => {
      const me = activeIds(s);
      const request: ContentRequest = {
        id,
        businessId: me.businessId,
        title: input.title,
        brief: input.brief,
        budget: input.budget,
        dueDate: input.dueDate,
        postedAt: nowStamp(),
        status: input.status ?? "open",
        visibility: input.visibility,
        invitedCreatorIds: input.invitedCreatorIds,
        preferredKinds: input.preferredKinds,
        slots: input.slots ?? 1,
        views: 0,
        kind: "custom",
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
      const next = { ...s, requests: replaceById(s.requests, id, (r) => ({ ...r, ...patch })) };
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
      let next: DemoState = {
        ...s,
        requests: replaceById(s.requests, id, (r) => ({ ...r, status: "open", postedAt: nowStamp() })),
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
        paths.order(request.id),
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

  /** Hire from a pitch: payment is secured immediately and work starts. */
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
        // Starts when the creator is free (booked creators can be hired for later).
        dueDate: at(
          pitch.deliveryDays +
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
        event("funded", "system", `${money(totals.total, true)} secured. Released only when you approve the work.`),
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
        text: `${nameOfBusiness(s, request.businessId)} hired ${creator?.firstName ?? "the creator"}. Payment of ${money(totals.total, true)} is secured and released when the work is approved.`,
      });
      if (input.note?.trim()) {
        next = appendMessage(next, threadId, { from: "business", text: input.note.trim() }, "creator");
      }
      next = notifyParty(next, { creatorId: pitch.creatorId }, "offer", `You're hired! ${nameOfBusiness(s, request.businessId)} accepted your pitch`, paths.commission(commissionId));
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
        event("funded", "system", `${money(totals.total, true)} authorised on your card. You're only charged if they accept.`),
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
      next = notifyParty(next, { creatorId: input.creatorId }, "offer", `${nameOfBusiness(s, me.businessId)} sent you an offer: ${input.title} (${money(input.price + input.addons.reduce((a, b) => a + b.price, 0))})`, paths.commission(commissionId));
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
            event("funded", "system", "Payment secured. Released when the work is approved."),
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
              ? `Thanks for the offer! I'm in. I'll read through the brief tonight and send any questions before I start filming.`
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
      next = appendMessage(next, c.threadId, { from: "system", text: `Offer declined. The authorisation on your card was released.` }, "business");
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
        events: [...x.events, event("cancelled", "business", "Offer withdrawn. Card authorisation released.")],
      })),
    }));
  },

  /* -------------------------------------------------------- production */

  /** Creator uploads a new version for review (campaigns: a watermarked review copy). */
  deliver(input: {
    commissionId: string;
    note: string;
    files: { name: string; size: string }[];
    video?: Partial<Video>;
  }): string {
    const deliveryId = uid("d");
    update((s) => {
      const c = findCommission(s, input.commissionId);
      const creator = s.creators.find((x) => x.id === c.creatorId);
      const previous = c.deliveries[c.deliveries.length - 1];
      const ownVideos = s.videos.filter((v) => v.creatorId === c.creatorId);
      const template =
        previous?.video ??
        ownVideos.find((v) => v.format === c.brief.format) ??
        s.videos.find((v) => v.id === creator?.featuredVideoId) ??
        ownVideos[0] ??
        s.videos[0];
      const product = s.products.find((p) => p.id === c.brief.productId);
      const campaign = c.source === "campaign";
      // A new delivery has no performance yet (portfolio templates carry views).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { stats, ...base } = template;
      const video: Video = {
        ...base,
        id: uid("v"),
        creatorId: c.creatorId,
        title: `${product?.name ?? c.title} — ${campaign ? "review copy " : ""}v${c.deliveries.length + 1}`,
        format: c.brief.format,
        aspect: c.brief.aspect,
        madeFor: nameOfBusiness(s, c.businessId),
        durationSec: Math.min(Math.max(c.brief.durationSec, 8), 180),
        ...input.video,
      };
      const delivery: Delivery = {
        id: deliveryId,
        version: c.deliveries.length + 1,
        video,
        note: mask(input.note),
        deliveredAt: nowStamp(),
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
          deliveries: [...x.deliveries, delivery],
          events: [
            ...x.events,
            event("delivered", "creator", campaign ? `Review copy uploaded (version ${delivery.version})` : `Version ${delivery.version} delivered`),
          ],
        })),
      };
      // Campaign review copies live on the slot's page; posting each one to the inbox would flood
      // the business with one thread per creator.
      if (!campaign) {
        next = appendMessage(
          next,
          c.threadId,
          {
            from: "creator",
            text: input.note || `Version ${delivery.version} is up for review.`,
            attachment: { kind: "video", name: input.files[0]?.name ?? `${video.title}.mp4`, size: input.files[0]?.size, videoId: video.id },
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

  addComment(commissionId: string, deliveryId: string, input: { atSec: number; text: string; author: Role }) {
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (c) => ({
        ...c,
        deliveries: replaceById(c.deliveries, deliveryId, (d) => ({
          ...d,
          comments: [
            ...d.comments,
            { id: uid("dc"), atSec: input.atSec, text: mask(input.text), author: input.author, resolved: false, createdAt: nowStamp() },
          ].sort((a, b) => a.atSec - b.atSec),
        })),
      })),
    }));
  },

  updateComment(commissionId: string, deliveryId: string, commentId: string, patch: { text?: string; resolved?: boolean }) {
    const clean = patch.text !== undefined ? { ...patch, text: mask(patch.text) } : patch;
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (c) => ({
        ...c,
        deliveries: replaceById(c.deliveries, deliveryId, (d) => ({
          ...d,
          comments: replaceById(d.comments, commentId, (m) => ({ ...m, ...clean })),
        })),
      })),
    }));
  },

  removeComment(commissionId: string, deliveryId: string, commentId: string) {
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (c) => ({
        ...c,
        deliveries: replaceById(c.deliveries, deliveryId, (d) => ({
          ...d,
          comments: d.comments.filter((m) => m.id !== commentId),
        })),
      })),
    }));
  },

  /** Business asks for changes on the latest delivery (uses its timestamped comments). */
  requestRevision(commissionId: string, note: string) {
    update((s) => {
      const c = findCommission(s, commissionId);
      const latest = c.deliveries[c.deliveries.length - 1];
      if (!latest) return s;
      const count = latest.comments.filter((m) => !m.resolved).length;
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "revision",
          autoApproveAt: undefined,
          revisionsUsed: x.revisionsUsed + 1,
          dueDate: Date.parse(x.dueDate) < Date.parse(at(2)) ? at(2, "18:00") : x.dueDate,
          deliveries: replaceById(x.deliveries, latest.id, (d) => ({ ...d, status: "changes_requested" })),
          events: [
            ...x.events,
            event("revision_requested", "business", `Changes requested on version ${latest.version}${count ? ` (${count} note${count === 1 ? "" : "s"})` : ""}`),
          ],
        })),
      };
      next = appendMessage(
        next,
        c.threadId,
        { from: "business", text: note || `Left ${count} note${count === 1 ? "" : "s"} on version ${latest.version}. Thank you!` },
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
  },

  /**
   * Approve the latest delivery. Custom and direct work: payment is released to the creator.
   * Campaign slots: the full-quality file unlocks for the business and the price moves to the
   * creator's wallet as pending until month end (and only if the post stays up).
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
                withdrawableFrom: endOfMonth(completedAt),
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
                ? `${money(c.price)} added to ${nameOfCreator(s, x.creatorId)}'s wallet as pending`
                : `${money(totals.creatorEarns)} released to ${nameOfCreator(s, x.creatorId)}`,
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
          `Approved! ${money(c.price)} is in your wallet as pending. Post it with ${request?.campaign?.brandHandle ?? "the brand tag"} to unlock it at month end.`,
          paths.commission(c.id),
        );
      } else {
        next = appendMessage(next, c.threadId, { from: "system", text: `Approved. ${money(totals.creatorEarns)} was released to ${nameOfCreator(s, c.creatorId)}.` }, "creator");
        next = notifyParty(next, { creatorId: c.creatorId }, "payment", `${money(totals.creatorEarns)} released by ${nameOfBusiness(s, c.businessId)}`, paths.wallet);
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

  /** Hold the full budget and publish a UGC campaign. Returns the new campaign id. */
  publishCampaign(input: CampaignInput): string {
    const id = uid("r");
    update((s) => {
      const me = activeIds(s);
      const tier = tierById[input.tierId];
      const product = s.products.find((p) => p.id === input.productId);
      const total = input.videos * tier.pricePerVideo;
      const request: ContentRequest = {
        id,
        businessId: me.businessId,
        title: input.title,
        brief: campaignBrief(input, product),
        budget: { min: tier.pricePerVideo, max: tier.pricePerVideo },
        dueDate: at(30, "18:00"),
        postedAt: nowStamp(),
        status: "open",
        visibility: "public",
        invitedCreatorIds: [],
        preferredKinds: [],
        slots: input.videos,
        views: 0,
        kind: "campaign",
        campaign: {
          tierId: input.tierId,
          pricePerVideo: tier.pricePerVideo,
          platform: input.platform,
          brandHandle: input.brandHandle.startsWith("@") ? input.brandHandle : `@${input.brandHandle}`,
          explainer: input.explainer,
          paymentMethodId: input.paymentMethodId,
          ledger: [
            {
              id: uid("lg"),
              at: nowStamp(),
              kind: "charge",
              amount: total,
              note: `${input.videos} videos × ${money(tier.pricePerVideo)} held`,
            },
          ],
          excludedCreatorIds: [],
          simulate: true,
        },
      };
      let next: DemoState = { ...s, requests: [request, ...s.requests] };
      next = notifyDemoCreatorsOfRequest(next, request);
      return next;
    });
    return id;
  },

  /** Take the first open slot on a campaign (first come, first served). */
  acceptCampaignSlot(requestId: string, creatorId?: string): TakeSlotResult {
    load();
    const who = creatorId ?? activeIds(state).creatorId;
    const request = state.requests.find((r) => r.id === requestId);
    const creator = who ? state.creators.find((c) => c.id === who) : undefined;
    if (!request || !request.campaign) return { ok: false, reason: "closed" };
    const check = eligibility(state, creator, request);
    if (!check.ok) return { ok: false, reason: check.reason };
    const slot = openSlotNumbers(state, request)[0];
    const commissionId = uid("c");
    update((s) => {
      const terms = request.campaign!;
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
        createdAt: nowStamp(),
        acceptedAt: nowStamp(),
        dueDate: at(14, "18:00"),
        deliveries: [],
        events: [event("slot_accepted", "creator", `Took slot ${slot}`)],
        threadId: ensured[1],
        payment: { status: "held", methodId: terms.paymentMethodId },
        campaignSlot: slot,
      };
      next = { ...next, commissions: [commission, ...next.commissions] };
      next = syncCampaignStatus(next, requestId);
      next = notifyParty(next, { businessId: request.businessId }, "campaign", "", paths.order(requestId), {
        key: `campaign:${requestId}:joined`,
        text: (n) =>
          n === 1
            ? `${creator!.firstName} took a slot on "${request.title}"`
            : `${n} creators took slots on "${request.title}"`,
      });
      return next;
    });
    return { ok: true, commissionId, slot };
  },

  /** Business removes an accepted creator before filming; the slot reopens for others. */
  removeCampaignCreator(commissionId: string, reason = "") {
    update((s) => {
      const c = findCommission(s, commissionId);
      const request = c.requestId ? s.requests.find((r) => r.id === c.requestId) : undefined;
      if (!request?.campaign || !occupiesSlot(c)) return s;
      const reprice = repriceOnReopen(request, c.price);
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "cancelled",
          cancelCode: "replaced",
          cancelReason: reason || undefined,
          autoApproveAt: undefined,
          payment: { ...x.payment, status: "returned" },
          events: [...x.events, event("creator_replaced", "business", "Removed from the campaign. The slot reopened for other creators.")],
        })),
        requests: replaceById(s.requests, request.id, (r) => ({
          ...r,
          campaign: {
            ...r.campaign!,
            excludedCreatorIds: [...new Set([...r.campaign!.excludedCreatorIds, c.creatorId])],
            ledger: reprice ? [...r.campaign!.ledger, reprice] : r.campaign!.ledger,
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

  /** Business rejects a review copy: the slot goes to another creator; the money stays held. */
  rejectCampaignVideo(commissionId: string, reason = "") {
    update((s) => {
      const c = findCommission(s, commissionId);
      const request = c.requestId ? s.requests.find((r) => r.id === c.requestId) : undefined;
      if (!request?.campaign || !occupiesSlot(c)) return s;
      const latest = c.deliveries[c.deliveries.length - 1];
      const reprice = repriceOnReopen(request, c.price);
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "cancelled",
          cancelCode: "video_rejected",
          cancelReason: mask(reason) || undefined,
          autoApproveAt: undefined,
          payment: { ...x.payment, status: "returned" },
          deliveries: latest ? replaceById(x.deliveries, latest.id, (d) => ({ ...d, status: "rejected" })) : x.deliveries,
          events: [
            ...x.events,
            event("video_rejected", "business", `Review copy rejected${reason ? `: ${reason}` : ""}. The slot reopened for another creator.`),
          ],
        })),
        requests: replaceById(s.requests, request.id, (r) => ({
          ...r,
          campaign: {
            ...r.campaign!,
            excludedCreatorIds: [...new Set([...r.campaign!.excludedCreatorIds, c.creatorId])],
            ledger: reprice ? [...r.campaign!.ledger, reprice] : r.campaign!.ledger,
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

  /** Creator posts the approved video on their own account; verification runs on the next tick. */
  submitPost(commissionId: string, url: string) {
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (x) => ({
        ...x,
        post: { status: "checking", url: url.trim(), at: nowStamp() },
        events: [...x.events, event("posted", "creator", "Posted on their account. Checking the tag and disclosure…")],
      })),
    }));
  },

  /** Demo control: pretend the creator took the post down (pending money stays locked). */
  markPostRemoved(commissionId: string) {
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (x) =>
        x.post ? { ...x, post: { ...x.post, status: "removed" } } : x,
      ),
    }));
  },

  /** Change the follower tier once after publishing. Taken slots keep their price. */
  changeCampaignTier(requestId: string, tierId: FollowerTierId): { ok: boolean; diff: number } {
    load();
    const request = state.requests.find((r) => r.id === requestId);
    const terms = request?.campaign;
    if (!request || !terms || terms.tierChangedAt || terms.tierId === tierId) return { ok: false, diff: 0 };
    const tier = tierById[tierId];
    const open = openSlotNumbers(state, request).length;
    const diff = (tier.pricePerVideo - terms.pricePerVideo) * open;
    update((s) => ({
      ...s,
      requests: replaceById(s.requests, requestId, (r) => ({
        ...r,
        budget: { min: tier.pricePerVideo, max: tier.pricePerVideo },
        campaign: {
          ...r.campaign!,
          tierId,
          previousTierId: r.campaign!.tierId,
          pricePerVideo: tier.pricePerVideo,
          tierChangedAt: nowStamp(),
          ledger:
            diff === 0
              ? r.campaign!.ledger
              : [
                  ...r.campaign!.ledger,
                  {
                    id: uid("lg"),
                    at: nowStamp(),
                    kind: diff > 0 ? "top_up" : "refund",
                    amount: Math.abs(diff),
                    note: `Tier changed to ${tier.label}: ${open} open slot${open === 1 ? "" : "s"} × ${money(Math.abs(tier.pricePerVideo - terms.pricePerVideo))}`,
                  },
                ],
        },
      })),
    }));
    return { ok: true, diff };
  },

  /** Stop new acceptances. Open slots are refunded; slots in progress carry on. */
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
                { id: uid("lg"), at: nowStamp(), kind: "refund", amount: refund, note: `Closed with ${open} open slot${open === 1 ? "" : "s"}: refunded` },
              ]
            : r.campaign!.ledger,
        },
      })),
    }));
  },

  /**
   * Demo control ("Jump to month end"): pending campaign earnings whose post is still live become
   * withdrawable. Earnings whose post was taken down stay locked.
   */
  closeMonth(): { released: number; locked: number } {
    load();
    const key = monthKey(new Date(peekNow()).toISOString());
    let released = 0;
    let locked = 0;
    update((s) => {
      let next: DemoState = { ...s, closedMonths: [...new Set([...s.closedMonths, key])] };
      const due = s.commissions.filter((c) => c.payment.status === "pending");
      for (const c of due) {
        if (c.post?.status === "live") {
          released += c.price;
          next = {
            ...next,
            commissions: replaceById(next.commissions, c.id, (x) => ({
              ...x,
              payment: { ...x.payment, status: "released" },
              events: [...x.events, event("payout_available", "system", `Month closed with the post still up: ${money(x.price)} is ready to withdraw`)],
            })),
          };
          next = notifyParty(next, { creatorId: c.creatorId }, "payment", "", paths.wallet, {
            key: `month:${key}:released`,
            text: (n) => (n === 1 ? `${money(c.price)} from "${c.title}" is ready to withdraw` : `${n} campaign payments are ready to withdraw`),
          });
        } else {
          locked += c.price;
        }
      }
      return next;
    });
    return { released, locked };
  },

  /* ----------------------------------------------------------- messages */

  sendMessage(threadId: string, from: Role, text: string, attachment?: Attachment) {
    update((s) => appendMessage(s, threadId, { from, text, attachment }, other(from)));
    scheduleReply(threadId, other(from), text);
  },

  /** Open (or reuse) a conversation between the signed-in account's buyer profile and a creator. */
  startThread(input: { creatorId: string; subject: string; text: string; requestId?: string; from?: Role }): string {
    let threadId = "";
    const from = input.from ?? "business";
    update((s) => {
      const [next, id] = ensureThread(s, {
        businessId: activeIds(s).businessId,
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
        `New campaign for you: "${request.title}". ${money(request.campaign!.pricePerVideo)} per yapp, ${request.slots} slots open.`,
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
        : `New request that fits you: ${request.title}`,
      paths.order(request.id),
    );
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Simulation tick (campaigns)                                                 */
/* -------------------------------------------------------------------------- */

const SIM_LOCK_KEY = "yapp-sim-lock";
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
  if (!holdsSimLock()) return;
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
        actions.submitPost(c.id, `https://www.tiktok.com/@${state.creators.find((x) => x.id === c.creatorId)?.handle ?? "creator"}/video/${7300000000 + (hashString(c.id) % 99999)}`);
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

function simulatedUpload(c: Commission) {
  const version = c.deliveries.length + 1;
  actions.deliver({
    commissionId: c.id,
    note:
      version === 1
        ? "Review copy is up (watermarked). I kept it natural and hit every talking point."
        : `Version ${version} is up. I fixed what you asked for.`,
    files: [{ name: `review_copy_v${version}.mp4`, size: `${(9 + version * 1.4).toFixed(1)} MB` }],
  });
  if (version > 1) {
    const previous = c.deliveries[c.deliveries.length - 1];
    previous?.comments.forEach((comment) => actions.updateComment(c.id, previous.id, comment.id, { resolved: true }));
  }
}

/** Simulated read-only check of the post: tag and paid-partnership disclosure found. */
function verifyPost(commissionId: string) {
  update((s) => {
    const c = s.commissions.find((x) => x.id === commissionId);
    if (!c?.post) return s;
    const request = c.requestId ? s.requests.find((r) => r.id === c.requestId) : undefined;
    const handle = request?.campaign?.brandHandle ?? "the brand";
    let next: DemoState = {
      ...s,
      commissions: replaceById(s.commissions, commissionId, (x) => ({
        ...x,
        post: { ...x.post!, status: "live", tagFound: true, disclosureFound: true },
        events: [...x.events, event("post_verified", "system", `Post verified: ${handle} tagged, paid partnership label on`)],
      })),
    };
    next = notifyParty(next, { creatorId: c.creatorId }, "campaign", `Your post for "${c.title}" is verified. ${money(c.price)} unlocks at month end if it stays up.`, paths.commission(c.id));
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
