"use client";

import { BadgeCheck, Globe, MailOpen, Sparkles } from "lucide-react";
import { useState } from "react";

import { BriefSummary } from "@/components/domain/brief-summary";
import { FilterChip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { at } from "@/lib/clock";
import { daysFromNow, money, plural, weekdayDate } from "@/lib/format";
import { cityById, fit, me, pitchesForRequest, savedCreatorIds } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { creatorKindById } from "@/lib/taxonomy";
import type { ContentRequest, Product } from "@/lib/types";

import { ChoiceTile, GroupError } from "./parts";
import { BUDGET_FLOOR, daysForIsoDay, isoDay } from "./shared";

/** Two buttons at the bottom of a confirm sheet: the action, then a quiet way out. */
function ConfirmFooter({
  action,
  onAction,
  cancel,
  onCancel,
  disabled,
}: {
  action: string;
  onAction: () => void;
  cancel: string;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <PillButton variant="contrast" size="lg" className="flex-1" onClick={onAction} disabled={disabled}>
        {action}
      </PillButton>
      <PillButton variant="ghost" size="lg" onClick={onCancel} data-autofocus>
        {cancel}
      </PillButton>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Invite creators (ranked by fit)                                             */
/* -------------------------------------------------------------------------- */

export function InviteSheet({ request, onClose }: { request: ContentRequest; onClose: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const [picked, setPicked] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const pitched = new Set(pitchesForRequest(s, request.id).map((p) => p.creatorId));
  const saved = savedCreatorIds(s);
  // Never offer the account's own creator profile (no ordering from yourself).
  const self = me.ids(s).creatorId;
  const ranked = s.creators
    .filter((creator) => creator.id !== self)
    .map((creator) => ({ creator, fit: fit(s, creator, request) }))
    .filter(({ creator }) => !savedOnly || saved.includes(creator.id))
    .sort((a, b) => b.fit.score - a.fit.score);

  const send = () => {
    picked.forEach((id) => actions.inviteToRequest(request.id, id));
    const names = picked.map((id) => s.creators.find((c) => c.id === id)?.firstName ?? "");
    toast({
      message:
        names.length === 1
          ? `Invited ${names[0]}. They'll see it first in Find work.`
          : `Invited ${names[0]} and ${plural(names.length - 1, "other")}.`,
    });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Invite creators"
      description="Ranked by how well they fit this brief. Each one gets a personal invite to pitch."
      width="md"
      footer={
        <PillButton variant="contrast" size="lg" className="w-full" disabled={!picked.length} onClick={send}>
          {picked.length ? `Invite ${plural(picked.length, "creator")}` : "Pick creators to invite"}
        </PillButton>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-2" role="group" aria-label="Show">
          <FilterChip pressed={!savedOnly} onClick={() => setSavedOnly(false)}>
            Best fits
          </FilterChip>
          <FilterChip pressed={savedOnly} onClick={() => setSavedOnly(true)} count={saved.filter((id) => id !== self).length}>
            Saved
          </FilterChip>
        </div>
        {ranked.length ? (
          <ul className="flex flex-col gap-2">
            {ranked.map(({ creator, fit: f }) => {
              const already = request.invitedCreatorIds.includes(creator.id);
              const hasPitched = pitched.has(creator.id);
              const on = picked.includes(creator.id);
              return (
                <li key={creator.id}>
                  <ChoiceTile
                    type="checkbox"
                    checked={already || hasPitched || on}
                    disabled={already || hasPitched}
                    onChange={() =>
                      setPicked((current) => (on ? current.filter((id) => id !== creator.id) : [...current, creator.id]))
                    }
                    label={`Invite ${creator.name}`}
                  >
                    <span className="flex items-center gap-3">
                      <FaceAvatar id={creator.id} name="" size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="y-small flex items-center gap-1 font-semibold">
                          <span className="truncate">{creator.name}</span>
                          {creator.verified ? <BadgeCheck size={14} aria-label="ID verified" className="flex-none" /> : null}
                        </span>
                        <span className="y-micro y-fg-2 block truncate">
                          {creatorKindById[creator.kind].name} · {cityById(creator.cityId)?.name}
                        </span>
                        <span className="y-micro y-fg-2 block truncate">
                          {hasPitched ? "Already pitched" : already ? "Already invited" : (f.reasons[0] ?? f.gaps[0])}
                        </span>
                      </span>
                      <span className="y-micro inline-flex flex-none items-center gap-1 font-semibold" aria-label={`${f.score}% fit`}>
                        <Sparkles size={13} aria-hidden />
                        <span aria-hidden>{f.score}%</span>
                      </span>
                    </span>
                  </ChoiceTile>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="y-small y-fg-2 py-6 text-center">You haven&apos;t saved any creators yet. Save the ones you like in Discover.</p>
        )}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit a live request: title, budget, due date, who can pitch                 */
/* -------------------------------------------------------------------------- */

export function EditRequestSheet({ request, onClose }: { request: ContentRequest; onClose: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const [title, setTitle] = useState(request.title);
  const [min, setMin] = useState(String(request.budget.min));
  const [max, setMax] = useState(String(request.budget.max));
  const [due, setDue] = useState(() => isoDay(Math.max(1, daysFromNow(request.dueDate))));
  const [visibility, setVisibility] = useState(request.visibility);
  const [submitted, setSubmitted] = useState(false);

  const minN = Number(min);
  const maxN = Number(max);
  const days = daysForIsoDay(due);
  const errors = {
    title: title.trim().length < 6 ? "Give it a title of at least 6 characters." : undefined,
    budget:
      !Number.isFinite(minN) || minN < BUDGET_FLOOR
        ? `The lowest budget is ${money(BUDGET_FLOOR)}.`
        : !Number.isFinite(maxN) || maxN < minN
          ? "The most you'd pay must be at least the least."
          : undefined,
    due: !Number.isFinite(days) || days < 1 || days > 90 ? "Pick a date between tomorrow and 90 days from now." : undefined,
    visibility:
      visibility === "invite" && request.invitedCreatorIds.length === 0
        ? "Invite at least one creator before making it invite only."
        : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const overMax = pitchesForRequest(s, request.id).filter(
    (p) => p.status !== "declined" && Number.isFinite(maxN) && p.price > maxN,
  ).length;

  const save = () => {
    setSubmitted(true);
    if (!valid) return;
    actions.updateRequest(request.id, {
      title: title.trim(),
      budget: { min: minN, max: maxN },
      dueDate: at(days, "18:00"),
      visibility,
    });
    toast({ message: "Saved. Creators see the changes right away." });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Edit order"
      description="Change the essentials. The brief itself stays as creators pitched on it: agree other changes in a message."
      width="md"
      footer={<ConfirmFooter action="Save changes" onAction={save} cancel="Cancel" onCancel={onClose} />}
    >
      <div className="flex flex-col gap-5">
        <TextField
          label="Title"
          required
          value={title}
          maxLength={90}
          onChange={(event) => setTitle(event.target.value)}
          error={submitted ? errors.title : undefined}
        />
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Budget from ($)"
              required
              inputMode="numeric"
              value={min}
              onChange={(event) => setMin(event.target.value.replace(/\D/g, ""))}
              aria-invalid={submitted && errors.budget ? true : undefined}
            />
            <TextField
              label="Up to ($)"
              required
              inputMode="numeric"
              value={max}
              onChange={(event) => setMax(event.target.value.replace(/\D/g, ""))}
              aria-invalid={submitted && errors.budget ? true : undefined}
            />
          </div>
          <GroupError message={submitted ? errors.budget : undefined} />
          {!errors.budget && overMax ? (
            <p className="y-micro y-fg-2 px-1">
              {plural(overMax, "pitch", "pitches")} quoted above {money(maxN)}. They stay, marked as over your max.
            </p>
          ) : null}
        </div>
        <TextField
          label="Due date"
          type="date"
          required
          min={isoDay(1)}
          max={isoDay(90)}
          value={due}
          onChange={(event) => setDue(event.target.value)}
          error={submitted ? errors.due : undefined}
          hint={Number.isFinite(days) && days >= 1 ? `${weekdayDate(at(days, "18:00"))} · ${plural(days, "day")} from today` : undefined}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="y-label mb-2">Who can pitch</legend>
          <ChoiceTile name="edit-visibility" checked={visibility === "public"} onChange={() => setVisibility("public")}>
            <span className="y-small flex items-center gap-2 font-semibold">
              <Globe size={16} aria-hidden /> Everyone who fits
            </span>
          </ChoiceTile>
          <ChoiceTile name="edit-visibility" checked={visibility === "invite"} onChange={() => setVisibility("invite")}>
            <span className="y-small flex items-center gap-2 font-semibold">
              <MailOpen size={16} aria-hidden /> Invite only
            </span>
            <span className="y-micro y-fg-2">
              {request.invitedCreatorIds.length
                ? `Only the ${plural(request.invitedCreatorIds.length, "creator")} you invited can pitch.`
                : "You haven't invited anyone yet."}
            </span>
          </ChoiceTile>
          <GroupError message={submitted ? errors.visibility : undefined} />
        </fieldset>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Close, delete                                                               */
/* -------------------------------------------------------------------------- */

export function CloseRequestSheet({
  request,
  pitchCount,
  onClose,
}: {
  request: ContentRequest;
  pitchCount: number;
  onClose: () => void;
}) {
  const toast = useToast();
  return (
    <Sheet
      open
      onClose={onClose}
      side="center"
      width="sm"
      title="Close this order?"
      description="Creators can't pitch any more, and it leaves Find work."
      footer={
        <ConfirmFooter
          action="Close order"
          onAction={() => {
            actions.closeRequest(request.id);
            toast({ message: "Order closed", action: { label: "Undo", onClick: () => actions.reopenRequest(request.id) } });
            onClose();
          }}
          cancel="Keep it open"
          onCancel={onClose}
        />
      }
    >
      <p className="y-body y-fg-2">
        {pitchCount
          ? `The ${plural(pitchCount, "pitch", "pitches")} you received stay here, and you can still message those creators.`
          : "Nothing is lost."}{" "}
        You can reopen it any time.
      </p>
    </Sheet>
  );
}

export function DeleteDraftSheet({ onDelete, onClose }: { onDelete: () => void; onClose: () => void }) {
  return (
    <Sheet
      open
      onClose={onClose}
      side="center"
      width="sm"
      title="Delete this draft?"
      description="It was never posted, so no creator has seen it."
      footer={<ConfirmFooter action="Delete draft" onAction={onDelete} cancel="Keep it" onCancel={onClose} />}
    >
      <p className="y-body y-fg-2">The brief and its settings are removed. This can&apos;t be undone.</p>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* The full brief                                                              */
/* -------------------------------------------------------------------------- */

export function BriefSheet({
  request,
  product,
  onClose,
}: {
  request: ContentRequest;
  product?: Product;
  onClose: () => void;
}) {
  return (
    <Sheet open onClose={onClose} title="The brief" description={request.title} width="lg">
      <div className="flex flex-col gap-4">
        <BriefSummary brief={request.brief} product={product} />
        {request.status !== "draft" ? (
          <p className="y-micro y-fg-2">Creators pitched on this brief, so it stays as is. Agree any changes in a message before you hire.</p>
        ) : null}
      </div>
    </Sheet>
  );
}
