/**
 * Where the app is served from. Empty locally; "/yap" on GitHub Pages (project site), set at build
 * time through NEXT_PUBLIC_BASE_PATH. Next's <Link> and router add the base path automatically;
 * use these helpers only for raw URLs (copy-link buttons, share text, window.location).
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Absolute URL for an in-app path, e.g. absoluteUrl("/creators/laylatalks"). Client-only. */
export function absoluteUrl(path: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${basePath}${path}`;
}

/**
 * Runs in <head> before paint: applies the saved theme so dark mode never flashes light, and marks
 * <html> with `y-session` when signed in, so the signed-out welcome screen can hide itself before
 * the client redirect to the feed (static hosting has no middleware to do this on the server).
 */
export const themeBootScript = `(function(){try{var d=document.documentElement,c=document.cookie,m=c.match(/(?:^|; )yapp_theme=(dark|light)/);if(m&&m[1]==="dark"){d.classList.add("dark");d.style.colorScheme="dark";}if(/(?:^|; )yapp_account=[^;]+/.test(c)){d.classList.add("y-session");}}catch(e){}})();`;
