"use client";

import { Building2, FileText, Users } from "lucide-react";
import { useState } from "react";

import { SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { niches } from "@/lib/taxonomy";
import { actions } from "@/lib/store";
import type { NicheId } from "@/lib/types";

const teamSizes = ["Just me", "2–10 people", "11–50 people", "51–200 people", "200+ people"];

const perks = [
  { icon: <FileText size={18} aria-hidden />, text: "Invoices with your company name and tax ID" },
  { icon: <Users size={18} aria-hidden />, text: "A team that can order and approve work" },
  { icon: <Building2 size={18} aria-hidden />, text: "Your company name and logo on your orders" },
];

/**
 * Upgrade a personal account to a business account. Everything else stays: the same login, your
 * creator profile, wallet and history. Calls `actions.upgradeToBusinessAccount`.
 */
export function UpgradeToBusiness() {
  const toast = useToast();
  const [form, setForm] = useState<{ name: string; website: string; industry: NicheId | ""; teamSize: string }>({
    name: "",
    website: "",
    industry: "",
    teamSize: "",
  });
  const [touched, setTouched] = useState(false);
  const site = form.website.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const errors = {
    name: form.name.trim().length < 2 ? "Enter your company's name." : null,
    website: site && !/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(site) ? "Enter a web address like daftar.app." : null,
  };

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-2">
        {perks.map((perk) => (
          <li key={perk.text} className="y-small flex items-center gap-3">
            <span aria-hidden className="y-tile grid size-9 flex-none place-items-center !rounded-full">
              {perk.icon}
            </span>
            {perk.text}
          </li>
        ))}
      </ul>

      <form
        noValidate
        className="flex flex-col gap-4 border-t border-(--b-line) pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (errors.name || errors.website) return;
          actions.upgradeToBusinessAccount({
            name: form.name.trim(),
            website: site || undefined,
            industry: form.industry || undefined,
            teamSize: form.teamSize || undefined,
          });
          toast({ message: `You now have a business account for ${form.name.trim()}` });
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Company name"
            required
            autoComplete="organization"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={touched ? errors.name : null}
          />
          <TextField
            label="Website"
            inputMode="url"
            dir="ltr"
            autoComplete="url"
            placeholder="yourcompany.com"
            value={form.website}
            onChange={(event) => setForm({ ...form, website: event.target.value })}
            error={touched ? errors.website : null}
          />
          <SelectField
            label="Industry"
            options={[{ value: "", label: "Choose an industry" }, ...niches.map((n) => ({ value: n.id, label: n.name }))]}
            value={form.industry}
            onChange={(event) => setForm({ ...form, industry: event.target.value as NicheId | "" })}
          />
          <SelectField
            label="Team size"
            options={[{ value: "", label: "Choose a size" }, ...teamSizes.map((size) => ({ value: size, label: size }))]}
            value={form.teamSize}
            onChange={(event) => setForm({ ...form, teamSize: event.target.value })}
          />
        </div>
        <p className="y-micro y-fg-2">
          Same login, wallet and creator profile. Your past orders stay as they are.
        </p>
        <div>
          <PillButton type="submit" variant="contrast">
            Upgrade to a business account
          </PillButton>
        </div>
      </form>
    </div>
  );
}
