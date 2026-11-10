import type { PaymentMethod, Payout, PayoutMethod } from "@/lib/types";
import { at, hoursAgo } from "@/lib/clock";

/** Cards per buyer profile (Daftar's, and Layla's own). */
export const paymentMethods: PaymentMethod[] = [
  { id: "pm-1", businessId: "b-daftar", brand: "visa", last4: "4242", expiry: "08/28", holder: "Nour Haddad", isDefault: true },
  { id: "pm-2", businessId: "b-daftar", brand: "mastercard", last4: "8810", expiry: "02/27", holder: "Nour Haddad", isDefault: false },
  { id: "pm-3", businessId: "b-layla", brand: "applepay", last4: "1907", expiry: "11/29", holder: "Layla Mansour", isDefault: true },
];

/** Layla's payout destinations. */
export const payoutMethods: PayoutMethod[] = [
  { id: "po-1", creatorId: "cr-layla", kind: "bank", label: "Bank account", detail: "Account ending 4821", isDefault: true },
  { id: "po-2", creatorId: "cr-layla", kind: "wallet", label: "Digital wallet", detail: "USD balance", isDefault: false },
];

/** Layla's payouts, newest first. */
export const payouts: Payout[] = [
  { id: "py-5", creatorId: "cr-layla", amount: 390, status: "processing", methodId: "po-1", at: hoursAgo(30) },
  { id: "py-4", creatorId: "cr-layla", amount: 460, status: "paid", methodId: "po-1", at: at(-21, "09:00") },
  { id: "py-3", creatorId: "cr-layla", amount: 780, status: "paid", methodId: "po-2", at: at(-42, "09:00") },
  { id: "py-2", creatorId: "cr-layla", amount: 640, status: "paid", methodId: "po-1", at: at(-63, "09:00") },
  { id: "py-1", creatorId: "cr-layla", amount: 520, status: "paid", methodId: "po-1", at: at(-84, "09:00") },
];
