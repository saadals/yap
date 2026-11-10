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

/** Video language chips ("English", "Spanish"). */
export function LanguageChips({
  ids,
  max,
  className = "",
}: {
  ids: LanguageId[];
  max?: number;
  className?: string;
}) {
  const shown = max ? ids.slice(0, max) : ids;
  const rest = max ? ids.length - shown.length : 0;
  return (
    <span className={`flex flex-wrap gap-1.5 ${className}`}>
      {shown.map((id) => (
        <Chip key={id}>{languageById[id].name}</Chip>
      ))}
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

/** Plain-text list: "English, Spanish" */
export const languageList = (ids: LanguageId[]) => ids.map((id) => languageById[id].name).join(", ");
export const platformList = (ids: PlatformId[]) => ids.map((id) => platformById[id].short).join(", ");
