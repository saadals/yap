"use client";

import { AtSign, Link2, Plus, Unlink } from "lucide-react";
import { useState } from "react";

import {
  ConnectStatus,
  READ_ONLY_NOTE,
  VerifiedMark,
  platformName,
  socialsSummary,
  tierLine,
  useConnectSequence,
} from "@/components/account/social";
import { FieldShell } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { compact, shortDate } from "@/lib/format";
import { actions } from "@/lib/store";
import { campaignPlatforms } from "@/lib/taxonomy";
import type { CampaignPlatformId, Creator, SocialAccount } from "@/lib/types";

import { ProfileSection } from "./section";

/**
 * Edit profile → Connected accounts (`#accounts`). Read-only connections to TikTok, Instagram and
 * Snapchat verify real followers, which decide which UGC campaigns a creator can take. Simulated:
 * `actions.connectSocial` estimates followers; `actions.disconnectSocial` removes one.
 */
export function ConnectedAccounts({ creator }: { creator: Creator }) {
  const toast = useToast();
  const socials = creator.socials ?? [];
  const [connecting, setConnecting] = useState<CampaignPlatformId | null>(null);
  const unconnected = campaignPlatforms.filter((p) => !socials.some((x) => x.platform === p.id));

  const disconnect = (social: SocialAccount) => {
    const before = socials;
    actions.disconnectSocial(creator.id, social.platform);
    toast({
      message: `${platformName(social.platform)} disconnected. Campaigns there need it connected.`,
      tone: "info",
      action: { label: "Undo", onClick: () => actions.updateCreator(creator.id, { socials: before }) },
    });
  };

  return (
    <ProfileSection
      id="accounts"
      title="Connected accounts"
      description={READ_ONLY_NOTE}
      summary={socials.length ? socialsSummary(socials) : "None connected. Connect one to take UGC campaigns."}
    >
      {socials.length ? (
        <ul className="flex flex-col divide-y divide-(--b-line)">
          {socials.map((social) => (
            <li key={social.platform} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
              <span aria-hidden className="y-tile grid size-11 flex-none place-items-center !rounded-full">
                <AtSign size={18} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="y-small flex items-center gap-1.5 font-semibold">
                  {platformName(social.platform)} · <span dir="ltr">@{social.handle}</span>
                  {social.verified ? <VerifiedMark /> : null}
                </p>
                <p className="y-micro y-fg-2">
                  {social.verified ? "Verified real followers" : "Followers"}{" "}
                  <span className="y-num font-semibold text-(--b-fg)">{compact(social.followers)}</span> · Connected{" "}
                  {shortDate(social.connectedAt)}
                </p>
                <p className="y-micro y-fg-2">{tierLine(social.followers)}</p>
              </div>
              <PillButton
                variant="ghost"
                size="sm"
                icon={<Unlink size={16} aria-hidden />}
                onClick={() => disconnect(social)}
                aria-label={`Disconnect ${platformName(social.platform)}`}
              >
                Disconnect
              </PillButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2 max-w-[56ch]">
          Custom orders hire on your portfolio, so this is optional. UGC campaigns pay a fixed price
          per video by follower tier, and check your followers on the platform they post to.
        </p>
      )}

      {unconnected.length ? (
        <div className="flex flex-wrap gap-2">
          {unconnected.map((platform) => (
            <PillButton
              key={platform.id}
              variant="soft"
              size="sm"
              icon={<Plus size={16} aria-hidden />}
              onClick={() => setConnecting(platform.id)}
            >
              Connect {platform.name}
            </PillButton>
          ))}
        </div>
      ) : null}

      <ConnectSheet
        creatorId={creator.id}
        platform={connecting}
        options={unconnected.map((p) => p.id)}
        onClose={() => setConnecting(null)}
      />
    </ProfileSection>
  );
}

/** Handle → "Connecting read-only…" → "Checking real followers…" → verified result. */
function ConnectSheet({
  creatorId,
  platform,
  options,
  onClose,
}: {
  creatorId: string;
  platform: CampaignPlatformId | null;
  options: CampaignPlatformId[];
  onClose: () => void;
}) {
  return (
    <Sheet
      open={platform !== null}
      onClose={onClose}
      title="Connect an account"
      description={READ_ONLY_NOTE}
      width="sm"
    >
      {/* Mounted only while open, so each connection starts fresh. */}
      {platform ? (
        <ConnectForm key={platform} creatorId={creatorId} initial={platform} options={options} onClose={onClose} />
      ) : null}
    </Sheet>
  );
}

function ConnectForm({
  creatorId,
  initial,
  options,
  onClose,
}: {
  creatorId: string;
  initial: CampaignPlatformId;
  options: CampaignPlatformId[];
  onClose: () => void;
}) {
  const toast = useToast();
  const connect = useConnectSequence();
  const [platform, setPlatform] = useState<CampaignPlatformId>(initial);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SocialAccount | null>(null);
  const choices = options.includes(initial) ? options : [initial, ...options];

  const submit = () => {
    const clean = handle.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_.]{2,30}$/.test(clean)) {
      setError("Enter your handle: letters, numbers, dots or underscores.");
      return;
    }
    setError(null);
    connect.start(() => {
      const social = actions.connectSocial(creatorId, platform, clean);
      setResult(social);
      toast({ message: `${platformName(platform)} connected` });
    });
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (connect.phase === "done") onClose();
        else if (!connect.busy) submit();
      }}
    >
      {choices.length > 1 ? (
        <div className="flex flex-col gap-2">
          <p className="y-label">Platform</p>
          <SegmentedToggle<CampaignPlatformId>
            label="Platform"
            value={platform}
            onChange={(next) => {
              if (connect.phase !== "idle") return;
              setPlatform(next);
            }}
            options={choices.map((id) => ({ value: id, label: platformName(id) }))}
            className="w-fit max-w-full"
          />
        </div>
      ) : null}

      <FieldShell label={`${platformName(platform)} handle`} required error={error}>
        {({ id, describedBy }) => (
          <div className="relative">
            <AtSign
              size={18}
              aria-hidden
              className="y-fg-3 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2"
            />
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
              disabled={connect.phase !== "idle"}
              data-autofocus
              value={handle}
              onChange={(event) => {
                setHandle(event.target.value.replace(/\s+/g, ""));
                if (error) setError(null);
              }}
              className="y-input ps-12"
            />
          </div>
        )}
      </FieldShell>

      <ConnectStatus phase={connect.phase} platform={platform} followers={result?.followers} />

      <div className="flex flex-wrap gap-2">
        <PillButton
          type="submit"
          variant="contrast"
          disabled={connect.busy}
          aria-busy={connect.busy || undefined}
          icon={connect.phase === "done" ? undefined : <Link2 size={18} aria-hidden />}
        >
          {connect.phase === "done" ? "Done" : connect.busy ? "Connecting…" : "Connect read-only"}
        </PillButton>
        {connect.phase === "idle" ? (
          <PillButton variant="ghost" onClick={onClose}>
            Cancel
          </PillButton>
        ) : null}
      </div>
    </form>
  );
}
