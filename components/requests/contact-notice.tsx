import { ShieldCheck } from "lucide-react";

import { hasContactDetails } from "@/lib/contact";

/**
 * Quiet note under a text box when the text holds contact details (phone, email, link, handle).
 * The store hides them on send (lib/contact.ts); this says so before it happens.
 */
export function ContactNotice({ text, className = "" }: { text: string; className?: string }) {
  if (!hasContactDetails(text)) return null;
  return (
    <p className={`y-micro y-fg-2 flex items-start gap-1.5 px-1 ${className}`} role="status">
      <ShieldCheck size={14} aria-hidden className="mt-0.5 flex-none" />
      Contact details are hidden when you send. Keep it on Yapp so payment protection covers the work.
    </p>
  );
}
