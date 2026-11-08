import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
  description: "One inbox for every conversation, whether you ordered the work or you're making it.",
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
