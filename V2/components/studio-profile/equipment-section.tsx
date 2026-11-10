"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";

import type { DraftProps } from "./profile-section";
import { EditorSection } from "./section";

/** Equipment: what you film with, as removable chips plus an add field. */
export function EquipmentSection({ draft, set }: Pick<DraftProps, "draft" | "set">) {
  const [item, setItem] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const text = item.trim();
    if (text.length < 2) {
      setError("Type the name of a piece of kit first.");
      return;
    }
    if (draft.equipment.some((thing) => thing.toLowerCase() === text.toLowerCase())) {
      setError("That's already on your list.");
      return;
    }
    set((d) => ({ ...d, equipment: [...d.equipment, text] }));
    setItem("");
    setError(null);
  };

  return (
    <EditorSection
      id="equipment"
      title="Equipment"
      description="What you film with. Brands use it to judge sound and picture before they order."
    >
      {draft.equipment.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {draft.equipment.map((thing) => (
            <li key={thing} className="y-chip !min-h-10 !pe-1">
              {thing}
              <RoundIconButton
                size="sm"
                tone="soft"
                label={`Remove ${thing}`}
                className="!size-8"
                onClick={() => set((d) => ({ ...d, equipment: d.equipment.filter((x) => x !== thing) }))}
              >
                <X size={14} />
              </RoundIconButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2">Nothing listed yet. Even “iPhone 14 and a clip-on mic” helps.</p>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="equipment-new" className="y-label">
          <span>Add equipment</span>
        </label>
        <div className="flex gap-2">
          <input
            id="equipment-new"
            name="equipment"
            className="y-input min-w-0 flex-1"
            maxLength={60}
            placeholder="e.g. Rode Wireless GO II"
            value={item}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "equipment-error" : undefined}
            onChange={(event) => {
              setItem(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
          <PillButton variant="soft" icon={<Plus size={16} aria-hidden />} onClick={add}>
            Add
          </PillButton>
        </div>
        {error ? (
          <p id="equipment-error" role="alert" className="y-small px-1 font-medium text-(--y-danger)">
            {error}
          </p>
        ) : null}
      </div>
    </EditorSection>
  );
}
