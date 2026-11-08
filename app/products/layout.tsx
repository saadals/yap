import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description: "Your saved products: the context and learnings every order starts from.",
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
