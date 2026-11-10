"use client";

import { ArrowRight, Check, ChevronDown, Lock, MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Note } from "@/components/ui/note";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { clock, shortDate, timeAgo, weekdayDate } from "@/lib/format";
import {
  commentAuthor,
  commentCounts,
  commentPermissions,
  commentsCloseAt,
  visibleComments,
  visibleReplies,
  type CommentAuthorView,
} from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { COMMENT_MIN_CHARS, COMMENTS_OPEN_DAYS } from "@/lib/taxonomy";
import type { CommentReply, Delivery, DeliveryComment, Role } from "@/lib/types";

import { autoApproveDate, scrollMotion, type Workspace } from "./helpers";

type Editing = { id: string; replyId?: string; text: string };

/**
 * The comments beside the player (Work spec 6.8.3, Site-wide 5.5.4): counts, the privacy line,
 * open comments first with their replies, resolved ones folded under "N resolved", and the
 * composer with its time chip (tap it for a general comment). Only the brand and the creator of
 * this order see them. Comments never pause the review.
 */
export function CommentsPanel({
  ws,
  delivery,
  time,
  activeId,
  onSeek,
  onActivate,
  fresh,
}: {
  ws: Workspace;
  delivery: Delivery;
  /** The player's playhead in whole seconds: the time for the next comment. */
  time: number;
  activeId?: string;
  /** Jump the player to a comment's time (and highlight it). */
  onSeek: (comment: DeliveryComment) => void;
  onActivate: (id: string | undefined) => void;
  /** Comments and replies that were unread for this side when the order opened. */
  fresh: ReadonlySet<string>;
}) {
  const s = useDemo();
  const { commission, side } = ws;
  const perms = commentPermissions(commission, delivery, side);
  const comments = visibleComments(delivery);
  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);
  const counts = commentCounts(delivery);
  const [showResolved, setShowResolved] = useState(false);
  // A highlighted resolved comment (a pin, or ?comment=) opens the folded list.
  const resolvedOpen = showResolved || resolved.some((c) => c.id === activeId);
  const listRef = useRef<HTMLDivElement>(null);

  // Bring the highlighted comment into view inside the panel (pins, time chips, ?comment=).
  useEffect(() => {
    if (!activeId) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-comment="${activeId}"]`);
    node?.scrollIntoView({ block: "nearest", behavior: scrollMotion() });
  }, [activeId, resolvedOpen]);

  const textDelivery = !perms.canTimestamp && delivery.kind === "text";
  const other = ws.otherName;
  const closesAt = commentsCloseAt(commission);
  const auto = side === "business" && commission.status === "delivered" ? autoApproveDate(commission, ws.latest) : undefined;

  const item = (comment: DeliveryComment) => (
    <CommentItem
      key={comment.id}
      ws={ws}
      delivery={delivery}
      comment={comment}
      author={commentAuthor(s, commission, comment)}
      active={activeId === comment.id}
      fresh={fresh}
      onSeek={onSeek}
    />
  );

  return (
    <div className="y-ord-cpanel" ref={listRef}>
      <div className="y-ord-chead">
        <h3>
          Comments <span className="y-ord-chead-n">({counts.total})</span>
        </h3>
        <small>
          {counts.open} open · {counts.resolved} done
        </small>
      </div>
      <Note size="sm" icon={<Lock size={13} aria-hidden />} className="mb-2.5">
        <b className="font-semibold">Private</b> · only you and {other} see these comments
      </Note>

      {comments.length === 0 ? (
        <p className="y-ord-cempty">
          {side === "creator"
            ? `No comments yet. When ${other} ${textDelivery ? "reads your copy" : "watches your version"}, their notes ${textDelivery ? "" : "on the video "}show up here.`
            : textDelivery
              ? `No comments yet. Write what you'd change and ${other} sees it here.`
              : "No comments yet. Pick a moment on the timeline and write what you'd change, or make a general comment."}
        </p>
      ) : (
        <>
          {open.length ? (
            <ul className="y-ord-clist" aria-label={`Open comments on version ${delivery.version}`}>
              {open.map(item)}
            </ul>
          ) : (
            <p className="y-ord-cnote !mt-0 !mb-2 !px-1">Every comment on this version is resolved.</p>
          )}
          {resolved.length ? (
            <>
              <button
                type="button"
                className="y-ord-resolved-t"
                aria-expanded={resolvedOpen}
                onClick={() => setShowResolved(!resolvedOpen)}
              >
                <Check size={14} strokeWidth={2.5} aria-hidden /> {resolved.length} resolved
                <ChevronDown size={14} aria-hidden className={`transition-transform ${resolvedOpen ? "rotate-180" : ""}`} />
              </button>
              {resolvedOpen ? (
                <ul className="y-ord-clist" aria-label={`Resolved comments on version ${delivery.version}`}>
                  {resolved.map(item)}
                </ul>
              ) : null}
            </>
          ) : null}
        </>
      )}

      {perms.canComment ? (
        <Composer
          key={delivery.id}
          ws={ws}
          delivery={delivery}
          time={time}
          timestamps={perms.canTimestamp}
          onSent={(id) => onActivate(id)}
        />
      ) : (
        <p className="y-ord-cnote">
          {closesAt
            ? `Comments closed on ${shortDate(closesAt)}, ${COMMENTS_OPEN_DAYS} days after the order was completed. They stay readable.`
            : "Comments are closed on this order. They stay readable."}
        </p>
      )}

      {perms.canComment ? (
        <p className="y-ord-cnote">
          {side === "business"
            ? auto && delivery.id === ws.latest?.id
              ? `Comments don't pause the review. Approve or request changes before ${weekdayDate(auto)}.`
              : commission.status === "completed" && closesAt
                ? `Comments stay open until ${shortDate(closesAt)} for final feedback.`
                : "Comments don't pause the review."
            : textDelivery
              ? "Reply to notes here. Feedback on the copy stays here, not in Messages."
              : "Reply to notes here. Video feedback stays on the video, not in Messages."}
        </p>
      ) : null}
    </div>
  );
}

