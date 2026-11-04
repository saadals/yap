"use client";

/**
 * Prototype data store. No backend: the seed in lib/data is copied into module state, every flow
 * mutates it through `actions`, and the result is persisted to localStorage so the demo survives
 * reloads (Account menu → "Reset demo data" restores the seed).
 *
 * Read with `useDemo()` (whole snapshot, stable until something changes) and derive with the pure
 * helpers in lib/selectors.ts. Never mutate the snapshot directly.
 *
 * The business and the creator sides share this one store, so a pitch sent as the creator shows
 * up for the business, a delivery made as the creator shows up for review, and so on.
 */

import { useSyncExternalStore } from "react";

import { HOUR, NOW, at } from "./clock";
import * as seedData from "./data";
import { money, priceBreakdown } from "./format";
import { AUTO_APPROVE_DAYS, SERVICE_FEE_RATE, formatById } from "./taxonomy";
import type {
  AddonId,
  Attachment,
  Brief,
  Business,
  Commission,
  CommissionEvent,
  ContentRequest,
  Creator,
  CreatorKind,
  Delivery,
  Learning,
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
  TeamMember,
  Thread,
  Video,
} from "./types";

export const ME = seedData.ME;
const STORAGE_KEY = "yapp-demo-v1";
const VERSION = 2;

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
  savedCreatorIds: string[];
  settings: Settings;
  requestDraft: RequestDraft | null;
  /** Requests the creator dismissed from their Opportunities feed. */
  hiddenRequestIds: string[];
};

function fromSeed(): DemoState {
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  return {
    version: VERSION,
    epoch: 0,
    lastStamp: NOW,
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
    savedCreatorIds: clone(seedData.savedCreatorIds),
    settings: clone(seedData.settings),
    requestDraft: null,
    hiddenRequestIds: [],
  };
}

const seedState = fromSeed();
let state: DemoState = seedState;
let hydrated = false;
/** Monotonic runtime clock (ms); kept outside `state` so updates can't rewind it. */
let lastStamp = NOW;
const listeners = new Set<() => void>();

