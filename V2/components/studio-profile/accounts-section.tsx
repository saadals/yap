"use client";

import { AtSign, Link2, Unlink } from "lucide-react";
import { useState } from "react";

import {
  ConnectStatus,
  READ_ONLY_NOTE,
  VerifiedMark,
  platformName,
  tierLine,
  useConnectSequence,
} from "@/components/account/social";
import { FieldShell } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { compact, shortDate } from "@/lib/format";
import { actions } from "@/lib/store";
import { campaignPlatforms } from "@/lib/taxonomy";
import type { CampaignPlatformId, Creator, SocialAccount } from "@/lib/types";

import { EditorSection } from "./section";

/**
 * Connected accounts: one row per campaign platform. Read-only connections verify real followers,
 * which decide the campaign tier you can take. Saves as you go (`connectSocial` / `disconnectSocial`).
 */
export function AccountsSection({ creator }: { creator: Creator }) {
  const toast = useToast();
  const socials = creator.socials ?? [];
  const [connecting, setConnecting] = useState<CampaignPlatformId | null>(null);

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
    <EditorSection
      id="accounts"
      title="Connected accounts"
      description={`${READ_ONLY_NOTE} Custom orders hire on your portfolio; UGC campaigns pay by follower tier.`}
      instant
    >
      <ul className="y-tile flex flex-col overflow-hidden !bg-transparent shadow-[inset_0_0_0_1px_var(--b-line)]">
        {campaignPlatforms.map((platform, index) => {
          const social = socials.find((x) => x.platform === platform.id);
          return (
            <li key={platform.id} className={`flex items-center gap-3 px-4 py-3.5 ${index ? "border-t border-(--b-line)" : ""}`}>
              <span aria-hidden className="y-tile grid size-10 flex-none place-items-center !rounded-full">
                <AtSign size={18} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="y-small flex items-center gap-1.5 font-semibold">
                  <span className="truncate">
                    {platform.name}
                    {social ? (
                      <>
                        {" · "}
                        <span dir="ltr">@{social.handle}</span>
                      </>
                    ) : null}
                  </span>
                  {social?.verified ? <VerifiedMark /> : null}
                </p>
                {social ? (
                  <>
                    <p className="y-micro y-fg-2">
                      <span className="y-num font-semibold text-(--b-fg)">{compact(social.followers)}</span> verified
                      followers · connected {shortDate(social.connectedAt)}
                    </p>
                    <p className="y-micro y-fg-2">{tierLine(social.followers)}</p>
                  </>
                ) : (
                  <p className="y-micro y-fg-2">Not connected</p>
                )}
              </div>
              {social ? (
                <PillButton
                  variant="ghost"
                  size="sm"
                  icon={<Unlink size={16} aria-hidden />}
                  onClick={() => disconnect(social)}
                  aria-label={`Disconnect ${platform.name}`}
                >
                  <span className="hidden sm:inline">Disconnect</span>
                </PillButton>
              ) : (
                <PillButton variant="soft" size="sm" icon={<Link2 size={16} aria-hidden />} onClick={() => setConnecting(platform.id)}>
                  Connect
                </PillButton>
              )}
            </li>
          );
        })}
      </ul>

      <Sheet
        open={connecting !== null}
        onClose={() => setConnecting(null)}
        title={connecting ? `Connect ${platformName(connecting)}` : "Connect an account"}
        description={READ_ONLY_NOTE}
        width="sm"
      >
        {/* Mounted only while open, so each connection starts fresh. */}
        {connecting ? (
          <ConnectForm key={connecting} creatorId={creator.id} platform={connecting} onClose={() => setConnecting(null)} />
        ) : null}
      </Sheet>
    </EditorSection>
  );
}

/** Handle → "Connecting read-only…" → "Checking real followers…" → the verified result. */
function ConnectForm({
  creatorId,
  platform,
  onClose,
}: {
  creatorId: string;
  platform: CampaignPlatformId;
  onClose: () => void;
}) {
  const toast = useToast();
  const connect = useConnectSequence();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SocialAccount | null>(null);

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
      <FieldShell label={`${platformName(platform)} handle`} required error={error}>
        {({ id, describedBy }) => (
          <div className="relative">
            <AtSign size={18} aria-hidden className="y-fg-2 pointer-events-none absolute start-4 top-1/2 -translate-y-1/2" />
            <input
              id={id}
              name="handle"
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
              className="y-input !ps-11"
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
