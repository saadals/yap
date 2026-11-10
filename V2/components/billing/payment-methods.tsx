"use client";

import { CreditCard, Plus, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";

import { paymentLabel } from "@/components/domain/money";
import { FieldShell, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { NOW_ISO } from "@/lib/clock";
import { plural } from "@/lib/format";
import { campaignMoney, me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

const brandName: Record<PaymentMethod["brand"], string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  applepay: "Apple Pay",
};

/** The signed-in account's cards (its buyer profile): add, make default, remove (never the last one). */
export function PaymentMethods() {
  const s = useDemo();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PaymentMethod | null>(null);
  const methods = me.paymentMethods(s);
  /** Held payments funded by a card: jobs, plus campaigns with money still on hold. */
  const heldWith = (id: string) =>
    s.commissions.filter((c) => c.payment.methodId === id && c.payment.status === "held" && c.source !== "campaign").length +
    s.requests.filter((r) => r.campaign?.paymentMethodId === id && campaignMoney(s, r).held > 0).length;

  return (
    <section aria-labelledby="methods-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="methods-title" className="y-head">
          Payment methods
        </h2>
        <PillButton variant="ghost" size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => setAdding(true)} className="-me-2">
          Add a card
        </PillButton>
      </div>
      {methods.length === 0 ? (
        <p className="y-small y-fg-2">No cards saved. Add one to pay for an order in one tap.</p>
      ) : (
        <ul className="flex flex-col">
          {methods.map((method) => {
            const held = heldWith(method.id);
            const meta = [
              method.brand === "applepay" ? "Touch ID or Face ID" : `Expires ${method.expiry}`,
              held ? `Funding ${plural(held, "held payment")}` : null,
            ].filter(Boolean);
            return (
              <li key={method.id} className="flex items-center gap-3 border-t border-(--b-line) py-3 first:border-0 first:pt-1">
                <span aria-hidden className="grid size-9 flex-none place-items-center rounded-(--y-r-sm) bg-(--b-chip)">
                  {method.brand === "applepay" ? <Smartphone size={17} /> : <CreditCard size={17} />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="y-small flex items-center gap-2 font-medium">
                    {paymentLabel(method)}
                    {method.isDefault ? <span className="y-micro y-fg-2 font-normal">Default</span> : null}
                  </span>
                  <span className="y-micro y-fg-2">
                    {meta.join(" · ")}
                    {!method.isDefault ? (
                      <>
                        {" · "}
                        <button
                          type="button"
                          className="y-link relative font-medium text-(--b-fg) after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
                          onClick={() => {
                            const previous = methods.find((m) => m.isDefault);
                            actions.setDefaultPaymentMethod(method.id);
                            toast({
                              message: `${paymentLabel(method)} is now your default`,
                              action: previous ? { label: "Undo", onClick: () => actions.setDefaultPaymentMethod(previous.id) } : undefined,
                            });
                          }}
                        >
                          Make default
                        </button>
                      </>
                    ) : null}
                  </span>
                </span>
                <span className="flex flex-none items-center gap-1">
                  {methods.length > 1 ? (
                    <RoundIconButton label={`Remove ${paymentLabel(method)}`} size="sm" tone="soft" onClick={() => setRemoving(method)}>
                      <Trash2 size={15} aria-hidden />
                    </RoundIconButton>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <AddCardSheet open={adding} onClose={() => setAdding(false)} />

      <Sheet
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        side="center"
        width="sm"
        title="Remove this card?"
        description={removing ? `${paymentLabel(removing)} won't be available for new orders.` : undefined}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <PillButton variant="ghost" onClick={() => setRemoving(null)}>
              Keep it
            </PillButton>
            <PillButton
              variant="contrast"
              onClick={() => {
                if (!removing || methods.length <= 1) return setRemoving(null);
                actions.removePaymentMethod(removing.id);
                toast({ message: `${paymentLabel(removing)} removed` });
                setRemoving(null);
              }}
            >
              Remove card
            </PillButton>
          </div>
        }
      >
        <p className="y-small y-fg-2">
          {removing && heldWith(removing.id)
            ? "Payments already held on this card stay protected and are released or refunded as normal."
            : "You can add it again any time."}
        </p>
      </Sheet>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Add card                                                                    */
/* -------------------------------------------------------------------------- */

function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function detectBrand(digits: string): PaymentMethod["brand"] | null {
  if (!digits) return null;
  if (digits.startsWith("4")) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return null;
}

const [nowYear, nowMonth] = [Number(NOW_ISO.slice(2, 4)), Number(NOW_ISO.slice(5, 7))];

type CardForm = { number: string; expiry: string; cvc: string; holder: string };

function validateCard(form: CardForm) {
  const digits = form.number.replace(/\D/g, "");
  const [mm, yy] = form.expiry.split("/").map(Number);
  let expiry: string | null = null;
  if (!/^\d{2}\/\d{2}$/.test(form.expiry) || mm < 1 || mm > 12) expiry = "Use the MM/YY format, like 08/28.";
  else if (yy < nowYear || (yy === nowYear && mm < nowMonth)) expiry = "This card has expired. Use a card that's still valid.";
  return {
    number:
      digits.length < 15
        ? "Enter the full card number."
        : !luhn(digits)
          ? "That number doesn't look right. Check it against your card."
          : !detectBrand(digits)
            ? "We take Visa, Mastercard and American Express."
            : null,
    expiry,
    cvc: /^\d{3,4}$/.test(form.cvc) ? null : "Enter the 3 or 4 digits on the back.",
    holder: form.holder.trim().length < 2 ? "Enter the name as it appears on the card." : null,
  };
}

const emptyCard: CardForm = { number: "", expiry: "", cvc: "", holder: "" };

export function AddCardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const [form, setForm] = useState<CardForm>(emptyCard);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [makeDefault, setMakeDefault] = useState(false);
  const errors = validateCard(form);
  const digits = form.number.replace(/\D/g, "");
  const brand = detectBrand(digits);
  const show = (key: keyof CardForm) => (touched[key] ? errors[key] : null);
  const blur = (key: keyof CardForm) => () => setTouched((t) => ({ ...t, [key]: true }));
  const filled = digits.length >= 15 && form.expiry.length === 5 && form.cvc.length >= 3 && form.holder.trim().length > 1;

  const close = () => {
    setForm(emptyCard);
    setTouched({});
    setMakeDefault(false);
    onClose();
  };

  const submit = () => {
    setTouched({ number: true, expiry: true, cvc: true, holder: true });
    if (errors.number || errors.expiry || errors.cvc || errors.holder || !brand) return;
    const isFirst = me.paymentMethods(s).length === 0;
    actions.addPaymentMethod({ brand, last4: digits.slice(-4), expiry: form.expiry, holder: form.holder.trim() }, makeDefault);
    toast({ message: `${brandName[brand]} ending ${digits.slice(-4)} added${makeDefault || isFirst ? " as your default" : ""}` });
    close();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Add a card"
      description="Charged when you hire or post a campaign. Yapp holds the payment, service fee included, until it's released or refunded."
      width="sm"
      footer={
        <div className="flex flex-wrap gap-2">
          <PillButton type="submit" form="add-card-form" variant="contrast" disabled={!filled}>
            Save card
          </PillButton>
          <PillButton variant="ghost" onClick={close}>
            Cancel
          </PillButton>
        </div>
      }
    >
      <form
        id="add-card-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <FieldShell
          label="Card number"
          required
          error={show("number")}
          hint={brand ? `${brandName[brand]} card` : "Visa, Mastercard or American Express"}
        >
          {({ id, describedBy }) => (
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={show("number") ? true : undefined}
              className="y-input y-num"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={form.number}
              onBlur={blur("number")}
              data-autofocus
              onChange={(event) =>
                setForm({
                  ...form,
                  number: event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 16)
                    .replace(/(\d{4})(?=\d)/g, "$1 "),
                })
              }
            />
          )}
        </FieldShell>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Expiry"
            required
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={form.expiry}
            error={show("expiry")}
            onBlur={blur("expiry")}
            onChange={(event) => {
              const d = event.target.value.replace(/\D/g, "").slice(0, 4);
              setForm({ ...form, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
            }}
          />
          <TextField
            label="Security code"
            required
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={form.cvc}
            error={show("cvc")}
            onBlur={blur("cvc")}
            onChange={(event) => setForm({ ...form, cvc: event.target.value.replace(/\D/g, "").slice(0, 4) })}
          />
        </div>
        <TextField
          label="Name on card"
          required
          autoComplete="cc-name"
          value={form.holder}
          error={show("holder")}
          onBlur={blur("holder")}
          onChange={(event) => setForm({ ...form, holder: event.target.value })}
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" className="y-check" checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} />
          <span className="y-small">Make this my default card</span>
        </label>
        <p className="y-micro y-fg-2">Prototype: no real card is charged or stored. Try 4242 4242 4242 4242.</p>
      </form>
    </Sheet>
  );
}
