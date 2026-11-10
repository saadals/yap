"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { SiteHeader } from "@/components/shell/site-header";
import { Lockup } from "@/components/ui/brand";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useReducedMotion } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { creatorByHandle, me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import type { Creator } from "@/lib/types";

import "@/app/styles/watch.css";

import { type WatchItem, watchItems } from "./watch-items";
import { WatchPanel } from "./watch-panel";
import { WatchReel } from "./watch-reel";

/** The last slot: "That's every video". */
const END = "end";
/** Reels fully rendered either side of the one in view (the rest keep their height only). */
const WINDOW = 2;

/**
 * /discover/watch: creators' videos, one at a time. `?creator=handle` scopes it to one creator,
 * `?video=id` starts on a video (and follows the reel in view, so Back and reload come back to
 * it). Signed in it sits in the app shell (no tab bar: close goes back); signed out, in a
 * full-screen public frame.
 */
export function WatchPage() {
  return (
    <Suspense fallback={<PublicFrame>{<WatchSkeleton />}</PublicFrame>}>
      <Watch />
    </Suspense>
  );
}

function Watch() {
  const s = useDemo();
  const hydrated = useHydrated();
  const { account } = usePrefs();
  const params = useSearchParams();
  const creatorHandle = params.get("creator")?.replace(/^@/, "").toLowerCase() || null;
  const startVideo = params.get("video");

  if (!hydrated) {
    return (
      <PublicFrame>
        <WatchSkeleton />
      </PublicFrame>
    );
  }

  const scoped = creatorHandle ? creatorByHandle(s, creatorHandle) : undefined;
  const own = Boolean(account && scoped && me.creator(s)?.id === scoped.id);
  // A different account (or creator) gets a fresh viewer; following ?video= must not remount it.
  const body = (
    <Viewer
      key={`${account ? s.activeAccountId : "public"}:${creatorHandle ?? ""}`}
      creatorHandle={creatorHandle}
      startVideo={startVideo}
    />
  );
  if (account)
    return (
      <AppShell fullscreen focus mode={own ? "studio" : undefined}>
        {body}
      </AppShell>
    );
  return <PublicFrame>{body}</PublicFrame>;
}

/** Signed out: the public header on desktop, nothing on phones (the reel is the screen). */
function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:h-auto lg:min-h-dvh lg:overflow-visible">
      <SiteHeader signedIn={false} desktopOnly />
      <main id="main" className="min-h-0 flex-1">
        {children}
      </main>
    </div>
  );
}

