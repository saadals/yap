"use client";

import { AlertCircle, Check } from "lucide-react";
import { useState } from "react";

import { FilterChip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/format";
import { actions } from "@/lib/store";
import { formats, languageById, languages, niches, platforms } from "@/lib/taxonomy";
import type { Creator, FormatId, LanguageId, NicheId, PlatformId } from "@/lib/types";

import { ProfileSection, useDraft } from "./section";

type Skills = {
  languages: LanguageId[];
  formats: FormatId[];
  niches: NicheId[];
  platforms: PlatformId[];
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
      <AlertCircle size={16} aria-hidden /> {children}
    </p>
  );
}

export function SkillsSection({ creator }: { creator: Creator }) {
  const toast = useToast();
  const { draft, set, dirty, reset } = useDraft<Skills>({
    languages: creator.languages,
    formats: creator.formats,
    niches: creator.niches,
    platforms: creator.platforms,
  });
  const [attempted, setAttempted] = useState(false);
  const errors = {
    languages: draft.languages.length ? null : "Pick at least one language.",
    formats: draft.formats.length ? null : "Pick at least one format you make.",
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const showErrors = attempted || dirty;

  return (
    <ProfileSection
      id="skills"
      title="Languages, formats and categories"
      description="These drive your fit score. List only what you'd happily deliver."
      summary={[
        creator.languages.map((l) => languageById[l].name).join(", "),
        plural(creator.formats.length, "format"),
        plural(creator.niches.length, "category", "categories"),
      ].join(" · ")}
      dirty={dirty}
      attempted={attempted}
      errorCount={errorCount}
      saveLabel="Save skills"
      onDiscard={() => {
        reset();
        setAttempted(false);
      }}
      onSave={() => {
        setAttempted(true);
        if (errorCount) return;
        actions.updateCreator(creator.id, {
          // keep taxonomy order so chips read consistently everywhere
          languages: languages.map((l) => l.id).filter((id) => draft.languages.includes(id)),
          formats: draft.formats,
          niches: draft.niches,
          platforms: platforms.map((p) => p.id).filter((id) => draft.platforms.includes(id)),
        });
        setAttempted(false);
        toast({ message: "Saved. Your fit scores update right away." });
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="y-label mb-3 w-full">
          <span>Languages you make videos in</span>
          <span className="y-micro y-fg-3 font-medium">{draft.languages.length} selected</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {languages.map((lang) => (
            <FilterChip
              key={lang.id}
              pressed={draft.languages.includes(lang.id)}
              onClick={() => set((d) => ({ ...d, languages: toggle(d.languages, lang.id) }))}
            >
              {lang.name}
            </FilterChip>
          ))}
        </div>
        {showErrors && errors.languages ? <FieldError>{errors.languages}</FieldError> : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="y-label mb-3 w-full">
          <span>Formats you make</span>
          <span className="y-micro y-fg-3 font-medium">{draft.formats.length} selected</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {formats.map((format) => {
            const Icon = format.icon;
            const on = draft.formats.includes(format.id);
            return (
              <button
                key={format.id}
                type="button"
                aria-pressed={on}
                onClick={() => set((d) => ({ ...d, formats: toggle(d.formats, format.id) }))}
                className={`y-tile y-hoverable flex items-start gap-3 p-4 text-start ${
                  on ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
                }`}
              >
                <span
                  className={`grid size-10 flex-none place-items-center rounded-full ${
                    on ? "bg-(--b-fg) text-(--b-bg)" : "bg-(--b-bg)"
                  }`}
                  aria-hidden
                >
                  {on ? <Check size={18} strokeWidth={2.75} /> : <Icon size={18} />}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="y-small font-semibold">{format.name}</span>
                  <span className="y-micro y-fg-2">{format.short}</span>
                </span>
              </button>
            );
          })}
        </div>
        {showErrors && errors.formats ? <FieldError>{errors.formats}</FieldError> : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="y-label mb-3 w-full">
          <span>Categories</span>
          <span className="y-micro y-fg-3 font-medium">Optional</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {niches.map((niche) => (
            <FilterChip
              key={niche.id}
              pressed={draft.niches.includes(niche.id)}
              onClick={() => set((d) => ({ ...d, niches: toggle(d.niches, niche.id) }))}
            >
              {niche.name}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="y-label mb-3 w-full">
          <span>Platforms you know well</span>
          <span className="y-micro y-fg-3 font-medium">Optional</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <FilterChip
              key={platform.id}
              pressed={draft.platforms.includes(platform.id)}
              onClick={() => set((d) => ({ ...d, platforms: toggle(d.platforms, platform.id) }))}
            >
              {platform.name}
            </FilterChip>
          ))}
        </div>
      </fieldset>
    </ProfileSection>
  );
}
