import { AlertTriangle, Check, Minus, ShieldCheck } from "lucide-react";

import { Block } from "@/components/ui/block";
import { quoted } from "@/lib/format";

/** The stage panel's card: one title, one line, then the state's content. */
export function Panel({
  title,
  line,
  children,
  live = false,
  icon,
  aside,
}: {
  title: React.ReactNode;
  line?: React.ReactNode;
  children?: React.ReactNode;
  /** Announce changes (async states such as "Checking your post…"). */
  live?: boolean;
  icon?: React.ReactNode;
  /** Decoration at the end of the title row (e.g. the celebration after approving). */
  aside?: React.ReactNode;
}) {
  return (
    <Block
      as="section"
      tone="paper"
      pad="md"
      aria-labelledby="stage-title"
      aria-live={live ? "polite" : undefined}
      className="flex flex-col gap-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id="stage-title" className="y-display y-title flex items-start gap-2.5">
            {icon ? <span className="mt-0.5 flex-none">{icon}</span> : null}
            <span>{title}</span>
          </h2>
          {line ? <p className="y-body y-fg-2 max-w-[62ch]">{line}</p> : null}
        </div>
        {aside ? <div className="flex-none max-sm:hidden">{aside}</div> : null}
      </div>
      {children}
    </Block>
  );
}

export function Note({ children, tone = "plain", icon }: { children: React.ReactNode; tone?: "plain" | "warning"; icon?: React.ReactNode }) {
  if (tone === "warning") {
    return (
      <div role="note" className="flex max-w-[62ch] items-start gap-3 rounded-(--y-r-tile) bg-(--y-warning-soft) p-4 text-(--y-warning)">
        {icon ?? <AlertTriangle size={18} aria-hidden className="mt-0.5 flex-none" />}
        <p className="y-small font-medium">{children}</p>
      </div>
    );
  }
  return (
    <p className="y-small inline-flex max-w-[62ch] items-start gap-2">
      {icon ?? <ShieldCheck size={17} aria-hidden className="mt-px flex-none" />}
      <span>{children}</span>
    </p>
  );
}

export function Quote({ text, by }: { text: string; by: string }) {
  return (
    <figure className="flex max-w-[62ch] flex-col gap-1 border-s-2 border-(--b-line-strong) ps-4">
      <blockquote className="y-body">{quoted(text)}</blockquote>
      <figcaption className="y-micro y-fg-2">{by}</figcaption>
    </figure>
  );
}

export function Checklist({ items, kind = "do" }: { items: string[]; kind?: "do" | "avoid" }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 grid size-5 flex-none place-items-center rounded-full ${
              kind === "do" ? "bg-(--b-fg) text-(--b-bg)" : "bg-(--b-chip) shadow-[inset_0_0_0_1.5px_var(--b-line)]"
            }`}
          >
            {kind === "do" ? <Check size={12} strokeWidth={3} aria-hidden /> : <Minus size={12} strokeWidth={3} aria-hidden />}
          </span>
          <span className="y-small">{item}</span>
        </li>
      ))}
    </ul>
  );
}

