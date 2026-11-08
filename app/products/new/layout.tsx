import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add a product",
  description: "Describe your product once so every order starts from it.",
};

export default function NewProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
