import { useId } from "react";

import { hashString, pickBy } from "@/lib/hash";

/* Gradient-sphere faces generated deterministically from a person's id. */

const tints = [
  "var(--y-c-sun)",
  "var(--y-c-coral)",
  "var(--y-c-violet)",
  "var(--y-c-sea)",
  "var(--y-c-mint)",
  "var(--y-c-blush)",
];

// [centre, edge] tints: two warm, three cool, three violet/blush so a crowd of faces stays varied.
const pairs: [number, number][] = [
  [0, 1],
  [1, 5],
  [2, 3],
  [3, 4],
  [4, 3],
  [5, 2],
  [2, 5],
  [3, 2],
];

const tufts = [
  "M37 12q6-9 13-1q6-9 13 0",
  "M31 15q9-12 20-3q9-9 18 2",
  "M46 4c-9 9 9 14 6 1",
  "M38 13l4-8l4 8l4-8l4 8",
  "M40 8q10 8 20 0",
  "",
];

const mouths = ["M44 64Q50 69 56 64", "M45 65H55", "M45 64Q50 67 55 64"];

export function FaceAvatar({
  id,
  name,
  size = 40,
  ring = false,
  className = "",
}: {
  id: string;
  name: string;
  /** Pixels, or a CSS length such as "100%" for fluid avatars. */
  size?: number | string;
  /** Adds a ring in the surrounding block colour (for overlapping stacks). */
  ring?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const hash = hashString(id);
  const [a, b] = pickBy(pairs, hash, 67);
  const tuft = pickBy(tufts, hash, 2);
  const mouth = pickBy(mouths, hash, 3);
  const look = (hash % 5) - 2;
  const lift = ((hash >>> 3) % 3) - 1;
  return (
    <span
      role={name ? "img" : undefined}
      aria-label={name || undefined}
      aria-hidden={name ? undefined : true}
      className={`relative inline-grid flex-none place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: ring ? "0 0 0 2.5px var(--b-bg, var(--y-paper))" : undefined,
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden overflow="visible">
        <defs>
          <radialGradient id={`${uid}-f`} cx="34%" cy="34%" r="80%">
            <stop offset="0%" stopColor={tints[a]} />
            <stop offset="100%" stopColor={tints[b]} />
          </radialGradient>
          <clipPath id={`${uid}-c`}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-c)`}>
          <circle cx="50" cy="50" r="50" fill={`url(#${uid}-f)`} />
          {tuft ? (
            <path
              d={tuft}
              transform="translate(0 6)"
              fill="none"
              stroke="#0e0e10"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          <g transform={`translate(${look} ${lift})`}>
            <circle cx="41" cy="52" r="4" fill="#0e0e10" />
            <circle cx="59" cy="52" r="4" fill="#0e0e10" />
            <path d={mouth} fill="none" stroke="#0e0e10" strokeWidth="3.6" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </span>
  );
}

export function AvatarStack({
  people,
  size = 32,
  max = 4,
  className = "",
}: {
  people: { id: string; name: string }[];
  size?: number;
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  return (
    <span className={`inline-flex items-center ${className}`}>
      {shown.map((person, index) => (
        <FaceAvatar
          key={person.id}
          id={person.id}
          name={person.name}
          size={size}
          ring
          className={index === 0 ? "" : "-ms-2.5"}
        />
      ))}
    </span>
  );
}
