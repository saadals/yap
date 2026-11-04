"use client";

import { Bell, Building2, CheckCircle2, Clock, ShieldCheck, TriangleAlert, Undo2, UserRound, Users } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { CompanyProfileForm } from "@/components/settings/company-profile";
import { ConfirmSheet } from "@/components/settings/confirm-sheet";
import { RowList, SettingsSection, SwitchRow } from "@/components/settings/controls";
import { NotificationPrefsControls } from "@/components/settings/notification-prefs";
import { SectionNav } from "@/components/settings/section-nav";
import { MemberProfileForm, TeamSection } from "@/components/settings/team";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { me } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { AUTO_APPROVE_DAYS } from "@/lib/taxonomy";

const sections = [
  { id: "company", label: "Company", icon: <Building2 size={16} aria-hidden /> },
  { id: "you", label: "Your profile", icon: <UserRound size={16} aria-hidden /> },
  { id: "team", label: "Team", icon: <Users size={16} aria-hidden /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={16} aria-hidden /> },
  { id: "approvals", label: "Approvals", icon: <ShieldCheck size={16} aria-hidden /> },
  { id: "danger", label: "Close workspace", icon: <TriangleAlert size={16} aria-hidden /> },
];

export default function BusinessSettingsPage() {
  return (
    <AppShell role="business">
      <Settings />
    </AppShell>
  );
}

function FormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-13 w-full !rounded-full" />
        </div>
      ))}
    </div>
  );
}

function Settings() {
  const s = useDemo();
  const hydrated = useHydrated();
  const toast = useToast();
  const business = me.business(s);
  const prefs = s.settings.business;
  const [closing, setClosing] = useState(false);

  return (
    <Page>
      <PageHeader
        title="Settings"
        description={`${business.name}'s profile, your team and how Yapp keeps you posted.`}
      />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-3">
          <SectionNav sections={sections} />
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:col-span-9">
          <SettingsSection
            id="company"
            title="Company profile"
            description="Shown on every request and offer, so creators know who they're making videos for."
          >
            {hydrated ? <CompanyProfileForm /> : <FormSkeleton rows={4} />}
          </SettingsSection>

          <SettingsSection id="you" title="Your profile" description="How you appear to creators and teammates.">
            {hydrated ? <MemberProfileForm /> : <FormSkeleton />}
          </SettingsSection>

          <SettingsSection
            id="team"
            title="Team"
            description="Everyone here can post requests, hire creators, message and approve work."
          >
            {hydrated ? <TeamSection /> : <FormSkeleton rows={2} />}
          </SettingsSection>

          <SettingsSection
            id="notifications"
            title="Notifications"
            description="Choose where we reach you. Anything that needs you, like a delivery to review, is always on in the app."
          >
            {hydrated ? (
              <NotificationPrefsControls role="business" email={prefs.invoiceEmail} />
            ) : (
              <FormSkeleton rows={3} />
            )}
          </SettingsSection>

          <SettingsSection
            id="approvals"
            title="Approvals & protection"
            tone="sky"
            description="How Yapp keeps both sides safe."
          >
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[
                {
                  icon: <ShieldCheck size={18} aria-hidden />,
                  title: "Held when work starts",
                  body: "Your payment is held by Yapp, not paid to the creator, while they work.",
                },
                {
                  icon: <Clock size={18} aria-hidden />,
                  title: `Auto-approves after ${AUTO_APPROVE_DAYS} days`,
                  body: `When a delivery arrives you have ${AUTO_APPROVE_DAYS} days to approve or ask for changes. No reply means it's approved and released.`,
                },
                {
                  icon: <Undo2 size={18} aria-hidden />,
                  title: "Full refund if not delivered",
                  body: "If the creator doesn't deliver, the payment comes back to you in full, fee included.",
                },
              ].map((item) => (
                <li key={item.title} className="y-tile flex flex-col gap-1.5 p-4">
                  <span className="y-small flex items-center gap-2 font-semibold">
                    {item.icon}
                    {item.title}
                  </span>
                  <span className="y-small y-fg-2">{item.body}</span>
                </li>
              ))}
            </ul>
            <RowList>
              <SwitchRow
                label="Remind me before a delivery auto-approves"
                icon={<CheckCircle2 size={18} />}
                description="We'll nudge you 24 hours and 2 hours before, by email and WhatsApp if they're on."
                checked={prefs.autoApproveReminders}
                disabled={!hydrated}
                onChange={(on) => {
                  actions.updateSettings("business", { autoApproveReminders: on });
                  toast({
                    message: on ? "Auto-approval reminders on" : "Auto-approval reminders off",
                    action: {
                      label: "Undo",
                      onClick: () => actions.updateSettings("business", { autoApproveReminders: !on }),
                    },
                  });
                }}
              />
            </RowList>
          </SettingsSection>

          <SettingsSection
            id="danger"
            title="Close workspace"
            description={`Closes ${business.name} on Yapp for everyone on your team. Open commissions must finish or be cancelled first, and receipts stay available for 7 years.`}
          >
            <div>
              <PillButton
                variant="outline"
                icon={<TriangleAlert size={18} aria-hidden />}
                onClick={() => setClosing(true)}
              >
                Close workspace
              </PillButton>
            </div>
          </SettingsSection>
        </div>
      </div>

      <ConfirmSheet
        open={closing}
        onClose={() => setClosing(false)}
        title={`Close ${business.name}?`}
        description="Your team loses access to requests, commissions and messages. This can't be undone."
        confirmLabel="Close workspace"
        typed={business.name.toUpperCase()}
        onConfirm={() => {
          setClosing(false);
          toast({
            message: `This is a demo, so ${business.name} stays open. In the live product it would close once open work is settled.`,
            tone: "info",
          });
        }}
      />
    </Page>
  );
}
