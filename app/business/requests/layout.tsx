import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Requests",
  description: "Your content requests: compare pitches side by side, hire, and post new requests.",
};

export default function RequestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
