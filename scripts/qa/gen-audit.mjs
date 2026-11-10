// Generates an audit flow for scripts/qa/cdp.mjs: every route at every width, asserting no
// horizontal overflow, Inter only, no emoji and no exclamation marks in interface copy, no
// dark-mode switch and no Next error overlay. A step fails with a short description of what it found.
//
// Usage: node scripts/qa/gen-audit.mjs <nour|layla|none> <out.json> [widths] [routes-file] [wait-ms]
//   widths       comma-separated, default 390,768,1024,1280,1440 (under 768 runs as a touch phone)
//   routes-file  one route per line, default scripts/qa/audit-routes.txt
//   wait-ms      pause after each page load, default 1800 (use more against a dev server)
// Then: BASE_URL=http://localhost:3123 node scripts/qa/cdp.mjs <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [account, out, widthsArg = "390,768,1024,1280,1440", routesFile, waitArg = "1800"] = process.argv.slice(2);
if (!account || !out) {
  console.error("usage: node scripts/qa/gen-audit.mjs <nour|layla|none> <out.json> [widths] [routes-file] [wait-ms]");
  process.exit(2);
}
const wait = Number(waitArg);
const routes = readFileSync(routesFile || join(here, "audit-routes.txt"), "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

// Runs in the page. Returns "" when clean, otherwise a short list of problems.
const check = `(() => {
  const out = [];
  const de = document.documentElement;
  const over = de.scrollWidth - de.clientWidth;
  if (over > 1) {
    // Name the widest offender to make the fix findable.
    let worst = null, worstRight = de.clientWidth;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > worstRight + 1) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') continue;
        let clipped = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p);
          if (o.overflowX !== 'visible' || o.overflow !== 'visible') { clipped = true; break; }
        }
        if (!clipped) { worst = el; worstRight = r.right; }
      }
    }
    out.push('overflow ' + over + 'px' + (worst ? ' by <' + worst.tagName.toLowerCase() + ' class="' + String(worst.className).slice(0, 60) + '">' : ''));
  }
  const fonts = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let bang = null, emoji = null;
  const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{1F1E6}-\\u{1F1FF}]/u;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,[data-user-text],nextjs-portal')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    fonts.add(fam);
    if (!bang && t.includes('!')) bang = t.slice(0, 70);
    if (!emoji && emojiRe.test(t.replace(/[\\u2713\\u2714\\u2192\\u2190\\u2197\\u2198\\u2605\\u2606\\u00B7\\u2022\\u2715\\u00D7]/g, ''))) emoji = t.slice(0, 50);
  }
  const odd = [...fonts].filter((f) => !/^(Inter|__Inter|ui-monospace|SFMono-Regular|Menlo|monospace)/i.test(f) && !/inter/i.test(f));
  if (odd.length) out.push('fonts ' + odd.join('|'));
  if (bang) out.push('bang: ' + bang);
  if (emoji) out.push('emoji: ' + emoji);
  const dark = [...document.querySelectorAll('button,[role=switch],label,a')].find((b) => /dark mode|dark theme|appearance/i.test(b.textContent || '') || /dark mode|dark theme/i.test(b.getAttribute('aria-label') || ''));
  if (dark) out.push('dark switch: ' + (dark.textContent || dark.getAttribute('aria-label')).trim().slice(0, 40));
  if (document.querySelector('nextjs-portal')?.shadowRoot?.querySelector('[data-nextjs-dialog], [data-nextjs-toast-errors]')) out.push('next error overlay');
  return out.join(' ; ');
})()`;

const steps = [];
for (const w of widthsArg.split(",").map(Number)) {
  const mobile = w < 1024;
  steps.push({ viewport: { width: w, height: mobile ? 844 : 900, mobile: w < 768 } });
  for (const r of routes) {
    steps.push({ go: r, after: wait });
    steps.push({ eval: `(${JSON.stringify(w + " " + r)}, ${check})`, equals: "" });
  }
}
const flow = { width: 1440, height: 900, steps };
if (account !== "none") flow.account = account;
writeFileSync(out, JSON.stringify(flow, null, 1));
console.log(`${out}: ${steps.length} steps`);
