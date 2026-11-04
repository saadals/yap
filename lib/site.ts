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

/** Runs in <head> before paint: applies the saved theme so dark mode never flashes light. */
export const themeBootScript = `(function(){try{var m=document.cookie.match(/(?:^|; )yapp_theme=(dark|light)/);if(m&&m[1]==="dark"){var d=document.documentElement;d.classList.add("dark");d.style.colorScheme="dark";}}catch(e){}})();`;
