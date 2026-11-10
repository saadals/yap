/**
 * Where the app is served from. Empty locally; "/yap" on GitHub Pages (project site), set at build
 * time through NEXT_PUBLIC_BASE_PATH. Next's <Link> and router add the base path automatically;
 * use these helpers only for raw URLs (copy-link buttons, share text, window.location).
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * URL of a file in `public/`, e.g. asset("/brand/yapping-mark.svg"). Raw `src` attributes don't get
 * the base path the way <Link> does, so "/brand/…" alone would 404 under "/yap" on GitHub Pages.
 * Safe on server and client (NEXT_PUBLIC_ values are inlined at build time).
 */
export function asset(path: string): string {
  return `${basePath}${path}`;
}

/** Absolute URL for an in-app path, e.g. absoluteUrl("/creators/laylatalks"). Client-only. */
export function absoluteUrl(path: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${basePath}${path}`;
}

/**
 * Runs in <head> before paint: marks <html> with `y-session` when signed in (static hosting has no
 * middleware to decide on the server). Everything that must not flash the wrong screen keys off it,
 * together with the 1024px layout switch, which CSS media queries already know before paint:
 * - "/" (components/shell/home-route.tsx): the static HTML is the signed-out bubble landing, hidden
 *   under `y-session` until the client shows Discover, or sends the visitor to Work (an account
 *   that only makes videos) or, on a phone, to the feed.
 * - "/home" and "/more" (phone only): hidden from 1024px by CSS (`.y-phone-only`) until the client
 *   sends desktop visitors to "/".
 * - Public pages (PublicShell): the static HTML draws both the signed-in and the signed-out header
 *   and tab bar; `y-session` shows one (`.y-in-only` / `.y-out-only` in app/styles/shell.css).
 *
 * Dark mode is paused (round 3 answers, item 49): the app is light only, so this no longer reads
 * the `yapp2_theme` cookie and never adds `html.dark`. The dark values stay in app/globals.css,
 * dormant. To switch dark mode back on, restore the theme lines below (they applied `dark` and
 * `color-scheme` from the cookie before paint) and set DARK_MODE_ENABLED in lib/prefs.tsx.
 *   m=c.match(/(?:^|; )yapp2_theme=(dark|light)/);if(m&&m[1]==="dark"){d.classList.add("dark");d.style.colorScheme="dark";}
 */
export const themeBootScript = `(function(){try{var d=document.documentElement,c=document.cookie;if(/(?:^|; )yapp2_account=[^;]+/.test(c)){d.classList.add("y-session");}}catch(e){}})();`;
