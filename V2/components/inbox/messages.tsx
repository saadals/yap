"use client";

import { EyeOff, FileText, Info, Paperclip, SendHorizontal, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { useToast } from "@/components/ui/toast";
import { hasContactDetails } from "@/lib/contact";
import { daysFromNow, timeOf, weekdayDate } from "@/lib/format";
import { businessById, creatorById, requestById, threadById, videoById } from "@/lib/selectors";
import { actions, useDemo, useTyping } from "@/lib/store";
import type { Attachment, Message, Role } from "@/lib/types";

const quickReplies: Record<Role, string[]> = {
  business: ["Looks great, thank you.", "Can we keep it under 45 seconds?", "Any questions about the brief?"],
  creator: ["Thanks, starting today.", "Quick question about the brief:", "Version 1 is on its way."],
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
      <div className="flex w-40 flex-col gap-1.5">
        <VideoThumb video={video} showHook={false} showMeta={false} playable decorative />
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
      className={`flex items-center gap-2.5 rounded-(--y-r-sm) px-3 py-2 text-start ${mine ? "bg-white/10" : "bg-(--y-paper)"}`}
    >
      <FileText size={18} aria-hidden className="flex-none" />
      <span className="min-w-0">
        <span className="y-small block truncate font-medium">{attachment.name}</span>
        {attachment.size ? <span className="y-micro opacity-75">{attachment.size}</span> : null}
      </span>
    </button>
  );
}

function Bubble({ message, role, otherName, grouped }: { message: Message; role: Role; otherName: string; grouped: boolean }) {
  if (message.from === "system") {
    return (
      <li className="flex justify-center px-4 py-1">
        <p className="y-micro y-fg-2 inline-flex max-w-md items-start gap-1.5 text-center">
          <Info size={14} aria-hidden className="mt-px flex-none" />
          <span>{message.text}</span>
        </p>
      </li>
    );
  }
  const mine = message.from === role;
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "-mt-1.5" : ""}`}>
      <div className={`flex max-w-[80%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`flex flex-col gap-2 px-3.5 py-2 ${
            mine ? "y-msg-mine rounded-[18px] rounded-ee-[6px]" : "y-msg-theirs rounded-[18px] rounded-es-[6px]"
          }`}
        >
          {message.text ? <p className="y-body whitespace-pre-line [overflow-wrap:anywhere]">{message.text}</p> : null}
          {message.attachment ? <AttachmentView attachment={message.attachment} mine={mine} /> : null}
        </div>
        <span className="y-micro y-fg-2 px-1">
          <span className="sr-only">{mine ? "You" : otherName}, </span>
          {timeOf(message.at)}
        </span>
      </div>
    </li>
  );
}

/**
 * One conversation's messages and composer. `role` is the viewer's side of it. Shows day
 * separators, attachments, system events and the typing indicator (other creators reply on their
 * own in the demo), marks the thread read for `role` while it's open, and keeps the newest message
 * in view. Contact details typed into the composer get one quiet notice: the store hides them when
 * the message is sent (a campaign's own brand handle is allowed).
 */
export function Messages({ threadId, role }: { threadId: string; role: Role }) {
  const s = useDemo();
  const thread = threadById(s, threadId);
  const typing = useTyping(threadId);
  const [text, setText] = useState("");
  const [file, setFile] = useState<Attachment | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const count = thread?.messages.length ?? 0;
  const unread = thread?.unread.includes(role) ?? false;

  useEffect(() => {
    if (unread) actions.markThreadRead(threadId, role);
  }, [unread, threadId, role]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [count, typing, threadId]);

  if (!thread) return null;
  const other =
    role === "business"
      ? (creatorById(s, thread.creatorId)?.firstName ?? "Creator")
      : (businessById(s, thread.businessId)?.name ?? "Client");
  const brandHandle = thread.requestId ? requestById(s, thread.requestId)?.campaign?.brandHandle : undefined;
  const contactNotice = hasContactDetails(text, brandHandle ? [brandHandle] : []);
  const canSend = Boolean(text.trim() || file);

  const send = () => {
    const body = text.trim();
    if (!body && !file) return;
    actions.sendMessage(threadId, role, body, file ?? undefined);
    setText("");
    setFile(null);
    inputRef.current?.focus();
  };

  const items = thread.messages.map((message, index) => {
    const day = dayLabel(message.at);
    const previous = thread.messages[index - 1];
    const separator = !previous || dayLabel(previous.at) !== day;
    const grouped =
      !separator &&
      previous?.from === message.from &&
      message.from !== "system" &&
      Date.parse(message.at) - Date.parse(previous.at) < 10 * 60_000;
    return { message, day, separator, grouped };
  });

  return (
    <>
      <div ref={listRef} className="y-scroll-y min-h-0 flex-1 px-4 py-4 md:px-6">
        <ol className="flex flex-col gap-3" aria-label={`Conversation with ${other}`}>
          {items.map(({ message, day, separator, grouped }) => (
            <Fragment key={message.id}>
              {separator ? (
                <li className="y-micro y-fg-2 flex justify-center pt-2" aria-hidden>
                  {day}
                </li>
              ) : null}
              <Bubble message={message} role={role} otherName={other} grouped={grouped} />
            </Fragment>
          ))}
          {typing && typing !== role ? (
            <li className="flex justify-start" aria-live="polite">
              <span className="y-msg-theirs inline-flex items-center gap-2 rounded-[18px] px-4 py-3">
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

      <div className="y-inbox-composer flex flex-none flex-col gap-2 border-t border-(--y-line) px-3 pt-3 md:px-4">
        {count === 0 ? (
          <div className="y-scroll-x -mx-1 flex gap-1.5 px-1">
            {quickReplies[role].map((reply) => (
              <button key={reply} type="button" className="y-chip y-hoverable flex-none" onClick={() => setText(reply)}>
                {reply}
              </button>
            ))}
          </div>
        ) : null}
        {contactNotice ? (
          <p className="y-micro y-fg-2 inline-flex items-start gap-1.5 px-1" role="status">
            <EyeOff size={14} aria-hidden className="mt-px flex-none" />
            Phone numbers, emails, links and handles are hidden when you send. Keep the conversation on Yapp.
          </p>
        ) : null}
        {file ? (
          <span className="y-chip w-fit">
            <Paperclip size={14} aria-hidden /> {file.name}
            <button
              type="button"
              aria-label="Remove attachment"
              onClick={() => setFile(null)}
              className="-me-1 rounded-full p-0.5"
            >
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
            data-tone-btn="ghost"
            aria-label="Attach a file"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={18} aria-hidden />
          </button>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Message {other}</span>
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={`Message ${other}`}
              className="y-input y-inbox-input max-h-36 min-h-10 resize-none !rounded-[20px] !py-2.5"
            />
          </label>
          <button
            type="submit"
            className="y-round flex-none"
            data-tone-btn="contrast"
            aria-label="Send message"
            disabled={!canSend}
          >
            <SendHorizontal size={18} aria-hidden className="y-flip" />
          </button>
        </form>
      </div>
    </>
  );
}
