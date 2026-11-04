"use client";

import { useState, useSyncExternalStore } from "react";

import { isEmail } from "@/components/settings/controls";
import { SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cityById, me } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { countries } from "@/lib/taxonomy";
import type { CountryId } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Persistence: the store has no fields for legal name / VAT / country, so they */
/* live in their own localStorage key (the invoice email lives in settings).    */
/* -------------------------------------------------------------------------- */

const KEY = "yapp-billing-details-v1";
type Stored = { companyName?: string; vat?: string; country?: CountryId };

let cache: Stored | null | undefined;
const listeners = new Set<() => void>();

function read(): Stored | null {
  if (cache === undefined) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Stored | null;
    } catch {
      cache = null;
    }
  }
  return cache;
}

function write(next: Stored) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: keep it in memory */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type BillingDetails = {
  companyName: string;
  vat: string;
  country: CountryId;
  email: string;
};

/** Billing details for receipts, merged from the store and this browser's saved fields. */
export function useBillingDetails(): BillingDetails {
  const s = useDemo();
  const stored = useSyncExternalStore(subscribe, read, () => null);
  const business = me.business(s);
  return {
    companyName: stored?.companyName ?? business.name,
    vat: stored?.vat ?? "",
    country: stored?.country ?? cityById(business.cityId)?.countryId ?? "sa",
    email: s.settings.business.invoiceEmail,
  };
}

const countryOptions = (Object.keys(countries) as CountryId[]).map((id) => ({
  value: id,
  label: countries[id].name,
}));

function validate(form: BillingDetails) {
  return {
    companyName: form.companyName.trim().length < 2 ? "Enter the company name for your receipts." : null,
    vat:
      form.vat.trim() && !/^[A-Za-z0-9 -]{8,20}$/.test(form.vat.trim())
        ? "Use 8 to 20 letters or numbers, like 300123456700003."
        : null,
    email: !isEmail(form.email) ? "Enter an email like finance@daftar.app." : null,
  };
}

/** Billing details as a compact summary; editing happens in a sheet. */
export function BillingDetailsCard({ titleId }: { titleId?: string }) {
  const hydrated = useHydrated();
  const details = useBillingDetails();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id={titleId} className="y-head">
          Billing details
        </h3>
        <PillButton variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={!hydrated}>
          Edit
        </PillButton>
      </div>
      {hydrated ? (
        <dl className="y-small flex flex-col gap-1">
          <div>
            <dt className="sr-only">Billed to</dt>
            <dd>
              <span className="font-semibold">{details.companyName}</span>
              <span className="y-fg-2">
                {" · "}
                {countries[details.country]?.name}
                {details.vat ? ` · VAT ${details.vat}` : ""}
              </span>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Billing email</dt>
            <dd className="y-fg-2 break-all">Receipts go to {details.email}</dd>
          </div>
        </dl>
      ) : (
        <div className="flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
      )}
      <Sheet open={editing} onClose={() => setEditing(false)} title="Billing details" width="sm">
        <Form initial={details} onSaved={() => setEditing(false)} />
      </Sheet>
    </div>
  );
}

function Form({ initial, onSaved }: { initial: BillingDetails; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = validate(form);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const show = (field: keyof typeof errors) => (touched[field] ? errors[field] : null);

  const set = <K extends keyof BillingDetails>(key: K, value: BillingDetails[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const blur = (field: string) => () => setTouched((current) => ({ ...current, [field]: true }));

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched({ companyName: true, vat: true, email: true });
        if (errors.companyName || errors.vat || errors.email) return;
        const next = { ...form, companyName: form.companyName.trim(), vat: form.vat.trim(), email: form.email.trim() };
        write({ companyName: next.companyName, vat: next.vat, country: next.country });
        actions.updateSettings("business", { invoiceEmail: next.email });
        toast({ message: "Billing details saved. New receipts will use them." });
        onSaved();
      }}
    >
      <TextField
        label="Company name"
        required
        hint="The legal name printed on every receipt."
        value={form.companyName}
        onChange={(event) => set("companyName", event.target.value)}
        onBlur={blur("companyName")}
        error={show("companyName")}
        autoComplete="organization"
        data-autofocus
      />
      <TextField
        label="VAT or tax number"
        hint="Add it if you reclaim VAT on the service fee."
        value={form.vat}
        onChange={(event) => set("vat", event.target.value)}
        onBlur={blur("vat")}
        error={show("vat")}
        inputMode="text"
        placeholder="300123456700003"
      />
      <TextField
        label="Billing email"
        required
        type="email"
        hint="Receipts are sent here."
        value={form.email}
        onChange={(event) => set("email", event.target.value)}
        onBlur={blur("email")}
        error={show("email")}
        autoComplete="email"
      />
      <SelectField
        label="Country"
        required
        options={countryOptions}
        value={form.country}
        onChange={(event) => set("country", event.target.value as CountryId)}
      />
      <div className="pt-1">
        <PillButton type="submit" variant="contrast" disabled={!dirty}>
          Save billing details
        </PillButton>
      </div>
    </form>
  );
}
