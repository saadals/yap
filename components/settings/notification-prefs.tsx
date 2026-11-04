"use client";

import { BellRing, Mail, MessageCircle } from "lucide-react";

import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/components/ui/toast";
import { actions, useDemo } from "@/lib/store";
import type { NotificationPrefs, Role } from "@/lib/types";

import { RowList, SwitchRow } from "./controls";

const channelCopy: Record<Role, Record<"email" | "whatsapp" | "push", string>> = {
  business: {
    email: "New pitches, deliveries ready for review and every receipt.",
    whatsapp: "Only time-sensitive things: a delivery to review or a creator's question.",
    push: "Browser alerts while Yapp is open in a tab.",
  },
  creator: {
    email: "New offers, client replies, approvals and payouts.",
    whatsapp: "Only time-sensitive things: a new offer, a change request or a due date tomorrow.",
    push: "Browser alerts while Yapp is open in a tab.",
  },
};

const labels = { email: "Email", whatsapp: "WhatsApp", push: "Push notifications" } as const;
const icons = {
  email: <Mail size={18} />,
  whatsapp: <MessageCircle size={18} />,
  push: <BellRing size={18} />,
};

/** Email / WhatsApp / push switches and the digest setting for one role. Saves immediately. */
export function NotificationPrefsControls({ role, email }: { role: Role; email?: string }) {
  const s = useDemo();
  const toast = useToast();
  const prefs: NotificationPrefs = s.settings[role];

  const toggle = (key: "email" | "whatsapp" | "push", on: boolean) => {
    actions.updateSettings(role, { [key]: on });
    toast({
      message: `${labels[key]} ${on ? "on" : "off"}`,
      action: { label: "Undo", onClick: () => actions.updateSettings(role, { [key]: !on }) },
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <RowList>
        {(["email", "whatsapp", "push"] as const).map((key) => (
          <SwitchRow
            key={key}
            label={labels[key]}
            icon={icons[key]}
            description={
              key === "email" && email ? `${channelCopy[role][key]} Sent to ${email}.` : channelCopy[role][key]
            }
            checked={prefs[key]}
            onChange={(on) => toggle(key, on)}
          />
        ))}
      </RowList>
      <div className="y-tile flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="y-small font-semibold" id={`${role}-digest-label`}>
            Summary of less urgent updates
          </p>
          <p className="y-micro y-fg-2">
            {prefs.digest === "instant"
              ? "Sent as they happen."
              : prefs.digest === "daily"
                ? "One email each morning at 9:00."
                : "No summaries. You'll still get the alerts above."}
          </p>
        </div>
        <SegmentedToggle
          label="Summary frequency"
          value={prefs.digest}
          onChange={(digest) => {
            actions.updateSettings(role, { digest });
            toast({
              message:
                digest === "instant"
                  ? "Updates will arrive as they happen"
                  : digest === "daily"
                    ? "You'll get a daily summary at 9:00"
                    : "Summaries turned off",
            });
          }}
          options={[
            { value: "instant", label: "Instant" },
            { value: "daily", label: "Daily" },
            { value: "off", label: "Off" },
          ]}
          className="flex-none self-start sm:self-auto"
        />
      </div>
    </div>
  );
}
