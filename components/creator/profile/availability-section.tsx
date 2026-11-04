"use client";

import { CalendarClock } from "lucide-react";

import { Block } from "@/components/ui/block";
import { useToast } from "@/components/ui/toast";
import { at } from "@/lib/clock";
import { daysFromNow, weekdayDate } from "@/lib/format";
import { actions } from "@/lib/store";
import type { Creator } from "@/lib/types";

const backIn = [7, 14, 21, 30];

/**
 * Availability saves instantly (it's a switch) and mirrors vacation mode in settings, so both
 * places always agree. When away, businesses see the return date and can't send offers.
 */
export function AvailabilitySection({ creator }: { creator: Creator }) {
  const toast = useToast();
  const returnIn = creator.availableFrom ? Math.max(1, daysFromNow(creator.availableFrom)) : 14;

  const apply = (available: boolean, availableFrom?: string) => {
    actions.updateCreator(creator.id, { available, availableFrom: available ? undefined : availableFrom });
    actions.updateSettings("creator", { vacationMode: !available });
  };

  const toggle = (available: boolean) => {
    const previous = { available: creator.available, availableFrom: creator.availableFrom };
    const from = available ? undefined : at(returnIn, "09:00");
    apply(available, from);
    toast({
      message: available
        ? "You're available. Businesses can send you offers again."
        : `You're away until ${weekdayDate(from ?? at(14))}. Active work isn't affected.`,
      action: { label: "Undo", onClick: () => apply(previous.available, previous.availableFrom) },
    });
  };

  return (
    <Block as="section" tone="paper" pad="md" id="availability" aria-labelledby="availability-title" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="availability-title" className="y-head">
            <label htmlFor="available-switch" className="cursor-pointer">
              Available for new work
            </label>
          </h2>
          <p className="y-small y-fg-2" id="availability-desc">
            {creator.available
              ? "You show up in search and businesses can send direct offers."
              : `Away until ${creator.availableFrom ? weekdayDate(creator.availableFrom) : "you switch back"}. You still get paid for active work.`}
          </p>
        </div>
        <input
          id="available-switch"
          type="checkbox"
          role="switch"
          className="y-switch mt-1"
          aria-describedby="availability-desc"
          checked={creator.available}
          onChange={(e) => toggle(e.target.checked)}
        />
      </div>
      {!creator.available ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="back-on" className="y-label">
            <span className="flex items-center gap-1.5">
              <CalendarClock size={16} aria-hidden /> Back on
            </span>
          </label>
          <select
            id="back-on"
            className="y-input"
            value={backIn.includes(returnIn) ? String(returnIn) : "custom"}
            onChange={(e) => {
              const days = Number(e.target.value);
              if (!days) return;
              apply(false, at(days, "09:00"));
              toast({ message: `Return date set to ${weekdayDate(at(days, "09:00"))}.` });
            }}
          >
            {!backIn.includes(returnIn) ? (
              <option value="custom">{creator.availableFrom ? weekdayDate(creator.availableFrom) : "Pick a date"}</option>
            ) : null}
            {backIn.map((d) => (
              <option key={d} value={d}>
                {weekdayDate(at(d, "09:00"))} · in {d} days
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <p className="y-micro y-fg-3">Same switch as vacation mode in Settings.</p>
    </Block>
  );
}
