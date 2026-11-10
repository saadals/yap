"use client";

import { Download, FileText, FileVideo, Lock } from "lucide-react";
import { useCallback, useState } from "react";

import { VideoPlayer } from "@/components/domain/video-player";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/format";
import { commentAuthor, openComments, requestedComments, visibleComments } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { Aspect, Delivery, DeliveryComment, Video } from "@/lib/types";

import { CommentItem, CommentsPanel } from "./comments";
import { ago, versionStatus, type Job } from "./helpers";

type Seek = { at: number; key: number; id: string };

/**
 * A delivered version: the 9:16 player with comment pins (ad copy: the copy as text), the version
 * switcher, the creator's note, the two-way comments and the files. Both sides comment on any
 * version while comments are open. While the creator works on changes, the comments the brand sent
 * sit at the top as a list to work through. Campaign review copies stay watermarked for the
 * ordering side until approved.
 */
export function ReviewArea({
  job,
  delivery,
  footer,
  aside,
  collapsed = false,
  size = "md",
}: {
  job: Job;
  delivery: Delivery;
  /** Decision buttons under the comments (ordering side, version in review). */
  footer?: React.ReactNode;
  /** The stage's own content beside the player (finished jobs: review, learnings, post status). */
  aside?: React.ReactNode;
  /** Fold the comments behind "Comments (n)" (finished jobs). */
  collapsed?: boolean;
  size?: "sm" | "md";
}) {
  const s = useDemo();
  const { commission, side, latest } = job;
  const isLatest = delivery.id === latest?.id;
  const addressing = isLatest && side === "creator" && commission.status === "revision";

  const [time, setTimeState] = useState<{ id: string; t: number }>({ id: "", t: 0 });
  const now = time.id === delivery.id ? time.t : 0;
  const onTime = useCallback((t: number) => setTimeState({ id: delivery.id, t }), [delivery.id]);
  const [seek, setSeek] = useState<Seek | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();

  // A request to open one comment (?comment=, a timeline line): applied while rendering.
  const [seenFocus, setSeenFocus] = useState(0);
  const [opened, setOpened] = useState(false);
  const focus = job.focus;
  if (focus && focus.key !== seenFocus && focus.deliveryId === delivery.id) {
    setSeenFocus(focus.key);
    setOpened(true);
    const owner = focus.commentId
      ? delivery.comments.find((m) => m.id === focus.commentId || m.replies.some((r) => r.id === focus.commentId))
      : undefined;
    setActiveId(owner?.id);
    if (owner && owner.atSec !== null) setSeek({ at: owner.atSec, key: (seek?.key ?? 0) + 1, id: delivery.id });
  }

  const seekTo = (comment: DeliveryComment) => {
    setActiveId(comment.id);
    const at = comment.atSec;
    if (at === null) return;
    setSeek((current) => ({ at, key: (current?.key ?? 0) + 1, id: delivery.id }));
  };

  // While making changes: what the brand sent with its request (older data: its open comments).
  const sent = addressing ? requestedComments(delivery) : [];
  const requested = addressing
    ? sent.length
      ? sent
      : openComments(delivery).filter((m) => m.author === "business")
    : [];
  const exclude = requested.length ? new Set(requested.map((m) => m.id)) : undefined;

  const text = delivery.kind === "text" || !delivery.video;
  const watermarked = Boolean(delivery.reviewCopy) && side === "business" && delivery.status !== "approved";
  const wide = delivery.video?.aspect === "16:9";
  const grid = text
    ? "grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
    : wide
      ? "flex flex-col gap-6"
      : `grid gap-6 ${size === "sm" ? "md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]"}`;

  return (
    <div className="flex flex-col gap-6">
      {requested.length ? (
        <section aria-labelledby={`asked-${delivery.id}`} className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id={`asked-${delivery.id}`} className="y-head">
              What {job.businessName} asked you to change
            </h3>
            <span className="y-micro y-fg-2 flex-none">
              {requested.every((m) => m.resolved) ? "All done" : `${requested.filter((m) => !m.resolved).length} to go`}
            </span>
          </div>
          <ol className="flex flex-col gap-2">
            {requested.map((comment) => (
              <CommentItem
                key={comment.id}
                job={job}
                delivery={delivery}
                comment={comment}
                author={commentAuthor(s, commission, comment)}
                active={activeId === comment.id}
                onSeek={text ? undefined : seekTo}
                removed={noneRemoved}
                onRemoved={noop}
                onRestored={noop}
                requested
              />
            ))}
          </ol>
        </section>
      ) : null}

      <div className={grid}>
        <div className="relative min-w-0">
          {text ? (
            <CopyBlock delivery={delivery} />
          ) : delivery.video ? (
            <>
              <VideoPlayer
                key={delivery.id}
                video={delivery.video}
                comments={visibleComments(delivery)}
                onTime={onTime}
                seek={seek && seek.id === delivery.id ? seek : undefined}
                activeCommentId={activeId}
                onMarkerClick={(comment) => setActiveId(comment.id)}
                size={size}
              />
              {watermarked ? <Watermark video={delivery.video} size={size} /> : null}
            </>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <VersionSwitcher job={job} delivery={delivery} />

          {delivery.reviewCopy && delivery.status !== "approved" ? (
            <p className="y-small y-fg-2 inline-flex items-start gap-2">
              <Lock size={16} aria-hidden className="mt-0.5 flex-none" />
              {side === "business"
                ? "Watermarked, low-quality preview. The full-quality file and the raw footage unlock when you approve."
                : `${job.businessName} sees a watermarked, low-quality preview until they approve it.`}
            </p>
          ) : null}

          {delivery.note && !aside ? (
            <CreatorNote key={delivery.id} label={side === "creator" ? "Your note" : `${job.creatorName}'s note`} text={delivery.note} />
          ) : null}

          {aside}

          <CommentsPanel
            job={job}
            delivery={delivery}
            time={now}
            activeId={activeId}
            onSeek={text ? undefined : seekTo}
            onActivate={setActiveId}
            exclude={exclude}
            collapsed={collapsed && !opened}
            title={requested.length ? "Other comments" : "Comments"}
          />

          {job.slot && side === "business" ? null : text ? null : <Files files={delivery.files} watermarked={watermarked} />}

          {footer}
        </div>
      </div>
    </div>
  );
}

const noneRemoved: ReadonlySet<string> = new Set();
const noop = () => {};

/**
 * A version's comments without its player, folded (a campaign slot's posting step): the time
 * chips are labels, and a requested comment (?comment=) opens the fold.
 */
export function CommentsOnly({ job, delivery }: { job: Job; delivery: Delivery }) {
  const [activeId, setActiveId] = useState<string | undefined>();
  const [seenFocus, setSeenFocus] = useState(0);
  const [opened, setOpened] = useState(false);
  const focus = job.focus;
  if (focus && focus.key !== seenFocus && focus.deliveryId === delivery.id) {
    setSeenFocus(focus.key);
    setOpened(true);
    const owner = focus.commentId
      ? delivery.comments.find((m) => m.id === focus.commentId || m.replies.some((r) => r.id === focus.commentId))
      : undefined;
    setActiveId(owner?.id);
  }
  return <CommentsPanel job={job} delivery={delivery} time={0} activeId={activeId} onActivate={setActiveId} collapsed={!opened} />;
}

/** v1 · v2 · v3 chips with each version's status, and a dot on one with comments you haven't seen. */
function VersionSwitcher({ job, delivery }: { job: Job; delivery: Delivery }) {
  const deliveries = job.commission.deliveries;
  if (deliveries.length < 2) return null;
  const latest = deliveries[deliveries.length - 1];
  const Noun = job.noun.charAt(0).toUpperCase() + job.noun.slice(1);
  const unseen = (d: Delivery) =>
    d.id !== delivery.id &&
    !job.viewed.has(d.id) &&
    d.comments.some(
      (m) =>
        (job.fresh.has(m.id) && m.author !== job.side) || m.replies.some((r) => job.fresh.has(r.id) && r.author !== job.side),
    );
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
            {unseen(d) ? (
              <span className="size-1.5 rounded-full bg-(--y-neon)">
                <span className="sr-only">, new comments</span>
              </span>
            ) : null}
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

/** Ad copy: the delivered text as written, with its documents. */
function CopyBlock({ delivery }: { delivery: Delivery }) {
  const toast = useToast();
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="y-tile flex flex-col gap-3 p-4 md:p-5">
        <h3 className="y-micro y-fg-2 inline-flex items-center gap-1.5 font-medium tracking-[0.02em] uppercase">
          <FileText size={13} aria-hidden /> The copy · version {delivery.version}
        </h3>
        {delivery.text ? (
          <p className="y-small whitespace-pre-line">{delivery.text}</p>
        ) : (
          <p className="y-small y-fg-2">The copy is in the attached document.</p>
        )}
      </div>
      {delivery.files.length ? (
        <ul className="flex flex-col gap-1.5" aria-label="Documents">
          {delivery.files.map((file) => (
            <li key={file.name} className="y-tile flex items-center gap-3 py-2 ps-3 pe-1.5">
              <FileText size={16} aria-hidden className="flex-none" />
              <span className="y-small min-w-0 flex-1 truncate font-medium">{file.name}</span>
              <span className="y-micro y-num y-fg-2 flex-none">{file.size}</span>
              <button
                type="button"
                className="y-round flex-none !bg-transparent hover:!bg-(--b-bg)"
                data-tone-btn="soft"
                data-size="sm"
                aria-label={`Download ${file.name}`}
                title="Download"
                onClick={() => toast({ message: `Downloading ${file.name}`, tone: "info" })}
              >
                <Download size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
