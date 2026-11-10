"use client";

import { BadgeCheck, BellRing, LoaderCircle, Palmtree, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/chip";
import { FieldShell, TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { addDays, at, atLocal, localDay } from "@/lib/clock";
import { creatorNet, longDate, money, moneyExact } from "@/lib/format";
import { me, opportunities } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { formats, languages } from "@/lib/taxonomy";
import type { Creator, FormatId, LanguageId } from "@/lib/types";

import { RowList, SwitchRow } from "./controls";

/** "2026-11-20" in display time. */
const dayOf = (iso: string) => localDay(Date.parse(iso));
const tomorrow = dayOf(at(1));

/* -------------------------------------------------------------------------- */
/* Availability                                                                */
/* -------------------------------------------------------------------------- */

/** Available for new work and vacation mode, for the signed-in account's creator profile. */
export function AvailabilityControls({ creator }: { creator: Creator }) {
  const s = useDemo();
  const toast = useToast();
  const vacation = me.settings(s).creator.vacationMode;
  const returnDay = creator.availableFrom ? dayOf(creator.availableFrom) : "";
  const [dateError, setDateError] = useState<string | null>(null);
  const [reply, setReply] = useState(
    "Thanks for reaching out. I'm away right now and will reply as soon as I'm back. Active projects are on track.",
  );
  const [savedReply, setSavedReply] = useState(reply);

  return (
    <div className="flex flex-col gap-5">
      <RowList>
        <SwitchRow
          label="Available for new work"
          icon={<Zap size={18} />}
          description={
            vacation
              ? "Turn off vacation mode to change this."
              : creator.available
                ? "You show as available in search and match alerts."
                : "You show as booked. People can still message you."
          }
          checked={creator.available}
          disabled={vacation}
          onChange={(available) => {
            actions.updateCreator(creator.id, { available });
            toast({
              message: available ? "You're shown as available for new work" : "You're shown as booked",
              action: { label: "Undo", onClick: () => actions.updateCreator(creator.id, { available: !available }) },
            });
          }}
        />
        <SwitchRow
          label="Vacation mode"
          icon={<Palmtree size={18} />}
          description="Pauses new offers and hides you from search. Work in progress carries on."
          checked={vacation}
          onChange={(on) => {
            const before = { available: creator.available, availableFrom: creator.availableFrom };
            actions.updateSettings("creator", { vacationMode: on });
            if (on) {
              actions.updateCreator(creator.id, {
                available: false,
                availableFrom: creator.availableFrom ?? addDays(at(0, "09:00"), 14),
              });
            } else {
              actions.updateCreator(creator.id, { available: true, availableFrom: undefined });
            }
            setDateError(null);
            toast({
              message: on ? "Vacation mode on. New offers are paused." : "Welcome back. You're available for new work.",
              action: {
                label: "Undo",
                onClick: () => {
                  actions.updateSettings("creator", { vacationMode: !on });
                  actions.updateCreator(creator.id, before);
                },
              },
            });
          }}
        />
      </RowList>

      {vacation ? (
        <div className="y-tile flex flex-col gap-4 p-4">
          <FieldShell
            label="Back on"
            required
            hint={returnDay ? `Your profile says “Back ${longDate(atLocal(returnDay, "09:00"))}”.` : "Buyers see this on your profile."}
            error={dateError}
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                type="date"
                aria-describedby={describedBy}
                aria-invalid={dateError ? true : undefined}
                className="y-input !bg-(--b-bg) sm:max-w-xs"
                min={tomorrow}
                value={returnDay}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value || value < tomorrow) {
                    setDateError("Pick a date from tomorrow onwards.");
                    return;
                  }
                  setDateError(null);
                  actions.updateCreator(creator.id, { availableFrom: atLocal(value, "09:00") });
                }}
              />
            )}
          </FieldShell>
          <div className="flex flex-col gap-3">
            <TextArea
              label="Auto-reply"
              hint={`Sent once to anyone who messages you. ${280 - reply.length} characters left.`}
              rows={3}
              maxLength={280}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              className="[&_textarea]:!bg-(--b-bg)"
            />
            <div className="flex flex-wrap items-center gap-2">
              <PillButton
                variant="contrast"
                size="sm"
                disabled={reply.trim() === savedReply.trim() || reply.trim().length < 10}
                onClick={() => {
                  setSavedReply(reply.trim());
                  setReply(reply.trim());
                  toast({ message: "Auto-reply saved" });
                }}
              >
                Save auto-reply
              </PillButton>
              {reply.trim().length < 10 ? (
                <span className="y-micro y-fg-2">Write at least a short sentence.</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Opportunity alerts                                                          */
/* -------------------------------------------------------------------------- */

/** Match alerts for new custom orders, with a minimum budget, formats and languages. */
export function AlertControls({ creator }: { creator: Creator }) {
  const s = useDemo();
  const toast = useToast();
  const prefs = me.settings(s).creator;
  const [alertFormats, setAlertFormats] = useState<FormatId[]>(creator.formats);
  const [alertLangs, setAlertLangs] = useState<LanguageId[]>(creator.languages);

  const matching = opportunities(s, creator.id).filter(
    ({ request, hidden }) =>
      !hidden &&
      request.budget.max >= prefs.minBudget &&
      alertFormats.includes(request.brief.format) &&
      request.brief.languages.some((l) => alertLangs.includes(l)),
  ).length;

  /** Toggle a chip, keeping at least one selected. Applies straight away. */
  const toggle = <T,>(list: T[], value: T, what: string): T[] => {
    if (!list.includes(value)) return [...list, value];
    if (list.length === 1) {
      toast({ message: `Keep at least one ${what} so alerts can match`, tone: "info" });
      return list;
    }
    return list.filter((item) => item !== value);
  };

  return (
    <div className="flex flex-col gap-5">
      <RowList>
        <SwitchRow
          label="Match alerts"
          icon={<BellRing size={18} />}
          description="New custom orders that fit your formats, languages and budget. Campaigns you qualify for always notify you."
          checked={prefs.matchAlerts}
          onChange={(on) => {
            actions.updateSettings("creator", { matchAlerts: on });
            toast({
              message: on ? "Match alerts on" : "Match alerts off. You can still browse open work in Find work.",
              action: { label: "Undo", onClick: () => actions.updateSettings("creator", { matchAlerts: !on }) },
            });
          }}
        />
      </RowList>

      <fieldset
        disabled={!prefs.matchAlerts}
        className={`flex flex-col gap-5 transition-opacity ${prefs.matchAlerts ? "" : "opacity-55"}`}
      >
        <legend className="sr-only">Alert preferences</legend>
        <div className="flex flex-col gap-3">
          <label htmlFor="min-budget" className="y-label">
            <span>Minimum budget</span>
            <span className="y-display y-num text-2xl font-semibold">{money(prefs.minBudget)}</span>
          </label>
          <input
            id="min-budget"
            type="range"
            className="y-range"
            min={0}
            max={1000}
            step={10}
            value={prefs.minBudget}
            aria-valuetext={`${money(prefs.minBudget)} or more`}
            aria-describedby="min-budget-hint"
            onChange={(event) => actions.updateSettings("creator", { minBudget: Number(event.target.value) })}
          />
          <p id="min-budget-hint" className="y-micro y-fg-2" aria-live="polite">
            {prefs.minBudget > 0 ? (
              <>At {money(prefs.minBudget)} you earn {moneyExact(creatorNet(prefs.minBudget))}. </>
            ) : null}
            <span className="font-semibold text-(--b-fg)">
              {matching} open order{matching === 1 ? "" : "s"}
            </span>{" "}
            match right now.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="y-label" id="alert-formats">
            Formats
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="alert-formats">
            {formats.map((format) => {
              const Icon = format.icon;
              return (
                <FilterChip
                  key={format.id}
                  pressed={alertFormats.includes(format.id)}
                  onClick={() => setAlertFormats(toggle(alertFormats, format.id, "format"))}
                  icon={<Icon size={16} aria-hidden />}
                >
                  {format.name}
                </FilterChip>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="y-label" id="alert-languages">
            Languages
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="alert-languages">
            {languages.map((lang) => (
              <FilterChip
                key={lang.id}
                pressed={alertLangs.includes(lang.id)}
                onClick={() => setAlertLangs(toggle(alertLangs, lang.id, "language"))}
              >
                {lang.name}
              </FilterChip>
            ))}
          </div>
        </div>
      </fieldset>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ID verification (making)                                                     */
/* -------------------------------------------------------------------------- */

/** ID check for the creator profile: a simulated check that marks the profile verified. */
export function IdVerificationRow({ creator }: { creator: Creator }) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const verify = () => {
    setPending(true);
    timer.current = window.setTimeout(() => {
      actions.updateCreator(creator.id, { verified: true });
      setPending(false);
      toast({ message: "Your ID is verified. Your profile shows the badge now." });
    }, 3000);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="y-head">ID verification</h3>
        <p className="y-micro y-fg-2">
          {creator.verified
            ? "Verified with your government ID."
            : pending
              ? "Checking your ID. This takes a moment."
              : "A badge buyers trust, and needed before payouts. About 2 minutes."}
        </p>
      </div>
      {creator.verified ? (
        <Badge tone="success" icon={<BadgeCheck size={14} aria-hidden />}>
          Verified
        </Badge>
      ) : pending ? (
        <Badge tone="neutral" icon={<LoaderCircle size={14} aria-hidden className="animate-spin" />}>
          In review
        </Badge>
      ) : (
        <PillButton variant="contrast" size="sm" onClick={verify}>
          Verify ID
        </PillButton>
      )}
    </div>
  );
}

