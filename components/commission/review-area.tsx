"use client";

import { Check, FileVideo, Lock, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { VideoPlayer } from "@/components/domain/video-player";
import { FilterChip } from "@/components/ui/chip";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useToast } from "@/components/ui/toast";
import { clock, plural, timeAgo } from "@/lib/format";
import { actions } from "@/lib/store";
import type { Aspect, Delivery, DeliveryComment, Video } from "@/lib/types";

import { ago, cash, versionStatus, type Workspace } from "./helpers";

type Seek = { at: number; key: number; id: string };

/**
 * Deliveries: the player with note markers, timestamped notes and the creator's note. For the
 * version in review, the business decides here. Files are one quiet line (full list in Files).
 * Campaign review copies are watermarked for the ordering side until approved, and the decision
 * adds "Reject" (the slot goes to another creator).
 */
export function ReviewArea({ ws }: { ws: Workspace }) {
  const { commission, side, slot } = ws;
  const deliveries = commission.deliveries;
  const latest = deliveries[deliveries.length - 1];
  const [picked, setPicked] = useState<{ id: string; count: number } | null>(null);
  const selected =
    (picked && picked.count === deliveries.length
      ? deliveries.find((d) => d.id === picked.id)
      : undefined) ?? latest;
  const isLatest = selected.id === latest.id;
  const selectedId = selected.id;

  const [time, setTimeState] = useState<{ id: string; t: number }>({ id: "", t: 0 });
  const now = time.id === selectedId ? time.t : 0;
  const onTime = useCallback((t: number) => setTimeState({ id: selectedId, t }), [selectedId]);
  const [seek, setSeek] = useState<Seek | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();
  /** Notes added during this visit: once you're writing notes, "Request changes" becomes primary. */
  const [added, setAdded] = useState(0);

  const seekTo = (comment: DeliveryComment) => {
    setActiveId(comment.id);
    setSeek((current) => ({ at: comment.atSec, key: (current?.key ?? 0) + 1, id: selectedId }));
  };

  const inReview = isLatest && selected.status === "in_review" && commission.status === "delivered";
  const canNote = side === "business" && inReview;
  const canResolve = side === "creator" && isLatest && commission.status === "revision";
  // Review copies stay watermarked for the ordering side until approved.
  const watermarked = Boolean(selected.reviewCopy) && side === "business" && selected.status !== "approved";
  const noun = slot ? "Review copy" : "Version";

  return (
    <section
      id="review"
      aria-labelledby="review-title"
      data-tone="paper"
      className="y-block y-pad-md flex scroll-mt-24 flex-col gap-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 id="review-title" className="y-head">
          {noun} {selected.version}
          <span className="y-fg-2 font-normal">
            {" "}
            · {slot ? "uploaded" : "delivered"} {ago(selected.deliveredAt)}
          </span>
        </h2>
        {deliveries.length > 1 ? (
          <div role="group" aria-label="Versions" className="y-scroll-x -mx-1 flex gap-1.5 px-1">
            {deliveries.map((delivery) => (
              <FilterChip
                key={delivery.id}
                pressed={delivery.id === selectedId}
                onClick={() => {
                  setPicked({ id: delivery.id, count: deliveries.length });
                  setActiveId(undefined);
                }}
                icon={versionStatus[delivery.status].icon}
                className="flex-none"
              >
                <span aria-hidden>v{delivery.version}</span>
                <span className="sr-only">
                  {noun} {delivery.version},
                </span>
                <span className="font-medium opacity-75"> {versionStatus[delivery.status].label}</span>
              </FilterChip>
            ))}
          </div>
        ) : null}
      </div>

      {!isLatest ? (
        <p className="y-small y-fg-2 -mt-3">
          This is an earlier version.{" "}
          <button type="button" className="y-link font-semibold" onClick={() => setPicked(null)}>
            Show {noun.toLowerCase()} {latest.version}
          </button>
        </p>
      ) : null}

      <div
        className={
          selected.video.aspect === "16:9"
            ? "flex flex-col gap-6"
            : "grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]"
        }
      >
        <div className="relative">
          <VideoPlayer
            key={selectedId}
            video={selected.video}
            comments={selected.comments}
            onTime={onTime}
            seek={seek && seek.id === selectedId ? seek : undefined}
            activeCommentId={activeId}
            onMarkerClick={(comment) => setActiveId(comment.id)}
          />
          {watermarked ? <Watermark video={selected.video} /> : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {selected.reviewCopy && selected.status !== "approved" ? (
            <p className="y-small y-fg-2 inline-flex items-start gap-2">
              <Lock size={16} aria-hidden className="mt-0.5 flex-none" />
              {side === "business"
                ? "Watermarked, low-quality preview. The full-quality file unlocks when you approve."
                : `${ws.businessName} sees a watermarked, low-quality preview until they approve it.`}
            </p>
          ) : null}

          {selected.note ? (
            <DeliveryNote
              key={selectedId}
              label={side === "creator" ? "Your note" : `${ws.creatorName}'s note`}
              text={selected.note}
            />
          ) : null}

          <Notes
            ws={ws}
            delivery={selected}
            canEdit={canNote}
            canResolve={canResolve}
            activeId={activeId}
            onSeek={seekTo}
          />

          {canNote ? (
            <AddNote ws={ws} delivery={selected} time={now} onAdded={() => setAdded((n) => n + 1)} />
          ) : null}

          {/* Ordering side of a slot: the header's "Download full quality" is the one way to the file. */}
          {slot && side === "business" ? null : <Files files={selected.files} />}
        </div>
      </div>

      {side === "business" && inReview ? <Decision ws={ws} delivery={selected} drafting={added > 0} /> : null}
    </section>
  );
}

function Notes({
  ws,
  delivery,
  canEdit,
  canResolve,
  activeId,
  onSeek,
}: {
  ws: Workspace;
  delivery: Delivery;
  canEdit: boolean;
  canResolve: boolean;
  activeId?: string;
  onSeek: (comment: DeliveryComment) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const { commission, side } = ws;
  const comments = delivery.comments;
  const open = comments.filter((c) => !c.resolved).length;

  const authorName = (comment: DeliveryComment) =>
    comment.author === side
      ? side === "business"
        ? "Your team"
        : "You"
      : comment.author === "business"
        ? ws.businessName
        : ws.creatorName;

  const remove = (comment: DeliveryComment) => {
    actions.removeComment(commission.id, delivery.id, comment.id);
    toast({
      message: `Note at ${clock(comment.atSec)} deleted`,
      tone: "info",
      action: {
        label: "Undo",
        onClick: () =>
          actions.addComment(commission.id, delivery.id, {
            atSec: comment.atSec,
            text: comment.text,
            author: comment.author,
          }),
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="y-head">Notes{comments.length ? ` (${comments.length})` : ""}</h3>
        {comments.length ? (
          <span className="y-micro y-fg-2">
            {open ? `${open} open` : "All done"}
            {comments.length - open && open ? ` · ${comments.length - open} done` : ""}
          </span>
        ) : null}
      </div>
      {comments.length === 0 ? (
        <p className="y-small y-fg-2">
          {canEdit
            ? "No notes yet. Pause where you want a change and add one."
            : side === "creator" && delivery.status === "in_review"
              ? `No notes yet. If ${ws.businessName} wants changes, they appear here.`
              : "No notes on this version."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label={`Notes on version ${delivery.version}`}>
          {comments.map((comment) => {
            const mine = comment.author === side;
            const isEditing = editing?.id === comment.id;
            return (
              <li
                key={comment.id}
                className={`y-tile flex items-start gap-3 p-3 ${
                  activeId === comment.id ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSeek(comment)}
                  className="y-num inline-flex min-h-11 flex-none items-center rounded-full bg-(--b-bg) px-3 text-sm font-semibold hover:shadow-[inset_0_0_0_1.5px_var(--b-line)]"
                  aria-label={`Jump to ${clock(comment.atSec)}`}
                >
                  {clock(comment.atSec)}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
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
                    <p className={`y-small ${comment.resolved ? "y-fg-2 line-through decoration-(--b-line)" : ""}`}>
                      {comment.text}
                    </p>
                  )}
                  <p className="y-micro y-fg-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>
                      {authorName(comment)} · {timeAgo(comment.createdAt)}
                    </span>
                    {comment.resolved && !canResolve ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-(--y-success)">
                        <Check size={12} strokeWidth={3} aria-hidden /> Done
                      </span>
                    ) : null}
                  </p>
                </div>
                {canEdit && mine && !isEditing ? (
                  <div className="flex flex-none gap-1">
                    <RoundIconButton
                      size="sm"
                      label={`Edit note at ${clock(comment.atSec)}`}
                      onClick={() => setEditing({ id: comment.id, text: comment.text })}
                      className="!bg-(--b-bg)"
                    >
                      <Pencil size={16} aria-hidden />
                    </RoundIconButton>
                    <RoundIconButton
                      size="sm"
                      label={`Delete note at ${clock(comment.atSec)}`}
                      onClick={() => remove(comment)}
                      className="!bg-(--b-bg)"
                    >
                      <Trash2 size={16} aria-hidden />
                    </RoundIconButton>
                  </div>
                ) : null}
                {canResolve ? (
                  <label className="flex min-h-11 flex-none cursor-pointer items-center gap-2 ps-1">
                    <input
                      type="checkbox"
                      className="y-check"
                      checked={comment.resolved}
                      onChange={(event) =>
                        actions.updateComment(commission.id, delivery.id, comment.id, {
                          resolved: event.target.checked,
                        })
                      }
                    />
                    <span className="y-small font-semibold">Done</span>
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

function AddNote({
  ws,
  delivery,
  time,
  onAdded,
}: {
  ws: Workspace;
  delivery: Delivery;
  time: number;
  onAdded: () => void;
}) {
  const [text, setText] = useState("");
  const id = useId();
  const toast = useToast();
  const stamp = clock(time);
  const submit = () => {
    const body = text.trim();
    if (!body) return;
    actions.addComment(ws.commission.id, delivery.id, { atSec: time, text: body, author: "business" });
    setText("");
    onAdded();
    toast({ message: `Note added at ${stamp}. ${ws.creatorName} sees it when you ask for changes.` });
  };
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={id} className="y-label">
        <span>Add a note at {stamp}</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          className="y-input flex-1"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="e.g. Hold the WhatsApp screen a second longer"
        />
        <PillButton
          type="submit"
          variant="contrast"
          icon={<MessageSquarePlus size={18} aria-hidden />}
          disabled={!text.trim()}
        >
          Add note at <span className="y-num">{stamp}</span>
        </PillButton>
      </div>
    </form>
  );
}

/** The creator's note on a version: small, clamped to three lines with "Show more". */
function DeliveryNote({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 180;
  return (
    <div className="flex flex-col gap-1">
      <p className={`y-small y-fg-2 whitespace-pre-line ${long && !open ? "line-clamp-3" : ""}`}>
        <span className="font-semibold text-(--b-fg)">{label}: </span>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className="y-micro y-link w-fit font-semibold"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

/** One quiet line; every file is listed in the Files tab. */
function Files({ files }: { files: Delivery["files"] }) {
  const toast = useToast();
  if (!files.length) return null;
  return (
    <p className="y-small y-fg-2 inline-flex items-center gap-2">
      <FileVideo size={16} aria-hidden className="flex-none" />
      {plural(files.length, "file")} ·
      <button
        type="button"
        className="y-link font-semibold"
        onClick={() => toast({ message: `Downloading ${plural(files.length, "file")}`, tone: "info" })}
      >
        Download
      </button>
    </p>
  );
}

function Decision({ ws, delivery, drafting }: { ws: Workspace; delivery: Delivery; drafting: boolean }) {
  const { totals } = ws;
  const open = delivery.comments.filter((c) => !c.resolved).length;
  // Neon follows intent: approving by default, requesting changes once you're writing notes.
  const pending = drafting && open > 0;
  if (ws.slot) {
    return (
      <div className="flex flex-col-reverse gap-2 border-t border-(--b-line) pt-5 sm:flex-row sm:items-center sm:justify-end">
        <PillButton variant="ghost" className="sm:me-auto" onClick={() => ws.openSheet("reject")}>
          Reject
        </PillButton>
        <PillButton variant={pending ? "neon" : "outline"} arrow={pending} onClick={() => ws.openSheet("requestChanges")}>
          Ask for changes{open ? ` (${open})` : ""}
        </PillButton>
        <PillButton variant={pending ? "outline" : "neon"} arrow={!pending} onClick={() => ws.openSheet("approve")}>
          Approve
        </PillButton>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 border-t border-(--b-line) pt-5 sm:flex-row sm:justify-end">
      <PillButton variant={pending ? "neon" : "outline"} arrow={pending} onClick={() => ws.openSheet("requestChanges")}>
        Request changes{open ? ` (${open})` : ""}
      </PillButton>
      <PillButton variant={pending ? "outline" : "neon"} arrow={!pending} onClick={() => ws.openSheet("approve")}>
        Approve and release {cash(totals.creatorEarns)}
      </PillButton>
    </div>
  );
}

const ratio: Record<Aspect, number> = { "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "16:9": 16 / 9 };

/**
 * Diagonal "Review copy" watermark laid over the player's frame (not its controls). Sized like
 * the player's frame: full width for wide videos, at most 340px for vertical ones.
 */
function Watermark({ video }: { video: Video }) {
  const wide = video.aspect === "16:9";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 z-[4] mx-auto w-full overflow-hidden rounded-(--y-r-tile) ${
        wide ? "" : "max-w-[340px]"
      }`}
      style={{ aspectRatio: String(ratio[video.aspect]) }}
    >
      <div className="absolute -inset-1/2 flex -rotate-[28deg] flex-col items-center justify-center gap-[14%]">
        {[0, 1, 2, 3, 4].map((row) => (
          <span
            key={row}
            className={`y-display text-[clamp(18px,5vw,28px)] font-semibold whitespace-nowrap text-(--y-night-fg) opacity-45 [text-shadow:0_1px_3px_var(--y-scrim)] ${
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
