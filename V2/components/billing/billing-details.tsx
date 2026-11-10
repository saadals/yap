"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { paths } from "@/lib/paths";
import { cityById, isPersonal, me } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { countries } from "@/lib/taxonomy";
import type { CountryId } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Persistence. The store has no fields for the legal name, tax ID or country, */
/* so they live in their own localStorage key, per buyer profile (the invoice  */
/* email lives in the account's settings). V2 keys start with "yapp2-": Reset  */
/* demo data clears them.                                                      */
/* -------------------------------------------------------------------------- */

const KEY = "yapp2-billing-details";
type Stored = { companyName?: string; vat?: string; country?: CountryId };
type StoredByBusiness = Record<string, Stored>;

const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cache: StoredByBusiness | null = null;

/** Parsed from the raw string each time it changes (so Reset, which removes the key, shows at once). */
function read(): StoredByBusiness | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = cacheRaw;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = raw ? (JSON.parse(raw) as StoredByBusiness) : null;
    } catch {
      cache = null;
    }
  }
  return cache;
}

function write(businessId: string, entry: Stored) {
  const next = { ...(read() ?? {}), [businessId]: entry };
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    /* private mode: keep it in memory */
  }
  cacheRaw = raw;
  cache = next;
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
  /** A personal buyer profile: receipts carry the person's name, no company or tax ID. */
  personal: boolean;
};

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

/** Billing details for the signed-in account's receipts: the store plus this browser's saved fields. */
export function useBillingDetails(): BillingDetails {
  const s = useDemo();
  const all = useSyncExternalStore(subscribe, read, () => null);
  const business = me.business(s);
  const personal = isPersonal(s, business.id);
  const stored = all?.[business.id];
  return {
    companyName: personal ? business.name : (stored?.companyName ?? business.name),
    vat: personal ? "" : (stored?.vat ?? ""),
    country: stored?.country ?? cityById(business.cityId)?.countryId ?? "us",
    email: me.settings(s).business.invoiceEmail,
    personal,
  };
}

const countryOptions = (Object.keys(countries) as CountryId[]).map((id) => ({ value: id, label: countries[id].name }));

function validate(form: BillingDetails) {
  return {
    companyName: !form.personal && form.companyName.trim().length < 2 ? "Enter the company name for your receipts." : null,
    vat:
      !form.personal && form.vat.trim() && !/^[A-Za-z0-9 -]{8,20}$/.test(form.vat.trim())
        ? "Use 8 to 20 letters or numbers, like 12-3456789 or 123456789 RT0001."
        : null,
    email: !isEmail(form.email) ? "Enter an email like you@example.com." : null,
  };
}

/** Personal buyers: invoices in a company name come with a business account. */
function UpgradeForCompanyInvoices() {
  return (
    <p className="y-micro y-fg-2">
      Need receipts in a company name?{" "}
      <Link href={paths.settings("business")} className="y-link font-medium text-(--b-fg)">
        Upgrade to a business account
      </Link>
    </p>
  );
}

/** Billing details as a short summary; editing happens in a sheet. */
export function BillingDetailsCard() {
  const hydrated = useHydrated();
  const details = useBillingDetails();
  const [editing, setEditing] = useState(false);

  return (
    <section aria-labelledby="details-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="details-title" className="y-head">
          Billing details
        </h2>
        <PillButton variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={!hydrated} className="-me-2">
          Edit
        </PillButton>
      </div>
      {hydrated ? (
        <dl className="y-small flex flex-col gap-1">
          <div>
            <dt className="sr-only">Billed to</dt>
            <dd>
              <span className="font-medium">{details.companyName}</span>
              <span className="y-fg-2">
                {" · "}
                {countries[details.country]?.name}
              </span>
            </dd>
          </div>
          {details.vat ? (
            <div>
              <dt className="sr-only">Tax ID</dt>
              <dd className="y-fg-2 y-num">Tax ID {details.vat}</dd>
            </div>
          ) : null}
          <div>
            <dt className="sr-only">Billing email</dt>
            <dd className="y-fg-2 break-all">Receipts go to {details.email}</dd>
          </div>
        </dl>
      ) : (
        <div className="flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      )}
      {hydrated && details.personal ? <UpgradeForCompanyInvoices /> : null}
      <Sheet open={editing} onClose={() => setEditing(false)} title="Billing details" width="sm">
        <Form key={`${details.companyName}|${details.personal}`} initial={details} onSaved={() => setEditing(false)} />
      </Sheet>
    </section>
  );
}

function Form({ initial, onSaved }: { initial: BillingDetails; onSaved: () => void }) {
  const toast = useToast();
  const s = useDemo();
  const businessId = me.ids(s).businessId;
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
        write(
          businessId,
          next.personal ? { country: next.country } : { companyName: next.companyName, vat: next.vat, country: next.country },
        );
        actions.updateSettings("business", { invoiceEmail: next.email });
        toast({ message: "Billing details saved. New receipts will use them." });
        onSaved();
      }}
    >
      {form.personal ? null : (
        <>
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
            label="Tax ID"
            hint="Your business or sales tax number (an EIN, a GST/HST number or a VAT number). It's printed on every receipt so you can claim back sales tax."
            value={form.vat}
            onChange={(event) => set("vat", event.target.value)}
            onBlur={blur("vat")}
            error={show("vat")}
            placeholder="12-3456789"
          />
        </>
      )}
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
      {form.personal ? <UpgradeForCompanyInvoices /> : null}
      <div className="pt-1">
        <PillButton type="submit" variant="contrast" disabled={!dirty}>
          Save billing details
        </PillButton>
      </div>
    </form>
  );
}
