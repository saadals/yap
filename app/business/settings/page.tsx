"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { CompanyProfileForm } from "@/components/settings/company-profile";
import { ConfirmSheet } from "@/components/settings/confirm-sheet";
import { SettingsSection, SwitchRow } from "@/components/settings/controls";
import { NotificationPrefsControls } from "@/components/settings/notification-prefs";
import { SectionNav, useSettingsSection } from "@/components/settings/section-nav";
import { MemberProfileForm, TeamSection } from "@/components/settings/team";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { me } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { AUTO_APPROVE_DAYS } from "@/lib/taxonomy";

const sections = [
  { id: "company", label: "Company" },
  { id: "you", label: "Your profile" },
  { id: "team", label: "Team" },
  { id: "notifications", label: "Notifications" },
];
/** Anchors from before sections were merged. */
const aliases = { approvals: "notifications", danger: "company" };

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
  const [section, setSection] = useSettingsSection(sections, aliases);

  return (
    <Page>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-3">
          <SectionNav sections={sections} active={section} onSelect={setSection} />
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:col-span-9">
          <div hidden={section !== "company"}>
            <SettingsSection id="company" title="Company profile">
              {hydrated ? <CompanyProfileForm /> : <FormSkeleton rows={4} />}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--b-line) pt-5">
                <div className="min-w-0">
                  <p className="y-small font-semibold">Close workspace</p>
                  <p className="y-micro y-fg-2">Open commissions must finish first. Receipts stay available for 7 years.</p>
                </div>
                <PillButton
                  variant="ghost"
                  size="sm"
                  icon={<TriangleAlert size={16} aria-hidden />}
                  onClick={() => setClosing(true)}
                >
                  Close workspace
                </PillButton>
              </div>
            </SettingsSection>
          </div>

          <div hidden={section !== "you"}>
            <SettingsSection id="you" title="Your profile">
              {hydrated ? <MemberProfileForm /> : <FormSkeleton />}
            </SettingsSection>
          </div>

          <div hidden={section !== "team"}>
            <SettingsSection
              id="team"
              title="Team"
              description="Everyone can post requests, hire creators and approve work."
            >
              {hydrated ? <TeamSection /> : <FormSkeleton rows={2} />}
            </SettingsSection>
          </div>

          <div hidden={section !== "notifications"}>
            <SettingsSection id="notifications" title="Notifications">
              {hydrated ? (
                <NotificationPrefsControls role="business" email={prefs.invoiceEmail}>
                  <SwitchRow
                    label="Remind me before a delivery auto-approves"
                    icon={<CheckCircle2 size={18} />}
                    description={`Deliveries approve automatically after ${AUTO_APPROVE_DAYS} days. We'll nudge you 24 and 2 hours before.`}
                    checked={prefs.autoApproveReminders}
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
                </NotificationPrefsControls>
              ) : (
                <FormSkeleton rows={3} />
              )}
            </SettingsSection>
          </div>
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
