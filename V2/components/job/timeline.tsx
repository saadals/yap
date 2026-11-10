"use client";

import {
  Ban,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  EyeOff,
  FileText,
  Film,
  Handshake,
  Info,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Paperclip,
  Repeat2,
  Send,
  SendHorizontal,
  ShieldCheck,
  Star,
  Ticket,
  UserCheck,
  UserMinus,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { useToast } from "@/components/ui/toast";
import { hasContactDetails } from "@/lib/contact";
import { clock, daysFromNow, plural, timeOf, weekdayDate } from "@/lib/format";
import { allBrandHandles, threadById, videoById } from "@/lib/selectors";
import { actions, useDemo, useTyping } from "@/lib/store";
import type { Attachment, CommissionEvent, Delivery, Message, Role, Thread } from "@/lib/types";

import { commentSummary } from "./comments";
import type { Job } from "./helpers";
import { VersionBadge } from "./review-area";

type Item =
  | { kind: "message"; at: string; key: string; message: Message }
  | { kind: "note"; at: string; key: string; text: string; icon: React.ReactNode }
  | { kind: "comments"; at: string; key: string; text: string; deliveryId: string }
  | { kind: "version"; at: string; key: string; delivery: Delivery; message?: Message };

const eventIcon: Record<CommissionEvent["kind"], React.ReactNode> = {
  offer_sent: <Send size={14} aria-hidden className="y-flip" />,
  offer_accepted: <Handshake size={14} aria-hidden />,
  offer_declined: <XCircle size={14} aria-hidden />,
  hired: <UserCheck size={14} aria-hidden />,
  funded: <ShieldCheck size={14} aria-hidden />,
  brief_updated: <FileText size={14} aria-hidden />,
  delivered: <Film size={14} aria-hidden />,
  revision_requested: <Repeat2 size={14} aria-hidden />,
  approved: <CheckCircle2 size={14} aria-hidden />,
  paid: <Banknote size={14} aria-hidden />,
  reviewed: <Star size={14} aria-hidden />,
  cancelled: <Ban size={14} aria-hidden />,
  disputed: <LifeBuoy size={14} aria-hidden />,
  due_changed: <CalendarClock size={14} aria-hidden />,
  slot_accepted: <Ticket size={14} aria-hidden />,
  creator_replaced: <UserMinus size={14} aria-hidden />,
  video_rejected: <XCircle size={14} aria-hidden />,
  posted: <Megaphone size={14} aria-hidden />,
  post_verified: <BadgeCheck size={14} aria-hidden />,
  payout_available: <Wallet size={14} aria-hidden />,
};

const NEAR = 2 * 60_000;

/**
 * One chronological feed: messages, the job's events and every delivered version. System messages
 * that repeat an event (the store writes both) are dropped, and a version replaces the "delivered"
 * event and carries the creator's message that came with it.
 */
export function buildTimeline(
  thread: Thread | undefined,
  events: CommissionEvent[],
  deliveries: Delivery[],
  /** Text the stage panel already quotes (an open offer's message): left out here. */
  quoted?: string,
): Item[] {
  const messages = (thread?.messages ?? []).filter((m) => !quoted || m.text.trim() !== quoted.trim());
  const used = new Set<string>();
  const items: Item[] = [];
  for (const delivery of deliveries) {
    // The creator's message that came with the version: its video, or (ad copy) its document or note.
    const message = messages.find((m) =>
      delivery.video
        ? m.attachment?.videoId === delivery.video.id
        : m.from === "creator" &&
          !used.has(m.id) &&
          Math.abs(Date.parse(m.at) - Date.parse(delivery.deliveredAt)) < NEAR &&
          (m.attachment?.name === delivery.files[0]?.name || m.text === delivery.note || !m.attachment),
    );
    if (message) used.add(message.id);
    items.push({ kind: "version", at: delivery.deliveredAt, key: delivery.id, delivery, message });
  }
  const stamps = [...events.map((e) => Date.parse(e.at)), ...deliveries.map((d) => Date.parse(d.deliveredAt))];
  for (const event of events) {
    if (event.kind === "delivered") continue;
    const text = event.text;
    items.push({ kind: "note", at: event.at, key: event.id, text, icon: eventIcon[event.kind] ?? <Info size={14} aria-hidden /> });
  }
  for (const message of messages) {
    if (used.has(message.id)) continue;
    // "2 new comments on Version 1": a line that opens those comments (they aren't repeated here).
    if (message.link?.kind === "comments") {
      const target = deliveries.find((d) => d.id === message.link?.deliveryId);
      if (target) items.push({ kind: "comments", at: message.at, key: message.id, text: message.text, deliveryId: target.id });
      continue;
    }
    if (message.from === "system") {
      const at = Date.parse(message.at);
      if (stamps.some((stamp) => Math.abs(stamp - at) < NEAR)) continue;
      const text = message.text;
      items.push({ kind: "note", at: message.at, key: message.id, text, icon: <Info size={14} aria-hidden /> });
      continue;
    }
    items.push({ kind: "message", at: message.at, key: message.id, message });
  }
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Date.parse(a.item.at) - Date.parse(b.item.at) || a.index - b.index)
    .map(({ item }) => item);
}

