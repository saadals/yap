"use client";

import { BadgeCheck, Loader2 } from "lucide-react";
import { useId, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { weekdayDate } from "@/lib/format";
import { keepLiveUntil } from "@/lib/selectors";
import { actions } from "@/lib/store";
import { CAMPAIGN_KEEP_LIVE_DAYS, CAMPAIGN_RELEASE_DAYS, CAMPAIGN_RESTORE_HOURS } from "@/lib/taxonomy";

import { cash, FORM, possessive, type Job, type SlotContext } from "./helpers";
import { Note, Panel } from "./panel";
import { FinishedVideo } from "./completed";

/**
 * Making side of an approved campaign slot: post it on your own account (tag + paid-partnership
 * label), paste the link, we check it (~3s simulated), then the pay is pending until 7 days after
 * verification, and the post stays up 30 days. A post that comes down has 48 hours to go back up.
 */
export function PostStep({ job }: { job: Job }) {
  const { commission: c, businessName, slot, selected } = job;
  if (!slot) return null;
  const post = c.post;

  if (post?.status === "checking") {
    return (
      <Panel
        live
        icon={<Loader2 size={24} aria-hidden className="animate-spin motion-reduce:animate-none" />}
        title="Checking your post"
        line={`Looking for ${slot.brandHandle} and the paid-partnership label. This takes a few seconds.`}
      />
    );
  }

  if (post?.status === "live") {
    const released = c.payment.status === "released";
    const keepUntil = keepLiveUntil(c);
    return (
      <Panel
        live
        icon={<BadgeCheck size={24} aria-hidden className="text-(--y-success)" />}
        title="Verified: tag found, disclosure found"
        line={
          released
            ? `${cash(c.price)} is in your earnings, ready to withdraw.`
            : `${cash(c.price)} is released ${c.withdrawableFrom ? `on ${weekdayDate(c.withdrawableFrom)}` : `${CAMPAIGN_RELEASE_DAYS} days after verification`} if the post is still up.`
        }
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {selected ? <FinishedVideo delivery={selected} /> : null}
          <div className="flex min-w-0 flex-col gap-3">
            <Note>
              Keep it up until {keepUntil ? weekdayDate(keepUntil) : `${CAMPAIGN_KEEP_LIVE_DAYS} days after verification`}. We
              check it once a day.
            </Note>
            <Note icon={<BadgeCheck size={17} aria-hidden className="mt-px flex-none" />}>
              {slot.brandHandle} is tagged and the {slot.disclosure.charAt(0).toLowerCase()}
              {slot.disclosure.slice(1)} is on. {businessName} can see the post is live.
            </Note>
          </div>
        </div>
      </Panel>
    );
  }

  if (post?.status === "removed") {
    return (
      <Panel title="Your post was taken down">
        <Note tone="warning">
          Your {cash(c.price)} is on hold while the post is down. Put it back up within {CAMPAIGN_RESTORE_HOURS} hours and paste
          the new link, or the slot and its pay go back to {businessName}.
        </Note>
        <PostLinkForm job={job} slot={slot} again />
      </Panel>
    );
  }

  const steps = [
    `Post it on ${slot.platformName} from your own account${slot.social ? ` (@${slot.social.handle})` : ""}.`,
    `Tag ${slot.brandHandle} in the caption.`,
    `Turn on the ${slot.disclosure.charAt(0).toLowerCase()}${slot.disclosure.slice(1)}.`,
    `Keep it up for ${CAMPAIGN_KEEP_LIVE_DAYS} days after we verify it.`,
  ];
  return (
    <Panel
      title={`Post it to unlock ${cash(c.price)}`}
      line={`${businessName} approved your video. Post it, then paste the link here. Your ${cash(c.price)} is released ${CAMPAIGN_RELEASE_DAYS} days after we verify the post.`}
    >
      <ol className="flex max-w-[62ch] flex-col gap-2.5">
        {steps.map((text, index) => (
          <li key={text} className="y-small flex items-start gap-3">
            <span className="y-num grid size-6 flex-none place-items-center rounded-full bg-(--b-fg) text-xs font-semibold text-(--b-bg)">
              {index + 1}
            </span>
            <span className="pt-0.5">{text}</span>
          </li>
        ))}
      </ol>
      <PostLinkForm job={job} slot={slot} />
      <p className="y-micro y-fg-2">
        The full-quality file of {possessive(businessName)} approved version is under Files in Details.
      </p>
    </Panel>
  );
}

const looksLikeLink = (value: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\/\S+/i.test(value.trim());

function PostLinkForm({ job, slot, again = false }: { job: Job; slot: SlotContext; again?: boolean }) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [tried, setTried] = useState(false);
  const valid = looksLikeLink(url);
  const error = tried && !valid ? "Paste the full link to your post, like the one you'd share." : null;
  const example = `https://www.${slot.terms?.platform ?? "tiktok"}.com/${slot.social ? `@${slot.social.handle}/` : ""}…`;

  return (
    <form
      id={FORM.post}
      className="flex max-w-[62ch] flex-col gap-2"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!valid) return;
        // The panel switches to "Checking your post" (announced politely).
        actions.submitPost(job.commission.id, url.trim());
      }}
    >
      <label htmlFor={id} className="y-label">
        <span>{again ? "Link to the new post" : "Link to your post"}</span>
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name="post-link"
          type="url"
          inputMode="url"
          autoComplete="off"
          className="y-input min-w-0 flex-1"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={example}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
        />
        <span className="max-lg:hidden">
          <PillButton type="submit" variant="neon">
            {again ? "Submit new link" : "Submit post"}
          </PillButton>
        </span>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="y-small px-1 font-medium text-(--y-danger)">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="y-micro y-fg-2 px-1">
          We only read the post to check the tag and the label. We never post for you.
        </p>
      )}
    </form>
  );
}
