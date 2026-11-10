import { Clock, FileText } from "lucide-react";
import type { Metadata } from "next";

import { PublicShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Page, PageHeader } from "@/components/ui/page";

export const metadata: Metadata = {
  title: "Legal",
  description: "Yapp's terms and policies. Each document is in legal review and will be published here.",
};

/** Names only: the drafts are in legal review and the owner chose not to publish them yet. */
const documents = [
  "Terms of Service",
  "Brand Terms",
  "Creator Agreement",
  "Privacy Policy",
  "Cookie Policy",
  "Acceptable Use & Community Guidelines",
  "Copyright & IP Policy",
  "Refund & Cancellation Policy",
  "Order Dispute Policy",
  "ID Verification & Biometric Data Notice",
  "Accessibility Statement",
  "Fair Deal Commitments",
];

export default function LegalPage() {
  return (
    <PublicShell>
      <Page width="narrow">
        <PageHeader
          title="Legal"
          description="Our terms and policies are being reviewed by our lawyers. Each one will be published here in full when the review is done."
        />
        <Block as="section" aria-labelledby="legal-docs" pad="md" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="legal-docs" className="y-head">
              {documents.length} documents
            </h2>
            <Badge tone="neutral" icon={<Clock size={14} aria-hidden />}>
              In legal review
            </Badge>
          </div>
          <ul className="flex flex-col">
            {documents.map((name) => (
              <li
                key={name}
                className="flex min-h-14 items-center gap-3 border-t border-(--b-line) py-3 first:border-t-0"
              >
                <span aria-hidden className="y-tile grid size-9 flex-none place-items-center !rounded-(--y-r-sm)">
                  <FileText size={18} />
                </span>
                <span className="y-body font-medium">{name}</span>
              </li>
            ))}
          </ul>
        </Block>
        <p className="y-small y-fg-2 px-1 pt-4">
          This is a prototype with demo data. Nothing here is a binding agreement.
        </p>
      </Page>
    </PublicShell>
  );
}
