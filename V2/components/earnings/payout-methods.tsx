"use client";

import { Landmark, Plus, Star, Trash2, Wallet } from "lucide-react";
import { useState } from "react";

import { ItemRow, RowMenu } from "@/components/studio-jobs/item-row";
import { Badge } from "@/components/ui/badge";
import { FieldShell, TextField } from "@/components/ui/field";
import { List } from "@/components/ui/list";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { PayoutMethod } from "@/lib/types";

/** "Bank account · Account ending 4821" */
export const payoutLabel = (method: PayoutMethod) => `${method.label} · ${method.detail}`;

export function PayoutIcon({ kind, size = 18 }: { kind: PayoutMethod["kind"]; size?: number }) {
  return (
    <span aria-hidden className="y-tile grid size-10 flex-none place-items-center !rounded-full">
      {kind === "bank" ? <Landmark size={size} /> : <Wallet size={size} />}
    </span>
  );
}

/**
 * Payout methods as rows: the default is marked; a row menu makes another the default or removes
 * one (with undo). Removing the default hands it to the next method.
 */
export function PayoutMethodList({ onAdd }: { onAdd: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const methods = me.payoutMethods(s);

  if (!methods.length) {
    return (
      <div data-tone="paper" className="y-block y-pad-md flex flex-col items-start gap-3">
        <p className="y-small y-fg-2">Add a bank account or a digital wallet so you can withdraw what you earn.</p>
        <PillButton variant="contrast" size="sm" icon={<Plus size={16} aria-hidden />} onClick={onAdd}>
          Add payout method
        </PillButton>
      </div>
    );
  }

  return (
    <List label="Payout methods">
      {methods.map((method) => (
        <ItemRow
          key={method.id}
          lead={<PayoutIcon kind={method.kind} />}
          title={method.label}
          meta={<span className="y-num">{method.detail}</span>}
          chip={
            method.isDefault ? (
              <Badge tone="neutral" icon={<Star size={14} aria-hidden className="fill-current" />}>
                Default
              </Badge>
            ) : undefined
          }
          menu={
            <RowMenu
              label={`More for ${method.label}, ${method.detail}`}
              items={[
                ...(method.isDefault
                  ? []
                  : [
                      {
                        label: "Make default",
                        icon: <Star size={16} />,
                        onSelect: () => {
                          const previous = methods.find((m) => m.isDefault);
                          actions.setDefaultPayoutMethod(method.id);
                          toast({
                            message: `Payouts go to ${method.label} from now on`,
                            action: previous
                              ? { label: "Undo", onClick: () => actions.setDefaultPayoutMethod(previous.id) }
                              : undefined,
                          });
                        },
                      },
                    ]),
                {
                  label: "Remove",
                  icon: <Trash2 size={16} />,
                  tone: "danger" as const,
                  onSelect: () => {
                    const { kind, label, detail, isDefault } = method;
                    actions.removePayoutMethod(method.id);
                    toast({
                      message: `Removed ${label}`,
                      action: {
                        label: "Undo",
                        onClick: () => {
                          const id = actions.addPayoutMethod({ kind, label, detail });
                          if (isDefault) actions.setDefaultPayoutMethod(id);
                        },
                      },
                    });
                  },
                },
              ]}
            />
          }
        />
      ))}
    </List>
  );
}

/* -------------------------------------------------------------------------- */
/* Add a payout method (V1's checks: account numbers, IBAN checksum, routing)  */
/* -------------------------------------------------------------------------- */

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

/** Letters and digits only, upper case ("12-345 678" → "12345678"). */
const squash = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** A US or Canadian account number, or an IBAN (whose checksum is checked too). */
function accountNumberError(raw: string): string | null {
  const value = squash(raw);
  if (!value) return "Enter your account number.";
  if (value.length < 4 || value.length > 34) return "That doesn't look like an account number. Check it in your banking app.";
  if (/^[A-Z]{2}\d{2}/.test(value) && value.length >= 15) {
    // ISO 13616: move the first four to the end, letters become numbers, mod 97 must equal 1.
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

/** Routing number (US) or transit and institution numbers (Canada); optional for an IBAN. */
function bankCodeError(raw: string): string | null {
  const value = squash(raw);
  if (!value) return null;
  return value.length >= 5 && value.length <= 11
    ? null
    : "Check the number: a US routing number has 9 digits, Canadian transit and institution numbers 8 together.";
}

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
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a payout method"
      description="Where your money goes when you withdraw. Payouts are free."
      width="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <PillButton variant="ghost" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton type="submit" form="add-payout-form" variant="contrast">
            Save payout method
          </PillButton>
        </div>
      }
    >
      {/* Mounted only while open, so every opening starts from an empty form. */}
      {open ? <AddPayoutForm onClose={onClose} onAdded={onAdded} /> : null}
    </Sheet>
  );
}

function AddPayoutForm({ onClose, onAdded }: { onClose: () => void; onAdded?: (id: string) => void }) {
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
  const blur = (key: keyof typeof errors) => () => setTouched((t) => ({ ...t, [key]: true }));
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    setTouched({ holder: true, bank: true, account: true, code: true, email: true });
    if (Object.values(errors).some(Boolean)) return;
    let input: Omit<PayoutMethod, "id" | "isDefault" | "creatorId">;
    if (kind === "bank") {
      input = { kind, label: form.bank.trim(), detail: `Account ending ${squash(form.account).slice(-4)}` };
    } else {
      const [user, domain] = form.email.trim().split("@");
      input = { kind, label: "Digital wallet", detail: `${user.slice(0, 2)}•••@${domain}` };
    }
    const first = me.payoutMethods(s).length === 0;
    const id = actions.addPayoutMethod(input);
    if (form.makeDefault) actions.setDefaultPayoutMethod(id);
    toast({ message: `${input.label} added${form.makeDefault || first ? " as your default" : ""}` });
    onAdded?.(id);
    onClose();
  };

  return (
    <form
      id="add-payout-form"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <SegmentedToggle
        label="Type of payout method"
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
            label="Name on the account"
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
          <FieldShell
            label="Account number"
            required
            hint="Your account number, or an IBAN outside North America. Spaces are fine."
            error={show("account")}
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                name="account"
                aria-describedby={describedBy}
                aria-invalid={show("account") ? true : undefined}
                className="y-input y-num uppercase"
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
            hint="US and Canadian accounts (in Canada, transit and institution numbers together). Leave it empty for an IBAN."
            value={form.code}
            onChange={(event) => set("code", event.target.value.slice(0, 16))}
            onBlur={blur("code")}
            error={show("code")}
          />
        </>
      ) : (
        <TextField
          label="Wallet email"
          required
          type="email"
          autoComplete="email"
          hint="The email your digital wallet uses. Payouts arrive in US dollars."
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
      <p className="y-micro y-fg-2">Prototype: no real account is connected.</p>
    </form>
  );
}
