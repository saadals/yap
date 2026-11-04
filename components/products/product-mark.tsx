import { BookOpen, Film, Image as ImageIcon, KeyRound, type LucideIcon, Smartphone } from "lucide-react";

import type { Product, ProductAsset } from "@/lib/types";

/** Colour mark for a product: its initial on the brand colour (white text stays readable). */
export function ProductMark({
  product,
  size = 44,
  className = "",
}: {
  product: Pick<Product, "name" | "brandColor">;
  size?: number;
  className?: string;
}) {
  const initial = product.name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={`y-display inline-grid flex-none place-items-center font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        background: product.brandColor,
        fontSize: Math.round(size * 0.44),
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );
}

export const assetKinds: Record<ProductAsset["kind"], { label: string; icon: LucideIcon }> = {
  logo: { label: "Logo", icon: ImageIcon },
  screens: { label: "App screens", icon: Smartphone },
  "demo-account": { label: "Demo account", icon: KeyRound },
  "brand-guide": { label: "Brand guide", icon: BookOpen },
  footage: { label: "Footage", icon: Film },
};

export function AssetIcon({ kind, size = 18 }: { kind: ProductAsset["kind"]; size?: number }) {
  const Icon = assetKinds[kind].icon;
  return <Icon size={size} aria-hidden />;
}
