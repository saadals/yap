/* eslint-disable @next/next/no-img-element -- the master SVGs are shown as-is; next/image adds nothing here */
import Link from "next/link";

import { asset } from "@/lib/site";

/**
 * Yapping logo (round 3 brand package).
 *
 * DO NOT REDRAW. This component only displays the master SVG files in /public/brand. Never rebuild
 * the mark from SVG paths or circles, never retype the wordmark as text, never recolour or edit the SVG
 * files, never add shadows or glows. If a size or colour version is missing, ask for a new master
 * file instead of drawing one.
 *
 * Files:
 *   yapping-lockup.svg / -on-dark.svg       mark + wordmark (min 96px wide)
 *   yapping-mark.svg / -on-dark.svg         mark alone, 20px tall and up
 *   yapping-mark-small.svg / -on-dark.svg   mark without dots, 12–19px tall
 *   yapping-wordmark.svg / -on-dark.svg     wordmark alone, only next to the mark
 *
 * Tone: "light" = the logo sits on a light surface, "dark" = on a dark one (footer, dark stages,
 * video). The default, "auto", renders both files and lets CSS show one (`.y-logo` in
 * app/globals.css): it follows `html.dark`, and inside the feed's floating top it follows the reel
 * in view (`data-reel-tone`). Both are set before paint or by CSS alone, so there is no flash and no
 * hydration mismatch. The interface still says "Yapp"; only the logo's own name is "Yapping".
 */

type Tone = "light" | "dark";
export type LogoTone = Tone | "auto";

const SRC = {
  lockup: { light: "/brand/yapping-lockup.svg", dark: "/brand/yapping-lockup-on-dark.svg" },
  mark: { light: "/brand/yapping-mark.svg", dark: "/brand/yapping-mark-on-dark.svg" },
  markSmall: { light: "/brand/yapping-mark-small.svg", dark: "/brand/yapping-mark-small-on-dark.svg" },
  wordmark: { light: "/brand/yapping-wordmark.svg", dark: "/brand/yapping-wordmark-on-dark.svg" },
} as const;

// Width ÷ height of each master file's viewBox. Keep these in sync with the files; never stretch.
const RATIO = { lockup: 5990 / 1440, mark: 74 / 85, wordmark: 4470 / 1170 } as const;

type Files = { light: string; dark: string };

/** One file when the tone is pinned; both (CSS picks) when it's "auto". */
function LogoImage({
  files,
  ratio,
  size,
  tone,
  alt,
  className = "",
}: {
  files: Files;
  ratio: number;
  size: number;
  tone: LogoTone;
  alt: string;
  className?: string;
}) {
  const image = (which: Tone, extra = "") => (
    <img
      key={which}
      src={asset(files[which])}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={Math.round(size * ratio)}
      height={size}
      draggable={false}
      className={["flex-none select-none", extra, className].filter(Boolean).join(" ")}
    />
  );
  if (tone !== "auto") {
    return (
      <span className="y-logo" data-logo={tone}>
        {image(tone)}
      </span>
    );
  }
  return (
    <span className="y-logo" data-logo="auto">
      {image("light", "y-logo-light")}
      {image("dark", "y-logo-dark")}
    </span>
  );
}

/** The mark alone (decorative). `size` = height in px. Below 20px it uses the small mark (no dots). */
export function BrandMark({
  size = 28,
  tone = "auto",
  className = "",
}: {
  size?: number;
  tone?: LogoTone;
  className?: string;
}) {
  return (
    <LogoImage
      files={size < 20 ? SRC.markSmall : SRC.mark}
      ratio={RATIO.mark}
      size={size}
      tone={tone}
      alt=""
      className={className}
    />
  );
}

/** The wordmark alone (outlined artwork, not text). Only where the mark is already nearby. */
export function Wordmark({ size = 22, tone = "auto" }: { size?: number; tone?: LogoTone }) {
  return <LogoImage files={SRC.wordmark} ratio={RATIO.wordmark} size={size} tone={tone} alt="Yapping" />;
}

/**
 * The full lockup as one file, so the spacing between mark and word never changes. `size` = height
 * in px (the lockup's minimum is 96px wide, about 23px tall). `className` lands on the image, e.g.
 * responsive heights with `w-auto`; the file's ratio is kept either way.
 */
export function Lockup({
  size = 30,
  tone = "auto",
  className = "",
}: {
  size?: number;
  tone?: LogoTone;
  className?: string;
}) {
  return (
    <LogoImage
      files={SRC.lockup}
      ratio={RATIO.lockup}
      size={Math.max(size, 24)}
      tone={tone}
      alt="Yapping"
      className={className}
    />
  );
}

/** Header logo: the lockup as a link home. */
export function Brand({
  href = "/",
  size = "md",
  tone = "auto",
}: {
  href?: string;
  size?: "md" | "lg";
  tone?: LogoTone;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-full pe-1"
      aria-label="Yapping home"
    >
      <Lockup size={size === "lg" ? 38 : 30} tone={tone} />
    </Link>
  );
}
