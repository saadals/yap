import type { Business } from "@/lib/types";

/** Monogram squircle on the business's brand colour (no remote images). */
export function BusinessLogo({
  business,
  size = 44,
  className = "",
}: {
  business: Pick<Business, "monogram" | "brandColor" | "name">;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`y-display inline-grid flex-none place-items-center font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: business.brandColor,
        fontSize: Math.round(size * (business.monogram.length > 1 ? 0.36 : 0.46)),
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      {business.monogram}
    </span>
  );
}
