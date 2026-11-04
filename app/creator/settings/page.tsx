"use client";

import { Bell, CalendarCheck, Radar, UserRound } from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { SettingsSection } from "@/components/settings/controls";
import { AccountControls, AlertControls, AvailabilityControls } from "@/components/settings/creator-settings";
import { NotificationPrefsControls } from "@/components/settings/notification-prefs";
import { SectionNav } from "@/components/settings/section-nav";
import { Badge } from "@/components/ui/badge";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

const sections = [
  { id: "availability", label: "Availability", icon: <CalendarCheck size={16} aria-hidden /> },
  { id: "alerts", label: "Opportunity alerts", icon: <Radar size={16} aria-hidden /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={16} aria-hidden /> },
  { id: "account", label: "Account", icon: <UserRound size={16} aria-hidden /> },
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
  const vacation = s.settings.creator.vacationMode;

  return (
    <Page>
      <PageHeader
        title="Settings"
        description="When you're taking work, which opportunities reach you, and your account."
        actions={
          <PillButton href={`/creators/${creator.handle}`} variant="soft" size="sm" icon={<UserRound size={16} aria-hidden />}>
            View public profile
          </PillButton>
        }
      />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-3">
          <SectionNav sections={sections} />
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:col-span-9">
          <SettingsSection
            id="availability"
            title="Availability"
            description="Let businesses know whether you're taking new commissions."
            action={
              hydrated ? (
                vacation ? (
                  <Badge tone="warning" icon={<CalendarCheck size={14} aria-hidden />}>
                    On vacation
                  </Badge>
                ) : creator.available ? (
                  <Badge tone="success" icon={<CalendarCheck size={14} aria-hidden />}>
                    Taking work
                  </Badge>
                ) : (
                  <Badge tone="neutral" icon={<CalendarCheck size={14} aria-hidden />}>
                    Booked
                  </Badge>
                )
              ) : null
            }
          >
            {hydrated ? <AvailabilityControls /> : <Loading rows={2} />}
          </SettingsSection>

          <SettingsSection
            id="alerts"
            title="Opportunity alerts"
            tone="lavender"
            description="We match new requests to what you make and the dialects you speak, then tell you straight away."
          >
            {hydrated ? <AlertControls /> : <Loading rows={2} />}
          </SettingsSection>

          <SettingsSection
            id="notifications"
            title="Notifications"
            description="New offers and change requests always show in the app. Choose where else we reach you."
          >
            {hydrated ? <NotificationPrefsControls role="creator" /> : <Loading rows={3} />}
          </SettingsSection>

          <SettingsSection id="account" title="Account" description="Your sign-in details and security.">
            {hydrated ? <AccountControls /> : <Loading rows={3} />}
          </SettingsSection>
        </div>
      </div>
    </Page>
  );
}
