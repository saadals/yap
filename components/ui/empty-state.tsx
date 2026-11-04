import type { ReactNode } from "react";

import {
  type CharacterFace,
  type CharacterShape,
  type CharacterTint,
  Character,
} from "./character";

/** Helpful empty state: one character, a title, one sentence, a next action. */
export function EmptyState({
  title,
  body,
  action,
  shape = "ball",
  tint = "sea",
  face = "focus",
  headingLevel = 2,
  className = "",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  shape?: CharacterShape;
  tint?: CharacterTint;
  face?: CharacterFace;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={`flex flex-col items-center gap-4 px-4 py-10 text-center ${className}`}>
      <Character shape={shape} tint={tint} face={face} look={-1} className="h-24 w-auto" />
      <div className="flex max-w-sm flex-col gap-2">
        <Heading className="y-display y-title">{title}</Heading>
        <p className="y-body y-fg-2">{body}</p>
      </div>
      {action}
    </div>
  );
}
