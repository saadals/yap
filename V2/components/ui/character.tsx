import { useId } from "react";

/* -------------------------------------------------------------------------- */
/* Cast: six original blob shapes with minimal, neutral faces.                 */
/* Every shape is drawn in its own unit box; faces anchor at (fx, fy).         */
/* -------------------------------------------------------------------------- */

export type CharacterShape = "tower" | "dome" | "pill" | "ball" | "bean" | "gem";
export type CharacterFace = "calm" | "smile" | "focus" | "sleepy" | "wow";
export type CharacterTint = "violet" | "sun" | "sea" | "coral" | "mint" | "blush" | "ink" | "paper";

const shapes: Record<CharacterShape, { w: number; h: number; fx: number; fy: number; d: string }> =
  {
    tower: {
      w: 60,
      h: 132,
      fx: 30,
      fy: 36,
      d: "M0 30A30 30 0 0 1 60 30V118Q60 132 46 132H14Q0 132 0 118Z",
    },
    dome: {
      w: 100,
      h: 100,
      fx: 50,
      fy: 50,
      d: "M0 50A50 50 0 0 1 100 50V88Q100 100 88 100H12Q0 100 0 88Z",
    },
    pill: { w: 124, h: 64, fx: 42, fy: 30, d: "M32 0H92A32 32 0 0 1 92 64H32A32 32 0 0 1 32 0Z" },
    ball: { w: 90, h: 90, fx: 45, fy: 44, d: "M45 0A45 45 0 1 1 45 90A45 45 0 1 1 45 0Z" },
    bean: {
      w: 92,
      h: 104,
      fx: 46,
      fy: 46,
      d: "M0 42Q0 0 46 0Q92 0 92 42V86Q92 104 74 104H18Q0 104 0 86Z",
    },
    gem: {
      w: 100,
      h: 92,
      fx: 50,
      fy: 60,
      d: "M42 12Q50 -2 58 12L95 76Q103 90 87 90H13Q-3 90 5 76Z",
    },
  };

const tintVar: Record<CharacterTint, string> = {
  violet: "var(--y-c-violet)",
  sun: "var(--y-c-sun)",
  sea: "var(--y-c-sea)",
  coral: "var(--y-c-coral)",
  mint: "var(--y-c-mint)",
  blush: "var(--y-c-blush)",
  ink: "#0e0e10",
  paper: "#ffffff",
};

/** Second stop for the soft (gradient) rendering. */
const softPartner: Record<CharacterTint, CharacterTint> = {
  violet: "sea",
  sun: "coral",
  sea: "mint",
  coral: "blush",
  mint: "sun",
  blush: "violet",
  ink: "violet",
  paper: "sea",
};

function Face({
  face,
  x,
  y,
  scale = 1,
  look = 0,
  color,
}: {
  face: CharacterFace;
  x: number;
  y: number;
  scale?: number;
  look?: number;
  color: string;
}) {
  const dx = face === "focus" ? 5 * (look || 1) : look * 3;
  const stroke = { stroke: color, strokeWidth: 2.6, strokeLinecap: "round" as const, fill: "none" };
  return (
    <g transform={`translate(${x + dx} ${y}) scale(${scale})`}>
      {face === "sleepy" ? (
        <>
          <path d="M-13 0Q-9 -4 -5 0" {...stroke} />
          <path d="M5 0Q9 -4 13 0" {...stroke} />
        </>
      ) : (
        <>
          <circle cx={-9} cy={0} r={face === "wow" ? 4 : 3.4} fill={color} />
          <circle cx={9} cy={0} r={face === "wow" ? 4 : 3.4} fill={color} />
        </>
      )}
      {face === "smile" || face === "sleepy" ? <path d="M-6 9Q0 15 6 9" {...stroke} /> : null}
      {face === "calm" ? <path d="M-4 11Q0 12.5 4 11" {...stroke} /> : null}
      {face === "focus" ? <path d="M-3 11H3" {...stroke} /> : null}
      {face === "wow" ? <ellipse cx={0} cy={12} rx={3.6} ry={4.4} fill={color} /> : null}
    </g>
  );
}

export type CastMember = {
  shape: CharacterShape;
  tint: CharacterTint;
  face?: CharacterFace;
  x: number;
  y: number;
  scale?: number;
  look?: number;
  soft?: boolean;
};

