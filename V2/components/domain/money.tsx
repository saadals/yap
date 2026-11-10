"use client";

import { CreditCard, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { money, moneyExact, priceBreakdown } from "@/lib/format";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { addonById, includedRights, SERVICE_FEE_RATE } from "@/lib/taxonomy";
import type { AddonId, PaymentMethod } from "@/lib/types";

/**
 * Itemized price. Business view shows the service fee and total; creator view shows what
 * they earn (creators keep 100% of price + add-ons).
 */
export function PriceSummary({
  price,
  priceLabel = "Creator's price",
  addons = [],
  feeRate = SERVICE_FEE_RATE,
  perspective = "business",
  showRights = true,
  cents = false,
  className = "",
}: {
  price: number;
  priceLabel?: string;
  addons?: { id: AddonId; price: number }[];
  feeRate?: number;
  perspective?: "business" | "creator";
  showRights?: boolean;
  /** Receipts show every amount with cents; elsewhere whole dollars stay whole, so the total matches its button. */
  cents?: boolean;
  className?: string;
}) {
  const totals = priceBreakdown(price, addons, feeRate);
  const fmt = (amount: number) => (cents ? money(amount, true) : moneyExact(amount));
  const row = "flex items-baseline justify-between gap-4";
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <div className={row}>
        <span className="y-small">{priceLabel}</span>
        <span className="y-small y-num font-semibold">{fmt(price)}</span>
      </div>
      {addons.map((addon) => (
        <div key={addon.id} className={row}>
          <span className="y-small y-fg-2">+ {addonById[addon.id].name}</span>
          <span className="y-small y-num">{fmt(addon.price)}</span>
        </div>
      ))}
      {perspective === "business" ? (
        <>
          {feeRate > 0 ? (
            <div className={`${row} border-t border-(--b-line) pt-2.5`}>
              <span className="y-small y-fg-2">
                Service fee ({Math.round(feeRate * 100)}%)
                <span className="y-micro y-fg-3 block">Held with the payment, refunded with it</span>
              </span>
              <span className="y-small y-num">{fmt(totals.fee)}</span>
            </div>
          ) : null}
          <div className={`${row} border-t border-(--b-line) pt-2.5`}>
            <span className="y-head">Total</span>
            <span className="y-display y-num text-[28px] leading-none font-semibold tracking-[-0.02em]">
              {fmt(totals.total)}
            </span>
          </div>
        </>
      ) : (
        <div className={`${row} border-t border-(--b-line) pt-2.5`}>
          <span className="y-head">
            You earn
            <span className="y-micro y-fg-3 block font-normal">
              {feeRate > 0 ? "You keep 100%. The client pays Yapp’s fee." : "You keep 100%."}
            </span>
          </span>
          <span className="y-display y-num text-[28px] leading-none font-semibold tracking-[-0.02em]">
            {fmt(totals.creatorEarns)}
          </span>
        </div>
      )}
      {showRights ? <p className="y-micro y-fg-3 pt-1">Included: {includedRights}</p> : null}
    </div>
  );
}

/** The "payment protected" reassurance (trust: the shield and the label carry it). */
export function ProtectedNote({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div
      data-tone="paper"
      className={`y-block flex items-start gap-3 !rounded-(--y-r-tile) ${compact ? "p-3" : "p-4"} ${className}`}
    >
      <ShieldCheck size={20} aria-hidden className="mt-0.5 flex-none" />
      <div className="flex flex-col gap-0.5">
        <p className="y-small font-semibold">Payment protection</p>
        {!compact ? (
          <p className="y-small y-fg-2">
            We hold your payment and only release it when you approve the final video. If the
            creator doesn&apos;t deliver, you get a full refund.
          </p>
        ) : (
          <p className="y-micro y-fg-2">Held safely until you approve. Full refund if it isn&apos;t delivered.</p>
        )}
      </div>
    </div>
  );
}

export function paymentLabel(method: PaymentMethod) {
  if (method.brand === "applepay") return "Apple Pay";
  const brand = { visa: "Visa", mastercard: "Mastercard", amex: "Amex" }[method.brand];
  return `${brand} •••• ${method.last4}`;
}

/** Choose a saved card or add one (mock). Controlled: pass value + onChange. */
export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const s = useDemo();
  const methods = me.paymentMethods(s);
  const [adding, setAdding] = useState(false);
  const [card, setCard] = useState({ number: "", expiry: "", holder: "" });
  const digits = card.number.replace(/\D/g, "");
  const valid = digits.length >= 15 && /^\d{2}\/\d{2}$/.test(card.expiry) && card.holder.trim().length > 1;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="y-label mb-2">Pay with</legend>
      {methods.map((method) => (
        <label
          key={method.id}
          className={`y-tile flex min-h-14 cursor-pointer items-center gap-3 px-4 ${value === method.id ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
        >
          <input
            type="radio"
            name="payment-method"
            className="y-check !rounded-full"
            checked={value === method.id}
            onChange={() => onChange(method.id)}
          />
          <CreditCard size={20} aria-hidden />
          <span className="flex-1">
            <span className="y-small block font-semibold">{paymentLabel(method)}</span>
            <span className="y-micro y-fg-2">
              {method.brand === "applepay" ? "Touch ID or Face ID" : `Expires ${method.expiry}`}
              {method.isDefault ? " · Default" : ""}
            </span>
          </span>
        </label>
      ))}
      {adding ? (
        <div className="y-tile flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1.5">
            <span className="y-label">Card number</span>
            <input
              className="y-input y-num !bg-(--b-bg)"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={card.number}
              onChange={(e) =>
                setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ") })
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="y-label">Expiry</span>
              <input
                className="y-input y-num !bg-(--b-bg)"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={card.expiry}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="y-label">Name on card</span>
              <input
                className="y-input !bg-(--b-bg)"
                autoComplete="cc-name"
                value={card.holder}
                onChange={(e) => setCard({ ...card, holder: e.target.value })}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <PillButton
              size="sm"
              variant="contrast"
              disabled={!valid}
              onClick={() => {
                const id = actions.addPaymentMethod({
                  brand: digits.startsWith("4") ? "visa" : /^3[47]/.test(digits) ? "amex" : "mastercard",
                  last4: digits.slice(-4),
                  expiry: card.expiry,
                  holder: card.holder.trim(),
                });
                onChange(id);
                setAdding(false);
                setCard({ number: "", expiry: "", holder: "" });
              }}
            >
              Save card
            </PillButton>
            <PillButton size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </PillButton>
          </div>
          <p className="y-micro y-fg-3">Prototype: no real card is charged or stored.</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="y-tile y-hoverable flex min-h-14 items-center gap-3 px-4 font-semibold"
        >
          <Plus size={20} aria-hidden /> Add a card
        </button>
      )}
    </fieldset>
  );
}
