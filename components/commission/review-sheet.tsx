"use client";

import { Check, Lightbulb, Plus } from "lucide-react";
import { useId, useState } from "react";

import { StarInput } from "@/components/domain/stars";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet, SheetActions } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/format";
import { actions } from "@/lib/store";

import { suggestedLearnings, type Workspace } from "./helpers";

export const REVIEW_MIN_CHARS = 20;

/**
 * The review form (Work spec 6.10.2): overall stars (required), three optional sub-ratings, a
 * review of at least 20 characters with its counter, "I'd hire {name} again", and the learnings to
 * save to the product so they carry into the next brief (folded, optional). Returns the fields, the
 * validity and `submit`, so the approve sheet's second step and the standalone sheet share it.
 */
export function useReviewForm(ws: Workspace) {
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
  const rehireId = useId();
  const textId = useId();
  const counterId = useId();
  const draftId = useId();

  const length = text.trim().length;
  const valid = rating > 0 && length >= REVIEW_MIN_CHARS;
  const all = [...suggestions, ...extra];

  const addDraft = () => {
    const value = draft.trim();
    if (!value) return;
    if (!all.some((item) => item.toLowerCase() === value.toLowerCase())) setExtra((list) => [...list, value]);
    setChosen((list) => (list.includes(value) ? list : [...list, value]));
    setDraft("");
  };

  /** Posts the review; returns how many learnings were saved, or null when it isn't valid yet. */
  const submit = (): number | null => {
    if (!valid) return null;
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
    return learnings.length;
  };

  const fields = (
    <div className="flex flex-col gap-[18px]">
      <div className="y-ord-fld">
        <span className="y-ord-lb">Overall</span>
        <StarInput value={rating} onChange={setRating} label="Overall rating" size={34} />
      </div>

      <fieldset className="y-ord-fld">
        <legend className="y-ord-lb mb-2">
          The details <span className="y-fg-2 font-normal">· optional</span>
        </legend>
        {(
          [
            ["Quality", quality, setQuality],
            ["Communication", communication, setCommunication],
            ["Timeliness", timeliness, setTimeliness],
          ] as const
        ).map(([label, value, set]) => (
          <div key={label} className="y-ord-srow">
            <span>{label}</span>
            <StarInput value={value} onChange={set} label={label} size={22} />
          </div>
        ))}
      </fieldset>

      <div className="y-ord-fld">
        <label htmlFor={textId} className="y-ord-lb">
          Your review
        </label>
        <textarea
          id={textId}
          className="y-input y-ord-textarea"
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-describedby={counterId}
          placeholder={`What was it like working with ${creatorName}? What made the ${ws.adCopy ? "copy" : "video"} work?`}
        />
        <small id={counterId} aria-live="polite" className={length >= REVIEW_MIN_CHARS ? "text-(--y-success)" : ""}>
          {length >= REVIEW_MIN_CHARS ? (
            <span className="inline-flex items-center gap-1">
              <Check size={13} strokeWidth={3} aria-hidden /> Good to go
            </span>
          ) : length ? (
            `At least ${REVIEW_MIN_CHARS} characters · ${REVIEW_MIN_CHARS - length} more`
          ) : (
            `At least ${REVIEW_MIN_CHARS} characters`
          )}
        </small>
      </div>

      <label htmlFor={rehireId} className="y-ord-tgl">
        <input
          id={rehireId}
          type="checkbox"
          role="switch"
          className="y-switch"
          checked={rehire}
          onChange={(event) => setRehire(event.target.checked)}
        />
        <span>
          <b>I&apos;d hire {creatorName} again</b>
          <small>Shown as &ldquo;Would hire again&rdquo; on the review.</small>
        </span>
      </label>

      <details className="y-ord-more">
        <summary>
          <Lightbulb size={16} aria-hidden /> Save learnings for next time
          <span className="y-fg-2 font-normal"> · optional</span>
        </summary>
        <div className="flex flex-col gap-2 pt-3">
          <p className="y-small y-fg-2">
            Tick what should carry into your next brief{product ? ` for ${product.name}` : ""}. Every creator you work with
            sees these with the brief.
          </p>
          {all.length ? (
            <ul className="flex flex-col gap-2">
              {all.map((item) => (
                <li key={item}>
                  <label className="y-ord-chk">
                    <input
                      type="checkbox"
                      checked={chosen.includes(item)}
                      onChange={() =>
                        setChosen((list) => (list.includes(item) ? list.filter((v) => v !== item) : [...list, item]))
                      }
                    />
                    <span>
                      {item}
                      <small className="y-fg-2 block">{extra.includes(item) ? "Added by you" : "From your comments"}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          <label htmlFor={draftId} className="y-ord-lb pt-1">
            Add a learning
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
          {chosen.length ? (
            <p className="y-micro y-fg-2" aria-live="polite">
              {plural(chosen.length, "learning")} will be saved{product ? ` to ${product.name}` : ""}.
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );

  return { fields, valid, submit };
}

/** "Leave a review" later, from the Done step (the approve sheet's second step on its own). */
export function ReviewSheet({ ws, open, onClose }: { ws: Workspace; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const form = useReviewForm(ws);
  const post = () => {
    const saved = form.submit();
    if (saved === null) return;
    toast({
      message: saved
        ? `Review posted. ${plural(saved, "learning")} saved to ${ws.product?.name ?? "your product"} for next time.`
        : `Review posted to ${ws.creatorName}'s profile.`,
    });
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Review ${ws.creatorName}`}
      description="Your review helps other brands choose. It shows on their profile with your name and team."
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Not now
          </PillButton>
          <PillButton variant="contrast" disabled={!form.valid} onClick={post}>
            Post review
          </PillButton>
        </SheetActions>
      }
    >
      {form.fields}
    </Sheet>
  );
}
