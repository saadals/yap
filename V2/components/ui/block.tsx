import type { ElementType, ComponentPropsWithoutRef } from "react";

export type BlockTone =
  | "paper"
  | "mist"
  | "canvas"
  | "night"
  | "lavender"
  | "butter"
  | "sky"
  | "neon";

type BlockProps<T extends ElementType> = {
  as?: T;
  tone?: BlockTone;
  pad?: "none" | "sm" | "md" | "lg";
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/** The only container in Yapp: a rounded, full-width block whose tone sets local fg/chip tokens. */
export function Block<T extends ElementType = "div">({
  as,
  tone = "paper",
  pad = "md",
  className,
  ...rest
}: BlockProps<T> & { className?: string }) {
  const Component = (as ?? "div") as ElementType;
  const padClass = pad === "none" ? "" : `y-pad-${pad}`;
  const classes = `y-block ${padClass} ${className ?? ""}`;
  return <Component data-tone={tone} className={classes} {...rest} />;
}
