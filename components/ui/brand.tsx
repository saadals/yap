import Link from "next/link";

/**
 * Yapp mark: a speech bubble with three typing dots, the last one neon ("someone's about to
 * talk about your app"). Dots take the surrounding block's background so the mark works on
 * paper, night and neon blocks.
 */
export function BrandMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden
      className={`flex-none ${className}`}
    >
      <path
        d="M9 2.5h10a9 9 0 0 1 9 9v.5a9 9 0 0 1-9 9h-7.6l-5.6 4.6a.8.8 0 0 1-1.3-.62V19.6A9 9 0 0 1 0 12v-.5a9 9 0 0 1 9-9Z"
        fill="currentColor"
      />
      <circle cx="8.2" cy="11.8" r="2.3" fill="var(--b-bg, var(--y-paper))" />
      <circle cx="14" cy="11.8" r="2.3" fill="var(--b-bg, var(--y-paper))" />
      <circle cx="19.8" cy="11.8" r="2.3" fill="var(--y-neon)" />
    </svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="y-display font-bold tracking-[-0.045em]"
      style={{ fontSize: size, lineHeight: 1, fontFamily: "var(--y-font-display), sans-serif" }}
    >
      yapp
    </span>
  );
}

export function Brand({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-full pe-1"
      aria-label="Yapp home"
    >
      <BrandMark size={size === "lg" ? 34 : 28} />
      <Wordmark size={size === "lg" ? 30 : 24} />
    </Link>
  );
}
