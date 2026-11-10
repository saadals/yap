"use client";

import { Clock, FileText } from "lucide-react";

import { PublicShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { List, Row } from "@/components/ui/list";
import { Page, PageHeader } from "@/components/ui/page";

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
      <Page width="narrow" className="pb-8 md:pt-14">
        <PageHeader
          title="Legal"
          description="Our terms and policies are being reviewed by our lawyers. Each one will be published here in full when the review is done."
        />
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <h2 className="y-head">{documents.length} documents</h2>
          <Badge tone="neutral" icon={<Clock size={14} aria-hidden />}>
            In legal review
          </Badge>
        </div>
        <List label="Legal documents">
          {documents.map((name) => (
            <Row
              key={name}
              lead={
                <span aria-hidden className="y-tile grid size-9 place-items-center !rounded-(--y-r-sm)">
                  <FileText size={17} />
                </span>
              }
              title={name}
            />
          ))}
        </List>
        <p className="y-small y-fg-2 px-1 pt-4">
          This is a prototype with demo data. Nothing here is a binding agreement.
        </p>
      </Page>
    </PublicShell>
  );
}