function Viewer({ creatorHandle, startVideo }: { creatorHandle: string | null; startVideo: string | null }) {
  const s = useDemo();
  const { account } = usePrefs();
  const router = useRouter();
  const signedIn = Boolean(account);
  const reducedMotion = useReducedMotion();

  // Where Watch opened (read once: later ?video= changes come from scrolling).
  const [initial] = useState(() => ({ video: startVideo }));
  const { items, creator: scoped } = watchItems(s, {
    creatorHandle,
    startVideoId: initial.video,
    signedIn,
  });
  const ownCreatorId = signedIn ? me.ids(s).creatorId : undefined;
  const closeHref = scoped ? paths.creator(scoped.handle) : paths.discover();

  const [active, setActive] = useState<{ id: string | null; since: number | null }>({
    id: initial.video && items.some((item) => item.id === initial.video) ? initial.video : (items[0]?.id ?? null),
    since: null,
  });
  const [translate, setTranslate] = useState(true);

  const total = items.length;
  const found = active.id ? items.findIndex((item) => item.id === active.id) : -1;
  const activeIndex = active.id === END ? total : Math.max(0, found);
  const current: WatchItem | undefined = items[activeIndex];
  const atEnd = activeIndex >= total;

  // Latest values for the observer and the key handler (set before the browser can call them).
  const latest = useRef({ activeIndex, total, reducedMotion, closeHref, ids: items.map((item) => item.id), creatorHandle });
  useLayoutEffect(() => {
    latest.current = { activeIndex, total, reducedMotion, closeHref, ids: items.map((item) => item.id), creatorHandle };
  });

  // What floats over the reels follows the reel in view: video is dark; the end card follows the theme.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (atEnd || total === 0) delete root.dataset.reelTone;
    else root.dataset.reelTone = "dark";
    return () => {
      delete root.dataset.reelTone;
    };
  }, [atEnd, total]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /** Each slot registers with one IntersectionObserver; the slot at least 60% in view is the active reel. */
  const observeSlot = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
            const id = (entry.target as HTMLElement).dataset.reelId;
            if (!id) continue;
            const since = performance.now();
            setActive((prev) => (prev.id === id && prev.since !== null ? prev : { id, since }));
            // Follow the reel in the address bar, so Back and reload come back to it.
            if (id !== END) {
              const url = new URL(window.location.href);
              url.searchParams.set("video", id);
              if (latest.current.creatorHandle) url.searchParams.set("creator", latest.current.creatorHandle);
              window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
            }
          }
        },
        { threshold: [0.6] },
      );
    }
    const observer = observerRef.current;
    observer.observe(node);
    return () => observer.unobserve(node);
  }, [setActive]);

  /** Open on the start video (runs once, when the scroller mounts with its slots). */
  const [startAt] = useState(active.id);
  const attachScroller = useCallback(
    (node: HTMLDivElement | null) => {
      scrollerRef.current = node;
      if (!node || !startAt) return;
      const target = node.querySelector<HTMLElement>(`[data-reel-id="${CSS.escape(startAt)}"]`);
      if (target) node.scrollTo({ top: target.offsetTop, behavior: "instant" });
    },
    [startAt],
  );

  const go = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const target = scroller?.querySelector<HTMLElement>(`[data-reel-index="${index}"]`);
    if (!scroller || !target) return;
    scroller.scrollTo({ top: target.offsetTop, behavior: latest.current.reducedMotion ? "instant" : "smooth" });
  }, []);

  // Keyboard: ↑/↓ (and Page Up/Down) move a video, Esc closes. Not while typing or in a dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='slider']")) return;
      const { activeIndex: at, total: count } = latest.current;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        go(Math.min(at + 1, count));
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        go(Math.max(at - 1, 0));
      } else if (event.key === "Escape") {
        router.push(latest.current.closeHref);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, router]);

  const title = scoped ? `${scoped.firstName}'s videos` : "Watch";
  const announcement = total === 0 ? "" : atEnd ? "That's every video" : `Video ${activeIndex + 1} of ${total}`;

  if (creatorHandle && !scoped) return <WatchMissing />;

  return (
    <div className="y-watch">
      <h1 className="sr-only">{scoped ? `Videos by ${scoped.name}` : "Watch creators' videos"}</h1>
      <div className="y-watch-stage">
        <div className="y-watch-close-desk">
          <RoundIconButton href={closeHref} label={scoped ? `Back to ${scoped.firstName}'s profile` : "Close and go back to Discover"} tone="soft">
            <X size={20} aria-hidden />
          </RoundIconButton>
        </div>

        <div className="y-feed-col">
          <div ref={attachScroller} role="feed" aria-label={title} aria-busy={false} tabIndex={0} className="y-feed">
            {total === 0 ? (
              <div className="y-feed-slot">
                <WatchEmpty />
              </div>
            ) : (
              <>
                {items.map((item, index) => (
                  <div key={item.id} ref={observeSlot} data-reel-id={item.id} data-reel-index={index} className="y-feed-slot">
                    {Math.abs(index - activeIndex) <= WINDOW ? (
                      <WatchReel
                        item={item}
                        active={index === activeIndex}
                        since={item.id === active.id ? active.since : null}
                        reducedMotion={reducedMotion}
                        own={item.creator.id === ownCreatorId}
                        translate={translate}
                        onTranslate={() => setTranslate((v) => !v)}
                        position={index + 1}
                        setSize={total}
                      />
                    ) : (
                      <div aria-hidden className="y-feed-placeholder" />
                    )}
                  </div>
                ))}
                <div ref={observeSlot} data-reel-id={END} data-reel-index={total} className="y-feed-slot">
                  {total - activeIndex <= WINDOW ? (
                    <WatchEnd creator={scoped} own={Boolean(scoped && scoped.id === ownCreatorId)} onTop={() => go(0)} />
                  ) : null}
                </div>
              </>
            )}
          </div>

          {/* Phones: close, where you are and the logo, over the reel (they follow its tone). */}
          <div className="y-reel-top y-watch-top">
            <span className="flex min-w-0 items-center gap-2.5">
              <Link
                href={closeHref}
                className="y-watch-round"
                aria-label={scoped ? `Back to ${scoped.firstName}'s profile` : "Close and go back to Discover"}
              >
                <X size={20} aria-hidden />
              </Link>
              <span className="y-watch-title">{atEnd ? "" : title}</span>
            </span>
            <Link href={account ? paths.home : paths.landing} className="y-reel-logo flex-none" aria-label="Yapping home">
              <Lockup size={24} />
            </Link>
          </div>
        </div>

        {total > 0 ? (
          <div className="y-watch-nav">
            <RoundIconButton label="Previous video" disabled={activeIndex === 0} onClick={() => go(activeIndex - 1)}>
              <ChevronUp size={22} aria-hidden />
            </RoundIconButton>
            <span className="y-micro y-fg-2 y-num min-w-10 text-center" aria-hidden>
              {atEnd ? total : activeIndex + 1} / {total}
            </span>
            <RoundIconButton label="Next video" disabled={atEnd} onClick={() => go(activeIndex + 1)}>
              <ChevronDown size={22} aria-hidden />
            </RoundIconButton>
          </div>
        ) : null}

        <aside className="y-watch-panel" aria-label="About this video">
          {current ? <WatchPanel item={current} own={current.creator.id === ownCreatorId} /> : null}
        </aside>
        <div className="y-watch-spacer" aria-hidden />
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}

