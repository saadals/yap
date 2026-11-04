import type { Metadata, Viewport } from "next";
import { Funnel_Display, Funnel_Sans, Rubik, Zain } from "next/font/google";
import { cookies } from "next/headers";

import { AppRoot } from "@/components/shell/app-root";
import type { SessionRole, Theme } from "@/lib/prefs";

import "./globals.css";

/* Latin display + text (Funnel); Arabic display + text (Zain / Rubik) for Arabic content.
   adjustFontFallback is off so a metric-adjusted Arial never swallows the other script. */
const display = Funnel_Display({
  subsets: ["latin"],
  variable: "--y-font-display",
  display: "swap",
  adjustFontFallback: false,
});
const text = Funnel_Sans({
  subsets: ["latin"],
  variable: "--y-font-text",
  display: "swap",
  adjustFontFallback: false,
});
const arDisplay = Zain({
  subsets: ["arabic"],
  weight: ["400", "700", "800"],
  variable: "--y-font-ar-display",
  display: "swap",
  adjustFontFallback: false,
});
const arText = Rubik({
  subsets: ["arabic"],
  variable: "--y-font-ar-text",
  display: "swap",
  adjustFontFallback: false,
});

/** Only the primary family: next/font's generated fallback face covers all of Unicode and would
    swallow Arabic glyphs before the Arabic face gets a chance. */
const primary = (font: { style: { fontFamily: string } }) =>
  font.style.fontFamily.split(",")[0].trim();

const fontVars = {
  "--y-font-display": primary(display),
  "--y-font-text": primary(text),
  "--y-font-ar-display": primary(arDisplay),
  "--y-font-ar-text": primary(arText),
} as React.CSSProperties;

export const metadata: Metadata = {
  title: {
    default: "Yapp · Social videos for your app, made by real creators",
    template: "%s · Yapp",
  },
  description:
    "Commission creators who speak your audience's language to make selfie demos, walkthroughs and honest reviews for your app. Payment is protected until you approve.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eeeeea" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const theme: Theme = jar.get("yapp_theme")?.value === "dark" ? "dark" : "light";
  const roleCookie = jar.get("yapp_role")?.value;
  const role: SessionRole =
    roleCookie === "business" || roleCookie === "creator" ? roleCookie : null;

  return (
    <html
      lang="en"
      dir="ltr"
      className={`${display.variable} ${text.variable} ${arDisplay.variable} ${arText.variable} ${theme === "dark" ? "dark" : ""}`}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body>
        <AppRoot theme={theme} role={role} fontStyle={fontVars}>
          {children}
        </AppRoot>
      </body>
    </html>
  );
}
