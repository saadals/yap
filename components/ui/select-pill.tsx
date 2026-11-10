import { ChevronDown } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes } from "react";

/**
 * Native select drawn as a quiet pill: the finder's category (lg, 64px), sort and date range (md
 * 52px, sm 44px). `label` is its accessible name; write a visible label beside it when the
 * options don't say what they choose ("Sort").
 */
export function SelectPill({
  label,
  options,
  size = "md",
  className = "",
  ...select
}: {
  label: string;
  options: { value: string; label: ReactNode }[];
  size?: "sm" | "md" | "lg";
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "children">) {
  return (
    <span className={`y-selectpill ${className}`} data-size={size}>
      <select aria-label={label} {...select}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={size === "lg" ? 18 : 16} strokeWidth={2.25} aria-hidden />
    </span>
  );
}
