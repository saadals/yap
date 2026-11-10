"use client";

import { Check, History, Minus, Plus, Sparkles, Square } from "lucide-react";
import { useState } from "react";

import { Block } from "@/components/ui/block";
import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { shortDate } from "@/lib/format";

import { wordCount } from "./shared";
import type { StepProps } from "./step-props";
import { ListEditor, Question, ReferenceEditor, StrengthMeter } from "./wizard-parts";

export type Helper = {
  running: boolean;
  used: boolean;
  start: () => void;
  stop: () => void;
};

/** Brief help: live score with concrete next steps. */
export function BriefStrengthBlock({
  strength,
  className = "",
}: {
  strength: { score: number; tips: string[]; label: string };
  className?: string;
}) {
  return (
    <Block
      as="section"
      aria-labelledby="brief-strength"
      tone="paper"
      pad="md"
      className={`flex flex-col gap-4 ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h2 id="brief-strength" className="y-head flex items-center gap-2">
          <Sparkles size={18} aria-hidden className="flex-none" />
          Brief strength
        </h2>
        <p className="y-micro y-fg-2">Clear briefs get sharper pitches and fewer revision rounds.</p>
      </div>
      <StrengthMeter score={strength.score} label={strength.label} />
      {strength.tips.length ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {strength.tips.slice(0, 3).map((tip) => (
            <li key={tip} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-(--b-chip)">
                <Plus size={12} strokeWidth={3} aria-hidden />
              </span>
              <span className="y-small">{tip}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small flex items-center gap-2 font-semibold" aria-live="polite">
          <Check size={16} aria-hidden /> Nothing missing. Creators will love this brief.
        </p>
      )}
    </Block>
  );
}

export function DirectionStep({
  s,
  form,
  set,
  product,
  error,
  touch,
  helper,
  strength,
}: StepProps & {
  helper: Helper;
  strength: { score: number; tips: string[]; label: string };
}) {
  const words = wordCount(form.keyMessage);
  const learnings = product?.learnings ?? [];
  // Optional extras stay folded away until asked for (or already filled in).
  const [extras, setExtras] = useState(() => form.references.length > 0 || form.notes.trim().length > 0);
  const toggleIn = (key: "mustInclude" | "avoid", text: string) =>
    set((f) => {
      const list = f[key].includes(text) ? f[key].filter((x) => x !== text) : [...f[key], text];
      return key === "mustInclude" ? { mustInclude: list } : { avoid: list };
    });

  return (
    <>
      <BriefStrengthBlock strength={strength} className="lg:hidden" />

      <Question
        id="q-audience"
        title="Who is it for?"
        hint={product ? `Prefilled from ${product.name}. Tune it for this video if it's narrower.` : undefined}
      >
        <TextArea
          label="Audience"
          required
          rows={3}
          value={form.audience}
          error={error("audience")}
          onChange={(event) => set({ audience: event.target.value })}
          onBlur={() => touch("audience")}
          placeholder="Who they are, where they live, what their day looks like"
        />
      </Question>

      <Question
        id="q-goal"
        title="What should it achieve?"
        hint="One goal and one message. Creators will build the hook and the call to action around them."
      >
        <div className="y-tile flex flex-wrap items-center gap-3 p-3 ps-4">
          <Sparkles size={18} aria-hidden className="flex-none" />
          <p className="y-small min-w-0 flex-1">
            {helper.running ? (
              <span role="status">Writing a first draft from {product?.name ?? "your product"}…</span>
            ) : helper.used ? (
              "Drafted from your product and format. Edit anything."
            ) : (
              "Not sure how to put it? Get a first draft from your product and format."
            )}
          </p>
          {helper.running ? (
            <PillButton size="sm" variant="outline" icon={<Square size={14} aria-hidden />} onClick={helper.stop}>
              Stop
            </PillButton>
          ) : (
            <PillButton
              size="sm"
              variant="contrast"
              icon={<Sparkles size={16} aria-hidden />}
              onClick={helper.start}
              disabled={!product}
            >
              {helper.used || (form.goal && form.keyMessage) ? "Write it again" : "Help me write this"}
            </PillButton>
          )}
        </div>
        <TextArea
          label="Goal"
          required
          rows={3}
          value={form.goal}
          error={error("goal")}
          onChange={(event) => set({ goal: event.target.value })}
          onBlur={() => touch("goal")}
          placeholder="What should viewers do or feel after watching?"
          aria-busy={helper.running || undefined}
        />
        <TextField
          label="Key message"
          required
          value={form.keyMessage}
          error={error("keyMessage")}
          hint={`The one line they should remember. ${words ? `${words} word${words === 1 ? "" : "s"}` : "Aim for under 15 words"}${words > 15 ? " — try to trim it" : ""}.`}
          onChange={(event) => set({ keyMessage: event.target.value })}
          onBlur={() => touch("keyMessage")}
          placeholder="e.g. Send an invoice on WhatsApp in 10 seconds"
          aria-busy={helper.running || undefined}
        />
      </Question>

      {learnings.length ? (
        <Block as="section" aria-labelledby="q-learnings" tone="paper" pad="md" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="q-learnings" className="y-head flex items-center gap-2">
              <History size={18} aria-hidden /> Carried forward from past commissions
            </h2>
            <p className="y-small y-fg-2 max-w-[60ch]">
              What you learned on earlier {product?.name} videos. Add any of it to this brief in one tap.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {learnings.map((learning) => {
              const creator = s.creators.find((c) => c.id === learning.creatorId);
              const inMust = form.mustInclude.includes(learning.text);
              const inAvoid = form.avoid.includes(learning.text);
              return (
                <li key={learning.id} className="y-tile flex flex-col gap-3 p-4">
                  <p className="y-small font-medium">{learning.text}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="y-micro y-fg-2 me-auto">
                      {creator ? `From ${creator.firstName}'s commission` : "From a past commission"} · {shortDate(learning.createdAt)}
                    </span>
                    {inMust || inAvoid ? (
                      <>
                        <span className="y-badge" data-tone-badge="ink">
                          <Check size={14} aria-hidden /> In {inMust ? "must include" : "avoid"}
                        </span>
                        <PillButton
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleIn(inMust ? "mustInclude" : "avoid", learning.text)}
                          aria-label={`Remove "${learning.text}" from ${inMust ? "must include" : "avoid"}`}
                        >
                          Remove
                        </PillButton>
                      </>
                    ) : (
                      <>
                        <PillButton
                          size="sm"
                          variant="contrast"
                          icon={<Plus size={16} aria-hidden />}
                          onClick={() => toggleIn("mustInclude", learning.text)}
                          aria-label={`Add "${learning.text}" to must include`}
                        >
                          Must include
                        </PillButton>
                        <PillButton
                          size="sm"
                          variant="soft"
                          icon={<Minus size={16} aria-hidden />}
                          onClick={() => toggleIn("avoid", learning.text)}
                          aria-label={`Add "${learning.text}" to avoid`}
                        >
                          Avoid
                        </PillButton>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Block>
      ) : null}

      <Question
        id="q-must"
        title="Must include"
        hint={product ? `Prefilled from ${product.name}'s dos. Keep the ones that matter for this video.` : "Shots, lines or moments the video needs."}
      >
        <ListEditor
          label="Must include"
          items={form.mustInclude}
          onChange={(mustInclude) => set({ mustInclude })}
          placeholder="e.g. Show the WhatsApp send moment"
          marker={
            <span className="grid size-5 place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
              <Check size={12} strokeWidth={3} />
            </span>
          }
        />
      </Question>

      <Question
        id="q-avoid"
        title="Please avoid"
        hint={product ? `Prefilled from ${product.name}'s don'ts.` : "Words, claims or visuals to stay away from."}
      >
        <ListEditor
          label="Please avoid"
          items={form.avoid}
          onChange={(avoid) => set({ avoid })}
          placeholder="e.g. Don't mention other apps"
          marker={
            <span className="grid size-5 place-items-center rounded-full bg-(--b-bg) shadow-[inset_0_0_0_1.5px_var(--b-line)]">
              <Minus size={12} strokeWidth={3} />
            </span>
          }
        />
      </Question>

      {extras ? (
        <>
          <Question
            id="q-refs"
            title="References you like"
            optional
            hint="A video or account, and what you like about it. One good reference saves a revision round."
          >
            <ReferenceEditor items={form.references} onChange={(references) => set({ references })} />
          </Question>

          <Question id="q-notes" title="Anything else?" optional>
            <TextArea
              label="Notes for creators"
              rows={3}
              value={form.notes}
              onChange={(event) => set({ notes: event.target.value })}
              placeholder="Setting, wardrobe, what worked before, how you'll use the video"
            />
          </Question>
        </>
      ) : (
        <Block tone="paper" pad="none" className="p-2">
          <button
            type="button"
            aria-expanded={false}
            onClick={() => setExtras(true)}
            className="y-body flex min-h-14 w-full items-center gap-2 rounded-(--y-r-tile) px-4 text-start font-semibold transition-colors hover:bg-(--b-chip)"
          >
            <Plus size={18} aria-hidden /> Add references or notes
            <span className="y-small y-fg-3 font-medium">Optional</span>
          </button>
        </Block>
      )}
    </>
  );
}
