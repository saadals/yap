"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Gamepad2,
  Headphones,
  HeartPulse,
  LayoutGrid,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { useReducedMotion } from "@/components/ui/motion";
import { InLang, SectionHead } from "@/components/ui/page";
import { money, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { startingPrice } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Creator, NicheId, Video } from "@/lib/types";

import { avgViews, cityName, fastestDelivery, medianAvgViews, viewsLabel, type CategoryStat } from "./data";

export const categoryIcon: Record<NicheId, LucideIcon> = {
  ai: Sparkles,
  consumer: Smartphone,
  b2b: LayoutGrid,
  fintech: Wallet,
  gadgets: Headphones,
  gaming: Gamepad2,
  health: HeartPulse,
  ecommerce: ShoppingBag,
};

/** What the hot-categories file uses to bring a category's panel to the middle. */
export type StripControl = { centre: (id: NicheId) => void };

/** Panel pitch and the geometry of Discover 4.6. */
const STEP = 410;
const DRIFT = 0.28;
const EASE = 0.12;
const FRICTION = 0.94;
const IMPULSE = 14;
const RESUME_MS = 1500;
const CLICK_SLOP = 6;

type Motion = {
  offset: number;
  velocity: number;
  /** Eases the offset here (a category brought to the middle), shortest way round. */
  target: number | null;
  idleUntil: number;
  drag: { x: number; offset: number; last: number; moved: number } | null;
  /** The panel pointed at or focused (-1: none). */
  hover: number;
  focused: boolean;
  visible: boolean;
  panels: { ry: number; z: number }[];
};

/**
 * Tech creators by category: one panel per category drifting slowly round a 3D strip (CSS 3D, one
 * requestAnimationFrame loop, transforms only). Pointing at a panel stops the drift and opens it;
 * drag or swipe it (with momentum), swipe sideways on a trackpad, or use the arrows. The loop
 * stops while the strip is off screen, and nothing moves by itself under reduced motion. Keyboard:
 * each panel is a button (Enter opens its top creator), focusing one brings it to the middle.
 */
