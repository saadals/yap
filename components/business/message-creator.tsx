"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { paths } from "@/lib/paths";
import { me, threadsFor } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Creator } from "@/lib/types";

/**
 * "Message" for a creator, from the signed-in account's buyer profile (the ordering side): `href`
 * opens the latest existing conversation; otherwise `start()`
 * opens a short compose `sheet` (render it) that starts one and then opens it in Messages.
 */
export function useMessageCreator(creator: Creator) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const business = me.business(s);
  const existing = threadsFor(s, "business").find((t) => t.creatorId === creator.id);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const label = `Message ${creator.firstName}`;

  const send = () => {
    const body = text.trim();
    if (!body) {
      setError(`Write a short message so ${creator.firstName} knows what it's about.`);
      return;
    }
    const id = actions.startThread({
      creatorId: creator.id,
      subject: `Hello from ${business.name}`,
      text: body,
    });
    setOpen(false);
    toast({ message: `Message sent to ${creator.firstName}` });
    router.push(paths.messages(id));
  };

  const start = () => {
    setText(`Hi ${creator.firstName}, `);
    setError(null);
    setOpen(true);
  };

  const sheet = existing ? null : (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      title={label}
      description={`${creator.firstName} usually replies within ${creator.responseHours <= 1 ? "an hour" : `${creator.responseHours} hours`}.`}
      footer={
        <div className="flex justify-end">
          <PillButton variant="contrast" icon={<Send size={16} aria-hidden className="y-flip" />} onClick={send}>
            Send message
          </PillButton>
        </div>
      }
    >
      <TextArea
        label="Your message"
        required
        rows={5}
        maxLength={1000}
        value={text}
        data-autofocus
        onChange={(event) => {
          setText(event.target.value);
          if (error && event.target.value.trim()) setError(null);
        }}
        error={error}
        hint="Ask about availability, a format or an idea. You can send a full offer from their profile."
      />
    </Sheet>
  );

  return {
    label,
    href: existing ? paths.messages(existing.id) : undefined,
    start,
    sheet,
  };
}
