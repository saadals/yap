"use client";

import { FileText, Info, Paperclip, SendHorizontal, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { daysFromNow, timeOf, weekdayDate } from "@/lib/format";
import { businessById, creatorById, threadById, videoById } from "@/lib/selectors";
import { actions, useDemo, useTyping } from "@/lib/store";
import type { Attachment, Message, Role } from "@/lib/types";

import { VideoThumb } from "./video-thumb";

const quickReplies: Record<Role, string[]> = {
  business: ["Looks great, thank you!", "Can we keep it under 45 seconds?", "Any questions about the brief?"],
  creator: ["Thanks! Starting today.", "Quick question about the brief:", "Version 1 is on its way."],
};

function dayLabel(iso: string) {
  const days = -daysFromNow(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return weekdayDate(iso);
}

function AttachmentView({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  const s = useDemo();
  const toast = useToast();
  const video = attachment.videoId ? videoById(s, attachment.videoId) : undefined;
  if (attachment.kind === "video" && video) {
    return (
      <div className="flex w-44 flex-col gap-1.5">
        <VideoThumb video={video} showHook={false} playable decorative />
        <span className={`y-micro truncate ${mine ? "opacity-80" : "y-fg-2"}`}>
          {attachment.name}
          {attachment.size ? ` · ${attachment.size}` : ""}
        </span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toast({ message: `Downloading ${attachment.name}`, tone: "info" })}
      className={`flex items-center gap-2.5 rounded-[14px] px-3 py-2 text-start ${mine ? "bg-white/10" : "bg-(--b-bg)"}`}
    >
      <FileText size={18} aria-hidden className="flex-none" />
      <span className="min-w-0">
        <span className="y-small block truncate font-semibold">{attachment.name}</span>
        {attachment.size ? <span className="y-micro opacity-70">{attachment.size}</span> : null}
      </span>
    </button>
  );
}

function Bubble({ message, role, otherName }: { message: Message; role: Role; otherName: string }) {
  if (message.from === "system") {
    return (
      <li className="flex justify-center px-4">
        <p className="y-micro y-fg-2 inline-flex max-w-md items-start gap-1.5 rounded-[14px] bg-(--b-chip) px-3 py-2 text-center">
          <Info size={14} aria-hidden className="mt-px flex-none" />
          <span>{message.text}</span>
        </p>
      </li>
    );
  }
  const mine = message.from === role;
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[82%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`flex flex-col gap-2 px-4 py-2.5 ${
            mine
              ? "rounded-[20px] rounded-ee-[6px] bg-(--y-ink) text-(--y-paper)"
              : "rounded-[20px] rounded-es-[6px] bg-(--b-chip) text-(--b-chip-fg)"
          }`}
        >
          {message.text ? <p className="y-small whitespace-pre-line">{message.text}</p> : null}
          {message.attachment ? <AttachmentView attachment={message.attachment} mine={mine} /> : null}
        </div>
        <span className="y-micro y-fg-3 px-1">
          {mine ? "You" : otherName} · {timeOf(message.at)}
        </span>
      </div>
    </li>
  );
}

/**
 * A conversation between a business and a creator. Shows messages with day separators,
 * attachments, system events, a typing indicator (simulated replies) and a composer.
 * Marks the thread read for `role` while visible. Put it inside a paper Block.
 */
export function ThreadView({
  threadId,
  role,
  className = "",
  maxHeight = "min(62dvh, 640px)",
  placeholder,
}: {
  threadId: string;
  role: Role;
  className?: string;
  /** CSS max-height for the scrollable message list. */
  maxHeight?: string;
  placeholder?: string;
}) {
  const s = useDemo();
  const thread = threadById(s, threadId);
  const typing = useTyping(threadId);
  const [text, setText] = useState("");
  const [file, setFile] = useState<Attachment | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const count = thread?.messages.length ?? 0;

  useEffect(() => {
    if (thread?.unread.includes(role)) actions.markThreadRead(threadId, role);
  }, [thread, threadId, role]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [count, typing]);

  if (!thread) return null;
  const other =
    role === "business"
      ? creatorById(s, thread.creatorId)?.firstName ?? "Creator"
      : businessById(s, thread.businessId)?.name ?? "Client";

  const send = () => {
    const body = text.trim();
    if (!body && !file) return;
    actions.sendMessage(threadId, role, body, file ?? undefined);
    setText("");
    setFile(null);
  };

  const items = thread.messages.map((message, index) => {
    const day = dayLabel(message.at);
    const previous = thread.messages[index - 1];
    return { message, day, separator: !previous || dayLabel(previous.at) !== day };
  });

  return (
    <div className={`flex flex-col ${className}`}>
      <div ref={listRef} className="y-scroll-y flex-1 px-1 py-2" style={{ maxHeight }}>
        <ol className="flex flex-col gap-3" aria-label={`Conversation with ${other}`}>
          {items.map(({ message, day, separator }) => {
            return (
              <Fragment key={message.id}>
                {separator ? (
                  <li className="y-micro y-fg-3 flex items-center gap-3 py-1" aria-hidden>
                    <span className="h-px flex-1 bg-(--b-line)" />
                    {day}
                    <span className="h-px flex-1 bg-(--b-line)" />
                  </li>
                ) : null}
                <Bubble message={message} role={role} otherName={other} />
              </Fragment>
            );
          })}
          {typing && typing !== role ? (
            <li className="flex justify-start" aria-live="polite">
              <span className="inline-flex items-center gap-2 rounded-[20px] bg-(--b-chip) px-4 py-3">
                <span className="y-typing" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                <span className="sr-only">{other} is typing</span>
              </span>
            </li>
          ) : null}
        </ol>
      </div>

      <div className="flex flex-col gap-2 border-t border-(--b-line) pt-3">
        {count < 3 ? (
          <div className="y-scroll-x -mx-1 flex gap-1.5 px-1">
            {quickReplies[role].map((reply) => (
              <button
                key={reply}
                type="button"
                className="y-chip y-hoverable flex-none"
                onClick={() => setText(reply)}
              >
                {reply}
              </button>
            ))}
          </div>
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
            className="y-round"
            data-tone-btn="soft"
            data-size="sm"
            aria-label="Attach a file"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={18} aria-hidden />
          </button>
          <label className="flex-1">
            <span className="sr-only">Message {other}</span>
            <textarea
              rows={1}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={placeholder ?? `Message ${other}…`}
              className="y-input max-h-40 min-h-11 !rounded-[22px] !py-2.5"
            />
          </label>
          <button
            type="submit"
            className="y-round"
            data-tone-btn="contrast"
            data-size="sm"
            aria-label="Send message"
            disabled={!text.trim() && !file}
          >
            <SendHorizontal size={18} aria-hidden className="y-flip" />
          </button>
        </form>
      </div>
    </div>
  );
}
