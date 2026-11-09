"use client";

import {
  memo,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { useMediaQuery, useReducedMotion } from "@/lib/hooks";
import { useHydrated } from "@/lib/store";

/**
 * The creator bubbles: a pool of DOM discs flown through with a small perspective calculation.
 * No WebGL: every bubble faces the camera, so a transform and an opacity are all each one needs,
 * and FaceAvatar, hover and dark mode come for free. The animation writes to the DOM directly;
 * React only re-renders a bubble when it is recycled and takes the next creator.
 */

const FIELD_DESKTOP = { x: 12, y: 7, near: 3, far: 40 };
const FIELD_MOBILE = { x: 5, y: 9, near: 3, far: 40 };
type Field = typeof FIELD_DESKTOP;

const COUNT_DESKTOP = 72;
const COUNT_MOBILE = 36;
/** Every fifth bubble is decorative (no face, no interaction). */
const DECOR_EVERY = 5;
/** Pixel size each bubble is drawn at before it's scaled. */
const BASE_DESKTOP = 240;
const BASE_MOBILE = 200;

/** How close the first frame's bubbles start, so no face fills the screen before anything moves. */
const FIRST_FRAME_NEAR = 6;

/** Portrait screens are narrow: slightly smaller bubbles so one face can't fill the width. */
const RADIUS_SCALE_MOBILE = 0.8;

const FOV = 50;
const FOV_KICK = 4;
const DAMP = 8;
const STEP = 4;
const BURST = 10;
/** Mobile fly-through, units per second. */
const FLY_SPEED = 0.9;
const FOG_NEAR = 8;
const FOG_FAR = 40;
/** Respawn distance: bubbles past this are behind the far end when flying backwards. */
const FAR_LIMIT = 46;
/** Below this opacity a face is too faint to be a target. */
const MIN_HIT_OPACITY = 0.4;
const MIN_GAP = 2.2;
/** The same face stays at least this far apart in depth (when the catalog allows it). */
const FACE_SPACING = 15;

const INTENT_MS = 120;
const LEAVE_MS = 120;
const SUPPRESS_MS = 500;
const REDUCED_FADE_MS = 120;
const TAP_MS = 250;
const TAP_PX = 10;

const DECOR_TINTS = ["var(--y-c-coral)", "var(--y-c-sea)", "var(--y-c-violet)", "var(--y-c-sun)"];

type Decor = "gloss" | "soap";

type Seed = {
  x: number;
  y: number;
  z: number;
  r: number;
  seeds: [number, number, number];
  speed: number;
  amp: number;
  hue: number;
  decor: Decor | null;
  tint: string | null;
  face: string | null;
};

type Queue = { list: string[]; cursor: number };

/** Seeded so the field is a pure function of the catalog (and safe to build during render). */
function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function shuffle(list: string[], rng: Rng): string[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A spot biased toward the centre, as far from its neighbours as a few tries allow. */
function pickXY(rng: Rng, field: Field, others: readonly Seed[], z: number): [number, number] {
  let best: [number, number] = [0, 0];
  let bestGap = -1;
  for (let tries = 0; tries < 8; tries += 1) {
    const angle = rng() * Math.PI * 2;
    const reach = Math.pow(rng(), 0.75);
    const x = Math.cos(angle) * reach * field.x;
    const y = Math.sin(angle) * reach * field.y;
    let gap = Number.POSITIVE_INFINITY;
    for (const other of others) {
      const dz = other.z - z;
      if (Math.abs(dz) > 6) continue;
      gap = Math.min(gap, Math.hypot(other.x - x, other.y - y, dz));
    }
    if (gap > bestGap) {
      best = [x, y];
      bestGap = gap;
    }
    if (gap >= MIN_GAP) break;
  }
  return best;
}

/** The next creator in the shuffled loop, skipping faces already close by in depth. */
function takeFace(
  queue: Queue,
  ids: string[],
  others: readonly Seed[],
  z: number,
  rng: Rng,
): string | null {
  let best: string | null = null;
  let bestGap = -1;
  for (let tries = 0; tries < queue.list.length; tries += 1) {
    const id = queue.list[queue.cursor];
    queue.cursor += 1;
    if (queue.cursor >= queue.list.length) {
      queue.list = shuffle(ids, rng);
      queue.cursor = 0;
    }
    let gap = Number.POSITIVE_INFINITY;
    for (const other of others) if (other.face === id) gap = Math.min(gap, Math.abs(other.z - z));
    if (gap >= FACE_SPACING) return id;
    if (gap > bestGap) {
      best = id;
      bestGap = gap;
    }
  }
  return best;
}

function createField(ids: string[], desktop: boolean) {
  const rng = mulberry32(0x59415050);
  const field = desktop ? FIELD_DESKTOP : FIELD_MOBILE;
  const count = desktop ? COUNT_DESKTOP : COUNT_MOBILE;
  const queue: Queue = { list: shuffle(ids, rng), cursor: 0 };
  const bubbles: Seed[] = [];
  for (let i = 0; i < count; i += 1) {
    const decor: Decor | null = i % DECOR_EVERY === DECOR_EVERY - 1 ? (i % 3 === 0 ? "gloss" : "soap") : null;
    const z = -(FIRST_FRAME_NEAR + rng() * (field.far - FIRST_FRAME_NEAR));
    const [x, y] = pickXY(rng, field, bubbles, z);
    bubbles.push({
      x,
      y,
      z,
      r: (decor ? 0.35 + rng() * 0.45 : 0.45 + rng() * 0.65) * (desktop ? 1 : RADIUS_SCALE_MOBILE),
      seeds: [rng() * 100, rng() * 100, rng() * 100],
      speed: 0.6 + rng() * 0.6,
      amp: 0.4 + rng() * 0.4,
      hue: Math.round(rng() * 360),
      decor,
      tint: decor ? DECOR_TINTS[i % DECOR_TINTS.length] : null,
      face: decor ? null : takeFace(queue, ids, bubbles, z, rng),
    });
  }
  return { bubbles, queue };
}

export type BubbleFieldHandle = {
  /** A quick rush forward: the transition into sign-in. */
  burst: () => void;
};

type BubbleFieldProps = {
  creatorIds: string[];
  /** A preview is open: drift and fly-through pause. */
  frozen: boolean;
  /** False while sign-in is up or opening: no previews, no wheel zoom. */
  interactive: boolean;
  /** Open a creator's preview, or close it (null). */
  onPreview: (creatorId: string | null) => void;
  ref?: Ref<BubbleFieldHandle>;
};

export function BubbleField(props: BubbleFieldProps) {
  const hydrated = useHydrated();
  const desktop = useMediaQuery("(min-width: 1024px)");
  if (!hydrated || props.creatorIds.length === 0) return null;
  return <LiveField key={desktop ? "desktop" : "mobile"} {...props} desktop={desktop} />;
}

type Sim = {
  burst: () => void;
  pointer: (index: number | null) => void;
  tap: (index: number | null) => void;
};

function faceIndex(target: EventTarget): number | null {
  const node = target instanceof Element ? target.closest<HTMLElement>("[data-face]") : null;
  return node ? Number(node.dataset.index) : null;
}

function LiveField({
  creatorIds,
  frozen,
  interactive,
  onPreview,
  ref,
  desktop,
}: BubbleFieldProps & { desktop: boolean }) {
  const [initial] = useState(() => createField(creatorIds, desktop));
  const [faces, setFaces] = useState(() => initial.bubbles.map((b) => b.face));
  const reduced = useReducedMotion();
  const hoverMode = useMediaQuery("(hover: hover) and (pointer: fine)");
  const base = desktop ? BASE_DESKTOP : BASE_MOBILE;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<Sim | null>(null);
  const downRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const latest = useRef({ creatorIds, frozen, interactive, onPreview, reduced, hoverMode });
  useLayoutEffect(() => {
    latest.current = { creatorIds, frozen, interactive, onPreview, reduced, hoverMode };
  });

  useImperativeHandle(ref, () => ({ burst: () => simRef.current?.burst() }), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.children) as HTMLElement[];
    const field = desktop ? FIELD_DESKTOP : FIELD_MOBILE;
    const half = base / 2;
    const rng = mulberry32(0x46414345);
    // The state object is the starting point only: the animation works on its own copy.
    const bubbles = initial.bubbles.map((seed) => ({
      ...seed,
      alpha: 1,
      hover: 1,
      lastOpacity: -1,
      lastLayer: Number.NaN,
      lastHit: null as boolean | null,
    }));
    const queue: Queue = { list: initial.queue.list.slice(), cursor: initial.queue.cursor };
    const pending = new Map<number, string | null>();

    let width = root.clientWidth;
    let height = root.clientHeight;
    let frame = 0;
    let last = performance.now();
    let clock = 0;
    let camZ = 0;
    let targetZ = 0;
    let fov = FOV;
    let wheelRest = 0;
    let suppressUntil = 0;
    let candidate: number | null = null;
    let intentTimer: number | undefined;
    let leaveTimer: number | undefined;
    let fadeTimer: number | undefined;

    const respawn = (index: number, z: number) => {
      const bubble = bubbles[index];
      const [x, y] = pickXY(rng, field, bubbles, z);
      bubble.x = x;
      bubble.y = y;
      bubble.z = z;
      bubble.alpha = 0;
      if (bubble.decor) return;
      bubble.face = null;
      bubble.face = takeFace(queue, latest.current.creatorIds, bubbles, z, rng);
      pending.set(index, bubble.face);
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const { frozen: paused, reduced: still, hoverMode: hovers } = latest.current;

      if (!paused && !(still && desktop)) clock += dt;
      if (!paused && !hovers && !still) targetZ -= FLY_SPEED * dt;

      const previous = camZ;
      if (!still) camZ = targetZ + (camZ - targetZ) * Math.exp(-DAMP * dt);
      const velocity = Math.abs(camZ - previous) / Math.max(dt, 1e-4);
      const fovTarget = still ? FOV : FOV + Math.min(FOV_KICK, velocity * 0.35);
      fov += (fovTarget - fov) * (1 - Math.exp(-10 * dt));
      const focal = height / 2 / Math.tan((fov * Math.PI) / 360);

      bubbles.forEach((bubble, index) => {
        if (camZ - bubble.z < 1) respawn(index, camZ - field.far - rng() * 4);
        else if (camZ - bubble.z > FAR_LIMIT) respawn(index, camZ - (3 + rng() * 3));

        bubble.alpha = Math.min(1, bubble.alpha + dt / 0.15);
        const hoverTarget = index === candidate ? 1.08 : 1;
        bubble.hover += (hoverTarget - bubble.hover) * (1 - Math.exp(-14 * dt));

        const [s0, s1, s2] = bubble.seeds;
        const t = clock * bubble.speed;
        const ox = Math.sin(t * 0.31 + s0) * bubble.amp + Math.sin(t * 0.13 + s1) * bubble.amp * 0.4;
        const oy = Math.cos(t * 0.27 + s1) * bubble.amp + Math.sin(t * 0.11 + s2) * bubble.amp * 0.4;
        const oz = Math.sin(t * 0.19 + s2) * bubble.amp * 0.6;

        const distance = Math.max(0.2, camZ - (bubble.z + oz));
        const k = focal / distance;
        const sx = width / 2 + (bubble.x + ox) * k;
        const sy = height / 2 - (bubble.y + oy) * k;
        const scale = (2 * bubble.r * k * bubble.hover) / base;
        const fog = Math.min(1, Math.max(0, 1 - (distance - FOG_NEAR) / (FOG_FAR - FOG_NEAR)));
        const near = Math.min(1, Math.max(0, (distance - 1) / 2));
        const opacity = fog * near * bubble.alpha;

        const el = els[index];
        el.style.transform = `translate3d(${(sx - half).toFixed(1)}px,${(sy - half).toFixed(1)}px,0) scale(${scale.toFixed(4)})`;
        if (Math.abs(opacity - bubble.lastOpacity) > 0.006) {
          el.style.opacity = opacity.toFixed(3);
          bubble.lastOpacity = opacity;
        }
        const layer = 1000 - Math.round(distance * 4);
        if (layer !== bubble.lastLayer) {
          el.style.zIndex = String(layer);
          bubble.lastLayer = layer;
        }
        if (!bubble.decor) {
          const hit = opacity > MIN_HIT_OPACITY;
          if (hit !== bubble.lastHit) {
            el.style.pointerEvents = hit ? "auto" : "none";
            bubble.lastHit = hit;
          }
        }
      });

      if (pending.size > 0) {
        const batch = [...pending];
        pending.clear();
        setFaces((current) => {
          const next = current.slice();
          for (const [index, id] of batch) next[index] = id;
          return next;
        });
      }
    };

    const step = (direction: number, size = STEP) => {
      const { frozen: open, onPreview: preview, reduced: still } = latest.current;
      if (open) preview(null);
      suppressUntil = performance.now() + SUPPRESS_MS;
      targetZ -= direction * size;
      if (still) {
        window.clearTimeout(fadeTimer);
        root.style.opacity = "0";
        fadeTimer = window.setTimeout(() => {
          camZ = targetZ;
          root.style.opacity = "";
        }, REDUCED_FADE_MS);
      }
    };

    const tryOpen = () => {
      if (candidate === null || !latest.current.interactive) return;
      const remaining = suppressUntil - performance.now();
      if (remaining > 0) {
        intentTimer = window.setTimeout(tryOpen, remaining);
        return;
      }
      const id = bubbles[candidate].face;
      if (id) latest.current.onPreview(id);
    };

    const sim: Sim = {
      burst: () => step(1, BURST),
      pointer: (index) => {
        if (!latest.current.hoverMode || index === candidate) return;
        candidate = index;
        window.clearTimeout(intentTimer);
        if (index === null) {
          window.clearTimeout(leaveTimer);
          leaveTimer = window.setTimeout(() => {
            if (candidate === null && latest.current.frozen) latest.current.onPreview(null);
          }, LEAVE_MS);
          return;
        }
        window.clearTimeout(leaveTimer);
        intentTimer = window.setTimeout(tryOpen, INTENT_MS);
      },
      tap: (index) => {
        const { interactive: can, frozen: open, onPreview: preview } = latest.current;
        if (!can) return;
        const id = index === null ? null : bubbles[index].face;
        if (id) preview(id);
        else if (open) preview(null);
      },
    };
    simRef.current = sim;

    const onResize = () => {
      width = root.clientWidth;
      height = root.clientHeight;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!latest.current.interactive) return;
      const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
      if (Math.abs(dy) >= 50) {
        wheelRest = 0;
        step(Math.sign(dy));
        return;
      }
      wheelRest += dy;
      while (Math.abs(wheelRest) >= 100) {
        const direction = Math.sign(wheelRest);
        wheelRest -= direction * 100;
        step(direction);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || !latest.current.interactive) return;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        step(-1);
      }
    };

    const onBlur = () => {
      candidate = null;
      window.clearTimeout(intentTimer);
      window.clearTimeout(leaveTimer);
      if (latest.current.frozen) latest.current.onPreview(null);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame((now) => {
      tick(now);
      root.setAttribute("data-ready", "");
    });
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    root.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(intentTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(fadeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      root.removeEventListener("wheel", onWheel);
      root.removeAttribute("data-ready");
      simRef.current = null;
    };
  }, [initial, desktop, base]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="y-bubbles"
      style={{ "--bubble": `${base}px` } as CSSProperties}
      onPointerOver={(event) => {
        if (event.pointerType === "mouse") simRef.current?.pointer(faceIndex(event.target));
      }}
      onPointerLeave={() => simRef.current?.pointer(null)}
      onPointerDown={(event) => {
        downRef.current = { x: event.clientX, y: event.clientY, at: event.timeStamp };
      }}
      onPointerUp={(event) => {
        const down = downRef.current;
        downRef.current = null;
        if (!down || latest.current.hoverMode) return;
        const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
        if (event.timeStamp - down.at < TAP_MS && moved < TAP_PX) {
          simRef.current?.tap(faceIndex(event.target));
        }
      }}
      onPointerCancel={() => {
        downRef.current = null;
      }}
    >
      {initial.bubbles.map((bubble, index) => (
        <Bubble
          key={index}
          index={index}
          face={faces[index]}
          decor={bubble.decor}
          tint={bubble.tint}
          hue={bubble.hue}
        />
      ))}
    </div>
  );
}

const Bubble = memo(function Bubble({
  index,
  face,
  decor,
  tint,
  hue,
}: {
  index: number;
  face: string | null;
  decor: Decor | null;
  tint: string | null;
  hue: number;
}) {
  return (
    <div
      className="y-bubble"
      data-index={index}
      data-face={decor ? undefined : ""}
      data-decor={decor ?? undefined}
      style={{ "--d-tint": tint ?? undefined, "--b-hue": `${hue}deg` } as CSSProperties}
    >
      {face ? <FaceAvatar id={face} name="" size="100%" /> : null}
      <span className="y-bubble-glass" />
    </div>
  );
});
