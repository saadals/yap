import Link from "next/link";

/**
 * A `.y-row` link like `Row` (components/ui/list.tsx), with two extras the brand pages need:
 * - `phoneEnd`: what the end slot shows on phones, placed under the text instead (so a title keeps
 *   its width at 390px); the end slot itself is hidden there.
 * - `wrap`: let the title wrap to two lines instead of truncating.
 */
export function RowLink({
  href,
  lead,
  title,
  meta,
  below,
  end,
  phoneEnd,
  wrap = false,
  chevron = true,
  ariaLabel,
  className = "",
  onClick,
}: {
  href: string;
  lead?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  below?: React.ReactNode;
  end?: React.ReactNode;
  phoneEnd?: React.ReactNode;
  wrap?: boolean;
  /** "phone": only on phones (where the end slot is hidden). */
  chevron?: boolean | "phone";
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link role="listitem" href={href} aria-label={ariaLabel} onClick={onClick} className={`y-row ${className}`}>
      {lead ? <span className="flex-none self-start pt-0.5 sm:self-center sm:pt-0">{lead}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`font-medium ${wrap ? "y-clamp-2" : "truncate"}`}>{title}</span>
        {meta ? <span className={`y-small y-fg-2 ${wrap ? "y-clamp-2" : "truncate"}`}>{meta}</span> : null}
        {below ? <span className="mt-1.5 block">{below}</span> : null}
        {phoneEnd ? <span className="mt-2 flex sm:hidden">{phoneEnd}</span> : null}
      </span>
      {end ? <span className={`flex flex-none items-center gap-2 ${phoneEnd ? "max-sm:hidden" : ""}`}>{end}</span> : null}
      {chevron ? (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width="18"
          height="18"
          className={`y-fg-3 y-flip flex-none ${chevron === "phone" ? "sm:hidden" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      ) : null}
    </Link>
  );
}
