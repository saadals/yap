"use client";

import { Check, ChevronDown, History, Package, Plus, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ExplainerField } from "@/components/campaigns/explainer";
import { Note } from "@/components/ui/note";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { lengthLabel } from "@/lib/format";
import { aspects, formatById, platforms } from "@/lib/taxonomy";
import type { Aspect, FormatId, PlatformId } from "@/lib/types";

import {
  HOOK_MAX,
  LIST_MAX,
  OWN_PRODUCT_NOTE,
  hasLine,
  toggleLine,
  type NewOrderForm,
} from "./model";
import { AttachmentsField, controlProps, Fld, PillGroup, ReferenceEditor, StepCard } from "./parts";
import type { StepProps } from "./step-props";
import { draftBrief } from "./writing";

const DEFAULT_PIECES = ["5 headlines, up to 40 characters", "5 primary texts, up to 125 characters", "2 calls to action"];

/** Sensible "up to" lengths around a format's typical range. */
function lengthOptions(format: FormatId | null): number[] {
  const ladder = [5, 8, 10, 12, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300];
  if (!format) return [15, 30, 45, 60, 90];
  const [lo, hi] = formatById[format].typical;
  const inside = ladder.filter((v) => v >= lo && v <= hi);
  const picked = inside.length > 4 ? [inside[0], ...inside.slice(-3)] : inside;
  const above = ladder.find((v) => v > hi);
  return above ? [...picked, above] : picked;
}

