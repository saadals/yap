"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { NavLinks } from "@/components/shell/site-header";
import { Brand } from "@/components/ui/brand";
import { useMediaQuery, useReducedMotion } from "@/lib/hooks";
import { paths, type SignInIntent } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { creatorById, featuredVideo, portfolio } from "@/lib/selectors";
import { useDemo, useHydrated, type DemoState } from "@/lib/store";
import type { Creator, Video } from "@/lib/types";

import { BubbleField, type BubbleFieldHandle } from "./bubble-field";
import { ReelPreview } from "./reel-preview";

/** Button goes green, the bubbles rush past, then sign-in opens. */
const BURST_MS = 380;
const BURST_MS_REDUCED = 140;
/** Long enough for the preview's close animation. */
const PREVIEW_EXIT_MS = 200;

type Preview = { creatorId: string; openedAt: number; open: boolean };

/** The signed-out header's links: the same list the site header shows a visitor. */

const eligibleCreators = (s: DemoState): Creator[] =>
  s.creators.filter((creator) => portfolio(s, creator).length > 0);

/** A creator's best two videos: the featured one first, vertical before anything else. */
function highlights(s: DemoState, creator: Creator): Video[] {
  const videos = portfolio(s, creator);
  const featured = featuredVideo(s, creator);
  const vertical = (video: Video) => video.aspect === "9:16";
  const ordered = [
    ...(featured && vertical(featured) ? [featured] : []),
    ...videos.filter((video) => vertical(video) && video !== featured),
    ...videos.filter((video) => !vertical(video)),
  ];
  return ordered.slice(0, 2);
}

/**
 * The welcome screen, for signed-out visitors only: the creator field, one quiet line about what
 * Yapp is, and two ways in. /signin and /signup render it with the panel already open.
 */
