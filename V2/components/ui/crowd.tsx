import { useId } from "react";

import { hashString } from "@/lib/hash";

const tints = [
  "var(--y-c-sun)",
  "var(--y-c-coral)",
  "var(--y-c-violet)",
  "var(--y-c-sea)",
  "var(--y-c-mint)",
  "var(--y-c-blush)",
  "var(--y-c-sea)",
  "var(--y-c-coral)",
  "#f4f4f0",
];

type Person = { x: number; y: number; s: number; body: string; legs: string; tall: boolean };

/** Deterministic crowd: four depth rows of simple people with jittered positions. */
function people(): Person[] {
  const rows = [
    { count: 20, y: 120, s: 0.5 },
    { count: 16, y: 180, s: 0.68 },
    { count: 12, y: 255, s: 0.9 },
    { count: 9, y: 345, s: 1.2 },
  ];
  const list: Person[] = [];
  rows.forEach((row, rowIndex) => {
    for (let index = 0; index < row.count; index++) {
      const hash = hashString(`crowd-${rowIndex}-${index}`);
      const step = 1260 / row.count;
      list.push({
        x: step * index + ((hash % 60) - 30) - 20,
        y: row.y + ((hash >>> 5) % 30) - 15,
        s: row.s * (0.88 + ((hash >>> 9) % 24) / 100),
        body: tints[(hash >>> 13) % tints.length],
        legs: (hash >>> 17) % 3 === 0 ? "#0e0e10" : "#1f2a5a",
        tall: (hash >>> 21) % 3 === 0,
      });
    }
  });
  return list;
}

const crowd = people();

/**
 * Stippled, blurred crowd (landing only). Blurred figures are seen through a
 * mask made of two overlapping, rotated dot grids, so it reads like a halftone print.
 */
export function Crowd({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 1200 420"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden
    >
      <defs>
        <pattern
          id={`${id}-p1`}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(28)"
        >
          <circle cx="3" cy="3" r="2" fill="#fff" />
        </pattern>
        <pattern
          id={`${id}-p2`}
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-17)"
        >
          <circle cx="4.5" cy="4.5" r="2.3" fill="#fff" />
        </pattern>
        <pattern
          id={`${id}-p3`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(9)"
        >
          <circle cx="4" cy="4" r="1.2" fill="#fff" />
        </pattern>
        <mask id={`${id}-md`} maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="420">
          <rect width="1200" height="420" fill={`url(#${id}-p1)`} />
          <rect width="1200" height="420" fill={`url(#${id}-p2)`} />
        </mask>
        <mask id={`${id}-ms`} maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="420">
          <rect width="1200" height="420" fill={`url(#${id}-p3)`} />
        </mask>
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="var(--y-c-sun)" />
          <stop offset="0.5" stopColor="var(--y-c-blush)" />
          <stop offset="1" stopColor="var(--y-c-sea)" />
        </linearGradient>
      </defs>
      <g mask={`url(#${id}-ms)`}>
        <rect width="1200" height="420" fill={`url(#${id}-bg)`} />
      </g>
      <g mask={`url(#${id}-md)`}>
        <g filter={`url(#${id}-blur)`}>
          {crowd.map((person, index) => (
            <g key={index} transform={`translate(${person.x} ${person.y}) scale(${person.s})`}>
              <rect x="-15" y="34" width="13" height="70" rx="6.5" fill={person.legs} />
              <rect x="2" y="34" width="13" height="70" rx="6.5" fill={person.legs} />
              <rect
                x="-27"
                y="-34"
                width="54"
                height={person.tall ? 112 : 80}
                rx="24"
                fill={person.body}
              />
              <circle cx="0" cy="-52" r="17" fill="#2b211c" />
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