/** Step 4: the brief. The hook, what must be shown and what not to say; files; more detail. */
export function BriefStep(props: StepProps) {
  const { form, d, set, err, headingRef } = props;
  const toast = useToast();
  const product = d.product;
  const campaign = form.kind === "campaign";
  const [helping, setHelping] = useState(false);
  const [helped, setHelped] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const stop = () => {
    window.clearInterval(timer.current);
    setHelping(false);
  };

  const help = () => {
    if (!product || helping) return;
    const draft = draftBrief(form.format, product, d.adCopy);
    const before: Partial<NewOrderForm> = { hook: form.hook, mustShow: form.mustShow, copyPieces: form.copyPieces };
    const hookWords = draft.hook.split(" ");
    const mustWords = draft.mustShow.split(" ");
    const ticks = 18;
    let tick = 0;
    setHelping(true);
    set((f) => ({
      hook: "",
      mustShow: "",
      goal: f.goal.trim() ? f.goal : draft.goal,
      keyMessage: f.keyMessage.trim() ? f.keyMessage : draft.keyMessage,
      ...(d.adCopy && !f.copyPieces.trim() ? { copyPieces: DEFAULT_PIECES.join("\n") } : {}),
    }));
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      tick += 1;
      const share = tick / ticks;
      set({
        hook: hookWords.slice(0, Math.ceil(hookWords.length * share)).join(" "),
        mustShow: mustWords.slice(0, Math.ceil(mustWords.length * share)).join(" "),
      });
      if (tick >= ticks) {
        window.clearInterval(timer.current);
        setHelping(false);
        setHelped(true);
        if ((before.hook ?? "").trim() || (before.mustShow ?? "").trim()) {
          toast({ message: "Wrote a new hook and must show", action: { label: "Undo", onClick: () => set(before) } });
        }
      }
    }, 45);
  };

  const helper = (
    <div className="y-nw-help">
      <Sparkles size={18} aria-hidden className="flex-none" />
      <p className="min-w-0 flex-1" role={helping ? "status" : undefined}>
        {helping
          ? `Writing a first draft from ${product?.name ?? "your product"}…`
          : helped
            ? "Drafted from your product and format. Edit anything."
            : product
              ? `Not sure how to put it? Get a first draft from ${product.name}${d.adCopy ? "" : " and the format"}.`
              : "Pick a saved product on Basics and we can draft this for you."}
      </p>
      {helping ? (
        <PillButton size="sm" variant="soft" icon={<Square size={14} aria-hidden />} onClick={stop}>
          Stop
        </PillButton>
      ) : (
        <PillButton
          size="sm"
          variant="contrast"
          icon={<Sparkles size={16} aria-hidden />}
          onClick={help}
          disabled={!product}
        >
          {product && (helped || (form.hook && form.mustShow)) ? "Write it again" : "Help me write this"}
        </PillButton>
      )}
    </div>
  );

  const hookErr = err("hook");
  const mustErr = err("mustShow");
  const avoidErr = err("dontSay");

  const learnings = product?.learnings ?? [];
  // Learnings first: what earlier orders taught is the part brands forget to retype.
  const mustSuggestions = [
    ...learnings.map((l) => ({ text: l.text, learning: true })),
    ...(product?.dos ?? []).map((text) => ({ text, learning: false })),
  ];
  const avoidSuggestions = (product?.donts ?? []).map((text) => ({ text, learning: false }));

  return (
    <StepCard
      title="The brief"
      hint={`Short and clear wins. Creators see this before they ${campaign ? "pick a slot" : "pitch"}.`}
      headingRef={headingRef}
    >
      {helper}

      {d.adCopy ? (
        <>
          <Fld
            field="copyPieces"
            label="What to write"
            error={err("copyPieces")}
            hint="One piece per line, with any length limits."
          >
            <textarea
              className="y-input y-nw-input"
              rows={3}
              {...controlProps("copyPieces", err("copyPieces"))}
              placeholder={DEFAULT_PIECES.join("\n")}
              value={form.copyPieces}
              onChange={(event) => set({ copyPieces: event.target.value })}
            />
          </Fld>
          <Fld
            field="copyPlacements"
            label="Where it will run"
            note="pick one or more"
            group
            labelId="nw-placements-label"
            error={err("copyPlacements")}
          >
            <PillGroup<PlatformId>
              field="copyPlacements"
              labelId="nw-placements-label"
              error={err("copyPlacements")}
              multiple
              checkmark
              options={platforms.map((p) => ({ value: p.id, label: p.name }))}
              selected={form.copyPlacements}
              onToggle={(id) =>
                set((f) => ({
                  copyPlacements: f.copyPlacements.includes(id)
                    ? f.copyPlacements.filter((p) => p !== id)
                    : platforms.map((p) => p.id).filter((p) => p === id || f.copyPlacements.includes(p)),
                }))
              }
            />
          </Fld>
        </>
      ) : null}

      <Fld
        field="hook"
        label={d.adCopy ? "The opening line or angle" : "The hook · first 2 seconds"}
        optional={d.adCopy}
        error={hookErr}
        aside={<Counter value={form.hook} max={HOOK_MAX} />}
      >
        <textarea
          className="y-input y-nw-input"
          rows={3}
          {...controlProps("hook", hookErr)}
          placeholder={
            d.adCopy
              ? "Open on the line a customer would say: “I'll pay you tomorrow”"
              : "Open on the problem: a messy inbox at 9am…"
          }
          value={form.hook}
          aria-busy={helping || undefined}
          onChange={(event) => set({ hook: event.target.value })}
        />
      </Fld>

      <Fld
        field="mustShow"
        label={d.adCopy ? "Must get across" : "Must show"}
        error={mustErr}
        aside={<Counter value={form.mustShow} max={LIST_MAX} />}
        hint={
          d.adCopy
            ? "One point per line."
            : "One per line. Each line becomes a checkbox the creator ticks before sending."
        }
      >
        <textarea
          className="y-input y-nw-input"
          rows={4}
          {...controlProps("mustShow", mustErr)}
          placeholder={d.adCopy ? "Invoices go out on WhatsApp in 10 seconds" : "The one-tap summary and the pricing screen"}
          value={form.mustShow}
          aria-busy={helping || undefined}
          onChange={(event) => set({ mustShow: event.target.value })}
        />
      </Fld>
      {mustSuggestions.length && product ? (
        <Suggestions
          label={`Add from ${product.name}`}
          items={mustSuggestions}
          text={form.mustShow}
          onToggle={(line) => set((f) => ({ mustShow: toggleLine(f.mustShow, line) }))}
          target={d.adCopy ? "must get across" : "must show"}
        />
      ) : null}

      <Fld
        field="dontSay"
        label="Don't say"
        optional
        error={avoidErr}
        hint="One per line."
      >
        <textarea
          className="y-input y-nw-input"
          rows={3}
          {...controlProps("dontSay", avoidErr)}
          placeholder="“Best”, “free forever”, competitor names"
          value={form.dontSay}
          onChange={(event) => set({ dontSay: event.target.value })}
        />
      </Fld>
      {avoidSuggestions.length && product ? (
        <Suggestions
          label={`Add from ${product.name}`}
          items={avoidSuggestions}
          text={form.dontSay}
          onToggle={(line) => set((f) => ({ dontSay: toggleLine(f.dontSay, line) }))}
          target="don't say"
        />
      ) : null}

      <Fld field="attachments" label="Attachments" optional note="help creators get it right" group>
        <AttachmentsField files={form.attachments} onChange={(attachments) => set({ attachments })} />
      </Fld>

      {d.physical ? (
        <Note icon={<Package size={18} />}>
          <b>Shipping products isn&apos;t available yet.</b> Creators use a product they already own. The brief says so
          for you: &ldquo;{OWN_PRODUCT_NOTE}&rdquo;
        </Note>
      ) : null}

      <MoreDetail {...props} />
    </StepCard>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  const length = value.trim().length;
  return (
    <small className="y-nw-count-chars y-num" data-over={length > max ? "true" : undefined} aria-hidden>
      {length}/{max}
    </small>
  );
}

