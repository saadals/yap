import { Skeleton } from "@/components/ui/skeleton";

/** Bento-shaped placeholder shown until the saved demo state has loaded. */
export function DashboardSkeleton() {
  const block = (tone: string, className: string, children: React.ReactNode) => (
    <div data-tone={tone} className={`y-block y-pad-md flex flex-col gap-4 ${className}`}>
      {children}
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-12" aria-busy="true" aria-label="Loading your dashboard">
      {block(
        "paper",
        "min-h-72 justify-between lg:col-span-8",
        <>
          <Skeleton className="h-10 w-48" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-14 w-4/5" />
            <Skeleton className="h-7 w-3/5" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-12 w-36" />
            <Skeleton className="h-12 w-36" />
          </div>
        </>,
      )}
      {block("mist", "min-h-72 lg:col-span-4", <Skeleton className="h-full min-h-56 w-full" />)}
      {block(
        "mist",
        "lg:col-span-8",
        <>
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-2 md:grid-cols-2">
            <Skeleton className="h-52" />
            <Skeleton className="h-52" />
          </div>
        </>,
      )}
      {block(
        "paper",
        "lg:col-span-4",
        <>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-24 w-full" />
        </>,
      )}
    </div>
  );
}
