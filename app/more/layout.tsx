import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "More",
  description: "Yapp's services, how it works, help, the company and legal documents, and your region.",
};

export default function MoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
