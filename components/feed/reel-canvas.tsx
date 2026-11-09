"use client";

import { useState } from "react";

import { Character, type CharacterFace, type CharacterShape, type CharacterTint } from "@/components/ui/character";
import { hashString } from "@/lib/hash";
import type { NicheId } from "@/lib/types";

/** The soft glows and film grain behind an order or campaign reel. */
export function ReelBackdrop() {
  return (
    <div aria-hidden className="y-reel-backdrop">
      <span className="y-reel-glow" data-glow="a" />
      <span className="y-reel-glow" data-glow="b" />
    </div>
  );
}

const faces: CharacterFace[] = ["calm", "smile", "focus", "sleepy", "wow"];

/** Five overlapping shapes on one baseline, positioned in a 340 × 150 box. */
const lineup: { shape: CharacterShape; left: number; height: number; ratio: string }[] = [
  { shape: "ball", left: 0, height: 58, ratio: "98 / 98" },
  { shape: "tower", left: 42, height: 136, ratio: "68 / 140" },
  { shape: "bean", left: 96, height: 100, ratio: "100 / 112" },
  { shape: "dome", left: 170, height: 120, ratio: "108 / 108" },
  { shape: "ball", left: 268, height: 72, ratio: "98 / 98" },
];

const tintSets: CharacterTint[][] = [
  ["coral", "sun", "violet", "sea", "blush"],
  ["mint", "sun", "sea", "blush", "violet"],
  ["coral", "sun", "sea", "violet", "blush"],
  ["violet", "sea", "blush", "sun", "mint"],
  ["blush", "violet", "sun", "sea", "coral"],
  ["sun", "coral", "sea", "mint", "violet"],
];

/** One character. Tapping it squishes it and changes its face; it never navigates. */
function ReelCharacter({
  member,
  tint,
  firstFace,
  index,
  reducedMotion,
}: {
  member: (typeof lineup)[number];
  tint: CharacterTint;
  firstFace: number;
  index: number;
  reducedMotion: boolean;
}) {
  const [turns, setTurns] = useState(0);
  return (
    <button
      type="button"
      aria-hidden
      tabIndex={-1}
      className="y-reel-char"
      style={{
        left: `${(member.left / 340) * 100}%`,
        height: `${(member.height / 150) * 100}%`,
        aspectRatio: member.ratio,
        animationDelay: `${index * -0.9}s`,
      }}
      onClick={(event) => {
        setTurns((value) => value + 1);
        if (reducedMotion) return;
        event.currentTarget.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.12, 0.86)" }, { transform: "scale(1)" }],
          { duration: 260, easing: "cubic-bezier(.3,1.6,.5,1)" },
        );
      }}
    >
      <Character shape={member.shape} tint={tint} face={faces[(firstFace + turns) % faces.length]} soft />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Topic props: one small object above the middle character.                   */
/* -------------------------------------------------------------------------- */

