"use client";

import { CircleCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { hasContactDetails } from "@/lib/contact";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { ContentRequest } from "@/lib/types";

/** Quiet note under a text box when it holds contact details (the store hides them on send). */
export function ContactNotice({ text, className = "" }: { text: string; className?: string }) {
  if (!hasContactDetails(text)) return null;
  return (
    <p className={`y-micro y-fg-2 flex items-start gap-1.5 px-1 ${className}`} role="status">
      <ShieldCheck size={14} aria-hidden className="mt-0.5 flex-none" />
      Contact details are hidden when you send. Keep it on Yapp so payment protection covers the work.
    </p>
  );
}

/** The conversation this creator already has with the brand about this order (if any). */
export function threadAbout(s: ReturnType<typeof useDemo>, request: ContentRequest) {
  const creatorId = me.ids(s).creatorId;
  if (!creatorId) return undefined;
  return s.threads.find(
    (t) => t.requestId === request.id && t.creatorId === creatorId && !t.commissionId && t.messages.length > 0,
  );
}

/**
 * "Questions about the brief?": a short message to the brand before pitching. Opens a
 * conversation in Messages (the brand's reply lands there).
 */
export function AskBrandSheet({
  open,
  onClose,
  request,
  brandName,
}: {
  open: boolean;
  onClose: () => void;
  request: ContentRequest;
  brandName: string;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="sm"
      title={`Ask ${brandName} a question`}
      description="They'll see it in Messages. Ask before you pitch, so your pitch answers the brief."
    >
      {open ? <AskForm request={request} brandName={brandName} onClose={onClose} /> : null}
    </Sheet>
  );
}

function AskForm({ request, brandName, onClose }: { request: ContentRequest; brandName: string; onClose: () => void }) {
  const s = useDemo();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const creatorId = me.ids(s).creatorId;

  if (threadId) {
    return (
      <div className="flex flex-col gap-4 pt-3" role="status">
        <p className="y-body flex items-start gap-2">
          <CircleCheck size={20} aria-hidden className="mt-0.5 flex-none text-(--y-success)" />
          <span>
            Sent to {brandName}. Their reply shows up in Messages, and we&apos;ll let you know when it arrives.
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <PillButton href={paths.messages(threadId)} variant="contrast" icon={<MessageCircle size={16} aria-hidden />}>
            Open the conversation
          </PillButton>
          <PillButton variant="ghost" onClick={onClose}>
            Back to the brief
          </PillButton>
        </div>
      </div>
    );
  }

  const send = () => {
    if (!creatorId) return;
    if (text.trim().length < 8) {
      setError("Write your question (a sentence is plenty).");
      return;
    }
    const id = actions.startThread({
      creatorId,
      businessId: request.businessId,
      subject: request.title,
      text: text.trim(),
      requestId: request.id,
      from: "creator",
    });
    setThreadId(id);
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4 pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <TextArea
        label="Your question"
        required
        rows={5}
        maxLength={600}
        data-autofocus
        placeholder="Is it fine to film at home instead of a shop counter?"
        value={text}
        error={error}
        onChange={(event) => {
          setText(event.target.value);
          if (error) setError(null);
        }}
      />
      <ContactNotice text={text} />
      <div className="flex justify-end">
        <PillButton type="submit" variant="contrast">
          Send question
        </PillButton>
      </div>
    </form>
  );
}
