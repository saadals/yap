import { paths } from "@/lib/paths";

/** In-app path to continue to after signing in (never another site or an auth page). */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return paths.home;
  if (/^\/(signin|signup|onboarding)(\/|\?|#|$)/.test(next)) return paths.home;
  return next;
}

export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="y-micro y-fg-3 flex items-center gap-3" role="separator" aria-label={label}>
      <span aria-hidden className="h-px flex-1 bg-(--b-line)" />
      <span aria-hidden>{label}</span>
      <span aria-hidden className="h-px flex-1 bg-(--b-line)" />
    </div>
  );
}
