import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type ActionCommon = {
  /** `neon`: the one green action (Pick now). `dark`: the dark full-width action (Pitch now). */
  tone?: "neon" | "dark";
  /** md 52px (cards, list), lg 56px (the job page's CTA card, the phone bar). */
  size?: "md" | "lg";
  /** Count pill before the arrow: "6 of 10 left", "2 min". */
  count?: ReactNode;
  /** Red count pill: the last slot. */
  urgent?: boolean;
  /** The round arrow at the end (off for a disabled "All slots taken"). */
  arrow?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
};

/**
 * Full-width pill with a label, an optional count pill and a round arrow: the campaign card's
 * "Pick now" (green) and the job page's dark "Pitch now". A list of job cards repeats one green
 * `ActionPill`; everything else on that page stays dark or ghost. Buttons inside a clickable card
 * should stop propagation in `onClick` so they don't also open the card.
 */
export function ActionPill(
  props: ActionCommon &
    (
      | { href: string; onClick?: () => void }
      | { href?: undefined; onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void }
    ),
) {
  const {
    tone = "neon",
    size = "md",
    count,
    urgent = false,
    arrow = true,
    disabled = false,
    className = "",
    children,
  } = props;
  const content = (
    <>
      <span className="y-action-label">{children}</span>
      {count !== undefined && count !== null ? (
        <span className="y-action-count" data-urgent={urgent ? "true" : undefined}>
          {count}
        </span>
      ) : null}
      {arrow ? (
        <span className="y-action-arrow" aria-hidden>
          <ArrowRight size={size === "lg" ? 20 : 18} strokeWidth={2.2} className="y-flip" />
        </span>
      ) : null}
    </>
  );
  const shared = {
    className: `y-action ${className}`,
    "data-look": tone,
    "data-size": size,
    "data-arrow": arrow ? undefined : "false",
    "aria-label": props["aria-label"],
  };
  if (props.href !== undefined && !disabled) {
    return (
      <Link {...shared} href={props.href} onClick={props.onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      {...shared}
      disabled={disabled}
      onClick={props.href === undefined ? props.onClick : undefined}
    >
      {content}
    </button>
  );
}

/**
 * The campaign action, worded the same everywhere (round 3 answers, item 16): "Pick now" with the
 * remaining count beside it, red on the last slot, and "All slots taken" (disabled) at zero.
 * `count="of"` reads "6 of 10 left" (cards), `count="left"` reads "6 left" (the job page).
 */
export function PickNowButton({
  left,
  total,
  count = "of",
  size = "md",
  disabled = false,
  onClick,
  href,
  className = "",
}: {
  left: number;
  total: number;
  count?: "of" | "left";
  size?: "md" | "lg";
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  href?: string;
  className?: string;
}) {
  if (left <= 0) {
    return (
      <ActionPill size={size} arrow={false} disabled className={className}>
        All slots taken
      </ActionPill>
    );
  }
  const common = {
    size,
    disabled,
    className,
    urgent: left === 1,
    count: count === "of" ? `${left} of ${total} left` : `${left} left`,
    "aria-label": `Pick now, ${left} of ${total} remaining`,
  } as const;
  return href ? (
    <ActionPill {...common} href={href}>
      Pick now
    </ActionPill>
  ) : (
    <ActionPill {...common} onClick={onClick}>
      Pick now
    </ActionPill>
  );
}

/**
 * Round arrow inside a larger link or button ("Review now →", "Open Work →"). Decorative: the link
 * around it carries the label. `dark` is black with a green arrow, `neon` green with a black arrow,
 * `light` white with a hairline. It nudges forward when its link is hovered. For a standalone
 * round button use `RoundIconButton`.
 */
export function ArrowCircle({
  tone = "dark",
  size = 40,
  direction = "forward",
  className = "",
}: {
  tone?: "dark" | "neon" | "light";
  size?: number;
  direction?: "forward" | "back";
  className?: string;
}) {
  const Icon = direction === "forward" ? ArrowRight : ArrowLeft;
  return (
    <span
      aria-hidden
      className={`y-arrowc ${className}`}
      data-look={tone}
      style={{ "--s": `${size}px` } as React.CSSProperties}
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={2.2} className="y-flip" />
    </span>
  );
}
