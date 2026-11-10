"use client";

import { ArrowRight, BadgeCheck, Heart, Languages, PencilLine, Play, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSimulatedPlayback } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { money } from "@/lib/format";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { isSaved, startingPrice } from "@/lib/selectors";
import { absoluteUrl } from "@/lib/site";
import { actions, useDemo } from "@/lib/store";
import { formatById, isTranslated, languageById, textDir } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

import { useSwipeLeft } from "./use-swipe-left";
import type { WatchItem } from "./watch-items";

export type ReelProps = {
  item: WatchItem;
  /** The reel in view (plays). */
  active: boolean;
  /** `performance.now()` when it became active (restarts playback); null until known. */
  since: number | null;
  reducedMotion: boolean;
  /** Your own video (no Order, no Save). */
  own: boolean;
  translate: boolean;
  onTranslate: () => void;
  position: number;
  setSize: number;
};

/** Where "Order" goes from a video: the order page with the video attached, or sign-in first. */
export function orderFromVideoHref(item: WatchItem, signedIn: boolean): string {
  const href = paths.orderCreator(item.creator.handle, { video: item.video.id });
  return signedIn ? href : paths.signIn({ next: href });
}

/** Copy a link to this video in Watch. */
export function useShareVideo() {
  const toast = useToast();
  return (item: WatchItem) => {
    const url = absoluteUrl(paths.watch({ video: item.video.id, creator: item.creator.handle }));
    const copy = navigator.clipboard?.writeText(url);
    if (!copy) {
      toast({ message: `Copy this link: ${url}`, tone: "info" });
      return;
    }
    copy.then(
      () => toast({ message: "Link to this video copied" }),
      () => toast({ message: `Copy this link: ${url}`, tone: "info" }),
    );
  };
}

/** Save or unsave, with undo. Signed out, it asks you to sign in first. */
export function useToggleSave() {
  const toast = useToast();
  const router = useRouter();
  const { account } = usePrefs();
  return (creator: Creator, back: string) => {
    if (!account) {
      router.push(paths.signIn({ next: back }));
      return;
    }
    const nowSaved = actions.toggleSavedCreator(creator.id);
    toast({
      message: nowSaved ? `Saved ${creator.firstName}` : `Removed ${creator.firstName} from saved`,
      action: { label: "Undo", onClick: () => actions.toggleSavedCreator(creator.id) },
    });
  };
}

/**
 * One video as a full-bleed reel: the generated scene, simulated playback with captions (and an
 * English translation for videos that aren't in English) while it's in view, tap to pause, the
 * creator and one line of facts, the actions column, and on phones one green button: Order. Swipe
 * left (or tap the name) for the creator's profile.
 */