function dayLabel(iso: string) {
  const days = -daysFromNow(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return weekdayDate(iso);
}

const SHOW = 10;

/** The composer's id: "Message …" buttons scroll to it and focus it. */
export const COMPOSER_ID = "job-composer";

export function Timeline({ job }: { job: Job }) {
  const s = useDemo();
  const { commission: c, side } = job;
  const thread = threadById(s, c.threadId);
  const typing = useTyping(thread?.id);
  const [expanded, setExpanded] = useState(false);
  const items = buildTimeline(thread, c.events, c.deliveries, c.status === "offered" ? c.offerMessage : undefined);
  // Collapse only when there's a real amount to hide: "Show 1 earlier update" helps nobody.
  const hidden = expanded || items.length <= SHOW + 4 ? 0 : items.length - SHOW;
  const shown = items.slice(hidden);

  // Mark the conversation read for this side while it's on screen.
  const unread = Boolean(thread?.unread.includes(side));
  useEffect(() => {
    if (unread && thread) actions.markThreadRead(thread.id, side);
  }, [unread, thread, side]);

  return (
    <Block as="section" tone="paper" pad="md" aria-labelledby="timeline-title" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="timeline-title" className="y-head">
          Timeline
        </h2>
        <span className="y-micro y-fg-2">Messages, versions and updates</span>
      </div>

      {hidden ? (
        <button type="button" className="y-small y-link w-fit font-medium" onClick={() => setExpanded(true)}>
          Show {plural(hidden, "earlier update")}
        </button>
      ) : null}

      <ol className="flex flex-col gap-3" aria-label="Timeline, oldest first">
        {shown.map((item, index) => {
          const previous = shown[index - 1];
          const day = dayLabel(item.at);
          const separator = !previous || dayLabel(previous.at) !== day;
          return (
            <Fragment key={item.key}>
              {separator ? (
                <li className="y-micro y-fg-2 flex items-center gap-3 py-1" aria-hidden>
                  <span className="h-px flex-1 bg-(--b-line)" />
                  {day}
                  <span className="h-px flex-1 bg-(--b-line)" />
                </li>
              ) : null}
              {item.kind === "message" ? (
                <Bubble message={item.message} job={job} />
              ) : item.kind === "version" ? (
                <VersionCard job={job} delivery={item.delivery} message={item.message} />
              ) : item.kind === "comments" ? (
                <li className="flex justify-center px-2">
                  <p className="y-micro y-fg-2 inline-flex max-w-md flex-wrap items-center justify-center gap-x-1.5 text-center">
                    <MessageCircle size={14} aria-hidden className="flex-none" />
                    <span>
                      {item.text} <span className="opacity-80">· {timeOf(item.at)}</span>
                    </span>
                    <button type="button" className="y-link min-h-8 font-medium text-(--b-fg) pointer-coarse:min-h-11" onClick={() => job.showComments(item.deliveryId)}>
                      View
                    </button>
                  </p>
                </li>
              ) : (
                <li className="flex justify-center px-2">
                  <p className="y-micro y-fg-2 inline-flex max-w-md items-start gap-1.5 text-center">
                    <span className="mt-px flex-none">{item.icon}</span>
                    <span>
                      {item.text} <span className="y-fg-2 opacity-80">· {timeOf(item.at)}</span>
                    </span>
                  </p>
                </li>
              )}
            </Fragment>
          );
        })}
        {typing && typing !== side ? (
          <li className="flex justify-start" aria-live="polite">
            <span className="inline-flex items-center gap-2 rounded-[18px] bg-(--b-chip) px-4 py-3">
              <span className="y-typing" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <span className="sr-only">{job.otherName} is typing</span>
            </span>
          </li>
        ) : null}
      </ol>

      {thread ? <Composer job={job} thread={thread} /> : null}
    </Block>
  );
}

function Bubble({ message, job }: { message: Message; job: Job }) {
  const mine = message.from === job.side;
  const who = mine ? "You" : message.from === "business" ? job.businessName : job.creatorName;
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`flex flex-col gap-2 px-3.5 py-2.5 ${
            mine
              ? "rounded-[18px] rounded-ee-[6px] bg-(--y-ink) text-(--y-paper)"
              : "rounded-[18px] rounded-es-[6px] bg-(--b-chip) text-(--b-chip-fg)"
          }`}
        >
          {message.text ? <p className="y-small whitespace-pre-line">{message.text}</p> : null}
          {message.attachment ? <AttachmentView attachment={message.attachment} mine={mine} /> : null}
        </div>
        <span className="y-micro y-fg-2 px-1">
          {who} · {timeOf(message.at)}
        </span>
      </div>
    </li>
  );
}

