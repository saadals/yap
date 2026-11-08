import { FaceAvatar } from "@/components/ui/face-avatar";
import type { Business } from "@/lib/types";

/**
 * Monogram squircle on the business's brand colour (no remote images). Someone ordering in their
 * own name (a personal buyer profile) shows their face instead.
 */
export function BusinessLogo({
  business,
  size = 44,
  className = "",
}: {
  business: Pick<Business, "monogram" | "brandColor" | "name"> & Partial<Pick<Business, "kind" | "faceId" | "id">>;
  size?: number;
  className?: string;
}) {
  if (business.kind === "personal") {
    return (
      <span aria-hidden className={`inline-flex flex-none ${className}`}>
        <FaceAvatar id={business.faceId ?? business.id ?? business.name} name="" size={size} />
      </span>
    );
  }
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
