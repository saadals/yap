import { Check, Minus } from "lucide-react";

/** Chunky fit numeral with a 10-segment bar (creator ↔ request fit). */
export function MatchScore({
  value,
  size = "md",
  showBar = true,
  label,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  showBar?: boolean;
  label?: string;
}) {
  const filled = Math.round(value / 10);
  const numberClass =
    size === "lg" ? "text-[64px] md:text-[80px]" : size === "md" ? "text-[34px]" : "text-[24px]";
  const caption = label ?? "fit";
  return (
    <div className="flex flex-col gap-1.5" aria-label={`${value}% ${caption}`} role="img">
      <div className="flex items-baseline gap-1 leading-none" aria-hidden>
        <span className={`y-display y-num font-semibold tracking-[-0.04em] ${numberClass}`}>
          {value}
        </span>
        <span className={`y-display font-normal ${size === "lg" ? "text-3xl" : "text-base"}`}>
          %
        </span>
        {size !== "lg" ? <span className="y-micro y-fg-2 ms-1">{caption}</span> : null}
      </div>
      {showBar ? (
        <span className="flex gap-[3px]" aria-hidden>
          {Array.from({ length: 10 }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index < filled ? "bg-(--b-fg)" : "bg-(--b-line)"} ${
                size === "sm" ? "min-w-[5px]" : "min-w-2"
              }`}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}

/** Why the score is what it is: reasons that matched and gaps, never a black box. */
export function MatchExplain({
  reasons,
  gaps,
}: {
  reasons: string[];
  gaps: string[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {reasons.map((reason) => (
        <li key={reason} className="flex items-start gap-3">
          <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
            <Check size={14} strokeWidth={3} aria-hidden />
          </span>
          <span className="y-small">{reason}</span>
        </li>
      ))}
      {gaps.map((gap) => (
        <li key={gap} className="flex items-start gap-3">
          <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-(--b-chip) shadow-[inset_0_0_0_1.5px_var(--b-line)]">
            <Minus size={14} strokeWidth={3} aria-hidden />
          </span>
          <span className="y-small">
            <span className="sr-only">Gap: </span>
            {gap}
          </span>
        </li>
      ))}
    </ul>
  );
}
