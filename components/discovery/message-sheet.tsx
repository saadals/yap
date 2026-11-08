"use client";

import { CircleCheck, Send } from "lucide-react";
import { useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { TextArea } from "@/components/ui/field";
import { paths } from "@/lib/paths";
import { isPersonal, me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Creator } from "@/lib/types";

import { responseLabel } from "./profile-utils";

/** Ask a creator a question before commissioning, from the signed-in account's buyer profile. */
export function MessageSheet({
  creator,
  open,
  onClose,
}: {
  creator: Creator;
  open: boolean;
  onClose: () => void;
}) {
  const s = useDemo();
  const business = me.business(s);
  const sender = (me.member(s)?.name ?? me.account(s).name).split(" ")[0];
  const starter = isPersonal(s, business.id)
    ? `Hi ${creator.firstName}, I'm ${sender}. I'm thinking about commissioning you for a short video. Before I do: `
    : `Hi ${creator.firstName}, I'm ${sender} from ${business.name}. We're thinking about commissioning you for a short video about our app. Before we do: `;
  const [text, setText] = useState(starter);
  const [touched, setTouched] = useState(false);
  const [sentThreadId, setSentThreadId] = useState<string | null>(null);
  const trimmed = text.trim();
  const tooShort = trimmed.length < 12 || trimmed === starter.trim();
  const error = touched && tooShort ? "Add your question so they can answer it in one go." : null;

  const close = () => {
    onClose();
    if (sentThreadId) {
      setSentThreadId(null);
      setText(starter);
      setTouched(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={sentThreadId ? "Message sent" : `Message ${creator.firstName}`}
      description={
        sentThreadId
          ? undefined
          : `Ask anything before you commission. ${creator.firstName} usually replies ${responseLabel(creator.responseHours)}.`
      }
      width="sm"
      footer={
        sentThreadId ? (
          <div className="flex flex-wrap justify-end gap-2 pb-3 md:pb-0">
            <PillButton variant="ghost" onClick={close}>
              Keep browsing
            </PillButton>
            <PillButton variant="contrast" href={paths.messages(sentThreadId)} arrow>
              Open conversation
            </PillButton>
          </div>
        ) : (
          <div className="flex justify-end gap-2 pb-3 md:pb-0">
            <PillButton variant="ghost" onClick={close}>
              Cancel
            </PillButton>
            <PillButton
              variant="contrast"
              icon={<Send size={18} aria-hidden />}
              disabled={tooShort}
              onClick={() => {
                const id = actions.startThread({
                  creatorId: creator.id,
                  subject: `Question for ${creator.firstName}`,
                  text: trimmed,
                });
                setSentThreadId(id);
              }}
            >
              Send message
            </PillButton>
          </div>
        )
      }
    >
      {sentThreadId ? (
        <div className="flex flex-col items-start gap-3 py-2" role="status">
          <span className="grid size-12 place-items-center rounded-full bg-(--y-success-soft) text-(--y-success)">
            <CircleCheck size={24} aria-hidden />
          </span>
          <p className="y-body">
            {creator.firstName} will see it in their inbox and usually replies{" "}
            {responseLabel(creator.responseHours)}. We&apos;ll notify you when they do.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-1">
          <TextArea
            label="Your message"
            required
            rows={6}
            value={text}
            data-autofocus
            onChange={(event) => setText(event.target.value)}
            onBlur={() => setTouched(true)}
            error={error}
            hint="Tip: ask about timing, a format you need, or whether they've worked on apps like yours."
          />
          <p className="y-micro y-fg-3">
            Keep payments on Yapp. Your money is only protected when you commission here.
          </p>
        </div>
      )}
    </Sheet>
  );
}
