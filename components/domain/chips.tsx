import { Chip } from "@/components/ui/chip";
import { formatById, languageById, platformById } from "@/lib/taxonomy";
import type { FormatId, LanguageId, PlatformId } from "@/lib/types";

export function FormatChip({ id, className = "" }: { id: FormatId; className?: string }) {
  const format = formatById[id];
  const Icon = format.icon;
  return (
    <Chip icon={<Icon size={14} aria-hidden />} className={className}>
      {format.name}
    </Chip>
  );
}

/** Dialect chips. `native` adds the Arabic name (e.g. "Saudi · سعودي"). */
export function LanguageChips({
  ids,
  native = false,
  max,
  className = "",
}: {
  ids: LanguageId[];
  native?: boolean;
  max?: number;
  className?: string;
}) {
  const shown = max ? ids.slice(0, max) : ids;
  const rest = max ? ids.length - shown.length : 0;
  return (
    <span className={`flex flex-wrap gap-1.5 ${className}`}>
      {shown.map((id) => {
        const lang = languageById[id];
        return (
          <Chip key={id}>
            {lang.short}
            {native && id !== "en" ? (
              <span dir="rtl" lang="ar" className="y-fg-2">
                · {lang.native}
              </span>
            ) : null}
          </Chip>
        );
      })}
      {rest > 0 ? <Chip>+{rest}</Chip> : null}
    </span>
  );
}

export function PlatformChips({ ids, className = "" }: { ids: PlatformId[]; className?: string }) {
  return (
    <span className={`flex flex-wrap gap-1.5 ${className}`}>
      {ids.map((id) => (
        <Chip key={id}>{platformById[id].short}</Chip>
      ))}
    </span>
  );
}

/** Plain-text list: "Saudi, Khaleeji" */
export const languageList = (ids: LanguageId[]) => ids.map((id) => languageById[id].short).join(", ");
export const platformList = (ids: PlatformId[]) => ids.map((id) => platformById[id].short).join(", ");