function Avatar({ author, size }: { author: CommentAuthorView; size: number }) {
  if (author.faceId) return <FaceAvatar id={author.faceId} name="" size={size} />;
  if (author.business) return <BusinessLogo business={author.business} size={size} />;
  return <FaceAvatar id={author.name} name="" size={size} />;
}

const whereOf = (comment: Pick<DeliveryComment, "atSec">) =>
  comment.atSec === null ? "general comment" : `comment at ${clock(comment.atSec)}`;

function CommentItem({
  ws,
  delivery,
  comment,
  author,
  active,
  fresh,
  onSeek,
}: {
  ws: Workspace;
  delivery: Delivery;
  comment: DeliveryComment;
  author: CommentAuthorView;
  active: boolean;
  fresh: ReadonlySet<string>;
  onSeek: (comment: DeliveryComment) => void;
}) {
  const s = useDemo();
  const toast = useToast();
  const { commission, side } = ws;
  const perms = commentPermissions(commission, delivery, side);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const replies = visibleReplies(comment);
  const name = (view: CommentAuthorView) => (view.own ? "You" : view.name);

  const remove = (replyId?: string) => {
    const result = actions.removeComment(commission.id, delivery.id, comment.id, replyId);
    setMenu(null);
    if (!result.ok) return;
    toast({
      message: replyId ? "Reply deleted" : `${whereOf(comment).replace(/^./, (c) => c.toUpperCase())} deleted`,
      tone: "info",
      action: { label: "Undo", onClick: () => actions.restoreComment(commission.id, delivery.id, comment.id, replyId) },
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const result = actions.editComment(commission.id, delivery.id, editing.id, editing.text, editing.replyId);
    if (!result.ok) {
      toast({ message: "Write a comment first", tone: "info" });
      return;
    }
    setEditing(null);
    toast({ message: "Comment updated" });
  };

  const sendReply = () => {
    if (replying === null) return;
    const text = replying.trim();
    if (text.length < COMMENT_MIN_CHARS) {
      toast({ message: "Write a reply first", tone: "info" });
      return;
    }
    const result = actions.replyToComment(commission.id, delivery.id, comment.id, text);
    if (!result.ok) {
      toast({ message: "Couldn't send. Try again.", tone: "info" });
      return;
    }
    setReplying(null);
    toast({ message: `Reply sent · ${ws.otherName} gets a notification` });
  };

  const editBox = (label: string) =>
    editing ? (
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          saveEdit();
        }}
      >
        <label className="sr-only" htmlFor={`edit-${editing.replyId ?? editing.id}`}>
          {label}
        </label>
        <textarea
          id={`edit-${editing.replyId ?? editing.id}`}
          rows={2}
          className="y-input !min-h-0 !py-2 text-sm"
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

  const ownActions = (target: DeliveryComment | CommentReply, replyId?: string) => {
    const key = replyId ?? comment.id;
    if (!perms.canEditOwn || !commentAuthor(s, commission, target).own || target.deletedAt) return null;
    return menu === key ? (
      <>
        <button type="button" className="y-hit" onClick={() => { setMenu(null); setEditing({ id: comment.id, replyId, text: target.text }); }}>
          Edit
        </button>
        <button type="button" className="y-hit" onClick={() => remove(replyId)}>
          Delete
        </button>
      </>
    ) : (
      <button
        type="button"
        className="y-hit"
        aria-label={replyId ? "More for your reply" : `More for your ${whereOf(comment)}`}
        aria-expanded={false}
        onClick={() => setMenu(key)}
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
    );
  };

  const isEditing = editing && !editing.replyId;

  return (
    <li
      className="y-ord-citem"
      data-comment={comment.id}
      data-active={active ? "true" : undefined}
      data-resolved={comment.resolved ? "true" : undefined}
    >
      <div className="y-ord-ctop">
        <Avatar author={author} size={28} />
        <span className="y-ord-cname">{name(author)}</span>
        <span className="min-w-0 truncate">
          · {timeAgo(comment.createdAt)}
          {comment.editedAt && !comment.deletedAt ? " · edited" : ""}
        </span>
        {fresh.has(comment.id) && !author.mine ? <span className="y-ord-new">New</span> : null}
        <span className="flex-1" />
        {comment.atSec === null ? (
          <span className="y-ord-tchip" data-general="true">
            General
          </span>
        ) : (
          <button
            type="button"
            className="y-ord-tchip y-hit"
            onClick={() => onSeek(comment)}
            aria-label={`Play from ${clock(comment.atSec)}`}
          >
            {clock(comment.atSec)}
          </button>
        )}
      </div>

      {comment.deletedAt ? (
        <p className="y-ord-ctext y-fg-2 italic">Comment deleted</p>
      ) : isEditing ? (
        editBox(`Edit your ${whereOf(comment)}`)
      ) : (
        <p className="y-ord-ctext">{comment.text}</p>
      )}

      {perms.canComment && !comment.deletedAt && !isEditing ? (
        <div className="y-ord-cact">
          {replying === null ? (
            <button type="button" className="y-hit" onClick={() => setReplying("")}>
              Reply
            </button>
          ) : null}
          {!comment.resolved && perms.canResolve ? (
            <button
              type="button"
              className="y-hit"
              onClick={() => {
                actions.resolveComment(commission.id, delivery.id, comment.id);
                toast({ message: "Comment resolved", tone: "info" });
              }}
            >
              Resolve
            </button>
          ) : null}
          {comment.resolved && perms.canReopen ? (
            <button
              type="button"
              className="y-hit"
              onClick={() => {
                actions.reopenComment(commission.id, delivery.id, comment.id);
                toast({ message: "Comment re-opened", tone: "info" });
              }}
            >
              Re-open
            </button>
          ) : null}
          {ownActions(comment)}
        </div>
      ) : comment.resolved ? (
        <p className="y-ord-cact">
          <span className="inline-flex items-center gap-1">
            <Check size={12} strokeWidth={3} aria-hidden /> Resolved
          </span>
        </p>
      ) : null}

      {replies.map((reply) => {
        const view = commentAuthor(s, commission, reply);
        const editingReply = editing?.replyId === reply.id;
        return (
          <div key={reply.id} className="y-ord-reply" data-comment={reply.id}>
            <div className="y-ord-ctop">
              <Avatar author={view} size={22} />
              <span className="y-ord-cname">{name(view)}</span>
              <span className="min-w-0 truncate">
                · {timeAgo(reply.createdAt)}
                {reply.editedAt ? " · edited" : ""}
              </span>
              {fresh.has(reply.id) && !view.mine ? <span className="y-ord-new">New</span> : null}
            </div>
            {editingReply ? editBox("Edit your reply") : <p className="y-ord-ctext">{reply.text}</p>}
            {!editingReply && perms.canEditOwn && view.own ? <div className="y-ord-cact">{ownActions(reply, reply.id)}</div> : null}
          </div>
        );
      })}

      {replying !== null ? (
        <form
          className="y-ord-composer y-ord-reply-form"
          onSubmit={(event) => {
            event.preventDefault();
            sendReply();
          }}
        >
          <label className="sr-only" htmlFor={`reply-${comment.id}`}>
            Reply to {name(author)}
          </label>
          <textarea
            id={`reply-${comment.id}`}
            rows={1}
            value={replying}
            onChange={(event) => setReplying(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendReply();
              }
              if (event.key === "Escape") {
                event.stopPropagation();
                setReplying(null);
              }
            }}
            placeholder={`Reply to ${author.own ? "your comment" : author.firstName}…`}
            autoFocus
          />
          <button type="submit" className="y-ord-send" aria-label="Send reply">
            <ArrowRight size={16} strokeWidth={2.4} aria-hidden className="y-flip" />
          </button>
        </form>
      ) : null}
    </li>
  );
}

