"use client";

import { AtSign } from "lucide-react";
import { useState } from "react";

import { FieldShell } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { creatorById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { CampaignPlatformId } from "@/lib/types";

import { ConnectStatus, READ_ONLY_NOTE, platformName, useConnectSequence } from "./social";

/**
 * Connect one social account read-only, in place (a campaign page asks for it): handle, then the
 * simulated "connecting… checking real followers…" sequence, then the verified count and tier.
 */
export function ConnectSocialSheet({
  open,
  onClose,
  creatorId,
  platform,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  platform: CampaignPlatformId;
  /** Why it opened, e.g. "to pick a Yapp on this campaign". */
  reason?: string;
}) {
  const name = platformName(platform);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="sm"
      title={`Connect your ${name}`}
      description={reason ? `We check your real followers ${reason}.` : "We check your real followers for campaigns."}
    >
      {open ? <ConnectForm creatorId={creatorId} platform={platform} onClose={onClose} /> : null}
    </Sheet>
  );
}

function ConnectForm({
  creatorId,
  platform,
  onClose,
}: {
  creatorId: string;
  platform: CampaignPlatformId;
  onClose: () => void;
}) {
  const s = useDemo();
  const connect = useConnectSequence(900);
  // Already connected (e.g. during profile setup): show it as done.
  const existing = creatorById(s, creatorId)?.socials?.find((a) => a.platform === platform);
  const [handle, setHandle] = useState(existing?.handle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [followers, setFollowers] = useState<number | undefined>(undefined);
  const name = platformName(platform);
  const phase = connect.phase === "idle" && existing ? "done" : connect.phase;

  const start = () => {
    if (phase !== "idle") return;
    if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) {
      setError("Use your handle: letters, numbers, dots or underscores.");
      return;
    }
    connect.start(() => {
      const social = actions.connectSocial(creatorId, platform, handle);
      setFollowers(social.followers);
    });
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5 pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (phase === "done") onClose();
        else start();
      }}
    >
      <FieldShell label={`Your ${name} handle`} required error={error} hint={READ_ONLY_NOTE}>
        {({ id, describedBy }) => (
          <div className="relative">
            <AtSign size={18} aria-hidden className="y-fg-3 pointer-events-none absolute start-4 top-1/2 -translate-y-1/2" />
            <input
              id={id}
              dir="ltr"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={30}
              placeholder="yourhandle"
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
              disabled={phase !== "idle"}
              data-autofocus
              value={handle}
              onChange={(event) => {
                setHandle(event.target.value.replace(/^@/, "").replace(/\s+/g, ""));
                if (error) setError(null);
              }}
              className="y-input ps-11"
            />
          </div>
        )}
      </FieldShell>
      <ConnectStatus phase={phase} platform={platform} followers={followers ?? existing?.followers} />
      <div className="flex justify-end">
        {phase === "done" ? (
          <PillButton type="submit" variant="contrast">
            Done
          </PillButton>
        ) : (
          <PillButton type="submit" variant="contrast" disabled={connect.busy}>
            {connect.busy ? "Connecting…" : `Connect ${name}`}
          </PillButton>
        )}
      </div>
    </form>
  );
}
