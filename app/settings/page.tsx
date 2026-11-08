"use client";

import { SettingsScreen } from "@/components/settings/settings-screen";
import { AppShell } from "@/components/shell/app-shell";

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsScreen />
    </AppShell>
  );
}