function Composer({
  ws,
  delivery,
  time,
  timestamps,
  onSent,
}: {
  ws: Workspace;
  delivery: Delivery;
  time: number;
  /** False for ad copy: general comments only. */
  timestamps: boolean;
  onSent: (id: string) => void;
}) {
  const toast = useToast();
  const id = useId();
  const [text, setText] = useState("");
  const [general, setGeneral] = useState(!timestamps);
  const atSec = general || !timestamps ? null : time;
  const stamp = clock(time);

  const send = () => {
    const body = text.trim();
    if (body.length < COMMENT_MIN_CHARS) {
      toast({ message: "Write a comment first", tone: "info" });
      return;
    }
    const result = actions.addComment(ws.commission.id, delivery.id, { atSec, text: body });
    if (!result.ok) {
      toast({ message: "Couldn't send. Try again.", tone: "info" });
      return;
    }
    setText("");
    onSent(result.id);
    toast({ message: `Comment sent · ${ws.otherName} gets a notification` });
  };

  const placeholder = !timestamps
    ? delivery.kind === "text"
      ? "Add a comment on the copy…"
      : "Add a comment on this version…"
    : atSec === null
      ? "Add a general comment…"
      : `Add a comment at ${stamp}…`;

  return (
    <form
      className="y-ord-composer"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      {timestamps ? (
        <button
          type="button"
          className="y-ord-tchip y-hit"
          data-on={general ? undefined : "true"}
          data-off={general ? "true" : undefined}
          aria-pressed={!general}
          aria-label={general ? "General comment. Tap to pin it to the playhead" : `Pinned to ${stamp}. Tap for a general comment`}
          title={general ? "Pin it to the playhead" : "Make it a general comment"}
          onClick={() => setGeneral((value) => !value)}
        >
          {general ? "General" : <>@ {stamp}</>}
        </button>
      ) : null}
      <label htmlFor={id} className="sr-only">
        {placeholder.replace("…", "")}
      </label>
      <textarea
        id={id}
        rows={1}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
      />
      <button type="submit" className="y-ord-send" aria-label="Send comment">
        <ArrowRight size={16} strokeWidth={2.4} aria-hidden className="y-flip" />
      </button>
    </form>
  );
}

/** Ids of comments and replies the side hasn't seen yet across every version. */
export function unreadIds(deliveries: Delivery[], side: Role): string[] {
  const out: string[] = [];
  for (const d of deliveries) {
    for (const m of d.comments) {
      if (m.unread && m.author !== side && !m.deletedAt) out.push(m.id);
      for (const r of m.replies) if (r.unread && r.author !== side && !r.deletedAt) out.push(r.id);
    }
  }
  return out;
}
