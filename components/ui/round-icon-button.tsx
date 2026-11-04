import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { omit } from "@/lib/omit";

type Tone = "soft" | "contrast" | "outline" | "neon";
type Common = {
  label: string;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
};

/** Round icon button (48px by default). The label is required and becomes aria-label + title. */
export function RoundIconButton(
  props:
    | (Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">)
    | (Common & { href: string }),
) {
  const { label, tone = "soft", size = "md", className = "", children } = props;
  const shared = {
    className: `y-round ${className}`,
    "data-tone-btn": tone,
    "data-size": size,
    "aria-label": label,
    title: label,
  };
  if ("href" in props && props.href) {
    return (
      <Link {...shared} href={props.href}>
        {children}
      </Link>
    );
  }
  const rest = omit(props as Common & ButtonHTMLAttributes<HTMLButtonElement>, [
    "label",
    "tone",
    "size",
    "className",
    "children",
  ]);
  return (
    <button type="button" {...rest} {...shared}>
      {children}
    </button>
  );
}
