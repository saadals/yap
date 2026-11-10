import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New product",
  description: "Save a product once and reuse it in every order.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
