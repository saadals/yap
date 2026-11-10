import type { Account, Settings } from "@/lib/types";

import { campaignCommissions, campaignRequests, campaignThreads } from "./campaigns";
import { commissions as baseCommissions } from "./commissions";
import { requests as baseRequests } from "./requests";
import { threads as baseThreads } from "./threads";

/** Custom requests and UGC campaigns (lib/data/campaigns.ts). */
export const requests = [...campaignRequests, ...baseRequests];
export const commissions = [...baseCommissions, ...campaignCommissions];
export const threads = [...baseThreads, ...campaignThreads];

export { cities } from "./cities";
export { videos } from "./videos";
export { creators } from "./creators";
export { businesses, team } from "./businesses";
export { products } from "./products";
export { pitches } from "./pitches";
export { reviews } from "./reviews";
export { notifications } from "./notifications";
export { paymentMethods, payoutMethods, payouts } from "./money";

/**
 * The two demo people. One account type: both can order and make. Nour has a business account
 * (Daftar) and no creator profile yet; Layla orders in her own name and has a creator profile.
 * Switch between them from the account menu ("Switch account").
 */
export const accounts: Account[] = [
  {
    id: "nour",
    name: "Nour Haddad",
    firstName: "Nour",
    email: "nour@daftar.app",
    kind: "business",
    businessId: "b-daftar",
    memberId: "m-nour",
    reserved: { creatorId: "cr-nour", handle: "nourhaddad" },
  },
  {
    id: "layla",
    name: "Layla Mansour",
    firstName: "Layla",
    email: "layla@laylatalks.com",
    kind: "personal",
    businessId: "b-layla",
    creatorId: "cr-layla",
    reserved: { creatorId: "cr-layla", handle: "laylatalks" },
  },
];

/** Account used when nothing else says otherwise (fresh tab, static HTML). */
export const DEFAULT_ACCOUNT_ID = "nour";

/** Saved creators per account. */
export const savedCreatorIds: Record<string, string[]> = {
  nour: ["cr-layla", "cr-omar", "cr-nina", "cr-lina", "cr-sara"],
  layla: ["cr-nina", "cr-hana"],
};

const baseSettings: Settings = {
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

/** Settings per account. */
export const settings: Record<string, Settings> = {
  nour: baseSettings,
  layla: {
    business: { ...baseSettings.business, invoiceEmail: "layla@laylatalks.com" },
    creator: baseSettings.creator,
  },
};
