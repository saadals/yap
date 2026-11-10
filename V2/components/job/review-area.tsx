"use client";

import { Check, FileVideo, Lock, MessageSquarePlus, Pencil, Trash2, Undo2 } from "lucide-react";
import { useCallback, useState } from "react";

import { VideoPlayer } from "@/components/domain/video-player";
import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useToast } from "@/components/ui/toast";
import { clock, plural, timeAgo } from "@/lib/format";
import { actions } from "@/lib/store";
import type { Aspect, Delivery, DeliveryComment, Video } from "@/lib/types";

import { ago, versionStatus, type Job } from "./helpers";

type Mode = "review" | "address" | "read";

/**
 * A delivered version: the 9:16 player with note markers, the version switcher, the creator's note,
 * timestamped notes and the files. What you can do depends on who is looking:
 * - "review": the ordering side on the version in review adds, edits, resolves and deletes notes.
 * - "address": the creator ticks notes off while making the next version.
 * - "read": everyone else, and every earlier version.
 * Campaign review copies stay watermarked for the ordering side until approved.
 */
export function ReviewArea({
  job,
  delivery,
  footer,
  size = "md",
}: {
  job: Job;
  delivery: Delivery;
  /** Decision buttons under the notes (ordering side, version in review). */
  footer?: React.ReactNode;
  size?: "sm" | "md";
}) {
  const { commission, side, latest } = job;
  const isLatest = delivery.id === latest?.id;
  const mode: Mode =
    isLatest && side === "business" && commission.status === "delivered" && delivery.status === "in_review"
      ? "review"
      : isLatest && side === "creator" && commission.status === "revision"
        ? "address"
        : "read";

  const [time, setTimeState] = useState<{ id: string; t: number }>({ id: "", t: 0 });
  const now = time.id === delivery.id ? time.t : 0;
  const onTime = useCallback((t: number) => setTimeState({ id: delivery.id, t }), [delivery.id]);
  const [seek, setSeek] = useState<{ at: number; key: number; id: string } | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();

  const seekTo = (comment: DeliveryComment) => {
    setActiveId(comment.id);
    setSeek((current) => ({ at: comment.atSec, key: (current?.key ?? 0) + 1, id: delivery.id }));
  };

  const watermarked = Boolean(delivery.reviewCopy) && side === "business" && delivery.status !== "approved";
  const wide = delivery.video.aspect === "16:9";

  return (
    <div className={wide ? "flex flex-col gap-6" : `grid gap-6 ${size === "sm" ? "md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]"}`}>
      <div className="relative min-w-0">
        <VideoPlayer
          key={delivery.id}
          video={delivery.video}
          comments={delivery.comments}
          onTime={onTime}
          seek={seek && seek.id === delivery.id ? seek : undefined}
          activeCommentId={activeId}
          onMarkerClick={(comment) => setActiveId(comment.id)}
          size={size}
        />
        {watermarked ? <Watermark video={delivery.video} size={size} /> : null}
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <VersionSwitcher job={job} delivery={delivery} />

        {delivery.reviewCopy && delivery.status !== "approved" ? (
          <p className="y-small y-fg-2 inline-flex items-start gap-2">
            <Lock size={16} aria-hidden className="mt-0.5 flex-none" />
            {side === "business"
              ? "Watermarked, low-quality preview. The full-quality file unlocks when you approve."
              : `${job.businessName} sees a watermarked, low-quality preview until they approve it.`}
          </p>
        ) : null}

        {delivery.note ? (
          <CreatorNote key={delivery.id} label={side === "creator" ? "Your note" : `${job.creatorName}'s note`} text={delivery.note} />
        ) : null}

        <Notes job={job} delivery={delivery} mode={mode} activeId={activeId} onSeek={seekTo} />

        {mode === "review" ? <AddNote job={job} delivery={delivery} time={now} /> : null}

        {job.slot && side === "business" ? null : <Files files={delivery.files} watermarked={watermarked} />}

        {footer}
      </div>
    </div>
  );
}

/** v1 · v2 · v3 chips with each version's status. Only when there are several. */
function VersionSwitcher({ job, delivery }: { job: Job; delivery: Delivery }) {
  const deliveries = job.commission.deliveries;
  if (deliveries.length < 2) return null;
  const latest = deliveries[deliveries.length - 1];
  const Noun = job.noun.charAt(0).toUpperCase() + job.noun.slice(1);
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Versions" className="y-scroll-x -mx-1 flex gap-1.5 px-1">
        {deliveries.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={d.id === delivery.id}
            onClick={() => job.pickVersion(d.id === latest.id ? null : d.id)}
            className="y-filter flex-none"
          >
            {versionStatus[d.status].icon}
            <span>
              v{d.version}
              <span className="sr-only">
                {" "}
                {Noun} {d.version},
              </span>
              <span className="font-normal opacity-75"> · {versionStatus[d.status].label}</span>
            </span>
          </button>
        ))}
      </div>
      {delivery.id !== latest.id ? (
        <p className="y-small y-fg-2">
          You&apos;re looking at {job.noun} {delivery.version}, {job.side === "creator" ? "delivered" : "received"} {ago(delivery.deliveredAt)}.{" "}
          <button type="button" className="y-link font-medium" onClick={() => job.pickVersion(null)}>
            Show {job.noun} {latest.version}
          </button>
        </p>
      ) : null}
    </div>
  );
}

