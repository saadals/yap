import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder in the dashboard's shape, shown until the saved demo state has loaded. */
export function DashboardSkeleton() {
  const block = (tone: string, className: string, rows: number) => (
    <div data-tone={tone} className={`y-block y-pad-md flex flex-col gap-4 ${className}`}>
      <Skeleton className="h-7 w-40" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
  return (
    <div aria-busy="true" aria-label="Loading your dashboard">
      <div className="flex flex-col gap-3 px-1 pt-2 pb-5 md:pb-6">
        <Skeleton className="h-12 w-80 max-w-full" />
        <Skeleton className="h-6 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-12" aria-hidden>
        <div className="flex flex-col gap-2 lg:col-span-8">
          {block("paper", "", 3)}
          {block("paper", "", 2)}
        </div>
        <div className="flex flex-col gap-2 lg:col-span-4">
          {block("mist", "min-h-44", 1)}
          {block("paper", "", 2)}
        </div>
      </div>
    </div>
  );
}
