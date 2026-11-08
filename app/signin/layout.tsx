import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Yapp to order videos from creators, or to make them and get paid.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
