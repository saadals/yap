"use client";

import { Landmark, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";

import { FieldShell, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { isEmail } from "@/components/settings/controls";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { PayoutMethod } from "@/lib/types";

export const payoutLabel = (method: PayoutMethod) => `${method.label} · ${method.detail}`;

export function PayoutMethodIcon({ kind, size = 18 }: { kind: PayoutMethod["kind"]; size?: number }) {
  return kind === "bank" ? <Landmark size={size} aria-hidden /> : <Wallet size={size} aria-hidden />;
}

export function PayoutMethods({ onAdd, titleId }: { onAdd: () => void; titleId?: string }) {
  const s = useDemo();
  const toast = useToast();
  const methods = me.payoutMethods(s);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id={titleId} className="y-head">
          Payout methods
        </h3>
        <PillButton variant="ghost" size="sm" icon={<Plus size={16} aria-hidden />} onClick={onAdd}>
          Add
          <span className="sr-only"> payout method</span>
        </PillButton>
      </div>
      {methods.length === 0 ? (
        <p className="y-small y-fg-2">Add a bank account or wallet so you can withdraw what you&apos;ve earned.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-(--b-line)">
          {methods.map((method) => (
            <li key={method.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span aria-hidden className="y-fg-2 flex-none">
                <PayoutMethodIcon kind={method.kind} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="y-small font-semibold">{method.label}</span>
                <span className="y-micro y-fg-2 y-num truncate">
                  {method.isDefault ? "Default · " : ""}
                  {method.detail}
                </span>
              </span>
              {!method.isDefault ? (
                <span className="flex flex-none items-center gap-1">
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
                  <PillButton
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={16} aria-hidden />}
                    aria-label={`Remove ${method.label}`}
                    title={`Remove ${method.label}`}
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
                    <span className="sr-only">Remove</span>
                  </PillButton>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add payout method                                                           */
/* -------------------------------------------------------------------------- */

/** Letters and digits only, upper case ("12-345 678" → "12345678"). */
const compact = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Works for a US or Canadian account number and for an IBAN; an IBAN also gets its checksum checked. */
export function accountNumberError(raw: string): string | null {
  const value = compact(raw);
  if (!value) return "Enter your account number.";
  if (value.length < 4 || value.length > 34) return "That doesn't look like an account number. Check it in your banking app.";
  if (/^[A-Z]{2}\d{2}/.test(value) && value.length >= 15) {
    // ISO 13616: rearrange, letters become numbers, mod 97 must equal 1.
    const rearranged = value.slice(4) + value.slice(0, 4);
    let remainder = 0;
    for (const char of rearranged) {
      const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
      for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    if (remainder !== 1) return "That IBAN doesn't check out. Copy it again from your banking app.";
  } else if (!/^\d+$/.test(value)) {
    return "Account numbers are digits only. If yours starts with two letters, enter the whole IBAN.";
  }
  return null;
}

/** Routing number (US) or transit and institution numbers (Canada); optional, an IBAN needs none. */
export function bankCodeError(raw: string): string | null {
  const value = compact(raw);
  if (!value) return null;
  return value.length >= 5 && value.length <= 11
    ? null
    : "Check the number: a US routing number has 9 digits, Canadian transit and institution numbers 8 together.";
}

export const ACCOUNT_HINT = "Your account number, or an IBAN outside North America. Spaces are fine.";
export const BANK_CODE_HINT = "For US and Canadian accounts (in Canada, transit and institution numbers together). Leave it empty if you entered an IBAN.";

type Form = { holder: string; bank: string; account: string; code: string; email: string; makeDefault: boolean };
const empty: Form = { holder: "", bank: "", account: "", code: "", email: "", makeDefault: false };

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
    bank: kind === "bank" && form.bank.trim().length < 2 ? "Enter your bank's name." : null,
    account: kind === "bank" ? accountNumberError(form.account) : null,
    code: kind === "bank" ? bankCodeError(form.code) : null,
    email: kind === "wallet" && !isEmail(form.email) ? "Enter the email your wallet uses." : null,
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
    setTouched({ holder: true, bank: true, account: true, code: true, email: true });
    if (errors.holder || errors.bank || errors.account || errors.code || errors.email) return;
    let input: Omit<PayoutMethod, "id" | "isDefault" | "creatorId">;
    if (kind === "bank") {
      input = { kind, label: form.bank.trim(), detail: `Account ending ${compact(form.account).slice(-4)}` };
    } else {
      const [user, domain] = form.email.trim().split("@");
      input = { kind, label: "Digital wallet", detail: `${user.slice(0, 2)}•••@${domain}` };
    }
    const id = actions.addPayoutMethod(input);
    const willBeDefault = form.makeDefault || me.payoutMethods(s).length === 0;
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
            { value: "wallet", label: "Digital wallet" },
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
            <TextField
              label="Bank"
              required
              autoComplete="off"
              value={form.bank}
              onChange={(event) => set("bank", event.target.value)}
              onBlur={blur("bank")}
              error={show("bank")}
            />
            <FieldShell label="Account number" required hint={ACCOUNT_HINT} error={show("account")}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={show("account") ? true : undefined}
                  className="y-input y-num uppercase"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.account}
                  onBlur={blur("account")}
                  onChange={(event) => set("account", event.target.value.toUpperCase().slice(0, 42))}
                />
              )}
            </FieldShell>
            <TextField
              label="Routing or transit number"
              autoComplete="off"
              spellCheck={false}
              inputMode="numeric"
              hint={BANK_CODE_HINT}
              value={form.code}
              onChange={(event) => set("code", event.target.value.slice(0, 16))}
              onBlur={blur("code")}
              error={show("code")}
            />
          </>
        ) : (
          <TextField
            label="Wallet email"
            hint="The email your digital wallet uses. Payouts arrive in US dollars."
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => set("email", event.target.value)}
            onBlur={blur("email")}
            error={show("email")}
          />
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