export function WelcomeScene({
  initialPanel,
  onLeave,
}: {
  initialPanel?: { intent: SignInIntent | null; next: string | null };
  /** "/" only: a sign-in is about to leave for `destination` (see HomeRoute). */
  onLeave?: (destination: string) => void;
}) {
  const s = useDemo();
  const router = useRouter();
  const hydrated = useHydrated();
  const { account } = usePrefs();
  const reduced = useReducedMotion();
  const hoverMode = useMediaQuery("(hover: hover) and (pointer: fine)");

  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<BubbleFieldHandle | null>(null);
  const checkedSession = useRef(false);
  const burstTimer = useRef<number | undefined>(undefined);
  const exitTimer = useRef<number | undefined>(undefined);

  const [panel, setPanel] = useState({ open: Boolean(initialPanel), intent: initialPanel?.intent ?? null });
  const [launching, setLaunching] = useState<SignInIntent | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewsShown, setPreviewsShown] = useState(0);

  // Once only: a sign-in from the panel also sets the session, and navigates by itself.
  useEffect(() => {
    if (!hydrated || checkedSession.current) return;
    checkedSession.current = true;
    // Signed in on arrival (/signin, /signup): "/" takes you home. On "/" HomeRoute never shows this.
    if (account) router.replace(paths.landing);
    else rootRef.current?.setAttribute("data-settled", "");
  }, [hydrated, account, router]);

  useEffect(
    () => () => {
      window.clearTimeout(burstTimer.current);
      window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const creators = eligibleCreators(s);
  const previewCreator = preview ? creatorById(s, preview.creatorId) : undefined;

  const showPreview = (creatorId: string | null) => {
    window.clearTimeout(exitTimer.current);
    if (creatorId === null) {
      setPreview((current) => (current ? { ...current, open: false } : null));
      exitTimer.current = window.setTimeout(() => setPreview(null), PREVIEW_EXIT_MS);
      return;
    }
    const openedAt = performance.now();
    setPreview((current) =>
      current?.open && current.creatorId === creatorId ? current : { creatorId, openedAt, open: true },
    );
    setPreviewsShown((count) => count + 1);
  };

  const openPanel = (intent: SignInIntent | null) => {
    showPreview(null);
    setPanel({ open: true, intent });
  };

  const launch = (intent: SignInIntent) => {
    if (launching || panel.open) return;
    showPreview(null);
    setLaunching(intent);
    if (!hoverMode) {
      try {
        navigator.vibrate?.(10);
      } catch {
        /* not supported: the colour change is the feedback */
      }
    }
    fieldRef.current?.burst();
    burstTimer.current = window.setTimeout(
      () => {
        setPanel({ open: true, intent });
        setLaunching(null);
      },
      reduced ? BURST_MS_REDUCED : BURST_MS,
    );
  };

  const closePanel = () => {
    if (initialPanel) router.replace(paths.landing);
    else setPanel((current) => ({ ...current, open: false }));
  };

  const previewOpen = Boolean(preview?.open);

  return (
    <div ref={rootRef} className="y-welcome">
      <BubbleField
        ref={fieldRef}
        creatorIds={creators.map((creator) => creator.id)}
        frozen={previewOpen}
        interactive={!panel.open && !launching}
        onPreview={showPreview}
      />
      <div aria-hidden className="y-welcome-fade" data-edge="top" />
      <div aria-hidden className="y-welcome-fade" data-edge="bottom" />
      <div aria-hidden className="y-welcome-veil" data-on={previewOpen} />

      <header>
        <div className="y-welcome-logo lg:hidden">
          <Brand href={paths.landing} />
        </div>
        <div className="y-welcome-nav y-glass hidden lg:flex">
          <div className="flex items-center gap-10">
            <Brand href={paths.landing} />
            <NavLinks session="out" />
          </div>
          {/* Signed-out nav (Site-wide 5.4.4): Sign in and Get started open the panel in place. */}
          <div className="flex items-center gap-2">
            <button type="button" className="y-welcome-signin" onClick={() => openPanel(null)}>
              Sign in
            </button>
            <button type="button" className="y-welcome-order" onClick={() => openPanel(null)}>
              Get started
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <h1 className="sr-only">Yapp: social videos for your app, made by real creators</h1>

        <p className="y-welcome-line" data-quiet={previewOpen}>
          <span>Social videos for your app, made by real creators.</span>{" "}
          <Link href={paths.about} className="y-welcome-about">
            What is Yapp?
          </Link>
        </p>

        {preview && previewCreator ? (
          <ReelPreview
            creator={previewCreator}
            videos={highlights(s, previewCreator)}
            open={preview.open}
            openedAt={preview.openedAt}
            tap={!hoverMode}
            hint={!hoverMode && previewsShown === 1}
            reduced={reduced}
            onClose={() => showPreview(null)}
          />
        ) : null}

        <div className="y-welcome-cta">
          <button
            type="button"
            className="y-welcome-btn y-glass"
            data-launching={launching === "ask" || undefined}
            onClick={() => launch("ask")}
          >
            Ask for Yapps
          </button>
          <button
            type="button"
            className="y-welcome-btn y-glass"
            data-launching={launching === "make" || undefined}
            onClick={() => launch("make")}
          >
            Make Yapps
          </button>
        </div>

        {/* The bubbles are decorative to assistive tech and the keyboard: this list is the way in. */}
        <ul className="sr-only" aria-label="Creators on Yapp">
          {creators.map((creator) => (
            <li key={creator.id}>
              <button
                type="button"
                onFocus={() => showPreview(creator.id)}
                onBlur={() => showPreview(null)}
                onClick={() => showPreview(creator.id)}
              >
                Preview {creator.name}
              </button>
            </li>
          ))}
        </ul>
      </main>

      <SignInPanel
        open={panel.open}
        intent={panel.intent}
        next={initialPanel?.next ?? null}
        onClose={closePanel}
        onLeave={onLeave}
      />
    </div>
  );
}
