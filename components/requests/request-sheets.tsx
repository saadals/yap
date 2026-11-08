"use client";

import { BadgeCheck, Check, Globe, MailOpen, Send } from "lucide-react";
import { useState } from "react";

import { languageList } from "@/components/domain/chips";
import { VideoPlayer } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FilterChip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { at } from "@/lib/clock";
import { compact, daysFromNow, lengthLabel, money, plural, timeOf, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { cityById, fit, me, pitchesForRequest, savedCreatorIds, videoById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { creatorKindById, formatById } from "@/lib/taxonomy";
import type { ContentRequest, Creator } from "@/lib/types";

import { ContactNotice } from "./contact-notice";
import { responseLabel } from "./pitch-card";
import { BUDGET_FLOOR, daysForIsoDay, isoDay } from "./shared";
import { ChoiceTile, GroupError } from "./wizard-parts";

/* -------------------------------------------------------------------------- */
/* Invite creators (fit-ranked)                                                */
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
          ? `Invited ${names[0]}. They'll see it at the top of their feed.`
          : `Invited ${names[0]} and ${plural(names.length - 1, "other")}.`,
    });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Invite creators"
      description="Ranked by how well they fit this brief. Invited creators get a personal note."
      width="md"
      footer={
        <PillButton
          variant="contrast"
          size="lg"
          className="w-full"
          disabled={!picked.length}
          onClick={send}
          icon={<Send size={18} aria-hidden className="y-flip" />}
        >
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
        <ul className="flex flex-col gap-2">
          {ranked.map(({ creator, fit: f }) => {
            const already = request.invitedCreatorIds.includes(creator.id);
            const hasPitched = pitched.has(creator.id);
            const on = picked.includes(creator.id);
            const city = cityById(creator.cityId);
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
                  className="!items-center"
                >
                  <span className="flex items-center gap-3">
                    <FaceAvatar id={creator.id} name="" size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="y-small flex items-center gap-1 font-semibold">
                        <span className="truncate">{creator.name}</span>
                        {creator.verified ? <BadgeCheck size={14} aria-label="ID verified" className="flex-none" /> : null}
                      </span>
                      <span className="y-micro y-fg-2 block truncate">
                        {creatorKindById[creator.kind].name} · {city?.name} · ★ {creator.rating.toFixed(1)}
                      </span>
                      <span className="y-micro y-fg-3 block truncate">
                        {hasPitched ? "Already pitched" : already ? "Already invited" : (f.reasons[0] ?? f.gaps[0])}
                      </span>
                    </span>
                    <span
                      className="flex-none rounded-full bg-(--y-lavender) px-2.5 py-1 text-(--y-on-color)"
                      aria-label={`${f.score}% fit`}
                    >
                      <span className="y-display y-num text-[17px] font-semibold" aria-hidden>
                        {f.score}
                      </span>
                      <span className="y-micro" aria-hidden>
                        %
                      </span>
                    </span>
                  </span>
                </ChoiceTile>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit a live request: budget, deadline, who can pitch                        */
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
        ? `The minimum budget is $${BUDGET_FLOOR}.`
        : !Number.isFinite(maxN) || maxN < minN
          ? "The maximum must be at least the minimum."
          : undefined,
    due:
      !Number.isFinite(days) || days < 1 || days > 90
        ? "Pick a date between tomorrow and 90 days from now."
        : undefined,
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
    toast({ message: "Request updated. Creators see the changes right away." });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Edit request"
      description="Change the essentials. The brief itself stays as creators pitched on it."
      width="md"
      footer={
        <div className="flex gap-2">
          <PillButton variant="contrast" size="lg" className="flex-1" onClick={save} aria-disabled={!valid && submitted ? "true" : undefined}>
            Save changes
          </PillButton>
          <PillButton variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </PillButton>
        </div>
      }
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
              label="Budget up to ($)"
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
              {plural(overMax, "pitch", "pitches")} quoted above {money(maxN)}. They stay, flagged as over budget.
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
            <span className="flex items-center gap-2 font-semibold">
              <Globe size={18} aria-hidden /> Everyone who fits
            </span>
          </ChoiceTile>
          <ChoiceTile name="edit-visibility" checked={visibility === "invite"} onChange={() => setVisibility("invite")}>
            <span className="flex items-center gap-2 font-semibold">
              <MailOpen size={18} aria-hidden /> Invite only
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
/* Close (confirm)                                                             */
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
      title="Close this request?"
      description="Creators can't pitch any more and it leaves their feeds."
      footer={
        <div className="flex gap-2">
          <PillButton
            variant="contrast"
            size="lg"
            className="flex-1"
            onClick={() => {
              actions.closeRequest(request.id);
              toast({
                message: "Request closed",
                action: { label: "Undo", onClick: () => actions.reopenRequest(request.id) },
              });
              onClose();
            }}
          >
            Close request
          </PillButton>
          <PillButton variant="ghost" size="lg" onClick={onClose} data-autofocus>
            Keep it open
          </PillButton>
        </div>
      }
    >
      <p className="y-body y-fg-2">
        {pitchCount
          ? `The ${plural(pitchCount, "pitch", "pitches")} you've received stay here and you can still message those creators.`
          : "Nothing is lost."}{" "}
        You can reopen it any time.
      </p>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Message a creator about this request                                        */
/* -------------------------------------------------------------------------- */

export function MessageSheet({
  creator,
  request,
  onClose,
}: {
  creator: Creator;
  request: ContentRequest;
  onClose: () => void;
}) {
  const s = useDemo();
  const toast = useToast();
  const existing = s.threads.find(
    (t) =>
      t.businessId === request.businessId &&
      t.creatorId === creator.id &&
      !t.commissionId &&
      t.requestId === request.id &&
      t.messages.length > 0,
  );
  const [text, setText] = useState(`Hi ${creator.firstName}, thanks for your pitch. `);
  const [sentThread, setSentThread] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const quick = [
    "Could you share one more sample in this style?",
    "What would your opening line be, word for word?",
    "Could you deliver a few days sooner?",
  ];

  const send = () => {
    const body = text.trim();
    if (body.length < 5) {
      setError("Write a short message first.");
      return;
    }
    const id = actions.startThread({ creatorId: creator.id, subject: request.title, text: body, requestId: request.id });
    setSentThread(id);
    toast({ message: `Message sent to ${creator.firstName}` });
  };

  if (sentThread) {
    return (
      <Sheet open onClose={onClose} title={`Message sent to ${creator.firstName}`} width="sm">
        <div className="flex flex-col gap-4">
          <div className="y-tile flex items-center gap-3 p-4">
            <span className="grid size-10 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
              <Check size={18} aria-hidden />
            </span>
            <p className="y-small">
              {creator.firstName} usually {responseLabel(creator.responseHours)}. We&apos;ll let you know when they do.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <PillButton href={paths.messages(sentThread)} variant="contrast" arrow>
              Open conversation
            </PillButton>
            <PillButton variant="ghost" onClick={onClose}>
              Back to pitches
            </PillButton>
          </div>
        </div>
      </Sheet>
    );
  }

  const last = existing?.messages.slice(-2) ?? [];
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Message ${creator.firstName}`}
      description={`About "${request.title}"`}
      width="sm"
      footer={
        <PillButton
          variant="contrast"
          size="lg"
          className="w-full"
          onClick={send}
          icon={<Send size={18} aria-hidden className="y-flip" />}
        >
          Send message
        </PillButton>
      }
    >
      <div className="flex flex-col gap-4">
        {existing ? (
          <div className="y-tile flex flex-col gap-2 p-4">
            <p className="y-micro y-fg-2">You&apos;ve talked about this request</p>
            {last.map((m) => (
              <p key={m.id} className="y-small">
                <span className="font-semibold">{m.from === "business" ? "You" : m.from === "creator" ? creator.firstName : "Yapp"}: </span>
                <span dir="auto">{m.text}</span>
                <span className="y-micro y-fg-3"> · {timeOf(m.at)}</span>
              </p>
            ))}
            <PillButton href={paths.messages(existing.id)} size="sm" variant="ghost" className="w-fit">
              Open the full conversation
            </PillButton>
          </div>
        ) : null}
        <TextArea
          label="Message"
          required
          rows={5}
          value={text}
          data-autofocus
          error={error}
          onChange={(event) => {
            setText(event.target.value);
            if (error) setError(null);
          }}
        />
        <ContactNotice text={text} className="-mt-2" />
        <div className="flex flex-col gap-2">
          <p className="y-micro y-fg-2">Quick questions</p>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                className="y-chip y-hoverable cursor-pointer"
                onClick={() => setText((current) => `${current.trim()} ${q}`.trim())}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Sample player                                                               */
/* -------------------------------------------------------------------------- */

export function SampleSheet({
  videoIds,
  startId,
  creator,
  onClose,
}: {
  videoIds: string[];
  startId: string;
  creator: Creator;
  onClose: () => void;
}) {
  const s = useDemo();
  const [currentId, setCurrentId] = useState(startId);
  const video = videoById(s, currentId);
  const others = videoIds.map((id) => videoById(s, id)).filter((v) => v !== undefined);
  if (!video) return null;
  const format = formatById[video.format];
  return (
    <Sheet open onClose={onClose} title={video.title} description={`Sample from ${creator.name}`} width="lg">
      <div className="flex flex-col gap-5">
        <VideoPlayer key={video.id} video={video} size="md" />
        <p className="y-small y-fg-2">
          {[
            format.name,
            languageList([video.lang]),
            lengthLabel(video.durationSec),
            video.madeFor ? `Made for ${video.madeFor}` : "Spec piece",
            video.stats ? `${compact(video.stats.views)} views` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {others.length > 1 ? (
          <div className="flex flex-col gap-2">
            <p className="y-micro y-fg-2">Other samples in this pitch</p>
            <ul className="flex gap-2">
              {others.map((v) => (
                <li key={v.id} className="w-24">
                  <button
                    type="button"
                    onClick={() => setCurrentId(v.id)}
                    aria-pressed={v.id === currentId}
                    aria-label={`Play ${v.title}`}
                    className={`block w-full rounded-(--y-r-tile) ${v.id === currentId ? "ring-2 ring-(--b-fg) ring-offset-2 ring-offset-(--b-bg)" : ""}`}
                  >
                    <VideoThumb video={v} frame="9:16" showHook={false} decorative />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
