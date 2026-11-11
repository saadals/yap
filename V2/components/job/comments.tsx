"use client";

import { ArrowUp, Check, ChevronDown, Lock, MessageCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { clock, plural, shortDate, timeAgo, weekdayDate } from "@/lib/format";
import {
  commentAuthor,
  commentCounts,
  commentPermissions,
  commentsCloseAt,
  type CommentAuthorView,
  visibleReplies,
} from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { COMMENT_MIN_CHARS, COMMENTS_OPEN_DAYS } from "@/lib/taxonomy";
import type { CommentReply, Delivery, DeliveryComment } from "@/lib/types";

import { autoApproveDate, commentError, reveal, type Job } from "./helpers";

/** One comment or reply deleted on this visit: it stays on screen as "Comment deleted · Undo". */
type Removed = { commentId: string; replyId?: string };
const removedKey = (r: Removed) => r.replyId ?? r.commentId;

const whereOf = (comment: Pick<DeliveryComment, "atSec">) =>
  comment.atSec === null ? "general comment" : `comment at ${clock(comment.atSec)}`;

/**
 * Two-way comments on one delivered version, for both sides (Site-wide spec 5.5.4 as ruled by the
 * round 3 answers): timestamped or general (general only for ad copy), replies one level deep,
 * either side resolves, only the brand re-opens, authors edit or delete their own on the latest
 * version, "New" marks on what this side hadn't seen. Read-only 30 days after completion.
 * Comments never stop the review timer.
 */
export function CommentsPanel({
  job,
  delivery,
  time,
  activeId,
  onSeek,
  onActivate,
  exclude,
  collapsed = false,
  title = "Comments",
  composer = "inside",
  skipReveal,
}: {
  job: Job;
  delivery: Delivery;
  /** The player's playhead in whole seconds (the time a new comment is pinned to). */
  time: number;
  activeId?: string;
  /** Jump the player to a comment (absent when there's no player: chips are labels). */
  onSeek?: (comment: DeliveryComment) => void;
  onActivate: (id: string | undefined) => void;
  /** Comments shown elsewhere on the panel (the creator's requested changes). */
  exclude?: ReadonlySet<string>;
  /** Start folded behind "Comments (n)" (finished jobs); opens itself for a requested comment. */
  collapsed?: boolean;
  title?: string;
  /** "outside": the parent renders `CommentComposer` itself (the review area keeps it in reach). */
  composer?: "inside" | "outside";
  /** Asked before bringing the highlighted comment into view; true skips it once (the parent scrolled elsewhere). */
  skipReveal?: () => boolean;
}) {
  const s = useDemo();
  const { commission, side } = job;
  const perms = commentPermissions(commission, delivery, side);
  const [removed, setRemoved] = useState<Removed[]>([]);
  const removedIds = new Set(removed.map(removedKey));
  const listed = delivery.comments.filter(
    (m) => !exclude?.has(m.id) && (!m.deletedAt || removedIds.has(m.id) || m.replies.some((r) => !r.deletedAt)),
  );
  const open = listed.filter((m) => !m.resolved);
  const resolved = listed.filter((m) => m.resolved);
  // Counts follow what this panel lists (the creator's requested changes are counted where they show).
  const live = listed.filter((m) => !m.deletedAt);
  const counts = { total: live.length, open: live.filter((m) => !m.resolved).length, resolved: live.filter((m) => m.resolved).length };
  const [showResolved, setShowResolved] = useState(false);
  const [unfolded, setUnfolded] = useState(false);
  const resolvedOpen = showResolved || resolved.some((m) => m.id === activeId);
  const expanded = !collapsed || unfolded || listed.some((m) => m.id === activeId);
  const listRef = useRef<HTMLDivElement>(null);

  // Bring the highlighted comment into view (a pin on the player, a time chip, ?comment=).
  useEffect(() => {
    if (!activeId) return;
    if (skipReveal?.()) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-comment="${activeId}"]`);
    if (node) reveal(node, "nearest");
  }, [activeId, resolvedOpen, expanded, skipReveal]);

  const closesAt = commentsCloseAt(commission);
  // Without a player (ad copy, the posting step) comments are general.
  const timestamps = perms.canTimestamp && Boolean(onSeek);
  const general = !timestamps;
  const textDelivery = delivery.kind === "text";
  const newCount = listed.reduce(
    (n, m) =>
      n +
      (job.fresh.has(m.id) && m.author !== side ? 1 : 0) +
      m.replies.filter((r) => job.fresh.has(r.id) && r.author !== side && !r.deletedAt).length,
    0,
  );

  const forget = (target: Removed) => setRemoved((list) => list.filter((r) => removedKey(r) !== removedKey(target)));
  const item = (comment: DeliveryComment) => (
    <CommentItem
      key={comment.id}
      job={job}
      delivery={delivery}
      comment={comment}
      author={commentAuthor(s, commission, comment)}
      active={activeId === comment.id}
      onSeek={onSeek}
      removed={removedIds}
      onRemoved={(target) => setRemoved((list) => [...list, target])}
      onRestored={forget}
    />
  );

  const header = (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="y-head">
        {title} <span className="y-fg-2 font-normal">({counts.total})</span>
      </h3>
      {counts.total ? (
        <span className="y-micro y-fg-2">
          {counts.open} open · {counts.resolved} done
        </span>
      ) : null}
    </div>
  );

  if (!expanded) {
    return (
      <div ref={listRef} data-comments={delivery.id} className="flex flex-col gap-2 border-t border-(--b-line) pt-4">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-3 text-start"
          aria-expanded={false}
          onClick={() => setUnfolded(true)}
        >
          <span className="flex min-w-0 flex-col">
            <span className="y-head inline-flex items-center gap-2">
              <MessageCircle size={16} aria-hidden />
              <span>
                {title} <span className="y-fg-2 font-normal">({counts.total})</span>
              </span>
              {newCount ? <NewTag>{newCount} new</NewTag> : null}
            </span>
            <span className="y-micro y-fg-2">
              {perms.canComment
                ? closesAt
                  ? `Open for final feedback until ${shortDate(closesAt)}`
                  : "Private to you and " + job.otherName
                : closesAt
                  ? `Closed on ${shortDate(closesAt)}. They stay readable.`
                  : "Closed. They stay readable."}
            </span>
          </span>
          <ChevronDown size={16} aria-hidden className="y-fg-2 flex-none" />
        </button>
      </div>
    );
  }

  const auto = side === "business" && commission.status === "delivered" && delivery.id === job.latest?.id ? autoApproveDate(commission) : undefined;

  return (
    <div
      ref={listRef}
      data-comments={delivery.id}
      className="flex scroll-mt-[calc(var(--y-header-h)+80px)] flex-col gap-3"
      aria-label={`Comments on ${job.noun} ${delivery.version}`}
      role="region"
    >
      {header}
      <p className="y-micro y-fg-2 inline-flex items-center gap-1.5">
        <Lock size={12} aria-hidden /> Private: only you and {job.otherName} see these
      </p>

      {listed.length === 0 ? (
        <p className="y-small y-fg-2">
          {side === "creator"
            ? exclude?.size
              ? `No other comments on this ${job.noun}.`
              : `No comments yet. When ${job.otherName} ${textDelivery ? "reads your copy" : "watches it"}, their notes show up here, and you can reply.`
            : textDelivery
              ? `No comments yet. Write what you'd change and ${job.otherName} sees it here.`
              : general
                ? "No comments on this version."
                : "No comments yet. Pause where you want a change and write it: it's pinned to that second. Or make a general comment."}
        </p>
      ) : (
        <>
          {open.length ? (
            <ul className="flex flex-col gap-2" aria-label={`Open comments on ${job.noun} ${delivery.version}`}>
              {open.map(item)}
            </ul>
          ) : (
            <p className="y-small y-fg-2">Every comment on this {job.noun} is resolved.</p>
          )}
          {resolved.length ? (
            <>
              <button
                type="button"
                className="y-small y-fg-2 inline-flex min-h-9 w-fit items-center gap-1.5 font-medium hover:text-(--b-fg) pointer-coarse:min-h-11"
                aria-expanded={resolvedOpen}
                onClick={() => setShowResolved(!resolvedOpen)}
              >
                <Check size={14} strokeWidth={2.5} aria-hidden /> {resolved.length} resolved
                <ChevronDown size={14} aria-hidden className={`transition-transform ${resolvedOpen ? "rotate-180" : ""}`} />
              </button>
              {resolvedOpen ? (
                <ul className="flex flex-col gap-2" aria-label={`Resolved comments on ${job.noun} ${delivery.version}`}>
                  {resolved.map(item)}
                </ul>
              ) : null}
            </>
          ) : null}
        </>
      )}

      {perms.canComment ? (
        composer === "inside" ? (
          <CommentComposer key={delivery.id} job={job} delivery={delivery} time={time} timestamps={timestamps} onSent={onActivate} />
        ) : null
      ) : (
        <p className="y-micro y-fg-2">
          {closesAt
            ? `Comments closed on ${shortDate(closesAt)}, ${COMMENTS_OPEN_DAYS} days after approval. They stay readable.`
            : "Comments are closed on this job. They stay readable."}
        </p>
      )}
      {perms.canComment && auto ? (
        <p className="y-micro y-fg-2">Comments don&apos;t pause the review. Approve or request changes by {weekdayDate(auto)}.</p>
      ) : perms.canComment && closesAt ? (
        <p className="y-micro y-fg-2">Open for final feedback until {shortDate(closesAt)}.</p>
      ) : null}
    </div>
  );
}

