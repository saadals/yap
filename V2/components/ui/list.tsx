import Link from "next/link";

import { Block } from "./block";

/**
 * V2 lists: one white card of rows separated by hairlines (calmer than a stack of cards).
 *
 *   <List label="Needs you">
 *     <Row href={...} lead={<FaceAvatar …/>} title="Review Layla's app demo" meta="Approves itself Fri" end={<Badge …/>} />
 *   </List>
 *
 * A row is a link (`href`), a button (`onClick`) or plain. Keep rows quiet: one title, one meta
 * line, at most one badge or number at the end.
 */
export function List({
  children,
  label,
  className = "",
  flush = false,
}: {
  children: React.ReactNode;
  /** Accessible name for the list (screen readers); not shown. */
  label?: string;
  className?: string;
  /** No card: rows sit straight on the surrounding block (e.g. inside a sheet). */
  flush?: boolean;
}) {
  const body = (
    <div role="list" aria-label={label} className="y-list">
      {children}
    </div>
  );
  if (flush) return <div className={className}>{body}</div>;
  return (
    <Block tone="paper" pad="none" className={`overflow-hidden ${className}`}>
      {body}
    </Block>
  );
}

type RowProps = {
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** Leading visual: avatar, logo, icon tile or thumbnail. */
  lead?: React.ReactNode;
  /** Trailing content: a badge, a price, a button (buttons only on plain rows). */
  end?: React.ReactNode;
  /** Extra line under the meta (e.g. a progress bar). */
  below?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  /** Show a chevron at the end of link rows (default true for links). */
  chevron?: boolean;
  ariaLabel?: string;
};

export function Row({ title, meta, lead, end, below, href, onClick, className = "", chevron, ariaLabel }: RowProps) {
  const showChevron = chevron ?? Boolean(href || onClick);
  const inner = (
    <>
      {lead ? <span className="flex-none">{lead}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{title}</span>
        {meta ? <span className="y-small y-fg-2 truncate">{meta}</span> : null}
        {below ? <span className="mt-1.5 block">{below}</span> : null}
      </span>
      {end ? <span className="flex flex-none items-center gap-2">{end}</span> : null}
      {showChevron ? (
        <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" className="y-fg-3 y-flip flex-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link role="listitem" href={href} aria-label={ariaLabel} className={`y-row ${className}`}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button role="listitem" type="button" onClick={onClick} aria-label={ariaLabel} className={`y-row ${className}`}>
        {inner}
      </button>
    );
  }
  return (
    <div role="listitem" className={`y-row ${className}`}>
      {inner}
    </div>
  );
}