/** The product's dos or don'ts and its learnings, one tap to add (or take out again). */
function Suggestions({
  label,
  items,
  text,
  onToggle,
  target,
}: {
  label: string;
  items: { text: string; learning: boolean }[];
  text: string;
  onToggle: (line: string) => void;
  target: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, 4);
  return (
    <div className="y-nw-suggest">
      <span className="y-nw-small">{label}</span>
      <ul>
        {shown.map((item) => {
          const on = hasLine(text, item.text);
          return (
            <li key={`${item.learning ? "l" : "p"}-${item.text}`}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${on ? "Remove from" : "Add to"} ${target}: ${item.text}`}
                onClick={() => onToggle(item.text)}
              >
                <span className="y-nw-suggest-ic" aria-hidden>
                  {on ? <Check size={13} strokeWidth={2.75} /> : <Plus size={13} strokeWidth={2.75} />}
                </span>
                <span className="min-w-0 flex-1">{item.text}</span>
                {item.learning ? (
                  <span className="y-nw-suggest-tag">
                    <History size={12} aria-hidden />
                    Learning
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > 4 ? (
        <button type="button" className="y-nw-link" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Show fewer" : `Show all ${items.length}`}
        </button>
      ) : null}
    </div>
  );
}

/** Optional extras that used to have their own steps: audience, goal, length, references, notes. */
function MoreDetail({ form, d, set }: StepProps) {
  const filled =
    form.goal.trim() || form.keyMessage.trim() || form.notes.trim() || form.references.length > 0 || Boolean(form.explainer);
  const [open, setOpen] = useState(Boolean(filled));
  const campaign = form.kind === "campaign";
  const footage = d.product?.assets.filter((a) => a.kind === "footage") ?? [];
  const sample = `${(d.productName || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product"}-explainer.mp4`;
  return (
    <div className="y-nw-more" data-open={open ? "true" : undefined}>
      <button type="button" className="y-nw-more-t" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <ChevronDown size={16} aria-hidden />
        More detail
        <small>optional · audience, goal{d.adCopy ? "" : ", length"}, references, notes</small>
      </button>
      {open ? (
        <div className="y-nw-more-b">
          <Fld field="audience" label="Who it's for">
            <textarea
              id="nwf-audience"
              className="y-input y-nw-input"
              rows={2}
              placeholder="Who they are, where they live, what their day looks like"
              value={form.audience}
              onChange={(event) => set({ audience: event.target.value })}
            />
          </Fld>
          <div className="y-nw-frow">
            <Fld field="goal" label="What it should achieve">
              <textarea
                id="nwf-goal"
                className="y-input y-nw-input"
                rows={2}
                placeholder="What viewers should do or feel after watching"
                value={form.goal}
                onChange={(event) => set({ goal: event.target.value })}
              />
            </Fld>
            <Fld field="keyMessage" label="Key message">
              <textarea
                id="nwf-keyMessage"
                className="y-input y-nw-input"
                rows={2}
                placeholder="The one line they should remember"
                value={form.keyMessage}
                onChange={(event) => set({ keyMessage: event.target.value })}
              />
            </Fld>
          </div>

          {!d.adCopy ? (
            <>
              <Fld field="length" label="Length" group labelId="nw-length-label">
                <PillGroup<number>
                  field="length"
                  labelId="nw-length-label"
                  options={lengthOptions(form.format).map((sec) => ({ value: sec, label: `Up to ${lengthLabel(sec)}` }))}
                  selected={[form.durationSec]}
                  onToggle={(durationSec) => set({ durationSec })}
                />
              </Fld>
              <div className="y-nw-frow">
                <Fld field="aspect" label="Shape" group labelId="nw-aspect-label">
                  <PillGroup<Aspect>
                    field="aspect"
                    labelId="nw-aspect-label"
                    options={aspects.map((a) => ({ value: a.id, label: a.name }))}
                    selected={[form.aspect]}
                    onToggle={(aspect) => set({ aspect })}
                  />
                </Fld>
                <Fld field="camera" label="On camera" group labelId="nw-camera-label">
                  <PillGroup<"on" | "off">
                    field="camera"
                    labelId="nw-camera-label"
                    options={[
                      { value: "on", label: "Creator on camera" },
                      { value: "off", label: "Voiceover only" },
                    ]}
                    selected={[form.onCamera ? "on" : "off"]}
                    onToggle={(value) => set({ onCamera: value === "on" })}
                  />
                </Fld>
              </div>
            </>
          ) : null}

          {campaign ? (
            <Fld
              field="explainer"
              label="Explainer video"
              group
              hint="A minute or two on what it is and who it's for. Creators watch it before filming."
            >
              <ExplainerField
                value={form.explainer}
                onChange={(explainer) => set({ explainer })}
                footage={footage}
                sampleName={sample}
              />
            </Fld>
          ) : null}

          <Fld field="references" label="References you like" group>
            <ReferenceEditor items={form.references} onChange={(references) => set({ references })} />
          </Fld>
          <Fld field="notes" label="Anything else">
            <textarea
              id="nwf-notes"
              className="y-input y-nw-input"
              rows={3}
              placeholder="Setting, wardrobe, what worked before"
              value={form.notes}
              onChange={(event) => set({ notes: event.target.value })}
            />
          </Fld>
        </div>
      ) : null}
    </div>
  );
}
