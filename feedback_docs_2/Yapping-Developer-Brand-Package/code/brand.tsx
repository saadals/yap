/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

/**
 * Yapping logo.
 *
 * DO NOT REDRAW. This component only displays the master SVG files in /public/brand.
 * Never rebuild the mark with <path>/<circle>, never retype the wordmark as text,
 * never recolour or edit the SVG files. If a size or colour version is missing,
 * ask for a new master file instead of drawing one.
 *
 * Files (copy the whole folder to /public/brand):
 *   yapping-lockup.svg / -on-dark.svg       mark + wordmark
 *   yapping-mark.svg / -on-dark.svg         mark alone (20px tall and up)
 *   yapping-mark-small.svg / -on-dark.svg   mark without dots (12–19px)
 *   yapping-wordmark.svg / -on-dark.svg     wordmark alone
 */

type Tone = "light" | "dark"; // "dark" = the logo sits on a dark background (footer, dark stages, video)

const SRC = {
  lockup: { light: "/brand/yapping-lockup.svg", dark: "/brand/yapping-lockup-on-dark.svg" },
  mark: { light: "/brand/yapping-mark.svg", dark: "/brand/yapping-mark-on-dark.svg" },
  markSmall: { light: "/brand/yapping-mark-small.svg", dark: "/brand/yapping-mark-small-on-dark.svg" },
  wordmark: { light: "/brand/yapping-wordmark.svg", dark: "/brand/yapping-wordmark-on-dark.svg" },
} as const;

// Width ÷ height of each master file's viewBox. Keep these in sync with the files; never stretch.
const RATIO = { lockup: 5990 / 1440, mark: 74 / 85, wordmark: 4470 / 1170 } as const;

/** The mark alone. `size` = height in px. Below 20px it switches to the small mark (no dots). */
export function BrandMark({
  size = 28,
  tone = "light",
  className = "",
}: {
  size?: number;
  tone?: Tone;
  className?: string;
}) {
  const src = size < 20 ? SRC.markSmall[tone] : SRC.mark[tone];
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      width={Math.round(size * RATIO.mark)}
      height={size}
      draggable={false}
      className={`flex-none select-none ${className}`}
    />
  );
}

/** The wordmark alone (outlined artwork, not text). `size` = height in px. */
export function Wordmark({ size = 22, tone = "light" }: { size?: number; tone?: Tone }) {
  return (
    <img
      src={SRC.wordmark[tone]}
      alt="Yapping"
      width={Math.round(size * RATIO.wordmark)}
      height={size}
      draggable={false}
      className="flex-none select-none"
    />
  );
}

/** Header logo: the full lockup as one file, so spacing between mark and word never changes. */
export function Brand({
  href = "/",
  size = "md",
  tone = "light",
}: {
  href?: string;
  size?: "md" | "lg";
  tone?: Tone;
}) {
  const h = size === "lg" ? 38 : 30;
  return (
    <Link href={href} className="inline-flex min-h-11 items-center rounded-full pe-1" aria-label="Yapping home">
      <img
        src={SRC.lockup[tone]}
        alt="Yapping"
        width={Math.round(h * RATIO.lockup)}
        height={h}
        draggable={false}
        className="flex-none select-none"
      />
    </Link>
  );
}
