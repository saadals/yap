"use client";

import { CalendarClock } from "lucide-react";

import { FilterChip } from "@/components/ui/chip";
import { FieldShell, SelectField, TextArea, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { at } from "@/lib/clock";
import { cities } from "@/lib/data";
import { daysFromNow, weekdayDate } from "@/lib/format";
import { actions } from "@/lib/store";
import { countries, creatorKinds, formats, languages, niches } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

import { BIO_MAX, BIO_MIN, HEADLINE_MAX, type ProfileDraft, orders, toggleIn } from "./draft";
import { EditorSection, GroupError, GroupLabel } from "./section";

export type DraftProps = {
  draft: ProfileDraft;
  set: (fn: (draft: ProfileDraft) => ProfileDraft) => void;
  /** The error to show for a key (after a save attempt or once the field was left). */
  show: (key: string) => string | null;
  touch: (key: string) => void;
  errorCount: number;
};

/** Profile: who you are, what you make, and whether you're taking new work. */
export function ProfileSection({ creator, draft, set, show, touch, errorCount }: DraftProps & { creator: Creator }) {
  return (
    <EditorSection
      id="about"
      title="Profile"
      description="The top of your public profile, and the line under every pitch you send."
      errorCount={errorCount}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <FieldShell label="Name" optionalLabel={false} hint="Matches your ID. Change it in Settings.">
          {({ id, describedBy }) => (
            <input id={id} aria-describedby={describedBy} className="y-input y-fg-2" value={creator.name} readOnly />
          )}
        </FieldShell>
        <SelectField
          label="City"
          required
          value={draft.cityId}
          onChange={(event) => set((d) => ({ ...d, cityId: event.target.value }))}
          options={cities.map((c) => ({ value: c.id, label: `${c.name}, ${countries[c.countryId].name}` }))}
        />
      </div>
      <TextField
        label="Headline"
        name="headline"
        required
        maxLength={HEADLINE_MAX}
        value={draft.headline}
        onChange={(event) => set((d) => ({ ...d, headline: event.target.value }))}
        onBlur={() => touch("headline")}
        hint={`${draft.headline.length}/${HEADLINE_MAX} · e.g. “App demos that sound like your smart friend”`}
        error={show("headline")}
      />
      <TextArea
        label="Bio"
        name="bio"
        required
        rows={5}
        maxLength={BIO_MAX}
        value={draft.bio}
        onChange={(event) => set((d) => ({ ...d, bio: event.target.value }))}
        onBlur={() => touch("bio")}
        hint={`${draft.bio.length}/${BIO_MAX} · at least ${BIO_MIN}`}
        error={show("bio")}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="y-label mb-3 w-full">
          <span>What kind of creator you are</span>
        </legend>
        <div className="grid gap-2 md:grid-cols-3">
          {creatorKinds.map((kind) => {
            const Icon = kind.icon;
            const checked = draft.kind === kind.id;
            return (
              <label
                key={kind.id}
                className={`y-tile y-hoverable flex cursor-pointer items-start gap-3 p-3.5 ${checked ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
              >
                <input
                  type="radio"
                  name="creator-kind"
                  className="y-check mt-0.5 !rounded-full"
                  checked={checked}
                  onChange={() => set((d) => ({ ...d, kind: kind.id }))}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="y-small flex items-center gap-1.5 font-semibold">
                    <Icon size={15} aria-hidden /> {kind.name}
                  </span>
                  <span className="y-micro y-fg-2">{kind.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <GroupLabel id="languages-label" label="Languages you make videos in" note={`${draft.languages.length} picked`} />
        <div role="group" aria-labelledby="languages-label" className="flex flex-wrap gap-1.5">
          {languages.map((lang) => (
            <FilterChip
              key={lang.id}
              pressed={draft.languages.includes(lang.id)}
              onClick={() => set((d) => ({ ...d, languages: toggleIn(orders.languages, d.languages, lang.id) }))}
            >
              {lang.name}
            </FilterChip>
          ))}
        </div>
        {show("languages") ? <GroupError>{show("languages")}</GroupError> : null}
      </div>

      <div className="flex flex-col gap-3">
        <GroupLabel id="formats-label" label="Formats you make" note={`${draft.formats.length} picked`} />
        <div role="group" aria-labelledby="formats-label" className="flex flex-wrap gap-1.5">
          {formats.map((format) => {
            const Icon = format.icon;
            return (
              <FilterChip
                key={format.id}
                pressed={draft.formats.includes(format.id)}
                icon={<Icon size={15} aria-hidden />}
                onClick={() => set((d) => ({ ...d, formats: toggleIn(orders.formats, d.formats, format.id) }))}
              >
                {format.name}
              </FilterChip>
            );
          })}
        </div>
        {show("formats") ? <GroupError>{show("formats")}</GroupError> : null}
      </div>

      <div className="flex flex-col gap-3">
        <GroupLabel id="niches-label" label="Categories you know" note="Optional" />
        <div role="group" aria-labelledby="niches-label" className="flex flex-wrap gap-1.5">
          {niches.map((niche) => (
            <FilterChip
              key={niche.id}
              pressed={draft.niches.includes(niche.id)}
              onClick={() => set((d) => ({ ...d, niches: toggleIn(orders.niches, d.niches, niche.id) }))}
            >
              {niche.name}
            </FilterChip>
          ))}
        </div>
      </div>

      <Availability creator={creator} />
    </EditorSection>
  );
}

const BACK_IN = [7, 14, 21, 30];

/**
 * Taking new work: a switch that saves right away (it mirrors vacation mode in Settings). When
 * away, brands see the return date and can't send direct offers; active work carries on.
 */
function Availability({ creator }: { creator: Creator }) {
  const toast = useToast();
  const returnIn = creator.availableFrom ? Math.max(1, daysFromNow(creator.availableFrom)) : 14;

  const apply = (available: boolean, availableFrom?: string) => {
    actions.updateCreator(creator.id, { available, availableFrom: available ? undefined : availableFrom });
    actions.updateSettings("creator", { vacationMode: !available });
  };

  const toggle = (available: boolean) => {
    const previous = { available: creator.available, availableFrom: creator.availableFrom };
    const from = available ? undefined : at(returnIn, "09:00");
    apply(available, from);
    toast({
      message: available
        ? "You're taking new work again. Brands can send you direct offers."
        : `You're away until ${weekdayDate(from ?? at(14))}. Active work isn't affected.`,
      action: { label: "Undo", onClick: () => apply(previous.available, previous.availableFrom) },
    });
  };

  return (
    <div id="availability" className="flex scroll-mt-32 flex-col gap-4 border-t border-(--b-line) pt-6 xl:scroll-mt-20">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="available-switch" className="y-head cursor-pointer">
            Taking new work
          </label>
          <p id="availability-desc" className="y-small y-fg-2">
            {creator.available
              ? "You show up in Discover and brands can send you direct offers. Saves right away."
              : `Away until ${creator.availableFrom ? weekdayDate(creator.availableFrom) : "you switch back"}. Brands see the date; active work carries on.`}
          </p>
        </div>
        <input
          id="available-switch"
          type="checkbox"
          role="switch"
          className="y-switch mt-1"
          aria-describedby="availability-desc"
          checked={creator.available}
          onChange={(event) => toggle(event.target.checked)}
        />
      </div>
      {!creator.available ? (
        <label className="flex max-w-xs flex-col gap-2">
          <span className="y-label">
            <span className="flex items-center gap-1.5">
              <CalendarClock size={16} aria-hidden /> Back on
            </span>
          </span>
          <select
            className="y-input"
            value={BACK_IN.includes(returnIn) ? String(returnIn) : "custom"}
            onChange={(event) => {
              const days = Number(event.target.value);
              if (!days) return;
              apply(false, at(days, "09:00"));
              toast({ message: `Back on ${weekdayDate(at(days, "09:00"))}.` });
            }}
          >
            {!BACK_IN.includes(returnIn) ? (
              <option value="custom">{creator.availableFrom ? weekdayDate(creator.availableFrom) : "Pick a date"}</option>
            ) : null}
            {BACK_IN.map((days) => (
              <option key={days} value={days}>
                {weekdayDate(at(days, "09:00"))} · in {days} days
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
