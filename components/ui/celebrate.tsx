"use client";

import { Cast, successCast } from "./character";

/** Peak-end moment: the cast pops in once with a short neon burst. Static under reduced motion. */
export function Celebrate({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <svg viewBox="0 0 240 150" className="absolute inset-0 h-full w-full" overflow="visible">
        <g className="y-burst" stroke="var(--y-ink)" strokeWidth="5" strokeLinecap="round">
          <line x1="118" y1="10" x2="118" y2="-6" />
          <line x1="80" y1="22" x2="70" y2="10" />
          <line x1="156" y1="22" x2="166" y2="10" />
          <line x1="52" y1="50" x2="38" y2="44" />
          <line x1="208" y1="62" x2="222" y2="56" />
        </g>
      </svg>
      <Cast
        members={successCast}
        viewBox="-10 -10 240 150"
        animate
        className="relative h-full w-full"
      />
    </div>
  );
}