export function WatchReel({ item, active, since, reducedMotion, own, translate, onTranslate, position, setSize }: ReelProps) {
  const { video, creator } = item;
  const s = useDemo();
  const router = useRouter();
  const { account } = usePrefs();
  const signedIn = Boolean(account);
  const saved = signedIn && isSaved(s, creator.id);
  const toggleSave = useToggleSave();
  const share = useShareVideo();
  const profile = paths.creator(creator.handle);
  const translated = isTranslated(video.lang);
  const here = paths.watch({ video: video.id, creator: creator.handle });

  const { ref, handlers } = useSwipeLeft<HTMLElement>({
    onSwipe: () => router.push(profile),
    reducedMotion,
  });

  const meta = [
    formatById[video.format]?.name,
    languageById[video.lang]?.name,
    creator.packages.length ? `From ${money(startingPrice(creator))}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Built here so the playback layer (which re-renders every frame) reuses the same elements.
  const info = (
    <>
      <Link href={profile} draggable={false} className="y-watch-who">
        <span className="y-watch-who-avatar">
          <FaceAvatar id={creator.id} name="" size={32} />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="flex min-w-0 items-center gap-1 text-[15px] font-semibold">
            <span className="truncate">{creator.name}</span>
            {creator.verified ? <BadgeCheck size={15} aria-label="ID verified" className="flex-none" /> : null}
          </span>
          <span className="truncate text-[12px] opacity-85">@{creator.handle}</span>
        </span>
      </Link>
      <p className="y-watch-meta">{meta}</p>
    </>
  );

  const actionsColumn = (
    <div className="y-watch-actions">
      {translated ? (
        <span className="y-watch-action">
          <button
            type="button"
            className="y-watch-round"
            aria-pressed={translate}
            aria-label="English translation"
            onClick={onTranslate}
          >
            <Languages size={20} aria-hidden />
          </button>
          <span aria-hidden>Translate</span>
        </span>
      ) : null}
      {own ? null : (
        <span className="y-watch-action" data-phone-only>
          <button
            type="button"
            className="y-watch-round"
            aria-pressed={saved}
            aria-label={saved ? `Remove ${creator.name} from saved` : `Save ${creator.name}`}
            onClick={() => toggleSave(creator, here)}
          >
            <Heart size={20} aria-hidden className={saved ? "fill-current" : ""} />
          </button>
          <span aria-hidden>{saved ? "Saved" : "Save"}</span>
        </span>
      )}
      <span className="y-watch-action" data-phone-only>
        <button type="button" className="y-watch-round" aria-label="Share this video" onClick={() => share(item)}>
          <Share2 size={19} aria-hidden />
        </button>
        <span aria-hidden>Share</span>
      </span>
      <span className="y-watch-action" data-phone-only>
        <Link href={profile} draggable={false} className="y-watch-round" aria-label={`${creator.firstName}'s profile`}>
          <ArrowRight size={19} aria-hidden className="y-flip" />
        </Link>
        <span aria-hidden>Profile</span>
      </span>
    </div>
  );

  const cta = own ? (
    <PillButton href={paths.studioProfile()} variant="neon" size="lg" arrow className="y-watch-cta y-reel-cta w-full" icon={<PencilLine size={17} aria-hidden />}>
      Edit your profile
    </PillButton>
  ) : (
    <PillButton href={orderFromVideoHref(item, signedIn)} variant="neon" size="lg" arrow className="y-watch-cta y-reel-cta w-full">
      Order from {creator.firstName}
    </PillButton>
  );

  return (
    <>
      <div aria-hidden className="y-reel-reveal">
        Profile
        <ArrowRight size={18} className="y-flip" />
      </div>
      <article
        ref={ref}
        {...handlers}
        aria-label={`Video by ${creator.name}: ${video.title}`}
        aria-roledescription="video"
        aria-posinset={position}
        aria-setsize={setSize}
        data-kind="video"
        className="y-reel"
      >
        <div className="absolute inset-0">
          <VideoThumb video={video} frame="9:16" fill rounded={false} showHook={false} showMeta={false} decorative />
        </div>
        <span aria-hidden className="y-reel-scrim" />
        <Playback
          item={item}
          autoplay={{ active: active && since !== null, since: since ?? 0, play: !reducedMotion }}
          translate={translate}
          info={info}
          cta={cta}
        />
        {actionsColumn}
      </article>
    </>
  );
}

/**
 * The part of a reel that changes while it plays: the tap-to-pause surface, the caption at the
 * playhead (with its translation) and the progress line. `info` and `cta` are passed in as elements
 * so the static overlay isn't rebuilt on every frame.
 */
function Playback({
  item,
  autoplay,
  translate,
  info,
  cta,
}: {
  item: WatchItem;
  autoplay: { active: boolean; since: number; play: boolean };
  translate: boolean;
  info: React.ReactNode;
  cta: React.ReactNode;
}) {
  const { video } = item;
  const { t, duration, playing, started, line, toggle } = useSimulatedPlayback(video, { autoplay, loop: true });
  const rtl = textDir(video.lang) === "rtl";
  const text = started ? line.text : video.hook;
  const translation = started ? line.translation : video.hookTranslation;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${video.title}` : `Play ${video.title}`}
        className="y-watch-tap"
      >
        {playing ? null : (
          <span aria-hidden className="y-play absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 68, height: 68 }}>
            <Play size={28} className="ms-1 fill-current" />
          </span>
        )}
      </button>

      <div className="y-watch-bottom">
        <div className="y-watch-text">
          <div className="y-watch-caption" aria-live={autoplay.active ? "polite" : undefined}>
            <span
              dir={textDir(video.lang)}
              lang={video.lang}
              className={`y-thumb-caption ${rtl ? "y-display" : ""}`}
              style={{ fontSize: "clamp(15px, 4.4cqw, 19px)" }}
            >
              {text}
            </span>
            {translate && translation ? (
              <span className="rounded-lg bg-black/70 px-2 py-0.5 text-[13px] font-medium text-white">{translation}</span>
            ) : null}
          </div>
          {info}
        </div>
        {cta}
      </div>

      <span aria-hidden className="y-watch-progress">
        <span style={{ width: `${(t / duration) * 100}%` }} />
      </span>
    </>
  );
}
