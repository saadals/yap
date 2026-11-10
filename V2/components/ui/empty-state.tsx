import type { ReactNode } from "react";

import type { CharacterFace, CharacterShape, CharacterTint } from "./character";

/**
 * Helpful empty state: a title, one sentence, a next action, centred. No illustration (round 3
 * answers, item 15: characters are out of empty states until abstract artwork arrives); `icon`
 * adds an optional line icon in a quiet circle when it helps say what's missing.
 */
export function EmptyState({
  title,
  body,
  action,
  icon,
  headingLevel = 2,
  className = "",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  /** A lucide icon, about 22px. */
  icon?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
  /** @deprecated Characters are no longer drawn in empty states; ignored. */
  shape?: CharacterShape;
  /** @deprecated Ignored. */
  tint?: CharacterTint;
  /** @deprecated Ignored. */
  face?: CharacterFace;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={`y-empty ${className}`}>
      {icon ? (
        <span className="y-empty-ic" aria-hidden>
          {icon}
        </span>
      ) : null}
      <Heading className="y-display y-empty-t">{title}</Heading>
      <p className="y-body y-empty-b">{body}</p>
      {action ? <div className="y-empty-a">{action}</div> : null}
    </div>
  );
}
