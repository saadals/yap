import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { omit } from "@/lib/omit";

export type PillVariant = "neon" | "contrast" | "soft" | "outline" | "ghost" | "whatsapp";

type Common = {
  variant?: PillVariant;
  size?: "sm" | "md" | "lg";
  /** Trailing round arrow circle, pilo-style. */
  arrow?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Common & {
  href: string;
  external?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
};

export function PillButton(props: AsButton | AsLink) {
  const {
    variant = "contrast",
    size = "md",
    arrow = false,
    icon,
    className = "",
    children,
  } = props;
  const content = (
    <>
      {icon}
      <span className="min-w-0 truncate">{children}</span>
      {arrow ? (
        <span aria-hidden className="y-arrow">
          <ArrowRight size={size === "lg" ? 20 : 18} strokeWidth={2.25} className="y-flip" />
        </span>
      ) : null}
    </>
  );
  const shared = {
    className: `y-pill ${className}`,
    "data-variant": variant,
    "data-size": size,
    "data-arrow": arrow ? "true" : undefined,
  };

  if (props.href !== undefined) {
    const { href, external, onClick } = props;
    if (external) {
      return (
        <a
          {...shared}
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={onClick}
          aria-label={props["aria-label"]}
        >
          {content}
        </a>
      );
    }
    return (
      <Link {...shared} href={href} onClick={onClick} aria-label={props["aria-label"]}>
        {content}
      </Link>
    );
  }

  const rest = omit(props as AsButton, [
    "variant",
    "size",
    "arrow",
    "icon",
    "className",
    "children",
  ]);
  return (
    <button type="button" {...rest} {...shared}>
      {content}
    </button>
  );
}
