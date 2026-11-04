"use client";

import { Check, Download, FileVideo, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { VideoPlayer } from "@/components/domain/video-player";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useToast } from "@/components/ui/toast";
import { clock, plural, timeAgo } from "@/lib/format";
import { actions } from "@/lib/store";
import type { Delivery, DeliveryComment } from "@/lib/types";

import { ago, cash, revisionsLeft, versionStatus, type Workspace } from "./helpers";

type Seek = { at: number; key: number; id: string };

/**
 * Deliveries: version switcher, the simulated player with note markers, timestamped notes,
 * files and the creator's note. For the version in review, the business decides here.
 */
export function ReviewArea({
  ws,
  sectionRef,
}: {
  ws: Workspace;
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  const { commission, role } = ws;
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
  const canNote = role === "business" && inReview;
  const canResolve = role === "creator" && isLatest && commission.status === "revision";
  const status = versionStatus[selected.status];

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      id="review"
      aria-labelledby="review-title"
      data-tone="paper"
      className="y-block y-pad-md flex scroll-mt-24 flex-col gap-6 outline-none"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="review-title" className="y-display y-title">
            {inReview && role === "business" ? `Review version ${selected.version}` : "Deliveries"}
          </h2>
          <p className="y-small y-fg-2">
            Version {selected.version} · delivered {ago(selected.deliveredAt)}
          </p>
        </div>
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
                <span className="sr-only">Version {delivery.version},</span>
                <span className="font-medium opacity-75"> {versionStatus[delivery.status].label}</span>
              </FilterChip>
            ))}
          </div>
        ) : (
          <Badge tone={status.tone} icon={status.icon} className="w-fit">
            {status.label}
          </Badge>
        )}
      </div>

      {!isLatest ? (
        <div className="y-tile flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="y-small">
            You&apos;re looking at version {selected.version}. Version {latest.version} is the latest.
          </p>
          <PillButton size="sm" variant="contrast" onClick={() => setPicked(null)}>
            Show version {latest.version}
          </PillButton>
        </div>
      ) : null}

      <div
        className={
          selected.video.aspect === "16:9"
            ? "flex flex-col gap-6"
            : "grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]"
        }
      >
        <div>
          <VideoPlayer
            key={selectedId}
            video={selected.video}
            comments={selected.comments}
            onTime={onTime}
            seek={seek && seek.id === selectedId ? seek : undefined}
            activeCommentId={activeId}
            onMarkerClick={(comment) => setActiveId(comment.id)}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {selected.note ? (
            <figure className="flex items-start gap-3">
              <FaceAvatar id={commission.creatorId} name="" size={36} />
              <div className="flex min-w-0 flex-col gap-1">
                <figcaption className="y-micro y-fg-2">
                  {role === "creator" ? "Your note" : `Note from ${ws.creatorName}`}
                </figcaption>
                <blockquote className="y-small y-tile rounded-ss-[6px] px-4 py-3 whitespace-pre-line">
                  {selected.note}
                </blockquote>
              </div>
            </figure>
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

          <Files files={selected.files} />
        </div>
      </div>

      {role === "business" && inReview ? <Decision ws={ws} delivery={selected} drafting={added > 0} /> : null}
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
  const { commission, role } = ws;
  const comments = delivery.comments;
  const open = comments.filter((c) => !c.resolved).length;

  const authorName = (comment: DeliveryComment) =>
    comment.author === role
      ? role === "business"
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
            ? "No notes yet. Pause on the moment you want changed and add a note. It's pinned to that second."
            : role === "creator" && delivery.status === "in_review"
              ? `No notes yet. If ${ws.businessName} wants changes, their notes appear here, pinned to the exact second.`
              : "No notes on this version."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label={`Notes on version ${delivery.version}`}>
          {comments.map((comment) => {
            const mine = comment.author === role;
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
    toast({ message: `Note added at ${stamp}. ${ws.creatorName} sees it when you request changes.` });
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
          aria-describedby={`${id}-hint`}
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
      <p id={`${id}-hint`} className="y-micro y-fg-3 px-1">
        Pause the video where you want a change. The note is pinned to that second.
      </p>
    </form>
  );
}

function Files({ files }: { files: Delivery["files"] }) {
  const toast = useToast();
  if (!files.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="y-head">Files</h3>
      <ul className="flex flex-col gap-2">
        {files.map((file) => (
          <li key={file.name} className="y-tile flex items-center gap-3 py-2 ps-4 pe-2">
            <FileVideo size={20} aria-hidden className="flex-none" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="y-small truncate font-semibold">{file.name}</span>
              <span className="y-micro y-fg-2">{file.size}</span>
            </span>
            <RoundIconButton
              size="sm"
              label={`Download ${file.name}`}
              className="!bg-(--b-bg)"
              onClick={() =>
                toast({ message: `Downloading ${file.name} (${file.size})`, tone: "info" })
              }
            >
              <Download size={18} aria-hidden />
            </RoundIconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Decision({ ws, delivery, drafting }: { ws: Workspace; delivery: Delivery; drafting: boolean }) {
  const { commission, totals } = ws;
  const open = delivery.comments.filter((c) => !c.resolved).length;
  // Neon follows intent: approving by default, requesting changes once you're writing notes.
  const pending = drafting ? open : 0;
  const left = revisionsLeft(commission);
  return (
    <div className="flex flex-col gap-4 border-t border-(--b-line) pt-5 lg:flex-row lg:items-center lg:justify-between">
      <p className="y-small y-fg-2 max-w-[44ch]">
        {pending
          ? `${plural(pending, "note")} ready to send to ${ws.creatorName}. `
          : `Happy with it? Approving releases ${cash(totals.creatorEarns)} to ${ws.creatorName}. `}
        {left ? `${plural(left, "revision round")} left.` : "No included revision rounds left."}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <PillButton
          variant={pending ? "neon" : "outline"}
          arrow={pending > 0}
          onClick={() => ws.openSheet("requestChanges")}
        >
          Request changes{open ? ` (${open})` : ""}
        </PillButton>
        <PillButton
          variant={pending ? "outline" : "neon"}
          arrow={!pending}
          onClick={() => ws.openSheet("approve")}
        >
          Approve and release {cash(totals.creatorEarns)}
        </PillButton>
      </div>
    </div>
  );
}
