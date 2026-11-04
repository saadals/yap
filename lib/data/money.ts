import type { PaymentMethod, Payout, PayoutMethod } from "@/lib/types";
import { at, hoursAgo } from "@/lib/clock";

/** Daftar's cards. */
export const paymentMethods: PaymentMethod[] = [
  { id: "pm-1", brand: "visa", last4: "4242", expiry: "08/28", holder: "Nour Haddad", isDefault: true },
  { id: "pm-2", brand: "mada", last4: "8810", expiry: "02/27", holder: "Nour Haddad", isDefault: false },
];

/** Layla's payout destinations. */
export const payoutMethods: PayoutMethod[] = [
  { id: "po-1", kind: "bank", label: "Emirates NBD", detail: "IBAN ending 4821", isDefault: true },
  { id: "po-2", kind: "wallet", label: "Wise", detail: "USD balance", isDefault: false },
];

/** Layla's payouts, newest first. */
export const payouts: Payout[] = [
  { id: "py-5", amount: 390, status: "processing", methodId: "po-1", at: hoursAgo(30) },
  { id: "py-4", amount: 460, status: "paid", methodId: "po-1", at: at(-21, "09:00") },
  { id: "py-3", amount: 780, status: "paid", methodId: "po-2", at: at(-42, "09:00") },
  { id: "py-2", amount: 640, status: "paid", methodId: "po-1", at: at(-63, "09:00") },
  { id: "py-1", amount: 520, status: "paid", methodId: "po-1", at: at(-84, "09:00") },
];
