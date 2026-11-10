"use client";

import { useId } from "react";

import { Block, type BlockTone } from "@/components/ui/block";

/**
 * A titled settings section. `id` doubles as the anchor target for the section nav, so the
 * block gets a scroll margin that clears the sticky header.
 */
export function SettingsSection({
  id,
  title,
  description,
  action,
  tone = "paper",
  children,
  className = "",
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: BlockTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Block
      as="section"
      id={id}
      aria-labelledby={`${id}-title`}
      tone={tone}
      className={`flex scroll-mt-20 flex-col gap-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-title`} className="y-display y-title">
            {title}
          </h2>
          {description ? <p className="y-small y-fg-2 max-w-[62ch]">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Block>
  );
}

/** A labelled on/off switch row (`.y-switch` with role="switch"). */
export function SwitchRow({
  label,
  description,
  checked,
  onChange,
  icon,
  disabled = false,
}: {
  label: string;
  description?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      {icon ? (
        <span
          aria-hidden
          className="y-tile grid size-10 flex-none place-items-center !rounded-full"
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 pt-0.5">
        <label htmlFor={id} className="y-small block cursor-pointer font-semibold">
          {label}
        </label>
        {description ? (
          <p id={`${id}-desc`} className="y-micro y-fg-2 mt-0.5 max-w-[56ch]">
            {description}
          </p>
        ) : null}
      </div>
      <span className="flex min-h-11 flex-none items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="y-switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={description ? `${id}-desc` : undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
      </span>
    </div>
  );
}

/** Rows separated by hairlines. */
export function RowList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col divide-y divide-(--b-line) ${className}`}>{children}</div>;
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