export function ExploreStrip({
  s,
  categories,
  onOpenCreator,
  controlRef,
}: {
  s: DemoState;
  categories: CategoryStat[];
  onOpenCreator: (id: string) => void;
  controlRef: RefObject<StripControl | null>;
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(-1);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const suppressClick = useRef(false);
  const count = categories.length;
  const motion = useRef<Motion>({
    offset: 0,
    velocity: 0,
    target: null,
    idleUntil: 0,
    drag: null,
    hover: -1,
    focused: false,
    visible: false,
    panels: categories.map(() => ({ ry: 0, z: 0 })),
  });
  const reducedRef = useRef(reduced);
  useLayoutEffect(() => {
    reducedRef.current = reduced;
  });

  const setHovered = (index: number) => {
    motion.current.hover = index;
    setHover(index);
  };

  const bringToMiddle = (index: number, holdMs = RESUME_MS) => {
    const m = motion.current;
    const span = count * STEP;
    // Shortest way round the loop to the panel's offset.
    const base = index * STEP;
    const turns = Math.round((m.offset - base) / span);
    m.target = base + turns * span;
    m.velocity = 0;
    m.idleUntil = performance.now() + holdMs;
    if (reducedRef.current) {
      m.offset = m.target;
      m.target = null;
    }
  };
  const bringRef = useRef(bringToMiddle);
  useLayoutEffect(() => {
    bringRef.current = bringToMiddle;
  });

  useEffect(() => {
    controlRef.current = {
      centre: (id) => {
        const index = categories.findIndex((c) => c.id === id);
        if (index >= 0) bringRef.current(index, 2500);
      },
    };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef, categories]);

  // The loop: one requestAnimationFrame, transforms only; stopped while off screen.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const m = motion.current;
    let raf = 0;
    const span = count * STEP;

    const frame = () => {
      const now = performance.now();
      const still = reducedRef.current;
      if (m.drag) {
        /* the pointer sets the offset */
      } else if (m.target !== null) {
        const gap = m.target - m.offset;
        if (Math.abs(gap) < 0.5 || still) {
          m.offset = m.target;
          m.target = null;
        } else m.offset += gap * EASE;
      } else if (Math.abs(m.velocity) > 0.05 && !still) {
        m.offset += m.velocity;
        m.velocity *= FRICTION;
      } else if (m.hover < 0 && !m.focused && now > m.idleUntil && !still) {
        m.offset += DRIFT;
      }
      for (let index = 0; index < count; index++) {
        const node = panelRefs.current[index];
        const p = m.panels[index];
        if (!node || !p) continue;
        let x = (((index * STEP - m.offset) % span) + span) % span;
        if (x > span / 2) x -= span;
        const t = Math.max(-1, Math.min(1, x / 700));
        const hovered = index === m.hover;
        const ry = hovered ? 0 : -t * 38;
        const z = hovered ? 50 : -Math.abs(t) * 120;
        const k = still ? 1 : EASE;
        p.ry += (ry - p.ry) * k;
        p.z += (z - p.z) * k;
        node.style.transform = `translateX(${x.toFixed(2)}px) translateZ(${p.z.toFixed(2)}px) rotateY(${p.ry.toFixed(3)}deg)`;
        node.style.zIndex = String(hovered ? 100 : Math.round(50 - Math.abs(x) / 20));
        node.style.opacity = Math.abs(x) > 1300 ? "0" : "1";
      }
      raf = m.visible ? window.requestAnimationFrame(frame) : 0;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        m.visible = Boolean(entry?.isIntersecting);
        if (m.visible && !raf) raf = window.requestAnimationFrame(frame);
      },
      { rootMargin: "100px 0px" },
    );
    observer.observe(stage);
    // Place the panels once before the first intersection report.
    frame();

    // A sideways trackpad swipe moves the strip (and not the page); a vertical wheel scrolls it.
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      m.velocity = 0;
      m.target = null;
      m.offset += event.deltaX;
      m.idleUntil = performance.now() + RESUME_MS;
      if (!raf) frame();
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      stage.removeEventListener("wheel", onWheel);
      window.cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [count]);

  // Drag (mouse, pen or touch), with momentum on release. A drag isn't a click.
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const m = motion.current;
    m.drag = { x: event.clientX, offset: m.offset, last: event.clientX, moved: 0 };
    m.target = null;
    m.velocity = 0;
    suppressClick.current = false;
    const onMove = (move: PointerEvent) => {
      const drag = m.drag;
      if (!drag) return;
      const dx = move.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      m.offset = drag.offset - dx;
      m.velocity = -(move.clientX - drag.last) * 0.9;
      drag.last = move.clientX;
      if (drag.moved > CLICK_SLOP) stageRef.current?.setAttribute("data-dragging", "true");
    };
    const onUp = () => {
      const moved = (m.drag?.moved ?? 0) > CLICK_SLOP;
      m.drag = null;
      m.idleUntil = performance.now() + RESUME_MS;
      if (reducedRef.current) m.velocity = 0;
      stageRef.current?.removeAttribute("data-dragging");
      suppressClick.current = moved;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };
  const onClickCapture = (event: React.MouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const nudge = (direction: 1 | -1) => {
    const m = motion.current;
    m.target = null;
    m.idleUntil = performance.now() + RESUME_MS;
    if (reducedRef.current) {
      m.offset += direction * STEP;
      return;
    }
    m.velocity = direction * IMPULSE;
  };

  const median = medianAvgViews(s);

  return (
    <section className="y-dsc-sec y-dsc-xs-sec" aria-labelledby="dsc-explore-title">
      <div className="y-dsc-xs-head">
        <SectionHead
          id="dsc-explore-title"
          eyebrow="Explore"
          title="Tech creators, by what they make"
          aside={
            <>
              <span className="y-dsc-meta max-md:hidden">Drag or swipe · hover to open</span>
              <button type="button" className="y-dsc-arrow y-hit" aria-label="Move the strip back" onClick={() => nudge(-1)}>
                <ArrowLeft size={16} aria-hidden className="y-flip" />
              </button>
              <button type="button" className="y-dsc-arrow y-hit" aria-label="Move the strip on" onClick={() => nudge(1)}>
                <ArrowRight size={16} aria-hidden className="y-flip" />
              </button>
            </>
          }
        />
      </div>
      <div
        ref={stageRef}
        className="y-dsc-xs"
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
      >
        <div className="y-dsc-xs-stage">
          {categories.map((category, index) => (
            <Panel
              key={category.id}
              ref={(node) => {
                panelRefs.current[index] = node;
              }}
              s={s}
              category={category}
              tone={index % 2 === 0 ? "neon" : "paper"}
              open={hover === index}
              median={median}
              onEnter={() => setHovered(index)}
              onLeave={() => {
                if (motion.current.hover === index) setHovered(-1);
              }}
              onFocusIn={() => {
                motion.current.focused = true;
                setHovered(index);
                bringToMiddle(index);
              }}
              onFocusOut={(next) => {
                motion.current.focused = false;
                if (!next) setHovered(-1);
              }}
              onOpenCreator={onOpenCreator}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Panel({
  ref,
  s,
  category,
  tone,
  open,
  median,
  onEnter,
  onLeave,
  onFocusIn,
  onFocusOut,
  onOpenCreator,
}: {
  ref: (node: HTMLDivElement | null) => void;
  s: DemoState;
  category: CategoryStat;
  tone: "neon" | "paper";
  open: boolean;
  median: number | null;
  onEnter: () => void;
  onLeave: () => void;
  onFocusIn: () => void;
  /** `next`: focus moved to another element inside this panel. */
  onFocusOut: (next: boolean) => void;
  onOpenCreator: (id: string) => void;
}) {
  const Icon = categoryIcon[category.id];
  const featured = category.featured;
  const featuredVideo = featured
    ? (category.videos.find((v) => v.creatorId === featured.id) ?? category.videos[0])
    : undefined;
  const latest = category.videos.filter((v) => v !== featuredVideo).slice(0, 3);
  const rows = category.creators.slice(0, 4);

  return (
    <div
      ref={ref}
      className="y-dsc-xp"
      data-tone={tone}
      data-open={open ? "true" : undefined}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onFocusIn}
      onBlur={(event) => onFocusOut(event.currentTarget.contains(event.relatedTarget as Node | null))}
    >
      {featured ? (
        <button
          type="button"
          className="y-dsc-xp-hit"
          aria-label={`${category.name}: ${plural(category.creators.length, "creator")}. Open ${featured.name}, the most viewed`}
          onClick={() => onOpenCreator(featured.id)}
        />
      ) : null}
      <div className="y-dsc-xp-in">
        <div className="y-dsc-xh">
          <span className="y-dsc-xh-ic" aria-hidden>
            <Icon size={15} strokeWidth={2.2} />
          </span>
          <h3>{category.name}</h3>
        </div>
        <p className="y-dsc-xsub">
          {plural(category.creators.length, "creator")} · {plural(category.orders, "order")} in 30 days
        </p>

        {open && featured && featuredVideo ? (
          <FeaturedView s={s} creator={featured} video={featuredVideo} median={median} />
        ) : (
          <div className="y-dsc-xlist" aria-hidden>
            <div className="y-dsc-xlist-h">
              <span>Top creator</span>
              <span>Avg views</span>
            </div>
            {rows.map((creator) => {
              const views = avgViews(s, creator);
              return (
                <div key={creator.id} className="y-dsc-xlist-r">
                  <span className="y-dsc-xlist-n">
                    <FaceAvatar id={creator.id} name="" size={20} />
                    <span className="truncate">{creator.name}</span>
                  </span>
                  <span className="y-dsc-xlist-v y-num">{views === null ? "—" : viewsLabel(views)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="y-dsc-xlatest">
          <span className="y-dsc-xlatest-l">Latest {category.name} Yapps</span>
          <div className="y-dsc-xthumbs">
            {latest.map((video) => (
              <button
                key={video.id}
                type="button"
                className="y-dsc-xthumb"
                aria-label={`${video.title}, by ${creatorName(s, video)}`}
                onClick={() => onOpenCreator(video.creatorId)}
              >
                <VideoThumb video={video} frame="9:16" fill showHook={false} showMeta={false} decorative />
              </button>
            ))}
          </div>
        </div>

        {open && featured ? (
          <Link href={paths.creator(featured.handle)} className="y-dsc-xbtn">
            View profile
            <ArrowRight size={14} aria-hidden className="y-flip" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

const creatorName = (s: DemoState, video: Video) =>
  s.creators.find((c) => c.id === video.creatorId)?.name ?? "a creator";

/** The panel's open view: the top creator's reel (no phone frame) and their numbers. */
function FeaturedView({
  s,
  creator,
  video,
  median,
}: {
  s: DemoState;
  creator: Creator;
  video: Video;
  median: number | null;
}) {
  const views = avgViews(s, creator);
  const vsMedian = views !== null && median ? Math.round((views / median - 1) * 100) : null;
  return (
    <div className="y-dsc-xd">
      <div className="y-dsc-dv" aria-hidden>
        <VideoThumb video={video} frame="9:16" fill showHook={false} showMeta={false} decorative />
        <InLang lang={video.lang} className="y-dsc-dv-cap">
          {video.hook}
        </InLang>
        <span className="y-dsc-dv-prog" />
      </div>
      <div className="y-dsc-xstats">
        <span className="y-dsc-xstats-n">
          <span className="truncate">{creator.name}</span>
          {creator.verified ? <BadgeCheck size={14} aria-label="Verified" className="flex-none" /> : null}
        </span>
        <span className="y-dsc-xstats-m">
          <Star size={11} aria-hidden className="inline -translate-y-px fill-current" /> {creator.rating.toFixed(1)} · {cityName(creator)} ·{" "}
          {formatById[creator.formats[0]]?.name}
        </span>
        <span className="y-dsc-xstats-r">
          <span>Avg views</span>
          <b className="y-num">{views === null ? "—" : viewsLabel(views)}</b>
        </span>
        <span className="y-dsc-xstats-r">
          <span>vs median</span>
          <b className="y-num">
            {vsMedian === null ? "—" : `${vsMedian >= 0 ? "↗" : "↘"} ${Math.abs(vsMedian)}%`}
          </b>
        </span>
        <span className="y-dsc-xstats-r">
          <span>Delivery</span>
          <b className="y-num">{plural(fastestDelivery(creator), "day")}</b>
        </span>
        <span className="y-dsc-xstats-r">
          <span>Rehire</span>
          <b className="y-num">{creator.repeatClientRate}%</b>
        </span>
        <span className="y-dsc-xstats-p">
          From <b className="y-num">{money(startingPrice(creator))}</b>
        </span>
      </div>
    </div>
  );
}
