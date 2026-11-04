import type { Settings } from "@/lib/types";

export { cities } from "./cities";
export { videos } from "./videos";
export { creators } from "./creators";
export { businesses, team } from "./businesses";
export { products } from "./products";
export { requests } from "./requests";
export { pitches } from "./pitches";
export { commissions } from "./commissions";
export { threads } from "./threads";
export { reviews } from "./reviews";
export { notifications } from "./notifications";
export { paymentMethods, payoutMethods, payouts } from "./money";

/** The two demo personas. */
export const ME = { businessId: "b-daftar", memberId: "m-nour", creatorId: "cr-layla" } as const;

/** Creators Daftar has saved. */
export const savedCreatorIds: string[] = ["cr-layla", "cr-omar", "cr-noura", "cr-lina", "cr-sara"];

export const settings: Settings = {
  business: {
    email: true,
    whatsapp: true,
    push: true,
    digest: "instant",
    autoApproveReminders: true,
    invoiceEmail: "finance@daftar.app",
  },
  creator: {
    email: true,
    whatsapp: true,
    push: true,
    digest: "daily",
    matchAlerts: true,
    minBudget: 120,
    vacationMode: false,
  },
};
