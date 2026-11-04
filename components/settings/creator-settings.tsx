"use client";

import {
  BadgeCheck,
  BellRing,
  KeyRound,
  Laptop,
  Palmtree,
  Smartphone,
  Tablet,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/chip";
import { FieldShell, TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { addDays, at } from "@/lib/clock";
import { longDate, money } from "@/lib/format";
import { me, opportunities } from "@/lib/selectors";
import { ME, actions, useDemo } from "@/lib/store";
import { formats, languages } from "@/lib/taxonomy";
import type { Creator, FormatId, LanguageId } from "@/lib/types";

import { ConfirmSheet } from "./confirm-sheet";
import { RowList, SwitchRow, isEmail } from "./controls";

/** "2026-11-20" in Riyadh time. */
const dayOf = (iso: string) => new Date(Date.parse(iso) + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
const tomorrow = dayOf(at(1));

/* -------------------------------------------------------------------------- */
/* Availability                                                                */
/* -------------------------------------------------------------------------- */

export function AvailabilityControls() {
  const s = useDemo();
  const toast = useToast();
  const creator = me.creator(s);
  const vacation = s.settings.creator.vacationMode;
  const returnDay = creator.availableFrom ? dayOf(creator.availableFrom) : "";
  const [dateError, setDateError] = useState<string | null>(null);
  const [reply, setReply] = useState(
    "Thanks for reaching out! I'm away right now and will reply as soon as I'm back. Active projects are on track.",
  );
  const [savedReply, setSavedReply] = useState(reply);

  return (
    <div className="flex flex-col gap-5">
      <RowList>
        <SwitchRow
          label="Available for new work"
          icon={<Zap size={18} />}
          description={
            vacation
              ? "Turn off vacation mode to change this."
              : creator.available
                ? "You show as available in search and match alerts."
                : "You show as booked. Businesses can still message you."
          }
          checked={creator.available}
          disabled={vacation}
          onChange={(available) => {
            actions.updateCreator(ME.creatorId, { available });
            toast({
              message: available ? "You're shown as available for new work" : "You're shown as booked",
              action: { label: "Undo", onClick: () => actions.updateCreator(ME.creatorId, { available: !available }) },
            });
          }}
        />
        <SwitchRow
          label="Vacation mode"
          icon={<Palmtree size={18} />}
          description="Pauses new offers and hides you from search. Work in progress carries on."
          checked={vacation}
          onChange={(on) => {
            const before = { available: creator.available, availableFrom: creator.availableFrom };
            actions.updateSettings("creator", { vacationMode: on });
            if (on) {
              actions.updateCreator(ME.creatorId, {
                available: false,
                availableFrom: creator.availableFrom ?? addDays(at(0, "09:00"), 14),
              });
            } else {
              actions.updateCreator(ME.creatorId, { available: true, availableFrom: undefined });
            }
            setDateError(null);
            toast({
              message: on ? "Vacation mode on. New offers are paused." : "Welcome back. You're available for new work.",
              action: {
                label: "Undo",
                onClick: () => {
                  actions.updateSettings("creator", { vacationMode: !on });
                  actions.updateCreator(ME.creatorId, before);
                },
              },
            });
          }}
        />
      </RowList>

      {vacation ? (
        <div className="y-tile flex flex-col gap-4 p-4">
          <FieldShell
            label="Back on"
            required
            hint={returnDay ? `Your profile says “Back ${longDate(`${returnDay}T09:00:00+03:00`)}”.` : "Clients see this on your profile."}
            error={dateError}
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                type="date"
                aria-describedby={describedBy}
                aria-invalid={dateError ? true : undefined}
                className="y-input !bg-(--b-bg) sm:max-w-xs"
                min={tomorrow}
                value={returnDay}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value || value < tomorrow) {
                    setDateError("Pick a date from tomorrow onwards.");
                    return;
                  }
                  setDateError(null);
                  actions.updateCreator(ME.creatorId, { availableFrom: `${value}T06:00:00.000Z` });
                }}
              />
            )}
          </FieldShell>
          <div className="flex flex-col gap-3">
            <TextArea
              label="Auto-reply"
              hint={`Sent once to anyone who messages you. ${280 - reply.length} characters left.`}
              rows={3}
              maxLength={280}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              className="[&_textarea]:!bg-(--b-bg)"
            />
            <div className="flex flex-wrap items-center gap-2">
              <PillButton
                variant="contrast"
                size="sm"
                disabled={reply.trim() === savedReply.trim() || reply.trim().length < 10}
                onClick={() => {
                  setSavedReply(reply.trim());
                  setReply(reply.trim());
                  toast({ message: "Auto-reply saved" });
                }}
              >
                Save auto-reply
              </PillButton>
              {reply.trim().length < 10 ? (
                <span className="y-micro y-fg-2">Write at least a short sentence.</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Opportunity alerts                                                          */
/* -------------------------------------------------------------------------- */

export function AlertControls() {
  const s = useDemo();
  const toast = useToast();
  const creator = me.creator(s);
  const prefs = s.settings.creator;
  const [alertFormats, setAlertFormats] = useState<FormatId[]>(creator.formats);
  const [alertLangs, setAlertLangs] = useState<LanguageId[]>(creator.languages);

  const matching = opportunities(s).filter(
    ({ request, hidden }) =>
      !hidden &&
      request.budget.max >= prefs.minBudget &&
      alertFormats.includes(request.brief.format) &&
      request.brief.languages.some((l) => alertLangs.includes(l)),
  ).length;

  /** Toggle a chip, keeping at least one selected. Applies straight away. */
  const toggle = <T,>(list: T[], value: T, what: string): T[] => {
    if (!list.includes(value)) return [...list, value];
    if (list.length === 1) {
      toast({ message: `Keep at least one ${what} so alerts can match`, tone: "info" });
      return list;
    }
    return list.filter((item) => item !== value);
  };

  return (
    <div className="flex flex-col gap-5">
      <RowList>
        <SwitchRow
          label="Match alerts"
          icon={<BellRing size={18} />}
          description="New requests that fit your formats, dialects and budget."
          checked={prefs.matchAlerts}
          onChange={(on) => {
            actions.updateSettings("creator", { matchAlerts: on });
            toast({
              message: on ? "Match alerts on" : "Match alerts off. You can still browse opportunities.",
              action: { label: "Undo", onClick: () => actions.updateSettings("creator", { matchAlerts: !on }) },
            });
          }}
        />
      </RowList>

      <fieldset
        disabled={!prefs.matchAlerts}
        className={`flex flex-col gap-5 transition-opacity ${prefs.matchAlerts ? "" : "opacity-55"}`}
      >
        <legend className="sr-only">Alert preferences</legend>
        <div className="flex flex-col gap-3">
          <label htmlFor="min-budget" className="y-label">
            <span>Minimum budget</span>
            <span className="y-display y-num text-2xl font-semibold">{money(prefs.minBudget)}</span>
          </label>
          <input
            id="min-budget"
            type="range"
            className="y-range"
            min={0}
            max={1000}
            step={10}
            value={prefs.minBudget}
            aria-valuetext={`${money(prefs.minBudget)} or more`}
            aria-describedby="min-budget-hint"
            onChange={(event) => actions.updateSettings("creator", { minBudget: Number(event.target.value) })}
          />
          <p id="min-budget-hint" className="y-micro y-fg-2" aria-live="polite">
            <span className="font-semibold text-(--b-fg)">
              {matching} open request{matching === 1 ? "" : "s"}
            </span>{" "}
            match right now.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="y-label" id="alert-formats">
            Formats
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="alert-formats">
            {formats.map((format) => {
              const Icon = format.icon;
              return (
                <FilterChip
                  key={format.id}
                  pressed={alertFormats.includes(format.id)}
                  onClick={() => setAlertFormats(toggle(alertFormats, format.id, "format"))}
                  icon={<Icon size={16} aria-hidden />}
                >
                  {format.name}
                </FilterChip>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="y-label" id="alert-dialects">
            Dialects and languages
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="alert-dialects">
            {languages.map((lang) => (
              <FilterChip
                key={lang.id}
                pressed={alertLangs.includes(lang.id)}
                onClick={() => setAlertLangs(toggle(alertLangs, lang.id, "dialect"))}
              >
                {lang.short}
                {lang.id !== "en" ? (
                  <span dir="rtl" lang="ar" className="ms-1 opacity-70">
                    {lang.native}
                  </span>
                ) : null}
              </FilterChip>
            ))}
          </div>
        </div>
      </fieldset>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Account                                                                     */
/* -------------------------------------------------------------------------- */

type Device = { id: string; name: string; detail: string; icon: React.ReactNode; current?: boolean };

const seedDevices: Device[] = [
  { id: "d-1", name: "iPhone 15", detail: "Safari · Dubai, UAE · Active now", icon: <Smartphone size={18} />, current: true },
  { id: "d-2", name: "MacBook Air", detail: "Chrome · Dubai, UAE · Yesterday", icon: <Laptop size={18} /> },
  { id: "d-3", name: "iPad", detail: "Safari · Abu Dhabi, UAE · 12 Oct", icon: <Tablet size={18} /> },
];

export function AccountControls() {
  const s = useDemo();
  const creator = me.creator(s);
  return <AccountInner creator={creator} />;
}

function AccountInner({ creator }: { creator: Creator }) {
  const toast = useToast();
  const [name, setName] = useState(creator.name);
  const [email, setEmail] = useState("layla@laylatalks.com");
  const [savedEmail, setSavedEmail] = useState(email);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [devices, setDevices] = useState(seedDevices);
  const [password, setPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const errors = {
    name: name.trim().split(/\s+/).length < 2 ? "Enter your first and last name." : null,
    email: !isEmail(email) ? "Enter an email like layla@example.com." : null,
  };
  const dirty = name.trim() !== creator.name || email.trim() !== savedEmail;

  const signOut = (device: Device) => {
    setDevices((list) => list.filter((d) => d.id !== device.id));
    toast({
      message: `Signed out of ${device.name}`,
      action: {
        label: "Undo",
        onClick: () => setDevices((list) => seedDevices.filter((d) => d.id === device.id || list.some((x) => x.id === d.id))),
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched({ name: true, email: true });
          if (errors.name || errors.email) return;
          const clean = name.trim().replace(/\s+/g, " ");
          if (clean !== creator.name) {
            actions.updateCreator(ME.creatorId, { name: clean, firstName: clean.split(" ")[0] });
          }
          setName(clean);
          setEmail(email.trim());
          setSavedEmail(email.trim());
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
          <FieldShell
            label="Handle"
            optionalLabel={false}
            hint="Part of your profile link, so it can't change."
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                aria-describedby={describedBy}
                className="y-input y-fg-2 cursor-not-allowed"
                value={`@${creator.handle}`}
                readOnly
              />
            )}
          </FieldShell>
        </div>
        <TextField
          label="Email"
          required
          type="email"
          autoComplete="email"
          hint="Clients never see it."
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={touched.email ? errors.email : null}
        />
        <div className="flex flex-wrap items-center gap-2">
          <PillButton type="submit" variant="contrast" disabled={!dirty}>
            Save account details
          </PillButton>
          <PillButton variant="soft" icon={<KeyRound size={18} aria-hidden />} onClick={() => setPassword(true)}>
            Change password
          </PillButton>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3 border-t border-(--b-line) pt-5">
        <div className="min-w-0 flex-1">
          <h3 className="y-head">ID verification</h3>
          <p className="y-micro y-fg-2">
            {creator.verified
              ? "Verified with your Emirates ID."
              : "Get a badge clients trust. It takes about 2 minutes."}
          </p>
        </div>
        {creator.verified ? (
          <Badge tone="success" icon={<BadgeCheck size={14} aria-hidden />}>
            Verified
          </Badge>
        ) : (
          <PillButton
            variant="contrast"
            size="sm"
            onClick={() =>
              toast({ message: "ID checks aren't part of this prototype. In the live product this opens a secure check.", tone: "info" })
            }
          >
            Verify ID
          </PillButton>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-(--b-line) pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="y-head">Signed-in devices</h3>
          {devices.length > 1 ? (
            <PillButton
              variant="ghost"
              size="sm"
              onClick={() => {
                const before = devices;
                setDevices((list) => list.filter((d) => d.current));
                toast({
                  message: "Signed out of all other devices",
                  action: { label: "Undo", onClick: () => setDevices(before) },
                });
              }}
            >
              Sign out of other devices
            </PillButton>
          ) : null}
        </div>
        <ul className="flex flex-col divide-y divide-(--b-line)">
          {devices.map((device) => (
            <li key={device.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span aria-hidden className="y-tile grid size-10 flex-none place-items-center !rounded-full">
                {device.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="y-small flex items-center gap-2 font-semibold">
                  {device.name}
                  {device.current ? (
                    <Badge tone="neutral" className="!min-h-6 !px-2 text-xs">
                      This device
                    </Badge>
                  ) : null}
                </p>
                <p className="y-micro y-fg-2 truncate">{device.detail}</p>
              </div>
              {!device.current ? (
                <PillButton variant="ghost" size="sm" onClick={() => signOut(device)} aria-label={`Sign out of ${device.name}`}>
                  Sign out
                </PillButton>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--b-line) pt-5">
        <div className="min-w-0">
          <h3 className="y-head">Delete account</h3>
          <p className="y-micro y-fg-2">Finish active commissions first. Anything in protection is paid out.</p>
        </div>
        <PillButton variant="ghost" size="sm" icon={<Trash2 size={16} aria-hidden />} onClick={() => setDeleting(true)}>
          Delete account
        </PillButton>
      </div>

      <PasswordSheet open={password} onClose={() => setPassword(false)} />
      <ConfirmSheet
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete your account?"
        description="Your profile, portfolio, reviews and pitches will be removed for good. This can't be undone."
        confirmLabel="Delete account"
        typed={creator.handle}
        onConfirm={() => {
          setDeleting(false);
          toast({
            message: "This is a demo, so your account stays. In the live product it would close after any payouts land.",
            tone: "info",
          });
        }}
      />
    </div>
  );
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = {
    current: form.current.length < 1 ? "Enter your current password." : null,
    next:
      form.next.length < 10
        ? "Use at least 10 characters."
        : form.next === form.current
          ? "Choose a password you haven't used here before."
          : null,
    confirm: form.confirm !== form.next ? "The passwords don't match." : null,
  };
  const show = (key: keyof typeof errors) => (touched[key] ? errors[key] : null);
  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));
  const close = () => {
    setForm({ current: "", next: "", confirm: "" });
    setTouched({});
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Change password"
      description="You'll stay signed in on this device."
      width="sm"
      footer={
        <div className="flex flex-wrap gap-2">
          <PillButton type="submit" form="password-form" variant="contrast">
            Update password
          </PillButton>
          <PillButton variant="ghost" onClick={close}>
            Cancel
          </PillButton>
        </div>
      }
    >
      <form
        id="password-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched({ current: true, next: true, confirm: true });
          if (errors.current || errors.next || errors.confirm) return;
          toast({ message: "Password updated" });
          close();
        }}
      >
        <TextField
          label="Current password"
          required
          type="password"
          autoComplete="current-password"
          value={form.current}
          onChange={(event) => setForm({ ...form, current: event.target.value })}
          onBlur={blur("current")}
          error={show("current")}
          data-autofocus
        />
        <TextField
          label="New password"
          required
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters. A short phrase is easier to remember."
          value={form.next}
          onChange={(event) => setForm({ ...form, next: event.target.value })}
          onBlur={blur("next")}
          error={show("next")}
        />
        <TextField
          label="Confirm new password"
          required
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(event) => setForm({ ...form, confirm: event.target.value })}
          onBlur={blur("confirm")}
          error={show("confirm")}
        />
        <p className="y-micro y-fg-3">Prototype: passwords aren&apos;t stored.</p>
      </form>
    </Sheet>
  );
}