function load() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === VERSION) {
        state = parsed;
        lastStamp = Math.max(lastStamp, parsed.lastStamp ?? NOW);
        return;
      }
    }
  } catch {
    /* private mode or corrupt data: fall back to the seed */
  }
  state = { ...seedState, epoch: Date.now() };
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
  state = { ...next, lastStamp };
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
      state = JSON.parse(event.newValue) as DemoState;
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

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Runtime timestamp: NOW plus real elapsed time (capped), always after the previous stamp. */
function nowStamp(): string {
  const elapsed = state.epoch ? Math.min(Date.now() - state.epoch, 8 * HOUR) : 0;
  lastStamp = Math.max(NOW + elapsed, lastStamp + 1000);
  return new Date(lastStamp).toISOString();
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

function notify(
  s: DemoState,
  role: Role,
  kind: Notification["kind"],
  text: string,
  href: string,
): DemoState {
  const item: Notification = { id: uid("n"), role, kind, text, href, at: nowStamp(), unread: true };
  return { ...s, notifications: [item, ...s.notifications] };
}

function appendMessage(
  s: DemoState,
  threadId: string,
  message: Omit<Message, "id" | "at">,
  unreadFor?: Role,
): DemoState {
  const full: Message = { ...message, id: uid("m"), at: nowStamp() };
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
    if (!c || c.creatorId === ME.creatorId) return;
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

export const actions = {
  /** Restore the original seed (clears everything done in this browser). */
  reset() {
    lastStamp = NOW;
    try {
      // Other prototype-only keys (e.g. billing details) live beside the main state.
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith("yapp-") && key !== STORAGE_KEY)
        .forEach((key) => window.localStorage.removeItem(key));
    } catch {
      /* ignore */
    }
    set({ ...fromSeed(), epoch: Date.now() });
  },

  /* ------------------------------------------------------------ saved */

  toggleSavedCreator(creatorId: string): boolean {
    load();
    const saved = state.savedCreatorIds.includes(creatorId);
    update((s) => ({
      ...s,
      savedCreatorIds: saved
        ? s.savedCreatorIds.filter((id) => id !== creatorId)
        : [creatorId, ...s.savedCreatorIds],
    }));
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
        businessId: ME.businessId,
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
    update((s) => ({ ...s, requestDraft: draft ? { ...draft, savedAt: nowStamp() } : null }));
  },

  createRequest(input: NewRequestInput): string {
    const id = uid("r");
    update((s) => {
      const request: ContentRequest = {
        id,
        businessId: ME.businessId,
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
      };
      let next: DemoState = { ...s, requests: [request, ...s.requests], requestDraft: null };
      if (request.status === "open" && (input.invitedCreatorIds.includes(ME.creatorId) || input.visibility === "public")) {
        next = notify(
          next,
          "creator",
          "request",
          input.invitedCreatorIds.includes(ME.creatorId)
            ? `${nameOfBusiness(s, ME.businessId)} invited you to pitch: ${input.title}`
            : `New request that fits you: ${input.title}`,
          `/creator/opportunities/${id}`,
        );
      }
      return next;
    });
    return id;
  },

  updateRequest(id: string, patch: Partial<ContentRequest>) {
    update((s) => ({ ...s, requests: replaceById(s.requests, id, (r) => ({ ...r, ...patch })) }));
  },

  publishDraft(id: string) {
    update((s) => {
      const request = s.requests.find((r) => r.id === id);
      let next: DemoState = {
        ...s,
        requests: replaceById(s.requests, id, (r) => ({ ...r, status: "open", postedAt: nowStamp() })),
      };
      if (request && (request.visibility === "public" || request.invitedCreatorIds.includes(ME.creatorId))) {
        next = notify(
          next,
          "creator",
          "request",
          request.invitedCreatorIds.includes(ME.creatorId)
            ? `${nameOfBusiness(s, request.businessId)} invited you to pitch: ${request.title}`
            : `New request that fits you: ${request.title}`,
          `/creator/opportunities/${id}`,
        );
      }
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
      if (creatorId === ME.creatorId) {
        next = notify(
          next,
          "creator",
          "request",
          `${nameOfBusiness(s, request.businessId)} invited you to pitch: ${request.title}`,
          `/creator/opportunities/${requestId}`,
        );
      }
      return next;
    });
  },

  hideRequest(requestId: string) {
    update((s) => ({ ...s, hiddenRequestIds: [...s.hiddenRequestIds, requestId] }));
  },

  unhideRequest(requestId: string) {
    update((s) => ({
      ...s,
      hiddenRequestIds: s.hiddenRequestIds.filter((id) => id !== requestId),
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
      const request = s.requests.find((r) => r.id === input.requestId);
      const pitch: Pitch = {
        ...input,
        id,
        creatorId: ME.creatorId,
        status: "sent",
        sentAt: nowStamp(),
      };
      let next: DemoState = {
        ...s,
        pitches: [pitch, ...s.pitches.filter((p) => !(p.requestId === input.requestId && p.creatorId === ME.creatorId))],
      };
      if (request?.businessId === ME.businessId) {
        next = notify(
          next,
          "business",
          "pitch",
          `${nameOfCreator(s, ME.creatorId)} pitched on "${request.title}" for ${money(input.price)}`,
          `/business/requests/${request.id}`,
        );
      }
      return next;
    });
    return id;
  },

  updatePitch(id: string, patch: Partial<Pick<Pitch, "message" | "angle" | "price" | "deliveryDays" | "sampleIds">>) {
    update((s) => ({ ...s, pitches: replaceById(s.pitches, id, (p) => ({ ...p, ...patch })) }));
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
      if (on && pitch?.creatorId === ME.creatorId) {
        const request = s.requests.find((r) => r.id === pitch.requestId);
        next = notify(next, "creator", "pitch", `Your pitch was shortlisted${request ? ` for "${request.title}"` : ""}`, "/creator/pitches");
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
      if (pitch?.creatorId === ME.creatorId) {
        const request = s.requests.find((r) => r.id === pitch.requestId);
        next = notify(
          next,
          "creator",
          "pitch",
          `${request ? nameOfBusiness(s, request.businessId) : "The business"} went with another creator${request ? ` for "${request.title}"` : ""}. Thanks for pitching.`,
          "/creator/pitches",
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
      if (pitch.creatorId === ME.creatorId) {
        next = notify(next, "creator", "offer", `You're hired! ${nameOfBusiness(s, request.businessId)} accepted your pitch`, `/creator/commissions/${commissionId}`);
      }
      return next;
    });
    const hired = state.commissions.find((c) => c.id === commissionId);
    if (hired && hired.creatorId !== ME.creatorId) simulateDelivery(commissionId, 25_000);
    return commissionId;
  },

  /* ------------------------------------------------------ direct offers */

  /** Commission a creator directly (from their profile or "commission again"). */
  sendOffer(input: OfferInput): string {
    const commissionId = uid("c");
    update((s) => {
      const ensured = ensureThread(s, {
        businessId: ME.businessId,
        creatorId: input.creatorId,
        commissionId,
        subject: input.title,
      });
      let next = ensured[0];
      const threadId = ensured[1];
      const totals = priceBreakdown(input.price, input.addons);
      const commission: Commission = {
        id: commissionId,
        businessId: ME.businessId,
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
        offerMessage: input.message,
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
      if (input.creatorId === ME.creatorId) {
        next = notify(next, "creator", "offer", `${nameOfBusiness(s, ME.businessId)} sent you an offer: ${input.title} (${money(input.price + input.addons.reduce((a, b) => a + b.price, 0))})`, `/creator/commissions/${commissionId}`);
      }
      return next;
    });
    // Other creators accept on their own after a short pause so the demo keeps moving.
    if (input.creatorId !== ME.creatorId && typeof window !== "undefined") {
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
      next = notify(next, "business", "offer", `${creator?.firstName ?? "The creator"} accepted your offer: ${c.title}`, `/business/commissions/${commissionId}`);
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
      next = notify(next, "business", "offer", `${nameOfCreator(s, c.creatorId)} declined your offer: ${c.title}`, `/business/commissions/${commissionId}`);
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

  /** Creator uploads a new version for review. */
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
      const video: Video = {
        ...template,
        id: uid("v"),
        creatorId: c.creatorId,
        title: `${product?.name ?? c.title} — v${c.deliveries.length + 1}`,
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
        note: input.note,
        deliveredAt: nowStamp(),
        status: "in_review",
        comments: [],
        files: input.files,
      };
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, c.id, (x) => ({
          ...x,
          status: "delivered",
          autoApproveAt: at(AUTO_APPROVE_DAYS, "20:00"),
          deliveries: [...x.deliveries, delivery],
          events: [...x.events, event("delivered", "creator", `Version ${delivery.version} delivered`)],
        })),
      };
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
      next = notify(next, "business", "delivery", `${creator?.firstName ?? "Your creator"} delivered version ${delivery.version} of "${c.title}"`, `/business/commissions/${c.id}`);
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
            { id: uid("dc"), atSec: input.atSec, text: input.text, author: input.author, resolved: false, createdAt: nowStamp() },
          ].sort((a, b) => a.atSec - b.atSec),
        })),
      })),
    }));
  },

  updateComment(commissionId: string, deliveryId: string, commentId: string, patch: { text?: string; resolved?: boolean }) {
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (c) => ({
        ...c,
        deliveries: replaceById(c.deliveries, deliveryId, (d) => ({
          ...d,
          comments: replaceById(d.comments, commentId, (m) => ({ ...m, ...patch })),
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
      if (c.creatorId === ME.creatorId) {
        next = notify(next, "creator", "revision", `${nameOfBusiness(s, c.businessId)} requested changes on "${c.title}"`, `/creator/commissions/${c.id}`);
      } else {
        scheduleReply(c.threadId, "creator", "thanks, notes");
        simulateDelivery(c.id, 20_000);
      }
      return next;
    });
  },

  /** Approve the latest delivery and release payment to the creator. */
  approve(commissionId: string) {
    update((s) => {
      const c = findCommission(s, commissionId);
      const latest = c.deliveries[c.deliveries.length - 1];
      const totals = priceBreakdown(c.price, c.addons, c.feeRate);
      let next: DemoState = {
        ...s,
        commissions: replaceById(s.commissions, commissionId, (x) => ({
          ...x,
          status: "completed",
          completedAt: nowStamp(),
          autoApproveAt: undefined,
          payment: { ...x.payment, status: "released" },
          deliveries: latest ? replaceById(x.deliveries, latest.id, (d) => ({ ...d, status: "approved" })) : x.deliveries,
          events: [
            ...x.events,
            event("approved", "business", latest ? `Version ${latest.version} approved` : "Work approved"),
            event("paid", "system", `${money(totals.creatorEarns)} released to ${nameOfCreator(s, x.creatorId)}`),
          ],
        })),
        creators: replaceById(s.creators, c.creatorId, (cr) => ({ ...cr, completed: cr.completed + 1 })),
      };
      next = appendMessage(next, c.threadId, { from: "system", text: `Approved. ${money(totals.creatorEarns)} was released to ${nameOfCreator(s, c.creatorId)}.` }, "creator");
      if (c.creatorId === ME.creatorId) {
        next = notify(next, "creator", "payment", `${money(totals.creatorEarns)} released by ${nameOfBusiness(s, c.businessId)}`, "/creator/earnings");
      }
      return next;
    });
  },

  leaveReview(input: ReviewInput): string {
    const reviewId = uid("rv");
    update((s) => {
      const c = findCommission(s, input.commissionId);
      const member = s.team.find((m) => m.id === ME.memberId);
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
        authorName: member?.name ?? "Daftar team",
        authorTitle: `${member?.title ?? "Team"}, ${nameOfBusiness(s, c.businessId)}`,
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
      if (c.creatorId === ME.creatorId) {
        next = notify(next, "creator", "review", `${nameOfBusiness(s, c.businessId)} left you a ${input.rating}-star review`, `/creators/${s.creators.find((x) => x.id === c.creatorId)?.handle ?? ""}`);
      }
      return next;
    });
    return reviewId;
  },

  /** Creator's private feedback about the business. */
  leaveClientFeedback(commissionId: string, rating: number, text: string) {
    update((s) => ({
      ...s,
      commissions: replaceById(s.commissions, commissionId, (c) => ({ ...c, clientFeedback: { rating, text } })),
    }));
  },

  replyToReview(reviewId: string, reply: string) {
    update((s) => ({ ...s, reviews: replaceById(s.reviews, reviewId, (r) => ({ ...r, reply })) }));
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

  /* ----------------------------------------------------------- messages */

  sendMessage(threadId: string, from: Role, text: string, attachment?: Attachment) {
    update((s) => appendMessage(s, threadId, { from, text, attachment }, other(from)));
    scheduleReply(threadId, other(from), text);
  },

  /** Open (or reuse) a conversation between the current business and a creator. */
  startThread(input: { creatorId: string; subject: string; text: string; requestId?: string; from?: Role }): string {
    let threadId = "";
    const from = input.from ?? "business";
    update((s) => {
      const [next, id] = ensureThread(s, {
        businessId: ME.businessId,
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

  markAllNotificationsRead(role: Role) {
    update((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.role === role ? { ...n, unread: false } : n)),
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
      creators: replaceById(s.creators, creatorId, (c) => ({ ...c, portfolioIds: [id, ...c.portfolioIds] })),
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
    update((s) => ({ ...s, team: [...s.team, { ...input, id, businessId: ME.businessId }] }));
    return id;
  },

  removeMember(memberId: string) {
    update((s) => ({ ...s, team: s.team.filter((m) => m.id !== memberId) }));
  },

  /* -------------------------------------------------------------- money */

  addPaymentMethod(input: Omit<PaymentMethod, "id" | "isDefault">, makeDefault = false): string {
    const id = uid("pm");
    update((s) => ({
      ...s,
      paymentMethods: [
        ...s.paymentMethods.map((m) => (makeDefault ? { ...m, isDefault: false } : m)),
        { ...input, id, isDefault: makeDefault || s.paymentMethods.length === 0 },
      ],
    }));
    return id;
  },

  removePaymentMethod(id: string) {
    update((s) => {
      const rest = s.paymentMethods.filter((m) => m.id !== id);
      if (rest.length && !rest.some((m) => m.isDefault)) rest[0] = { ...rest[0], isDefault: true };
      return { ...s, paymentMethods: rest };
    });
  },

  setDefaultPaymentMethod(id: string) {
    update((s) => ({ ...s, paymentMethods: s.paymentMethods.map((m) => ({ ...m, isDefault: m.id === id })) }));
  },

  addPayoutMethod(input: Omit<PayoutMethod, "id" | "isDefault">): string {
    const id = uid("po");
    update((s) => ({ ...s, payoutMethods: [...s.payoutMethods, { ...input, id, isDefault: s.payoutMethods.length === 0 }] }));
    return id;
  },

  removePayoutMethod(id: string) {
    update((s) => {
      const rest = s.payoutMethods.filter((m) => m.id !== id);
      if (rest.length && !rest.some((m) => m.isDefault)) rest[0] = { ...rest[0], isDefault: true };
      return { ...s, payoutMethods: rest };
    });
  },

  setDefaultPayoutMethod(id: string) {
    update((s) => ({ ...s, payoutMethods: s.payoutMethods.map((m) => ({ ...m, isDefault: m.id === id })) }));
  },

  requestPayout(amount: number, methodId: string): string {
    const id = uid("pay");
    update((s) => ({
      ...s,
      payouts: [{ id, amount, methodId, status: "processing", at: nowStamp() }, ...s.payouts],
    }));
    return id;
  },

  /* ----------------------------------------------------------- settings */

  updateSettings<R extends Role>(role: R, patch: Partial<Settings[R]>) {
    update((s) => ({ ...s, settings: { ...s.settings, [role]: { ...s.settings[role], ...patch } } }));
  },
};

/** Format label for event texts built outside this file. */
export const formatName = (id: Brief["format"]) => formatById[id]?.name ?? id;
