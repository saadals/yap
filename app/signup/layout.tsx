import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "One Yapp account to order social videos and to make them. Payment is protected on every order.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