function Notes({
  job,
  delivery,
  mode,
  activeId,
  onSeek,
}: {
  job: Job;
  delivery: Delivery;
  mode: Mode;
  activeId?: string;
  onSeek: (comment: DeliveryComment) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const { commission, side } = job;
  const comments =
    mode === "address"
      ? [...delivery.comments].sort((a, b) => Number(a.resolved) - Number(b.resolved) || a.atSec - b.atSec)
      : delivery.comments;
  const open = comments.filter((c) => !c.resolved).length;

  const author = (comment: DeliveryComment) =>
    comment.author === side ? "You" : comment.author === "business" ? job.businessName : job.creatorName;

  const remove = (comment: DeliveryComment) => {
    actions.removeComment(commission.id, delivery.id, comment.id);
    toast({
      message: `Note at ${clock(comment.atSec)} deleted`,
      tone: "info",
      action: {
        label: "Undo",
        onClick: () =>
          actions.addComment(commission.id, delivery.id, { atSec: comment.atSec, text: comment.text, author: comment.author }),
      },
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="y-head">Notes</h3>
        {comments.length ? (
          <span className="y-micro y-fg-2">{open ? `${open} open` : "All done"}</span>
        ) : null}
      </div>
      {comments.length === 0 ? (
        <p className="y-small y-fg-2">
          {mode === "review"
            ? "Pause where you want a change and add a note. It's pinned to that second."
            : side === "creator" && delivery.status === "in_review"
              ? `No notes yet. If ${job.businessName} wants changes, they appear here, pinned to the second.`
              : "No notes on this version."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5" aria-label={`Notes on ${job.noun} ${delivery.version}`}>
          {comments.map((comment) => {
            const mine = comment.author === side;
            const isEditing = editing?.id === comment.id;
            return (
              <li
                key={comment.id}
                className={`y-tile flex items-start gap-3 p-2.5 ${activeId === comment.id ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onSeek(comment)}
                  className="y-num inline-flex min-h-9 flex-none items-center rounded-full bg-(--b-bg) px-3 text-[13px] font-semibold hover:shadow-[inset_0_0_0_1.5px_var(--b-line)] pointer-coarse:min-h-11"
                  aria-label={`Jump to ${clock(comment.atSec)}`}
                >
                  {clock(comment.atSec)}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                  {isEditing ? (
                    <form
                      className="flex flex-col gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const text = editing.text.trim();
                        if (!text) return;
                        actions.updateComment(commission.id, delivery.id, comment.id, { text });
                        setEditing(null);
                        toast({ message: "Note updated" });
                      }}
                    >
                      <label className="sr-only" htmlFor={`edit-${comment.id}`}>
                        Edit note at {clock(comment.atSec)}
                      </label>
                      <textarea
                        id={`edit-${comment.id}`}
                        rows={2}
                        className="y-input !bg-(--b-bg)"
                        value={editing.text}
                        onChange={(event) => setEditing({ id: comment.id, text: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.stopPropagation();
                            setEditing(null);
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <PillButton type="submit" size="sm" variant="contrast" disabled={!editing.text.trim()}>
                          Save
                        </PillButton>
                        <PillButton size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          Cancel
                        </PillButton>
                      </div>
                    </form>
                  ) : (
                    <p className={`y-small ${comment.resolved ? "y-fg-2 line-through decoration-(--b-line-strong)" : ""}`}>
                      {comment.text}
                    </p>
                  )}
                  <p className="y-micro y-fg-2 flex flex-wrap items-center gap-x-2">
                    <span>
                      {author(comment)} · {timeAgo(comment.createdAt)}
                    </span>
                    {comment.resolved && mode !== "address" ? (
                      <span className="inline-flex items-center gap-1 font-medium text-(--y-success)">
                        <Check size={12} strokeWidth={3} aria-hidden /> Done
                      </span>
                    ) : null}
                  </p>
                  {mode === "review" && mine && !isEditing ? (
                    <NoteActions
                      comment={comment}
                      className="-ms-2 sm:hidden"
                      onToggle={() => actions.updateComment(commission.id, delivery.id, comment.id, { resolved: !comment.resolved })}
                      onEdit={() => setEditing({ id: comment.id, text: comment.text })}
                      onDelete={() => remove(comment)}
                    />
                  ) : null}
                </div>
                {mode === "review" && mine && !isEditing ? (
                  <NoteActions
                    comment={comment}
                    className="flex-none max-sm:hidden"
                    onToggle={() => actions.updateComment(commission.id, delivery.id, comment.id, { resolved: !comment.resolved })}
                    onEdit={() => setEditing({ id: comment.id, text: comment.text })}
                    onDelete={() => remove(comment)}
                  />
                ) : null}
                {mode === "address" ? (
                  <label className="flex min-h-9 flex-none cursor-pointer items-center gap-2 ps-1 pointer-coarse:min-h-11">
                    <input
                      type="checkbox"
                      className="y-check"
                      checked={comment.resolved}
                      onChange={(event) =>
                        actions.updateComment(commission.id, delivery.id, comment.id, { resolved: event.target.checked })
                      }
                    />
                    <span className="y-small font-medium">Done</span>
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Done, edit and delete for your own note (end of the row on wider screens, under the text on phones). */
function NoteActions({
  comment,
  className,
  onToggle,
  onEdit,
  onDelete,
}: {
  comment: DeliveryComment;
  className: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const at = clock(comment.atSec);
  const quiet = "!bg-transparent hover:!bg-(--b-bg)";
  return (
    <div className={`flex gap-0.5 ${className}`}>
      <RoundIconButton size="sm" label={comment.resolved ? `Reopen note at ${at}` : `Mark note at ${at} done`} onClick={onToggle} className={quiet}>
        {comment.resolved ? <Undo2 size={16} aria-hidden /> : <Check size={16} aria-hidden />}
      </RoundIconButton>
      <RoundIconButton size="sm" label={`Edit note at ${at}`} onClick={onEdit} className={quiet}>
        <Pencil size={16} aria-hidden />
      </RoundIconButton>
      <RoundIconButton size="sm" label={`Delete note at ${at}`} onClick={onDelete} className={quiet}>
        <Trash2 size={16} aria-hidden />
      </RoundIconButton>
    </div>
  );
}

function AddNote({ job, delivery, time }: { job: Job; delivery: Delivery; time: number }) {
  const [text, setText] = useState("");
  const toast = useToast();
  const stamp = clock(time);
  const submit = () => {
    const body = text.trim();
    if (!body) return;
    actions.addComment(job.commission.id, delivery.id, { atSec: time, text: body, author: "business" });
    setText("");
    toast({ message: `Note added at ${stamp}. ${job.creatorName} gets it when you ask for changes.` });
  };
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor="job-note" className="y-label">
        <span>
          Add a note at <span className="y-num">{stamp}</span>
        </span>
      </label>
      <div className="flex gap-2">
        <input
          id="job-note"
          name="job-note"
          className="y-input min-w-0 flex-1"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="e.g. Hold the send screen longer"
          autoComplete="off"
        />
        <PillButton
          type="submit"
          variant="contrast"
          icon={<MessageSquarePlus size={16} aria-hidden />}
          disabled={!text.trim()}
          aria-label={`Add note at ${stamp}`}
        >
          Add note
        </PillButton>
      </div>
    </form>
  );
}

/** The creator's note on a version, clamped to three lines with "Show more". */
function CreatorNote({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 180;
  return (
    <div className="flex flex-col gap-1">
      <p className={`y-small y-fg-2 whitespace-pre-line ${long && !open ? "line-clamp-3" : ""}`}>
        <span className="font-medium text-(--b-fg)">{label}: </span>
        {text}
      </p>
      {long ? (
        <button type="button" className="y-micro y-link w-fit font-medium" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

function Files({ files, watermarked }: { files: Delivery["files"]; watermarked: boolean }) {
  const toast = useToast();
  if (!files.length) return null;
  return (
    <p className="y-small y-fg-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <FileVideo size={16} aria-hidden className="flex-none" />
      {plural(files.length, "file")}
      {watermarked ? " · watermarked previews" : ""} ·
      <button
        type="button"
        className="y-link font-medium"
        onClick={() => toast({ message: `Downloading ${plural(files.length, "file")}`, tone: "info" })}
      >
        Download
      </button>
    </p>
  );
}

/** A version's status chip (used by version cards in the timeline). */
export function VersionBadge({ delivery }: { delivery: Delivery }) {
  const info = versionStatus[delivery.status];
  return (
    <Badge tone={info.tone} icon={info.icon}>
      {info.label}
    </Badge>
  );
}

const ratio: Record<Aspect, number> = { "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "16:9": 16 / 9 };

/** Diagonal "Review copy" watermark over the player's frame (not its controls). */
function Watermark({ video, size }: { video: Video; size: "sm" | "md" }) {
  const wide = video.aspect === "16:9";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 z-[4] mx-auto w-full overflow-hidden rounded-(--y-r-tile) ${
        wide ? "" : size === "sm" ? "max-w-[260px]" : "max-w-[340px]"
      }`}
      style={{ aspectRatio: String(ratio[video.aspect]) }}
    >
      <div className="absolute -inset-1/2 flex -rotate-[28deg] flex-col items-center justify-center gap-[14%]">
        {[0, 1, 2, 3, 4].map((row) => (
          <span
            key={row}
            className={`y-display text-[clamp(16px,4.5vw,24px)] font-semibold whitespace-nowrap text-white opacity-45 [text-shadow:0_1px_3px_rgb(0_0_0/0.45)] ${
              row % 2 ? "ps-[30%]" : ""
            }`}
          >
            Review copy · Review copy · Review copy
          </span>
        ))}
      </div>
    </div>
  );
}
