/**
 * A brand's letter tile: its own colour (a data field, e.g. `Business.brandColor`) with a white
 * initial. Radius is 30% of the size, as `BusinessLogo` draws it. Sizes in the previews: 22 (a
 * who-line), 32 (rows), 36 (list rows), 40 (cards, briefs), 44 (detail headers), 52 (person
 * cards). Decorative: the brand's name is always written next to it. For a `Business` object
 * use `BusinessLogo`, which also shows a face for someone ordering in their own name.
 */
export function BrandTile({
  name,
  color,
  initial,
  size = 40,
  className = "",
}: {
  name: string;
  color: string;
  /** Defaults to the first letter of `name`. */
  initial?: string;
  size?: number;
  className?: string;
}) {
  const letters = initial ?? name.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className={`y-brandtile ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: color,
        fontSize: Math.round(size * (letters.length > 1 ? 0.34 : 0.4)),
      }}
    >
      {letters}
    </span>
  );
}
