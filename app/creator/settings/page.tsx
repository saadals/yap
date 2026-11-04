"use client";

import { UserRound } from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { SettingsSection } from "@/components/settings/controls";
import { AccountControls, AlertControls, AvailabilityControls } from "@/components/settings/creator-settings";
import { NotificationPrefsControls } from "@/components/settings/notification-prefs";
import { SectionNav, useSettingsSection } from "@/components/settings/section-nav";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

const sections = [
  { id: "availability", label: "Availability" },
  { id: "alerts", label: "Opportunity alerts" },
  { id: "notifications", label: "Notifications" },
  { id: "account", label: "Account" },
];

export default function CreatorSettingsPage() {
  return (
    <AppShell role="creator">
      <Settings />
    </AppShell>
  );
}

function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-11 !rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-7 w-12 !rounded-full" />
        </div>
      ))}
    </div>
  );
}

function Settings() {
  const s = useDemo();
  const hydrated = useHydrated();
  const creator = me.creator(s);
  const [section, setSection] = useSettingsSection(sections);

  return (
    <Page>
      <PageHeader
        title="Settings"
        actions={
          <PillButton href={`/creators/${creator.handle}`} variant="soft" size="sm" icon={<UserRound size={16} aria-hidden />}>
            View public profile
          </PillButton>
        }
      />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-3">
          <SectionNav sections={sections} active={section} onSelect={setSection} />
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:col-span-9">
          <div hidden={section !== "availability"}>
            <SettingsSection id="availability" title="Availability">
              {hydrated ? <AvailabilityControls /> : <Loading rows={2} />}
            </SettingsSection>
          </div>

          <div hidden={section !== "alerts"}>
            <SettingsSection id="alerts" title="Opportunity alerts">
              {hydrated ? <AlertControls /> : <Loading rows={2} />}
            </SettingsSection>
          </div>

          <div hidden={section !== "notifications"}>
            <SettingsSection id="notifications" title="Notifications">
              {hydrated ? <NotificationPrefsControls role="creator" /> : <Loading rows={3} />}
            </SettingsSection>
          </div>

          <div hidden={section !== "account"}>
            <SettingsSection id="account" title="Account">
              {hydrated ? <AccountControls /> : <Loading rows={3} />}
            </SettingsSection>
          </div>
        </div>
      </div>
    </Page>
  );
}
