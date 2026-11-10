"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { Sheet, SheetActions } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { postLinkProblem } from "@/lib/selectors";
import { actions } from "@/lib/store";
import { CAMPAIGN_KEEP_LIVE_DAYS, CAMPAIGN_RELEASE_DAYS, campaignPlatformById } from "@/lib/taxonomy";

import { cash, type Workspace } from "./helpers";

/**
 * "Add your post link" (Work spec 6.9.3): the link and the three confirmations. Verify stays
 * disabled until the link is a link and all three are ticked; a link on the wrong platform, or
 * anything the store refuses, shows its exact reason. We then check the post (simulated: a few
 * seconds) and the page moves to "Checking your post…" and then verified.
 */
export function PostLinkSheet({ ws, open, onClose }: { ws: Workspace; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const slot = ws.slot!;
  const again = ws.commission.post?.status === "removed";
  const id = useId();
  const helpId = useId();
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [ticks, setTicks] = useState([false, false, false]);
  const [refused, setRefused] = useState<string | null>(null);
  const looksLikeLink = /^https?:\/\/\S+\.\S+/i.test(url.trim());
  // The link must be on the platform this creator picked (the store checks it too).
  const problem = url.trim() ? postLinkProblem(url, slot.platform) : null;
  const showProblem = problem && (touched || looksLikeLink);
  const valid = looksLikeLink && !problem;
  const ready = valid && ticks.every(Boolean);
  const example = campaignPlatformById[slot.platform].example.replace("{handle}", slot.social?.handle ?? "you");
  const disclosure = slot.disclosure.replace(/\s*\(.*\)$/, "");

  const items = [
    <>
      Tagged <b>{slot.brandHandle}</b> in the post
    </>,
    <>
      Turned on the <b>{disclosure}</b>
    </>,
    <>
      I&apos;ll keep it up for {CAMPAIGN_KEEP_LIVE_DAYS} days after it&apos;s verified, so the payment is released
    </>,
  ];

  const verify = () => {
    setTouched(true);
    if (!ready) return;
    const result = actions.submitPost(ws.commission.id, url.trim());
    if (!result.ok) {
      setRefused(result.reason);
      return;
    }
    toast({ message: "Post link added · checking it now" });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={again ? "Add the new post link" : "Add your post link"}
      description={`Post the approved video on your ${slot.platformName}${slot.social ? ` (@${slot.social.handle})` : ""}, then paste the link. We check it automatically.`}
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton variant="neon" disabled={!ready} onClick={verify}>
            Verify post
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="y-ord-fld">
          <label htmlFor={id} className="y-ord-lb">
            Post link
          </label>
          <input
            id={id}
            type="url"
            inputMode="url"
            autoComplete="off"
            className="y-input"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setRefused(null);
            }}
            onBlur={() => url && setTouched(true)}
            placeholder={example}
            aria-invalid={showProblem || refused ? true : undefined}
            aria-describedby={helpId}
          />
          <small
            id={helpId}
            role={showProblem || refused ? "alert" : undefined}
            className={showProblem || refused ? "font-medium text-(--y-danger)" : valid ? "text-(--y-success)" : ""}
          >
            {refused ? (
              refused
            ) : showProblem ? (
              problem
            ) : valid ? (
              <span className="inline-flex items-center gap-1">
                <Check size={13} strokeWidth={3} aria-hidden /> Looks like a {slot.platformName} link
              </span>
            ) : (
              "Paste the link to the live post"
            )}
          </small>
        </div>

        <fieldset className="y-ord-fld">
          <legend className="y-ord-lb mb-2">Before you paste</legend>
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
              <li key={index}>
                <label className="y-ord-chk">
                  <input
                    type="checkbox"
                    checked={ticks[index]}
                    onChange={() => setTicks((list) => list.map((v, i) => (i === index ? !v : v)))}
                  />
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <p className="y-small y-fg-2">
          We only read the post to check the tag and the label; we never post for you. Your{" "}
          {cash(ws.totals.creatorEarns)} is released {CAMPAIGN_RELEASE_DAYS} days after the post is verified.
        </p>
      </div>
    </Sheet>
  );
}