const stroke = { fill: "none", stroke: "#1d1d1f", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const props = {
  route: (
    <>
      <path {...stroke} strokeDasharray="1 6" d="M10 50C24 50 22 30 34 30S48 22 48 16" />
      <circle cx="10" cy="50" r="4" fill="#1d1d1f" />
      <path d="M48 4a10 10 0 0 0-10 10c0 7 10 16 10 16s10-9 10-16A10 10 0 0 0 48 4Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2.4" />
      <circle cx="48" cy="14" r="3.4" fill="var(--y-neon)" stroke="#1d1d1f" strokeWidth="2" />
    </>
  ),
  receipt: (
    <>
      <path d="M14 6h36v50l-6-4-6 4-6-4-6 4-6-4-6 4Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2.4" strokeLinejoin="round" />
      <path {...stroke} d="M22 18h20M22 26h12" />
      <circle cx="42" cy="40" r="9" fill="var(--y-neon)" stroke="#1d1d1f" strokeWidth="2.4" />
      <path {...stroke} d="m38 40 3 3 5-6" />
    </>
  ),
  boxes: (
    <>
      <rect x="8" y="32" width="24" height="24" rx="4" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2.4" />
      <rect x="32" y="32" width="24" height="24" rx="4" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2.4" />
      <rect x="20" y="8" width="24" height="24" rx="4" fill="var(--y-neon)" stroke="#1d1d1f" strokeWidth="2.4" />
      <path {...stroke} d="M16 32v8M44 32v8M28 8v8" />
    </>
  ),
  voice: (
    <>
      <rect x="23" y="6" width="18" height="32" rx="9" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2.4" />
      <path {...stroke} d="M15 30a17 17 0 0 0 34 0M32 47v9M24 56h16" />
      <path {...stroke} d="M7 16v10M57 16v10" />
    </>
  ),
  heart: (
    <>
      <path d="M32 54S8 40 8 23a12 12 0 0 1 24-3 12 12 0 0 1 24 3c0 17-24 31-24 31Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2.4" strokeLinejoin="round" />
      <path {...stroke} d="M18 30h8l4-8 5 14 3-6h8" />
    </>
  ),
  book: (
    <>
      <path d="M32 16C26 10 16 10 8 12v38c8-2 18-2 24 4 6-6 16-6 24-4V12c-8-2-18-2-24 4Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2.4" strokeLinejoin="round" />
      <path {...stroke} d="M32 16v38" />
      <path {...stroke} d="M16 24c4-1 7-1 10 1M38 25c3-2 6-2 10-1" />
    </>
  ),
  spark: (
    <>
      <path d="M28 8c2 14 8 20 22 22-14 2-20 8-22 22-2-14-8-20-22-22 14-2 20-8 22-22Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="50" cy="12" r="5" fill="var(--y-neon)" stroke="#1d1d1f" strokeWidth="2.4" />
    </>
  ),
  chat: (
    <>
      <path d="M16 8h32a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10H30l-12 10V44h-2A10 10 0 0 1 6 34V18A10 10 0 0 1 16 8Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="21" cy="26" r="3" fill="#1d1d1f" />
      <circle cx="32" cy="26" r="3" fill="#1d1d1f" />
      <circle cx="43" cy="26" r="3" fill="var(--y-neon)" stroke="#1d1d1f" strokeWidth="1.6" />
    </>
  ),
};

type Topic = keyof typeof props;

const topicByNiche: Partial<Record<NicheId, Topic>> = {
  fintech: "receipt",
  b2b: "receipt",
  ecommerce: "boxes",
  travel: "route",
  health: "heart",
  edtech: "book",
  ai: "spark",
};

/** The post's topic: voice-only work gets the mic, then the product's category, else a chat bubble. */
function topicFor(niche: NicheId | undefined, onCamera: boolean): Topic {
  if (!onCamera) return "voice";
  return (niche && topicByNiche[niche]) || "chat";
}

/** The characters and their prop, between the post's text and its facts. */
export function ReelCast({
  id,
  palette,
  niche,
  onCamera,
  reducedMotion,
}: {
  id: string;
  /** 1–6: the reel's palette. */
  palette: number;
  niche?: NicheId;
  onCamera: boolean;
  reducedMotion: boolean;
}) {
  const tints = tintSets[palette - 1] ?? tintSets[0];
  const seed = hashString(id);
  return (
    <div className="y-reel-cast">
      <div className="y-reel-cast-box">
        {lineup.map((member, index) => (
          <ReelCharacter
            key={index}
            member={member}
            index={index}
            tint={tints[index]}
            firstFace={(seed >>> index) % faces.length}
            reducedMotion={reducedMotion}
          />
        ))}
        <span aria-hidden className="y-reel-prop" style={{ left: "32%", bottom: "64%", width: "15%", aspectRatio: "1" }}>
          <svg viewBox="0 0 64 64">{props[topicFor(niche, onCamera)]}</svg>
        </span>
      </div>
    </div>
  );
}
