"use client";

import { Lightbulb, Plus } from "lucide-react";
import { useId, useState } from "react";

import { StarInput } from "@/components/domain/stars";
import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/format";
import { actions } from "@/lib/store";

import { suggestedLearnings, type Workspace } from "./helpers";

const MIN_TEXT = 20;

/**
 * Business reviews the creator: overall + three sub-ratings, written review, would-rehire, and
 * learnings saved to the product so they carry into the next brief.
 */
export function ReviewSheet({ ws, open, onClose }: { ws: Workspace; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { commission, creatorName, product } = ws;
  const suggestions = suggestedLearnings(commission);
  const [rating, setRating] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [timeliness, setTimeliness] = useState(0);
  const [text, setText] = useState("");
  const [rehire, setRehire] = useState(true);
  const [extra, setExtra] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [tried, setTried] = useState(false);
  const [touchedText, setTouchedText] = useState(false);
  const rehireId = useId();
  const draftId = useId();

  const ratingError = tried && !rating ? "Pick an overall rating from 1 to 5 stars." : null;
  const length = text.trim().length;
  const textError =
    (tried || touchedText) && length < MIN_TEXT
      ? `A few more words, please: at least ${MIN_TEXT} characters (${length} so far).`
      : null;
  const all = [...suggestions, ...extra];

  const addDraft = () => {
    const value = draft.trim();
    if (!value) return;
    if (!all.some((item) => item.toLowerCase() === value.toLowerCase())) setExtra((list) => [...list, value]);
    setChosen((list) => (list.includes(value) ? list : [...list, value]));
    setDraft("");
  };

  const submit = () => {
    setTried(true);
    if (!rating || length < MIN_TEXT) return;
    const learnings = all.filter((item) => chosen.includes(item));
    actions.leaveReview({
      commissionId: commission.id,
      rating,
      quality: quality || rating,
      communication: communication || rating,
      timeliness: timeliness || rating,
      text: text.trim(),
      wouldRehire: rehire,
      learnings,
    });
    toast({
      message: learnings.length
        ? `Review posted. ${plural(learnings.length, "learning")} saved to ${product?.name ?? "your product"} for next time.`
        : `Review posted to ${creatorName}'s profile.`,
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Review ${creatorName}`}
      description={`Your review appears on ${creatorName}'s profile with your name and team.`}
      width="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <PillButton variant="ghost" onClick={onClose}>
            Not now
          </PillButton>
          <PillButton variant="contrast" size="lg" onClick={submit}>
            Post review
          </PillButton>
        </div>
      }
    >
      <form
        className="flex flex-col gap-7"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-2">
          <span className="y-label">
            <span>Overall</span>
            <span className="y-micro y-fg-3 font-medium">Required</span>
          </span>
          <StarInput value={rating} onChange={setRating} label="Overall rating" size={36} />
          {ratingError ? (
            <p role="alert" className="y-small px-1 font-medium text-(--y-danger)">
              {ratingError}
            </p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-1">
          <legend className="y-label mb-1">The details</legend>
          <p className="y-micro y-fg-3 mb-2">Optional. Skipped ones use your overall rating.</p>
          {(
            [
              ["Quality of the video", quality, setQuality],
              ["Communication", communication, setCommunication],
              ["On time", timeliness, setTimeliness],
            ] as const
          ).map(([label, value, set]) => (
            <div
              key={label}
              className="flex flex-col gap-1 border-b border-(--b-line) py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="y-small font-medium">{label}</span>
              <StarInput value={value} onChange={set} label={label} size={24} />
            </div>
          ))}
        </fieldset>

        <TextArea
          label="Your review"
          required
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => setTouchedText(true)}
          error={textError}
          hint={`What was it like working with ${creatorName}? Other teams read this before hiring.`}
          placeholder={`e.g. ${creatorName} got our audience straight away. The hook landed in the first two seconds and the changes came back a day early.`}
        />

        <label htmlFor={rehireId} className="y-tile flex cursor-pointer items-center gap-4 p-4">
          <span className="flex flex-1 flex-col">
            <span className="y-small font-semibold">I&apos;d hire {creatorName} again</span>
            <span className="y-micro y-fg-2">Shown as &ldquo;Would hire again&rdquo; on the review.</span>
          </span>
          <input
            id={rehireId}
            type="checkbox"
            role="switch"
            className="y-switch"
            checked={rehire}
            onChange={(event) => setRehire(event.target.checked)}
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="y-head mb-1 inline-flex items-center gap-2">
            <Lightbulb size={18} aria-hidden /> Save learnings for next time
          </legend>
          <p className="y-small y-fg-2 mb-1 max-w-[62ch]">
            Tick what should carry into your next brief{product ? ` for ${product.name}` : ""}. Every creator you
            work with sees these alongside the brief.
          </p>
          {all.length ? (
            <ul className="flex flex-col gap-2">
              {all.map((item) => (
                <li key={item}>
                  <label className="y-tile flex cursor-pointer items-start gap-3 p-3">
                    <input
                      type="checkbox"
                      className="y-check mt-0.5"
                      checked={chosen.includes(item)}
                      onChange={() =>
                        setChosen((list) => (list.includes(item) ? list.filter((v) => v !== item) : [...list, item]))
                      }
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="y-small">{item}</span>
                      <span className="y-micro y-fg-3">
                        {extra.includes(item) ? "Added by you" : "From your notes on the delivery"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="y-micro y-fg-3">You didn&apos;t leave timestamped notes, so there&apos;s nothing to suggest. Add your own below.</p>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <label htmlFor={draftId} className="y-label">
              <span>Add a learning</span>
            </label>
            <div className="flex gap-2">
              <input
                id={draftId}
                className="y-input flex-1"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addDraft();
                  }
                }}
                placeholder="e.g. Open on the shop counter, not the phone"
              />
              <PillButton variant="soft" icon={<Plus size={18} aria-hidden />} onClick={addDraft} disabled={!draft.trim()}>
                Add
              </PillButton>
            </div>
          </div>
          {chosen.length ? (
            <p className="y-micro y-fg-2 px-1" aria-live="polite">
              {plural(chosen.length, "learning")} will be saved{product ? ` to ${product.name}` : ""}.
            </p>
          ) : null}
        </fieldset>
      </form>
    </Sheet>
  );
}
