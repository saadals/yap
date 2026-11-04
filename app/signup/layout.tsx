import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Join Yapp as a business that needs social videos, or as a creator who makes them. Payment is protected on every commission.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
