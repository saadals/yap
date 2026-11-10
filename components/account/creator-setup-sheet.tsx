"use client";

import { AtSign } from "lucide-react";
import { useId, useState } from "react";

import { FilterChip } from "@/components/ui/chip";
import { FieldShell, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { DEFAULT_LANGUAGE, formats, languages } from "@/lib/taxonomy";
import type { FormatId, LanguageId } from "@/lib/types";

import { CAMPAIGN_FLOOR, ConnectStatus, READ_ONLY_NOTE, useConnectSequence } from "./social";

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

type Form = { name: string; headline: string; languages: LanguageId[]; formats: FormatId[]; tiktok: string };
type Errors = Partial<Record<"name" | "languages" | "formats", string>>;

/**
 * "Set up your creator profile": the short sheet that gives an account a creator profile so it
 * can pitch on custom orders and take campaign slots. Opened from Profile, Settings and anywhere
 * an account without a creator profile tries to accept work. Calls `onDone(creatorId)` when made.
 */
export function CreatorSetupSheet({
  open,
  onClose,
  onDone,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  onDone?: (creatorId: string) => void;
  /** Why it opened, e.g. "to pick a slot on this campaign". */
  reason?: string;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Set up your creator profile"
      description={
        reason
          ? `You need a creator profile ${reason}. It takes a minute.`
          : "Make videos from the same account. It takes a minute, and you can add the rest later."
      }
      width="md"
      footer={
        <PillButton type="submit" form="creator-setup-form" variant="neon" size="lg" arrow className="w-full justify-between ps-6">
          Create my creator profile
        </PillButton>
      }
    >
      {/* Mounted only while open, so every opening starts from a fresh form. */}
      {open ? <SetupForm onClose={onClose} onDone={onDone} /> : null}
    </Sheet>
  );
}

function SetupForm({ onClose, onDone }: { onClose: () => void; onDone?: (creatorId: string) => void }) {
  const s = useDemo();
  const toast = useToast();
  const account = me.account(s);
  const languagesId = useId();
  const formatsId = useId();
  const connect = useConnectSequence(900);
  const [form, setForm] = useState<Form>(() => ({
    name: account.name,
    headline: "",
    languages: [DEFAULT_LANGUAGE],
    formats: [],
    tiktok: "",
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [followers, setFollowers] = useState<number | undefined>(undefined);

  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
    const keys = Object.keys(patch) as (keyof Errors)[];
    if (keys.some((key) => errors[key])) setErrors((e) => ({ ...e, ...Object.fromEntries(keys.map((k) => [k, undefined])) }));
  };

  const submit = () => {
    // Already creating (connecting TikTok, or about to close).
    if (connect.phase !== "idle") return;
    const found: Errors = {
      name: form.name.trim().length < 2 ? "Enter the name people will see." : undefined,
      languages: form.languages.length ? undefined : "Pick at least one language.",
      formats: form.formats.length ? undefined : "Pick at least one format.",
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const creatorId = actions.createCreatorProfile({
      name: form.name.trim().replace(/\s+/g, " "),
      headline: form.headline.trim(),
      languages: form.languages,
      formats: form.formats,
    });
    const finish = () => {
      toast({ message: "Your creator profile is ready" });
      onDone?.(creatorId);
      onClose();
    };
    const handle = form.tiktok.trim();
    if (!handle) {
      finish();
      return;
    }
    connect.start(() => {
      const social = actions.connectSocial(creatorId, "tiktok", handle);
      setFollowers(social.followers);
      window.setTimeout(finish, 1100);
    });
  };

  return (
    <form
      id="creator-setup-form"
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextField
        label="Name on your profile"
        required
        autoComplete="name"
        value={form.name}
        error={errors.name}
        onChange={(event) => set({ name: event.target.value })}
        hint={`Your profile link: yapp.co/${account.reserved.handle}`}
      />
      <TextField
        label="Headline"
        maxLength={80}
        placeholder="e.g. Friendly presenter for app demos and unboxings"
        hint="One line on what you make. You can change it any time."
        value={form.headline}
        onChange={(event) => set({ headline: event.target.value })}
      />

      <div className="flex flex-col gap-3">
        <p id={languagesId} className="y-label">
          <span>Languages you make videos in</span>
          <span className="y-micro y-fg-3 font-medium">Required</span>
        </p>
        <div
          role="group"
          aria-labelledby={languagesId}
          data-invalid={errors.languages ? true : undefined}
          className="flex flex-wrap gap-1.5"
        >
          {languages.map((lang) => (
            <FilterChip
              key={lang.id}
              pressed={form.languages.includes(lang.id)}
              onClick={() => set({ languages: toggle(form.languages, lang.id) })}
            >
              {lang.name}
            </FilterChip>
          ))}
        </div>
        {errors.languages ? (
          <p role="alert" className="y-micro font-medium text-(--y-danger)">
            {errors.languages}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <p id={formatsId} className="y-label">
          <span>Formats you make</span>
          <span className="y-micro y-fg-3 font-medium">Required</span>
        </p>
        <div
          role="group"
          aria-labelledby={formatsId}
          data-invalid={errors.formats ? true : undefined}
          className="flex flex-wrap gap-1.5"
        >
          {formats.map((format) => {
            const Icon = format.icon;
            return (
              <FilterChip
                key={format.id}
                pressed={form.formats.includes(format.id)}
                onClick={() => set({ formats: toggle(form.formats, format.id) })}
                icon={<Icon size={16} aria-hidden />}
              >
                {format.name}
              </FilterChip>
            );
          })}
        </div>
        {errors.formats ? (
          <p role="alert" className="y-micro font-medium text-(--y-danger)">
            {errors.formats}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-(--b-line) pt-5">
        <FieldShell
          label="Connect TikTok now"
          hint={`For UGC campaigns, which start at ${CAMPAIGN_FLOOR} followers. ${READ_ONLY_NOTE}`}
        >
          {({ id, describedBy }) => (
            <div className="relative">
              <AtSign
                size={18}
                aria-hidden
                className="y-fg-3 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2"
              />
              <input
                id={id}
                dir="ltr"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
                placeholder="yourhandle"
                aria-describedby={describedBy}
                disabled={connect.phase !== "idle"}
                value={form.tiktok}
                onChange={(event) => set({ tiktok: event.target.value.replace(/^@/, "").replace(/\s+/g, "") })}
                className="y-input ps-12"
              />
            </div>
          )}
        </FieldShell>
        <ConnectStatus phase={connect.phase} platform="tiktok" followers={followers} />
      </div>
    </form>
  );
}
