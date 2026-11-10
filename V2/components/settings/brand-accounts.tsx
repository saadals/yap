"use client";

import { AtSign } from "lucide-react";
import { useId, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { me } from "@/lib/selectors";
import { actions, BRAND_HANDLE, useDemo } from "@/lib/store";
import { campaignPlatforms } from "@/lib/taxonomy";
import type { CampaignPlatformId } from "@/lib/types";

const HANDLE_RULE = "Use letters, numbers, dots or underscores (2–30).";

/**
 * Settings → Brand accounts: the account creators tag on each campaign platform, one per platform,
 * saved on this account's buyer profile with `actions.saveBrandHandle` (always stored with "@").
 * A new campaign starts with these filled in, and what it posts with is saved back here.
 */
export function BrandAccounts() {
  const s = useDemo();
  const saved = me.brandHandles(s);
  return (
    <ul className="flex flex-col divide-y divide-(--y-line)" aria-label="Brand accounts by platform">
      {campaignPlatforms.map((platform) => (
        <HandleRow key={platform.id} platform={platform.id} name={platform.name} saved={saved[platform.id]} />
      ))}
    </ul>
  );
}

function HandleRow({ platform, name, saved }: { platform: CampaignPlatformId; name: string; saved?: string }) {
  const toast = useToast();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setValue(saved?.replace(/^@/, "") ?? "");
    setError(null);
    setEditing(true);
  };

  const save = () => {
    const bare = value.trim().replace(/^@+/, "");
    if (!bare) {
      setError(`Add the ${name} account creators should tag.`);
      return;
    }
    if (!BRAND_HANDLE.test(`@${bare}`)) {
      setError(HANDLE_RULE);
      return;
    }
    const result = actions.saveBrandHandle(platform, bare);
    if (!result) {
      setError(HANDLE_RULE);
      return;
    }
    setEditing(false);
    toast({ message: `Saved ${result} for ${name}` });
  };

  const remove = () => {
    const before = saved;
    actions.saveBrandHandle(platform, null);
    toast({
      message: `Removed the ${name} account`,
      action: before ? { label: "Undo", onClick: () => actions.saveBrandHandle(platform, before) } : undefined,
    });
  };

  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="y-tile grid size-10 flex-none place-items-center !rounded-full">
          <AtSign size={18} />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="y-small font-semibold">{name}</p>
          {!editing ? (
            <p className={`y-small truncate ${saved ? "font-medium" : "y-fg-2"}`}>
              {saved ? <bdi dir="ltr">{saved}</bdi> : "Not added yet"}
            </p>
          ) : null}
        </div>
        {editing ? null : saved ? (
          <div className="flex flex-none gap-1">
            <PillButton size="sm" variant="soft" onClick={start} aria-label={`Change the ${name} account`}>
              Change
            </PillButton>
            <PillButton size="sm" variant="ghost" onClick={remove} aria-label={`Remove the ${name} account`}>
              Remove
            </PillButton>
          </div>
        ) : (
          <PillButton size="sm" variant="soft" onClick={start} aria-label={`Add the ${name} account`}>
            Add
          </PillButton>
        )}
      </div>
      {editing ? (
        <form
          className="flex flex-wrap items-center gap-2 sm:ps-13"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            {name} account creators should tag
          </label>
          <span className="y-input flex min-w-0 flex-1 basis-52 items-center gap-0.5" dir="ltr">
            <span aria-hidden className="y-fg-2">
              @
            </span>
            <input
              id={inputId}
              value={value}
              maxLength={31}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="yourbrand"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setValue(event.target.value.replace(/^@+/, "").replace(/\s+/g, ""));
                if (error) setError(null);
              }}
              className="min-w-0 flex-1 bg-transparent outline-none"
              autoFocus
            />
          </span>
          <PillButton type="submit" size="sm" variant="contrast">
            Save
          </PillButton>
          <PillButton type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </PillButton>
        </form>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="y-small font-medium text-(--y-danger) sm:ps-13">
          {error}
        </p>
      ) : null}
    </li>
  );
}