/** Your comments on the creator's changes list and the panel both use this. */
export function CommentItem({
  job,
  delivery,
  comment,
  author,
  active,
  onSeek,
  removed,
  onRemoved,
  onRestored,
  requested = false,
}: {
  job: Job;
  delivery: Delivery;
  comment: DeliveryComment;
  author: CommentAuthorView;
  active: boolean;
  onSeek?: (comment: DeliveryComment) => void;
  /** Ids deleted on this visit, shown with Undo. */
  removed: ReadonlySet<string>;
  onRemoved: (target: Removed) => void;
  onRestored: (target: Removed) => void;
  /** Shown in the creator's "what to change" list: resolving reads "Mark done". */
  requested?: boolean;
}) {
  const s = useDemo();
  const toast = useToast();
  const { commission, side } = job;
  const perms = commentPermissions(commission, delivery, side);
  const [editing, setEditing] = useState<{ replyId?: string; text: string } | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const replies = comment.replies.filter((r) => !r.deletedAt || removed.has(r.id));
  const name = (view: CommentAuthorView) => (view.own ? "You" : view.name);
  const fresh = (id: string, view: CommentAuthorView) => job.fresh.has(id) && !view.mine;

  const fail = (reason: Parameters<typeof commentError>[0]) => toast({ message: commentError(reason), tone: "info" });

  const remove = (replyId?: string) => {
    const result = actions.removeComment(commission.id, delivery.id, comment.id, replyId);
    if (!result.ok) return fail(result.reason);
    const target = { commentId: comment.id, replyId };
    onRemoved(target);
    toast({
      message: replyId ? "Reply deleted" : `${whereOf(comment).replace(/^./, (c) => c.toUpperCase())} deleted`,
      tone: "info",
      action: { label: "Undo", onClick: () => restore(replyId) },
    });
  };

  const restore = (replyId?: string) => {
    const result = actions.restoreComment(commission.id, delivery.id, comment.id, replyId);
    if (!result.ok) return fail(result.reason);
    onRestored({ commentId: comment.id, replyId });
  };

  const saveEdit = () => {
    if (!editing) return;
    const result = actions.editComment(commission.id, delivery.id, comment.id, editing.text, editing.replyId);
    if (!result.ok) return fail(result.reason);
    setEditing(null);
    toast({ message: editing.replyId ? "Reply updated" : "Comment updated" });
  };

  const sendReply = () => {
    if (reply === null) return;
    const text = reply.trim();
    if (text.length < COMMENT_MIN_CHARS) return fail("too_short");
    const result = actions.replyToComment(commission.id, delivery.id, comment.id, text);
    if (!result.ok) return fail(result.reason);
    setReply(null);
    toast({ message: `Reply sent. ${job.otherName} gets a notification.` });
  };

  const resolve = () => {
    const result = actions.resolveComment(commission.id, delivery.id, comment.id);
    if (!result.ok) return fail(result.reason);
    toast({ message: requested ? `Marked done. ${job.otherName} sees it ticked.` : "Comment resolved", tone: "info" });
  };

  const reopen = () => {
    const result = actions.reopenComment(commission.id, delivery.id, comment.id);
    if (!result.ok) return fail(result.reason);
    toast({ message: "Comment re-opened", tone: "info" });
  };

  const editBox = (label: string) =>
    editing ? (
      <form
        className="flex flex-col gap-2 pt-1"
        onSubmit={(event) => {
          event.preventDefault();
          saveEdit();
        }}
      >
        <label className="sr-only" htmlFor={`edit-${editing.replyId ?? comment.id}`}>
          {label}
        </label>
        <textarea
          id={`edit-${editing.replyId ?? comment.id}`}
          rows={2}
          className="y-input !min-h-0 !bg-(--b-bg) !py-2"
          value={editing.text}
          onChange={(event) => setEditing({ ...editing, text: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setEditing(null);
            }
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              saveEdit();
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
    ) : null;

  const own = (target: DeliveryComment | CommentReply) =>
    perms.canEditOwn && commentAuthor(s, commission, target).own && !target.deletedAt;
  const isEditing = editing !== null && !editing.replyId;
  const chip =
    comment.atSec === null ? (
      <span className="y-micro y-fg-2 rounded-full bg-(--b-bg) px-2.5 py-1 font-medium">General</span>
    ) : onSeek ? (
      <button
        type="button"
        className="y-num y-micro inline-flex min-h-8 items-center rounded-full bg-(--b-bg) px-2.5 font-semibold hover:shadow-[inset_0_0_0_1.5px_var(--b-line)] pointer-coarse:min-h-11"
        onClick={() => onSeek(comment)}
        aria-label={`Play from ${clock(comment.atSec)}`}
      >
        {clock(comment.atSec)}
      </button>
    ) : (
      <span className="y-num y-micro rounded-full bg-(--b-bg) px-2.5 py-1 font-semibold">{clock(comment.atSec)}</span>
    );

  return (
    <li
      data-comment={comment.id}
      className={`y-tile job-comment flex scroll-mt-[calc(var(--y-header-h)+80px)] flex-col gap-1.5 p-3 ${active ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Avatar author={author} size={26} />
        <span className="y-small min-w-0 truncate">
          <span className="font-medium">{name(author)}</span>
          <span className="y-fg-2">
            {" "}
            · {timeAgo(comment.createdAt)}
            {comment.editedAt && !comment.deletedAt ? " · edited" : ""}
          </span>
        </span>
        {fresh(comment.id, author) && !comment.deletedAt ? <NewTag>New</NewTag> : null}
        <span className="flex-1" />
        {chip}
      </div>

      {comment.deletedAt ? (
        <p className="y-small y-fg-2 italic">
          Comment deleted
          {removed.has(comment.id) ? (
            <>
              {" · "}
              <button type="button" className="y-link font-medium not-italic" onClick={() => restore()}>
                Undo
              </button>
            </>
          ) : null}
        </p>
      ) : isEditing ? (
        editBox(`Edit your ${whereOf(comment)}`)
      ) : (
        <p className={`y-small whitespace-pre-line ${comment.resolved && !requested ? "y-fg-2" : ""}`}>{comment.text}</p>
      )}

      {!comment.deletedAt && !isEditing ? (
        <div className="-ms-1 flex flex-wrap items-center gap-x-1 gap-y-0.5">
          {comment.requestedAt && !requested ? <span className="y-micro y-fg-2 px-1 font-medium">Sent as a change</span> : null}
          {perms.canComment && reply === null ? <Act onClick={() => setReply("")}>Reply</Act> : null}
          {!comment.resolved && perms.canResolve ? <Act onClick={resolve}>{requested ? "Mark done" : "Resolve"}</Act> : null}
          {comment.resolved ? (
            <span className="y-micro inline-flex items-center gap-1 px-1 font-medium text-(--y-success)">
              <Check size={12} strokeWidth={3} aria-hidden /> {requested ? "Done" : "Resolved"}
            </span>
          ) : null}
          {comment.resolved && perms.canReopen ? <Act onClick={reopen}>Re-open</Act> : null}
          {own(comment) ? (
            <>
              <Act onClick={() => setEditing({ text: comment.text })} label={`Edit your ${whereOf(comment)}`}>
                Edit
              </Act>
              <Act onClick={() => remove()} label={`Delete your ${whereOf(comment)}`}>
                Delete
              </Act>
            </>
          ) : null}
        </div>
      ) : null}

      {replies.length ? (
        <ul className="mt-1 flex flex-col gap-2.5 border-s-2 border-(--b-line) ps-3" aria-label="Replies">
          {replies.map((r) => {
            const view = commentAuthor(s, commission, r);
            const editingReply = editing?.replyId === r.id;
            return (
              <li key={r.id} data-comment={r.id} className="job-comment flex flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar author={view} size={20} />
                  <span className="y-small min-w-0 truncate">
                    <span className="font-medium">{name(view)}</span>
                    <span className="y-fg-2">
                      {" "}
                      · {timeAgo(r.createdAt)}
                      {r.editedAt && !r.deletedAt ? " · edited" : ""}
                    </span>
                  </span>
                  {fresh(r.id, view) && !r.deletedAt ? <NewTag>New</NewTag> : null}
                </div>
                {r.deletedAt ? (
                  <p className="y-small y-fg-2 italic">
                    Reply deleted ·{" "}
                    <button type="button" className="y-link font-medium not-italic" onClick={() => restore(r.id)}>
                      Undo
                    </button>
                  </p>
                ) : editingReply ? (
                  editBox("Edit your reply")
                ) : (
                  <p className="y-small whitespace-pre-line">{r.text}</p>
                )}
                {!editingReply && own(r) ? (
                  <div className="-ms-1 flex gap-x-1">
                    <Act onClick={() => setEditing({ replyId: r.id, text: r.text })} label="Edit your reply">
                      Edit
                    </Act>
                    <Act onClick={() => remove(r.id)} label="Delete your reply">
                      Delete
                    </Act>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {reply !== null ? (
        <form
          className="mt-1 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            sendReply();
          }}
        >
          <label className="sr-only" htmlFor={`reply-${comment.id}`}>
            Reply to {author.own ? "your comment" : author.firstName}
          </label>
          <textarea
            id={`reply-${comment.id}`}
            rows={1}
            className="y-input max-h-32 min-h-10 min-w-0 flex-1 resize-none !rounded-[20px] !bg-(--b-bg) !py-2"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendReply();
              }
              if (event.key === "Escape") {
                event.stopPropagation();
                setReply(null);
              }
            }}
            placeholder={`Reply to ${author.own ? "your comment" : author.firstName}…`}
            autoFocus
          />
          <SendButton label="Send reply" disabled={reply.trim().length < COMMENT_MIN_CHARS} />
          <PillButton size="sm" variant="ghost" onClick={() => setReply(null)}>
            Cancel
          </PillButton>
        </form>
      ) : null}
    </li>
  );
}

function Act({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="y-micro y-fg-2 min-h-8 rounded-full px-1.5 font-medium hover:text-(--b-fg) hover:underline pointer-coarse:min-h-11"
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function NewTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="y-micro inline-flex flex-none items-center gap-1 font-semibold text-(--b-fg)">
      <span aria-hidden className="size-1.5 rounded-full bg-(--y-neon,#34c759)" />
      {children}
    </span>
  );
}

function SendButton({ label, disabled }: { label: string; disabled: boolean }) {
  return (
    <button
      type="submit"
      className="y-round flex-none"
      data-tone-btn="contrast"
      data-size="sm"
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      <ArrowUp size={18} aria-hidden />
    </button>
  );
}

function Avatar({ author, size }: { author: CommentAuthorView; size: number }) {
  if (author.faceId) return <FaceAvatar id={author.faceId} name="" size={size} />;
  if (author.business) return <BusinessLogo business={author.business} size={size} />;
  return <FaceAvatar id={author.name} name="" size={size} />;
}

/**
 * The comment box: pinned to the playhead (tap the chip for a general comment), or general only.
 * `CommentsPanel` renders it last; the review area renders it itself to keep it in reach.
 */
export function CommentComposer({
  job,
  delivery,
  time,
  timestamps,
  onSent,
}: {
  job: Job;
  delivery: Delivery;
  time: number;
  /** False for ad copy: general comments only. */
  timestamps: boolean;
  onSent: (id: string) => void;
}) {
  const toast = useToast();
  const id = useId();
  const [text, setText] = useState("");
  const [general, setGeneral] = useState(false);
  const atSec = general || !timestamps ? null : time;
  const stamp = clock(time);

  const send = () => {
    const body = text.trim();
    if (body.length < COMMENT_MIN_CHARS) {
      toast({ message: commentError("too_short"), tone: "info" });
      return;
    }
    const result = actions.addComment(job.commission.id, delivery.id, { atSec, text: body });
    if (!result.ok) {
      toast({ message: commentError(result.reason), tone: "info" });
      return;
    }
    setText("");
    onSent(result.id);
    toast({
      message: `${atSec === null ? "Comment" : `Comment at ${stamp}`} sent. ${job.otherName} gets a notification.`,
    });
  };

  const label = !timestamps
    ? delivery.kind === "text"
      ? "Comment on the copy"
      : `Comment on this ${job.noun}`
    : atSec === null
      ? "General comment"
      : `Comment at ${stamp}`;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="y-label">
          <span className="y-num">{label}</span>
        </label>
        {timestamps ? (
          <button
            type="button"
            className="y-micro y-link min-h-8 font-medium pointer-coarse:min-h-11"
            aria-pressed={general}
            onClick={() => setGeneral((value) => !value)}
          >
            {general ? `Pin it to ${stamp} instead` : "Make it general"}
          </button>
        ) : null}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          id={id}
          name="job-comment"
          rows={1}
          className="y-input max-h-40 min-h-11 min-w-0 flex-1 resize-none !rounded-[22px] !py-2.5"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={
            delivery.kind === "text"
              ? "e.g. Make headline 3 shorter"
              : job.side === "business"
                ? "e.g. Hold the send screen longer"
                : "e.g. I can trim this part"
          }
          autoComplete="off"
        />
        <SendButton label={`Send ${label.charAt(0).toLowerCase()}${label.slice(1)}`} disabled={text.trim().length < COMMENT_MIN_CHARS} />
      </div>
    </form>
  );
}

/** "3 comments · 1 new" for a version card. */
export function commentSummary(job: Job, delivery: Delivery): string | null {
  const { total } = commentCounts(delivery);
  if (!total) return null;
  const fresh = delivery.comments.reduce(
    (n, m) =>
      n +
      (!m.deletedAt && m.author !== job.side && job.fresh.has(m.id) ? 1 : 0) +
      visibleReplies(m).filter((r) => r.author !== job.side && job.fresh.has(r.id)).length,
    0,
  );
  return `${plural(total, "comment")}${fresh ? ` · ${fresh} new` : ""}`;
}
