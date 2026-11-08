"use client";

import { useRef } from "react";

/** Movement before a gesture picks an axis, and the travel that opens the details. */
const AXIS_LOCK = 10;
export const SWIPE_THRESHOLD = 60;

type Gesture = { id: number; x: number; y: number; axis: "x" | "y" | null; dx: number; dy: number; rtl: boolean };

/**
 * Swipe left on a reel to open its details (mirrored in RTL: swipe right). Pointer events with
 * `touch-action: pan-y` on the reel, so vertical swipes stay native scroll-snap. A gesture is
 * horizontal when |dx| > 2|dy|; releasing past 60px calls `onSwipe`, otherwise the reel springs
 * back. The reel follows the finger (a transform set directly on the element, no re-renders),
 * except with reduced motion, where it stays put and still navigates. The click that ends a drag
 * is swallowed, so a swipe that starts on a link or button doesn't also press it.
 *
 * Attach `ref` to the moving element; its parent gets `data-swiping` while it's dragged (to show
 * what's revealed underneath).
 */
export function useSwipeLeft<T extends HTMLElement>({
  onSwipe,
  reducedMotion,
  enabled = true,
}: {
  onSwipe: () => void;
  reducedMotion: boolean;
  enabled?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const swallow = useRef(false);

  const place = (offset: number, animate: boolean) => {
    const node = ref.current;
    if (!node) return;
    node.style.transition = animate ? "transform var(--y-dur-3) var(--y-ease)" : "none";
    node.style.transform = offset ? `translate3d(${offset}px, 0, 0)` : "";
    if (offset) node.parentElement?.setAttribute("data-swiping", "");
    else if (!animate) node.parentElement?.removeAttribute("data-swiping");
  };

  const settle = () => {
    const node = ref.current;
    if (!node) return;
    const done = () => {
      node.parentElement?.removeAttribute("data-swiping");
      node.style.transition = "";
    };
    if (reducedMotion) return done();
    node.addEventListener("transitionend", done, { once: true });
    window.setTimeout(done, 400);
  };

  // React events bubble out of portals (a sheet opened from the reel): only the reel's own DOM counts.
  const inside = (event: React.SyntheticEvent<T>) =>
    event.target instanceof Node && event.currentTarget.contains(event.target);

  const onPointerDown = (event: React.PointerEvent<T>) => {
    swallow.current = false;
    if (!enabled || !inside(event) || (event.pointerType === "mouse" && event.button !== 0)) return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      axis: null,
      dx: 0,
      dy: 0,
      rtl: getComputedStyle(event.currentTarget).direction === "rtl",
    };
  };

  const onPointerMove = (event: React.PointerEvent<T>) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
      g.axis = Math.abs(dx) > 2 * Math.abs(dy) ? "x" : "y";
      if (g.axis === "y") {
        gesture.current = null;
        return;
      }
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    // Only towards the start edge (left in LTR); the other way stays still.
    const forward = g.rtl ? Math.max(0, dx) : Math.min(0, dx);
    g.dx = forward;
    g.dy = dy;
    if (!reducedMotion) place(forward, false);
  };

  const finish = (event: React.PointerEvent<T>, cancelled: boolean) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    if (g.axis !== "x") return;
    swallow.current = true;
    const passed = !cancelled && Math.abs(g.dx) > SWIPE_THRESHOLD && Math.abs(g.dx) > 2 * Math.abs(g.dy);
    if (passed) {
      if (!reducedMotion) {
        const width = ref.current?.offsetWidth ?? 0;
        place((g.rtl ? 1 : -1) * width * 0.35, true);
        window.setTimeout(() => place(0, false), 700);
      }
      onSwipe();
      return;
    }
    place(0, !reducedMotion);
    settle();
  };

  const onClickCapture = (event: React.MouseEvent<T>) => {
    if (!swallow.current || !inside(event)) return;
    swallow.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    ref,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: React.PointerEvent<T>) => finish(event, false),
      onPointerCancel: (event: React.PointerEvent<T>) => finish(event, true),
      onClickCapture,
    },
  };
}
