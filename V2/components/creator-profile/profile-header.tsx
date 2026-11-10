"use client";

import { BadgeCheck, CalendarClock, CircleCheck, MessageCircle, Share2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SaveCreatorButton } from "@/components/domain/creator-card";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useToast } from "@/components/ui/toast";
import { num, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { cityLabel } from "@/lib/selectors";
import { absoluteUrl } from "@/lib/site";
import { creatorKindById, languageById } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

import { MessageSheet } from "./message-sheet";
import { availabilityLabel, responseShort } from "./utils";

/** Copy a link to the creator's profile (or a video in Watch) and say so. */
export function useShareLink() {
  const toast = useToast();
  return (path: string, what: string) => {
    const url = absoluteUrl(path);
    const copy = navigator.clipboard?.writeText(url);
    if (!copy) {
      toast({ message: `Copy this link: ${url}`, tone: "info" });
      return;
    }
    copy.then(
      () => toast({ message: `Link to ${what} copied` }),
      () => toast({ message: `Copy this link: ${url}`, tone: "info" }),
    );
  };
}

/**
 * Who this is: face, name, availability, headline, one meta line and the track record, with Save,
 * Message and Share. `own` hides Save and Message (nobody saves or messages themselves).
 */
export function ProfileHeader({ creator, own }: { creator: Creator; own: boolean }) {
  const { account } = usePrefs();
  const router = useRouter();
  const share = useShareLink();
  const [messageOpen, setMessageOpen] = useState(false);
  const kind = creatorKindById[creator.kind];
  const meta = [
    `@${creator.handle}`,
    kind.name,
    cityLabel(creator.cityId),
    creator.languages.map((id) => languageById[id].name).join(", "),
  ].join(" · ");

  const openMessage = () => {
    if (!account) router.push(paths.signIn({ next: paths.creator(creator.handle) }));
    else setMessageOpen(true);
  };

  const actions = (
    <>
      {own ? null : <SaveCreatorButton creator={creator} variant="soft" />}
      <RoundIconButton label="Share profile" size="sm" onClick={() => share(paths.creator(creator.handle), `${creator.firstName}'s profile`)}>
        <Share2 size={17} aria-hidden />
      </RoundIconButton>
      {own ? null : (
        <PillButton variant="soft" size="sm" icon={<MessageCircle size={16} aria-hidden />} onClick={openMessage}>
          Message
        </PillButton>
      )}
    </>
  );

  return (
    <Block tone="paper" pad="md" as="header" className="flex flex-col gap-5">
      <div className="flex items-start gap-4 md:gap-6">
        <span className="block w-[72px] flex-none md:w-[104px]">
          <FaceAvatar id={creator.id} name="" size="100%" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {creator.available ? (
              <Badge tone="success" icon={<CircleCheck size={13} aria-hidden />}>
                Available now
              </Badge>
            ) : (
              <Badge tone="neutral" icon={<CalendarClock size={13} aria-hidden />}>
                {availabilityLabel(creator)}
              </Badge>
            )}
          </div>
          <h1 className="y-display y-t-display flex flex-wrap items-center gap-x-2">
            <span className="min-w-0 break-words">{creator.name}</span>
            {creator.verified ? (
              <BadgeCheck role="img" aria-label="ID verified" className="size-6 flex-none md:size-7" strokeWidth={2} />
            ) : null}
          </h1>
          <p className="y-lead max-w-[54ch]">{creator.headline}</p>
          <p className="y-small y-fg-2">{meta}</p>
        </div>
        <div className="hidden flex-none items-center gap-2 md:flex">{actions}</div>
      </div>

      <TrackRecord creator={creator} />

      <div className="flex items-center gap-2 md:hidden">{actions}</div>

      {own ? null : <MessageSheet creator={creator} open={messageOpen} onClose={() => setMessageOpen(false)} />}
    </Block>
  );
}

/** Rating · completed · on time · replies in, as one quiet row of text. */
function TrackRecord({ creator }: { creator: Creator }) {
  const strong = "y-num font-semibold text-(--b-fg)";
  const items: { label: string; text: React.ReactNode }[] = [];
  if (creator.reviewCount || creator.rating) {
    items.push({
      label: "Rating",
      text: (
        <>
          <span className={strong}>
            <Star size={13} aria-hidden className="me-1 inline-block fill-current align-[-1px]" />
            {creator.rating.toFixed(1)}
          </span>{" "}
          ({plural(creator.reviewCount, "review")})
        </>
      ),
    });
  } else {
    items.push({ label: "Rating", text: "New on Yapp, no reviews yet" });
  }
  items.push(
    {
      label: "Jobs completed",
      text: (
        <>
          <span className={strong}>{num(creator.completed)}</span> completed
        </>
      ),
    },
    {
      label: "Delivered on time",
      text: (
        <>
          <span className={strong}>{creator.onTimeRate}%</span> on time
        </>
      ),
    },
    {
      label: "Typical response",
      text: (
        <>
          Replies in about <span className={strong}>{responseShort(creator.responseHours)}</span>
        </>
      ),
    },
  );
  return (
    <dl
      aria-label="Track record"
      className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-(--b-line) pt-4 sm:flex sm:flex-wrap sm:gap-x-6"
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className="sr-only">{item.label}</dt>
          <dd className="y-small y-fg-2">{item.text}</dd>
        </div>
      ))}
    </dl>
  );
}
