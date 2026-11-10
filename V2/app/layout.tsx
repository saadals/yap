import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { AppRoot } from "@/components/shell/app-root";
import { themeBootScript } from "@/lib/site";

import "./globals.css";

/* Inter, and nothing else: weights 400, 500 and 600 only (the brand book). Arabic snippets fall
   through to the system's Arabic face. adjustFontFallback is off so a metric-adjusted Arial never
   swallows the Arabic glyphs before the system face gets them. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--y-font-text",
  display: "swap",
  adjustFontFallback: false,
});

/** Only the primary family, so the browser falls through to system faces for other scripts. */
const fontVars = {
  "--y-font-text": inter.style.fontFamily.split(",")[0].trim(),
} as React.CSSProperties;

export const metadata: Metadata = {
  title: {
    default: "Yapp · Short videos from real creators, made for tech brands",
    template: "%s · Yapp",
  },
  description: "Short videos from real creators, made for tech brands.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Without this, env(safe-area-inset-*) reads 0 and the full-bleed feed can't clear the notch.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint (works on static hosting too). */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <AppRoot fontStyle={fontVars}>{children}</AppRoot>
      </body>
    </html>
  );
}
