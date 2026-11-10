import type { Metadata } from "next";

import { AppPreview } from "@/components/discover/app-preview";

export const metadata: Metadata = {
  title: "App preview",
  robots: { index: false, follow: false },
};

/**
 * The phone feed in read-only preview mode, for the frame on Discover ("Get the app"). Being served
 * at this address is what turns preview mode on (lib/preview.ts): the seed in memory, no storage.
 */
export default function AppPreviewPage() {
  return <AppPreview />;
}
