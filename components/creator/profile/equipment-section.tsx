"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useToast } from "@/components/ui/toast";
import { actions } from "@/lib/store";
import type { Creator } from "@/lib/types";

import { ProfileSection, useDraft } from "./section";

export function EquipmentSection({ creator }: { creator: Creator }) {
  const toast = useToast();
  const { draft, set, dirty, reset } = useDraft<string[]>(creator.equipment);
  const [item, setItem] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const text = item.trim();
    if (text.length < 2) {
      setError("Type the name of a piece of kit first.");
      return;
    }
    if (draft.some((d) => d.toLowerCase() === text.toLowerCase())) {
      setError("That's already on your list.");
      return;
    }
    set((list) => [...list, text]);
    setItem("");
    setError(null);
  };

  return (
    <ProfileSection
      id="equipment"
      title="Equipment"
      description="What you film with. Buyers use it to judge audio and picture quality."
      summary={creator.equipment.length ? creator.equipment.join(", ") : "Nothing listed yet"}
      dirty={dirty}
      saveLabel="Save equipment"
      onDiscard={() => {
        reset();
        setError(null);
      }}
      onSave={() => {
        actions.updateCreator(creator.id, { equipment: draft });
        toast({ message: "Equipment saved." });
      }}
    >
      {draft.length ? (
        <ul className="flex flex-wrap gap-2">
          {draft.map((thing) => (
            <li key={thing} className="y-chip !min-h-11 !pe-1">
              {thing}
              <RoundIconButton
                size="sm"
                tone="outline"
                label={`Remove ${thing}`}
                className="!size-9"
                onClick={() => set((list) => list.filter((x) => x !== thing))}
              >
                <X size={14} />
              </RoundIconButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2">Nothing listed yet. Even &ldquo;iPhone 14 and a clip-on mic&rdquo; helps.</p>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="equipment-new" className="y-label">
          <span>Add equipment</span>
        </label>
        <div className="flex gap-2">
          <input
            id="equipment-new"
            className="y-input min-w-0 flex-1"
            maxLength={60}
            placeholder="e.g. Rode Wireless GO II"
            value={item}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "equipment-error" : undefined}
            onChange={(e) => {
              setItem(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <PillButton variant="contrast" className="!min-h-[52px]" icon={<Plus size={16} aria-hidden />} onClick={add}>
            Add
          </PillButton>
        </div>
        {error ? (
          <p id="equipment-error" className="y-small px-1 font-medium text-(--y-danger)">
            {error}
          </p>
        ) : null}
      </div>
    </ProfileSection>
  );
}