function Member({
  member,
  gradientId,
  index,
  animate,
}: {
  member: CastMember;
  gradientId: string;
  index: number;
  animate: boolean;
}) {
  const def = shapes[member.shape];
  const scale = member.scale ?? 1;
  const fill = member.soft ? `url(#${gradientId})` : tintVar[member.tint];
  const faceColor = member.tint === "ink" ? "#ffffff" : "var(--y-face)";
  return (
    <g transform={`translate(${member.x} ${member.y}) scale(${scale})`}>
      <g
        className={`y-cast-shape ${animate ? "y-char-pop" : ""}`}
        style={animate ? { animationDelay: `${index * 70}ms` } : undefined}
      >
        {member.soft ? (
          <defs>
            <radialGradient id={gradientId} cx="32%" cy="26%" r="90%">
              <stop offset="0%" stopColor={tintVar[member.tint]} />
              <stop offset="100%" stopColor={tintVar[softPartner[member.tint]]} />
            </radialGradient>
          </defs>
        ) : null}
        <path d={def.d} fill={fill} />
        <Face
          face={member.face ?? "calm"}
          x={def.fx}
          y={def.fy}
          look={member.look}
          color={faceColor}
        />
      </g>
    </g>
  );
}

/** A group of characters in one SVG so overlaps blend (multiply in light mode). */
export function Cast({
  members,
  viewBox,
  className = "",
  animate = false,
  title,
}: {
  members: CastMember[];
  viewBox: string;
  className?: string;
  animate?: boolean;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox={viewBox}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      overflow="visible"
      style={{ isolation: "isolate" }}
    >
      {members.map((member, index) => (
        <Member
          key={index}
          member={member}
          gradientId={`${id}-g${index}`}
          index={index}
          animate={animate}
        />
      ))}
    </svg>
  );
}

/** A single character. */
export function Character({
  shape,
  tint,
  face = "calm",
  look = 0,
  soft = false,
  className = "",
  animate = false,
}: {
  shape: CharacterShape;
  tint: CharacterTint;
  face?: CharacterFace;
  look?: number;
  soft?: boolean;
  className?: string;
  animate?: boolean;
}) {
  const def = shapes[shape];
  return (
    <Cast
      className={className}
      viewBox={`-4 -4 ${def.w + 8} ${def.h + 8}`}
      animate={animate}
      members={[{ shape, tint, face, look, soft, x: 0, y: 0 }]}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Presets                                                                     */
/* -------------------------------------------------------------------------- */

/** Landing hero: the whole cast standing on one baseline (y = 236). */
export const heroCast: CastMember[] = [
  { shape: "pill", tint: "coral", face: "smile", x: 0, y: 172 },
  { shape: "tower", tint: "sun", face: "calm", x: 92, y: 71, scale: 1.25 },
  { shape: "dome", tint: "violet", face: "sleepy", x: 150, y: 106, scale: 1.3 },
  { shape: "bean", tint: "mint", face: "smile", x: 262, y: 116, scale: 1.15 },
  { shape: "ball", tint: "sea", face: "focus", look: -1, x: 352, y: 146 },
  { shape: "gem", tint: "ink", face: "calm", x: 376, y: 112, scale: 0.42 },
];

/** Success: three characters, the middle one surprised. */
export const successCast: CastMember[] = [
  { shape: "ball", tint: "sea", face: "smile", x: 0, y: 62, scale: 0.8 },
  { shape: "bean", tint: "mint", face: "wow", x: 56, y: 22, scale: 1.1 },
  { shape: "tower", tint: "sun", face: "sleepy", x: 146, y: 32, scale: 0.85 },
];

/** Auth / welcome: two characters leaning in. */
export const duoCast: CastMember[] = [
  { shape: "dome", tint: "violet", face: "smile", x: 0, y: 30 },
  { shape: "tower", tint: "sun", face: "focus", look: -1, x: 78, y: 0, scale: 1 },
];

/** Employer side: a pill team. */
export const teamCast: CastMember[] = [
  { shape: "pill", tint: "coral", face: "calm", x: 0, y: 40 },
  { shape: "ball", tint: "sea", face: "smile", x: 96, y: 14 },
  { shape: "gem", tint: "sun", face: "calm", x: 70, y: 44, scale: 0.6 },
];
