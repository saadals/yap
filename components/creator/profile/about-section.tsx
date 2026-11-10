"use client";

import { useState } from "react";

import { FieldShell, SelectField, TextArea, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cities } from "@/lib/data";
import { actions } from "@/lib/store";
import { countries, creatorKinds } from "@/lib/taxonomy";
import type { Creator, CreatorKind } from "@/lib/types";

import { BIO_MIN } from "../profile-strength";
import { ProfileSection, useDraft } from "./section";

const HEADLINE_MAX = 60;
const BIO_MAX = 400;

type About = { headline: string; bio: string; cityId: string; kind: CreatorKind };

export function AboutSection({ creator }: { creator: Creator }) {
  const toast = useToast();
  const { draft, set, dirty, reset } = useDraft<About>({
    headline: creator.headline,
    bio: creator.bio,
    cityId: creator.cityId,
    kind: creator.kind,
  });
  const [touched, setTouched] = useState<Partial<Record<keyof About, boolean>>>({});
  const [attempted, setAttempted] = useState(false);

  const errors = {
    headline:
      draft.headline.trim().length < 10
        ? "Write a headline of at least 10 characters. It's the first line buyers read."
        : null,
    bio:
      draft.bio.trim().length < BIO_MIN
        ? `Write at least ${BIO_MIN} characters (${BIO_MIN - draft.bio.trim().length} to go). Say who you are and what you're best at.`
        : null,
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const show = (field: "headline" | "bio") => (attempted || touched[field] ? errors[field] : null);

  return (
    <ProfileSection
      id="about"
      title="About"
      description="Shown at the top of your public profile and under every pitch."
      summary={creator.headline}
      dirty={dirty}
      attempted={attempted}
      errorCount={errorCount}
      saveLabel="Save about"
      onDiscard={() => {
        reset();
        setAttempted(false);
        setTouched({});
      }}
      onSave={() => {
        setAttempted(true);
        if (errorCount) return;
        actions.updateCreator(creator.id, {
          headline: draft.headline.trim(),
          bio: draft.bio.trim(),
          cityId: draft.cityId,
          kind: draft.kind,
        });
        setAttempted(false);
        toast({ message: "About saved. It's live on your profile." });
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <FieldShell label="Name" optionalLabel={false} hint="Matches your ID. Contact support to change it.">
          {({ id, describedBy }) => (
            <input id={id} aria-describedby={describedBy} className="y-input y-fg-2" value={creator.name} readOnly />
          )}
        </FieldShell>
        <SelectField
          label="City"
          required
          value={draft.cityId}
          onChange={(e) => set((d) => ({ ...d, cityId: e.target.value }))}
          options={cities.map((c) => ({ value: c.id, label: `${c.name}, ${countries[c.countryId].name}` }))}
        />
      </div>
      <TextField
        label="Headline"
        required
        maxLength={HEADLINE_MAX}
        value={draft.headline}
        onChange={(e) => set((d) => ({ ...d, headline: e.target.value }))}
        onBlur={() => setTouched((t) => ({ ...t, headline: true }))}
        hint={`${draft.headline.length}/${HEADLINE_MAX} · e.g. "App demos that sound like your smart friend"`}
        error={show("headline")}
      />
      <TextArea
        label="Bio"
        required
        rows={6}
        maxLength={BIO_MAX}
        value={draft.bio}
        onChange={(e) => set((d) => ({ ...d, bio: e.target.value }))}
        onBlur={() => setTouched((t) => ({ ...t, bio: true }))}
        hint={`${draft.bio.length}/${BIO_MAX} · at least ${BIO_MIN}`}
        error={show("bio")}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="y-label mb-3 w-full">
          <span>Creator type</span>
          <span className="y-micro y-fg-3 font-medium">Required</span>
        </legend>
        <div className="grid gap-2 md:grid-cols-3">
          {creatorKinds.map((kind) => {
            const Icon = kind.icon;
            const checked = draft.kind === kind.id;
            return (
              <label
                key={kind.id}
                className={`y-tile y-hoverable flex cursor-pointer items-start gap-3 p-4 ${
                  checked ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
                }`}
              >
                <input
                  type="radio"
                  name="creator-kind"
                  className="y-check mt-0.5 !rounded-full"
                  checked={checked}
                  onChange={() => set((d) => ({ ...d, kind: kind.id }))}
                />
                <span className="flex flex-col gap-1">
                  <span className="y-small flex items-center gap-1.5 font-semibold">
                    <Icon size={16} aria-hidden /> {kind.name}
                  </span>
                  <span className="y-micro y-fg-2">{kind.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </ProfileSection>
  );
}