function AttachmentView({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  const s = useDemo();
  const toast = useToast();
  const video = attachment.videoId ? videoById(s, attachment.videoId) : undefined;
  if (attachment.kind === "video" && video) {
    return (
      <div className="flex w-36 flex-col gap-1.5">
        <VideoThumb video={video} showHook={false} decorative />
        <span className={`y-micro truncate ${mine ? "opacity-80" : "y-fg-2"}`}>{attachment.name}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toast({ message: `Downloading ${attachment.name}`, tone: "info" })}
      className={`flex items-center gap-2.5 rounded-(--y-r-field) px-3 py-2 text-start ${mine ? "bg-white/10" : "bg-(--b-bg)"}`}
    >
      <FileText size={18} aria-hidden className="flex-none" />
      <span className="min-w-0">
        <span className="y-small block truncate font-medium">{attachment.name}</span>
        {attachment.size ? <span className="y-micro opacity-70">{attachment.size}</span> : null}
      </span>
    </button>
  );
}

/** A delivered version in the feed: its thumbnail, status and notes. Opens it in the stage panel. */
function VersionCard({ job, delivery, message }: { job: Job; delivery: Delivery; message?: Message }) {
  const mine = job.side === "creator";
  const selected = job.selected?.id === delivery.id;
  const Noun = job.noun.charAt(0).toUpperCase() + job.noun.slice(1);
  const text = message?.text || delivery.note;
  const comments = commentSummary(job, delivery);
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <button
        type="button"
        onClick={() => job.pickVersion(delivery.id === job.latest?.id ? null : delivery.id)}
        aria-label={`${Noun} ${delivery.version}: ${delivery.video ? "show it in the player" : "show it above"}`}
        className={`y-tile y-hoverable flex w-full max-w-[85%] items-start gap-3 p-2.5 text-start sm:max-w-[440px] ${
          selected ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
        }`}
      >
        <span className="w-16 flex-none">
          {delivery.video ? (
            <VideoThumb video={delivery.video} showHook={false} showMeta={false} playable decorative />
          ) : (
            <span className="grid aspect-[4/5] place-items-center rounded-(--y-r-sm) bg-(--b-bg)" aria-hidden>
              <FileText size={20} />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="y-small font-medium">
              {Noun} {delivery.version}
            </span>
            <VersionBadge delivery={delivery} />
          </span>
          {text ? <span className="y-micro y-fg-2 line-clamp-2">{text}</span> : null}
          <span className="y-micro y-fg-2">
            {mine ? "You" : job.creatorName} · {timeOf(delivery.deliveredAt)}
            {delivery.video ? ` · ${clock(delivery.video.durationSec)}` : delivery.kind === "text" ? " · Ad copy" : ""}
            {comments ? ` · ${comments}` : ""}
            {selected ? (delivery.video ? " · In the player" : " · Showing above") : ""}
          </span>
        </span>
      </button>
    </li>
  );
}

const quickReplies: Record<Role, string[]> = {
  business: ["Looks great, thank you.", "Any questions about the brief?", "Can we keep it under 45 seconds?"],
  creator: ["Thanks, starting today.", "Quick question about the brief:", "Version 1 is on its way."],
};

function Composer({ job, thread }: { job: Job; thread: Thread }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handles = job.slot?.terms ? allBrandHandles(job.slot.terms) : [];
  const contact = hasContactDetails(text, handles);
  const quiet = thread.messages.filter((m) => m.from !== "system").length === 0;

  const send = () => {
    const body = text.trim();
    if (!body && !file) return;
    actions.sendMessage(thread.id, job.side, body, file ?? undefined);
    setText("");
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-2 border-t border-(--b-line) pt-4">
      {quiet ? (
        <div className="y-scroll-x -mx-1 flex gap-1.5 px-1">
          {quickReplies[job.side].map((reply) => (
            <button key={reply} type="button" className="y-chip y-hoverable flex-none" onClick={() => setText(reply)}>
              {reply}
            </button>
          ))}
        </div>
      ) : null}
      {contact ? (
        <p className="y-micro y-fg-2 inline-flex items-start gap-1.5 px-1" role="status">
          <EyeOff size={14} aria-hidden className="mt-px flex-none" />
          Phone numbers, emails, links and handles are hidden when you send. Keeping it on Yapp keeps the payment protected.
        </p>
      ) : null}
      {file ? (
        <span className="y-chip w-fit">
          <Paperclip size={14} aria-hidden /> {file.name}
          <button type="button" aria-label="Remove attachment" onClick={() => setFile(null)} className="-me-1 rounded-full p-0.5">
            <X size={14} aria-hidden />
          </button>
        </span>
      ) : null}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const picked = event.target.files?.[0];
            if (picked)
              setFile({
                kind: picked.type.startsWith("image/") ? "image" : "file",
                name: picked.name,
                size: `${Math.max(1, Math.round(picked.size / 1024))} KB`,
              });
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="y-round flex-none"
          data-tone-btn="soft"
          data-size="sm"
          aria-label="Attach a file"
          title="Attach a file"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip size={18} aria-hidden />
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Message {job.otherName}</span>
          <textarea
            id={COMPOSER_ID}
            name="job-message"
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${job.otherName}…`}
            className="y-input max-h-40 min-h-11 w-full resize-none !rounded-[22px] !py-2.5"
          />
        </label>
        <button
          type="submit"
          className="y-round flex-none"
          data-tone-btn="contrast"
          data-size="sm"
          aria-label="Send message"
          title="Send"
          disabled={!text.trim() && !file}
        >
          <SendHorizontal size={18} aria-hidden className="y-flip" />
        </button>
      </form>
    </div>
  );
}

