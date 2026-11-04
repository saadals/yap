"use client";

import { ChevronRight, ExternalLink, LogOut, Moon, Repeat2, RotateCcw, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { usePrefs } from "@/lib/prefs";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Role } from "@/lib/types";

import { accountNav } from "./nav";

export function AccountSheet({
  role,
  open,
  onClose,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const { isDark, toggleTheme, setRole } = usePrefs();
  const [confirmReset, setConfirmReset] = useState(false);
  const business = me.business(s);
  const member = me.member(s);
  const creator = me.creator(s);

  const switchTo = (next: Role) => {
    setRole(next);
    onClose();
    router.push(next === "business" ? "/business" : "/creator");
  };

  return (
    <Sheet open={open} onClose={onClose} title="Account" width="sm">
      <div className="y-tile flex items-center gap-3 p-4">
        {role === "business" ? (
          <>
            <span className="relative">
              <FaceAvatar id={member.id} name={member.name} size={52} />
              <span className="absolute -end-1 -bottom-1 rounded-[10px] ring-2 ring-(--b-chip)">
                <BusinessLogo business={business} size={24} />
              </span>
            </span>
            <div className="min-w-0">
              <p className="y-head truncate">{member.name}</p>
              <p className="y-small y-fg-2 truncate">
                {member.title} · {business.name}
              </p>
            </div>
          </>
        ) : (
          <>
            <FaceAvatar id={creator.id} name={creator.name} size={52} />
            <div className="min-w-0">
              <p className="y-head truncate">{creator.name}</p>
              <p className="y-small y-fg-2 truncate">@{creator.handle}</p>
            </div>
          </>
        )}
      </div>

      <nav aria-label="Account" className="mt-3 flex flex-col gap-1">
        {role === "creator" ? (
          <Link
            href={`/creators/${creator.handle}`}
            onClick={onClose}
            className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
          >
            <ExternalLink size={20} aria-hidden />
            <span className="flex-1">View public profile</span>
            <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip" />
          </Link>
        ) : null}
        {accountNav[role].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip" />
          </Link>
        ))}
      </nav>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => switchTo(role === "business" ? "creator" : "business")}
          className="y-tile y-hoverable flex min-h-16 items-center gap-3 px-4 text-start"
        >
          <Repeat2 size={20} aria-hidden className="flex-none" />
          <span className="flex flex-col">
            <span className="y-micro y-fg-2">Demo view</span>
            <span className="y-small font-semibold">
              {role === "business" ? `Creator (${creator.firstName})` : `Business (${business.name})`}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-pressed={isDark}
          className="y-tile y-hoverable flex min-h-16 items-center gap-3 px-4 text-start"
        >
          {isDark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
          <span className="flex flex-col">
            <span className="y-micro y-fg-2">Theme</span>
            <span className="y-small font-semibold">{isDark ? "Light mode" : "Dark mode"}</span>
          </span>
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {confirmReset ? (
          <div className="y-tile flex flex-col gap-3 p-4" role="alert">
            <p className="y-small">
              Reset the prototype to its original demo data? Requests, messages and anything else you
              created in this browser will be cleared.
            </p>
            <div className="flex gap-2">
              <PillButton
                variant="contrast"
                size="sm"
                onClick={() => {
                  actions.reset();
                  setConfirmReset(false);
                  onClose();
                  toast({ message: "Demo data reset", tone: "info" });
                }}
              >
                Reset demo data
              </PillButton>
              <PillButton variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Keep my changes
              </PillButton>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
          >
            <RotateCcw size={20} aria-hidden />
            Reset demo data
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setRole(null);
            onClose();
            router.push("/");
          }}
          className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
        >
          <LogOut size={20} aria-hidden className="y-flip" />
          Sign out
        </button>
      </div>
    </Sheet>
  );
}