function WatchEnd({ creator, own, onTop }: { creator?: Creator; own: boolean; onTop: () => void }) {
  const { account } = usePrefs();
  const orderHref = creator ? paths.orderCreator(creator.handle) : null;
  return (
    <div data-tone="paper" className="y-block y-feed-fill flex h-full flex-col items-center justify-center overflow-y-auto">
      <EmptyState
        title={creator ? (own ? "That's all your videos" : `That's all of ${creator.firstName}'s videos`) : "That's every video for now"}
        body={
          creator
            ? own
              ? "Add more to your portfolio from your Studio profile. Brands watch here before they order."
              : `Like what you saw? Order from ${creator.firstName}, or look around for more creators.`
            : "New videos show up here as creators add them. Every creator is on Discover, with filters."
        }
        action={
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              {creator && !own && orderHref ? (
                <PillButton href={account ? orderHref : paths.signIn({ next: orderHref })} variant="neon" arrow>
                  Order from {creator.firstName}
                </PillButton>
              ) : null}
              {creator && own ? (
                <PillButton href={paths.studioProfile()} variant="contrast">
                  Edit your profile
                </PillButton>
              ) : (
                <PillButton href={paths.discover()} variant={creator ? "outline" : "contrast"}>
                  Find creators
                </PillButton>
              )}
            </div>
            <PillButton variant="ghost" size="sm" onClick={onTop}>
              Back to the first video
            </PillButton>
          </div>
        }
      />
    </div>
  );
}

function WatchEmpty() {
  return (
    <div data-tone="paper" className="y-block y-feed-fill flex h-full flex-col items-center justify-center overflow-y-auto">
      <EmptyState
        title="No videos yet"
        body="This creator hasn't added videos yet. Their profile has their packages, and you can message them for samples."
        action={
          <PillButton href={paths.discover()} variant="contrast">
            Find creators
          </PillButton>
        }
      />
    </div>
  );
}

function WatchMissing() {
  return (
    <div className="y-watch">
      <div className="mx-auto flex h-full max-w-xl flex-col justify-center px-(--y-gutter) lg:pt-10">
        <div data-tone="paper" className="y-block">
          <EmptyState
            headingLevel={2}
            title="We couldn't find that creator"
            body="The link may be mistyped, or the creator may have changed their handle."
            action={
              <PillButton href={paths.discover()} variant="contrast" arrow>
                Find creators
              </PillButton>
            }
          />
        </div>
      </div>
    </div>
  );
}

function WatchSkeleton() {
  return (
    <div className="y-watch">
      <div className="y-watch-stage">
        <div className="y-watch-close-desk" />
        <div className="y-feed-col">
          <div aria-hidden className="y-skel y-feed-fill h-full w-full !rounded-none lg:!rounded-(--y-r-block)" />
        </div>
        <div className="y-watch-spacer" />
      </div>
      <p className="sr-only" role="status">
        Loading videos
      </p>
    </div>
  );
}
