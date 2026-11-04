"use client";

import { Check, Landmark, Plus, Wallet } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { FieldShell, SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { isEmail } from "@/components/settings/controls";
import { actions, useDemo } from "@/lib/store";
import type { PayoutMethod } from "@/lib/types";

export const payoutLabel = (method: PayoutMethod) => `${method.label} · ${method.detail}`;

export function PayoutMethodIcon({ kind, size = 18 }: { kind: PayoutMethod["kind"]; size?: number }) {
  return kind === "bank" ? <Landmark size={size} aria-hidden /> : <Wallet size={size} aria-hidden />;
}

export function PayoutMethods({ onAdd }: { onAdd: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const methods = s.payoutMethods;

  return (
    <div className="flex flex-col gap-3">
      {methods.length === 0 ? (
        <p className="y-small y-fg-2">
          Add a bank account or wallet so you can withdraw what you&apos;ve earned.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {methods.map((method) => (
            <li key={method.id} className="y-tile flex flex-wrap items-center gap-3 p-3 ps-4">
              <span aria-hidden className="grid size-11 flex-none place-items-center rounded-full bg-(--b-bg)">
                <PayoutMethodIcon kind={method.kind} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="y-small flex flex-wrap items-center gap-2 font-semibold">
                  {method.label}
                  {method.isDefault ? (
                    <Badge tone="ink" icon={<Check size={12} aria-hidden />} className="!min-h-6 !px-2 text-xs">
                      Default
                    </Badge>
                  ) : null}
                </span>
                <span className="y-micro y-fg-2 y-num">
                  {method.kind === "bank" ? "Bank transfer" : "Wallet"} · {method.detail}
                </span>
              </span>
              {!method.isDefault ? (
                <PillButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const previous = methods.find((m) => m.isDefault);
                    actions.setDefaultPayoutMethod(method.id);
                    toast({
                      message: `Payouts will go to ${method.label} by default`,
                      action: previous
                        ? { label: "Undo", onClick: () => actions.setDefaultPayoutMethod(previous.id) }
                        : undefined,
                    });
                  }}
                >
                  Make default
                </PillButton>
              ) : null}
              {!method.isDefault ? (
                <PillButton
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${method.label}`}
                  onClick={() => {
                    const { id: _id, isDefault: _default, ...rest } = method;
                    void _id;
                    void _default;
                    actions.removePayoutMethod(method.id);
                    toast({
                      message: `Removed ${method.label}`,
                      action: { label: "Undo", onClick: () => actions.addPayoutMethod(rest) },
                    });
                  }}
                >
                  Remove
                </PillButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div>
        <PillButton variant="soft" icon={<Plus size={18} aria-hidden />} onClick={onAdd}>
          Add payout method
        </PillButton>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add payout method                                                           */
/* -------------------------------------------------------------------------- */

/** ISO 13616 check: rearrange, convert letters to numbers, mod 97 must equal 1. */
function validIban(raw: string) {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

const banks = [
  "Emirates NBD",
  "First Abu Dhabi Bank",
  "ADCB",
  "Mashreq",
  "Dubai Islamic Bank",
  "Al Rajhi Bank",
  "Saudi National Bank",
  "Arab Bank",
  "Other bank",
];
const wallets = ["Payoneer", "Wise", "PayPal"];

type Form = { holder: string; bank: string; iban: string; wallet: string; account: string; makeDefault: boolean };
const empty: Form = { holder: "", bank: banks[0], iban: "", wallet: wallets[0], account: "", makeDefault: false };

export function AddPayoutSheet({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: (id: string) => void;
}) {
  const s = useDemo();
  const toast = useToast();
  const [kind, setKind] = useState<PayoutMethod["kind"]>("bank");
  const [form, setForm] = useState<Form>(empty);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = {
    holder: kind === "bank" && form.holder.trim().length < 2 ? "Enter the name on the account." : null,
    iban:
      kind === "bank"
        ? !form.iban.trim()
          ? "Enter your IBAN."
          : !validIban(form.iban)
            ? "That IBAN doesn't check out. It starts with two letters, like AE07 0331 2345 6789 0123 456."
            : null
        : null,
    account: kind === "wallet" && !isEmail(form.account) ? `Enter the email on your ${form.wallet} account.` : null,
  };
  const show = (key: keyof typeof errors) => (touched[key] ? errors[key] : null);
  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const close = () => {
    setForm(empty);
    setTouched({});
    setKind("bank");
    onClose();
  };

  const submit = () => {
    setTouched({ holder: true, iban: true, account: true });
    if (errors.holder || errors.iban || errors.account) return;
    let input: Omit<PayoutMethod, "id" | "isDefault">;
    if (kind === "bank") {
      const iban = form.iban.replace(/\s+/g, "").toUpperCase();
      input = { kind, label: form.bank, detail: `IBAN ending ${iban.slice(-4)}` };
    } else {
      const [user, domain] = form.account.trim().split("@");
      input = { kind, label: form.wallet, detail: `${user.slice(0, 2)}•••@${domain}` };
    }
    const id = actions.addPayoutMethod(input);
    const willBeDefault = form.makeDefault || s.payoutMethods.length === 0;
    if (form.makeDefault) actions.setDefaultPayoutMethod(id);
    toast({ message: `${input.label} added${willBeDefault ? " as your default payout method" : ""}` });
    onAdded?.(id);
    close();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Add payout method"
      description="Where your earnings go when you withdraw. Payouts are free."
      width="sm"
      footer={
        <div className="flex flex-wrap gap-2">
          <PillButton type="submit" form="add-payout-form" variant="contrast">
            Save payout method
          </PillButton>
          <PillButton variant="ghost" onClick={close}>
            Cancel
          </PillButton>
        </div>
      }
    >
      <form
        id="add-payout-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <SegmentedToggle
          label="Payout method type"
          value={kind}
          onChange={(value) => {
            setKind(value);
            setTouched({});
          }}
          options={[
            { value: "bank", label: "Bank account" },
            { value: "wallet", label: "Wallet" },
          ]}
          size="md"
          className="self-start"
        />
        {kind === "bank" ? (
          <>
            <TextField
              label="Account holder"
              required
              autoComplete="name"
              value={form.holder}
              onChange={(event) => set("holder", event.target.value)}
              onBlur={blur("holder")}
              error={show("holder")}
            />
            <SelectField
              label="Bank"
              required
              options={banks.map((bank) => ({ value: bank, label: bank }))}
              value={form.bank}
              onChange={(event) => set("bank", event.target.value)}
            />
            <FieldShell
              label="IBAN"
              required
              hint="Find it in your banking app. Spaces are fine."
              error={show("iban")}
            >
              {({ id, describedBy }) => (
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={show("iban") ? true : undefined}
                  className="y-input y-num uppercase"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="AE07 0331 2345 6789 0123 456"
                  value={form.iban}
                  onBlur={blur("iban")}
                  onChange={(event) =>
                    set(
                      "iban",
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 34)
                        .replace(/(.{4})(?=.)/g, "$1 "),
                    )
                  }
                />
              )}
            </FieldShell>
          </>
        ) : (
          <>
            <SelectField
              label="Wallet"
              required
              options={wallets.map((wallet) => ({ value: wallet, label: wallet }))}
              value={form.wallet}
              onChange={(event) => set("wallet", event.target.value)}
            />
            <TextField
              label={`${form.wallet} email`}
              required
              type="email"
              autoComplete="email"
              value={form.account}
              onChange={(event) => set("account", event.target.value)}
              onBlur={blur("account")}
              error={show("account")}
            />
          </>
        )}
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="y-check"
            checked={form.makeDefault}
            onChange={(event) => set("makeDefault", event.target.checked)}
          />
          <span className="y-small">Use this for future payouts</span>
        </label>
        <p className="y-micro y-fg-3">Prototype: no real account is connected.</p>
      </form>
    </Sheet>
  );
}
