"use client";

import { useState } from "react";

import { TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Account } from "@/lib/types";

import { isEmail } from "./controls";
import { MemberProfileForm } from "./team";

/**
 * "You": the person behind the account. Business accounts edit their team member record (name,
 * role, email); personal accounts edit their name (kept in step with their creator profile) and
 * email.
 */
export function YouForm() {
  const s = useDemo();
  const account = me.account(s);
  if (me.member(s)) return <MemberProfileForm />;
  const creator = me.creator(s);
  const name = creator?.name ?? account.name;
  return <PersonalForm key={`${account.id}:${name}`} account={account} name={name} />;
}

function PersonalForm({ account, name: savedName }: { account: Account; name: string }) {
  const toast = useToast();
  const [name, setName] = useState(savedName);
  const [email, setEmail] = useState(account.email);
  const [savedEmail, setSavedEmail] = useState(account.email);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = {
    name: name.trim().split(/\s+/).length < 2 ? "Enter your first and last name." : null,
    email: !isEmail(email) ? "Enter an email like name@example.com." : null,
  };
  const dirty = name.trim() !== savedName || email.trim() !== savedEmail;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched({ name: true, email: true });
        if (errors.name || errors.email) return;
        const clean = name.trim().replace(/\s+/g, " ");
        actions.updateAccount({ name: clean, email });
        setName(clean);
        setEmail(email.trim().toLowerCase());
        setSavedEmail(email.trim().toLowerCase());
        toast({ message: "Saved" });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={touched.name ? errors.name : null}
        />
        <TextField
          label="Email"
          required
          type="email"
          dir="ltr"
          autoComplete="email"
          hint="Only Yapp sees it. Everything else stays in your messages."
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={touched.email ? errors.email : null}
        />
      </div>
      <div>
        <PillButton type="submit" variant="contrast" disabled={!dirty}>
          Save
        </PillButton>
      </div>
    </form>
  );
}
