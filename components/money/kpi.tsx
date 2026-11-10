import { Block, type BlockTone } from "@/components/ui/block";
import { Skeleton } from "@/components/ui/skeleton";
import { localDay } from "@/lib/clock";

/** A money KPI: label, chunky numeral, one line of context. */
export function KpiBlock({
  tone = "paper",
  label,
  value,
  sub,
  icon,
  children,
  loading = false,
  className = "",
}: {
  tone?: BlockTone;
  /** Show a skeleton numeral while persisted data loads. */
  loading?: boolean;
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Block tone={tone} pad="md" className={`flex h-full flex-col justify-between gap-6 ${className}`}>
      <p className="y-small flex items-center gap-2 font-semibold">
        {icon}
        {label}
      </p>
      <div className="flex flex-col gap-1.5">
        {loading ? (
          <Skeleton className="h-10 w-32 md:h-11" />
        ) : (
          <p className="y-display y-num text-[32px] leading-none font-semibold tracking-[-0.04em] sm:text-[40px] md:text-[44px]">
            {value}
          </p>
        )}
        {sub ? <p className="y-micro y-fg-2">{sub}</p> : null}
      </div>
      {children}
    </Block>
  );
}

/** Calendar date in display time as YYYY-MM-DD (for CSV files). */
export function isoDay(iso: string): string {
  return localDay(Date.parse(iso));
}

/** Build a CSV string with proper quoting. */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\r\n");
}

/** Download text as a file through a temporary Blob URL. Call from event handlers only. */
export function downloadFile(name: string, text: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿", text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
