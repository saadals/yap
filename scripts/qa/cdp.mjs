// Minimal Chrome DevTools Protocol driver for QA: scripted flows, text assertions, screenshots.
// No dependencies (Node >= 22 for the global WebSocket). Needs Google Chrome installed and the
// app running on BASE_URL (default http://localhost:3123, e.g. `npm run build && npx next start -p 3123`).
//
//   node scripts/qa/cdp.mjs scripts/qa/flows/core-loop.json
//
// Flow file: { width?, height?, mobile?, theme?: "dark" | "light", account?: "nour" | "layla",
//   steps: [ {go: "/path", after?: ms}, {wait: ms}, {click: "visible text"}, {clickSel: "css"},
//            {type: {sel, text}}, {text: "must appear"}, {notText: "must not appear"},
//            {eval: "js expression"}, {shot: "name", full?},
//            {account: "nour" | "layla"}   // switch the signed-in demo account (reloads the page)
//            {key: "ArrowDown"}            // keyboard (ArrowUp/Down/Left/Right, Enter, Escape)
//            {swipe: "left" | "right" | "up" | "down", sel?: "css", span?, dt?}   // touch swipe (mobile flows)
//          ] }
//
// One account type: flows sign in as a demo account (`account`, or the legacy `role`: business →
// nour, creator → layla). `click` prefers controls inside the top-most open dialog (sheets render
// above page buttons with the same label), then controls inside the viewport (the reels feed
// repeats labels like "Order"). Every run clears the app's cookies and storage first, so the demo
// starts from the seed. Screenshots go to .qa/shots/ (gitignored). Exits 1 if any step fails or the
// page throws.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), ".qa");
mkdirSync(join(OUT, "shots"), { recursive: true });
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:3123";
const script = JSON.parse(readFileSync(process.argv[2], "utf8"));
const port = 9300 + Math.floor(Math.random() * 500);

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    // One profile per process so several runs can work in parallel (profiles live in .qa/, gitignored).
    `--user-data-dir=${join(OUT, "profiles", String(process.pid))}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    wsUrl = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch {
    /* not up yet */
  }
  if (!wsUrl) await sleep(200);
}
if (!wsUrl) {
  console.error("Could not connect to Chrome. Set CHROME_PATH if Chrome lives elsewhere.");
  chrome.kill();
  process.exit(1);
}

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
  if (msg.method === "Runtime.exceptionThrown")
    errors.push(
      msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text,
    );
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error")
    errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result
    ?.result?.value;

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
// Fresh demo every run: clear this origin's storage and all cookies.
await send("Storage.clearDataForOrigin", { origin: new URL(BASE).origin, storageTypes: "all" });
await send("Network.clearBrowserCookies");

const width = script.width ?? 1440;
const height = script.height ?? 1000;
const mobile = !!script.mobile;
const metrics = (h) =>
  send("Emulation.setDeviceMetricsOverride", {
    width,
    height: h,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile,
  });
await metrics(height);
if (script.theme) await send("Network.setCookie", { name: "yapp_theme", value: script.theme, url: BASE });
const account = script.account ?? { business: "nour", creator: "layla" }[script.role];
if (account) await send("Network.setCookie", { name: "yapp_account", value: account, url: BASE });
if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

const clickByText = (want) => `(() => {
  const want = ${JSON.stringify(want)};
  const dialogs = [...document.querySelectorAll('[role=dialog]')];
  const root = dialogs.length ? dialogs[dialogs.length - 1] : document;
  const visible = (sel) => [...root.querySelectorAll(sel)].filter((e) => e.getClientRects().length && !e.disabled);
  const label = (e) => (e.innerText || e.getAttribute('aria-label') || '').trim();
  const find = (els) => els.find((e) => label(e) === want) || els.find((e) => label(e).startsWith(want)) || els.find((e) => label(e).includes(want));
  // Prefer what's on screen (repeated labels in feeds and lists), then anything in the document.
  const onScreen = (e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const pick = (els) => find(els.filter(onScreen)) || find(els);
  // Real controls first; <label> (e.g. card-style radios/checkboxes) only as a fallback.
  const el = pick(visible('button, a, [role=radio], [role=tab]')) || pick(visible('label'));
  if (!el) return false;
  el.scrollIntoView({ block: 'center' });
  el.click();
  return true;
})()`;

for (const step of script.steps) {
  if (step.go) {
    await send("Page.navigate", { url: BASE + step.go });
    await sleep(step.after ?? 2500);
  } else if (step.wait) {
    await sleep(step.wait);
  } else if (step.click) {
    if (!(await evaluate(clickByText(step.click)))) errors.push(`click target not found: ${step.click}`);
    await sleep(step.after ?? 900);
  } else if (step.clickSel) {
    const ok = await evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(step.clickSel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`,
    );
    if (!ok) errors.push(`selector not found: ${step.clickSel}`);
    await sleep(step.after ?? 900);
  } else if (step.type) {
    const ok = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(step.type.sel)});
      if (!el) return false;
      el.focus();
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(step.type.text)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    if (!ok) errors.push(`type target not found: ${step.type.sel}`);
    await sleep(step.after ?? 400);
  } else if (step.account) {
    await evaluate(`(() => {
      document.cookie = "yapp_account=${step.account}; path=/; max-age=31536000; samesite=lax";
      sessionStorage.setItem("yapp-account", "${step.account}");
      location.reload();
      return true;
    })()`);
    await sleep(step.after ?? 2500);
  } else if (step.key) {
    const codes = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27 };
    for (const type of ["rawKeyDown", "keyUp"]) {
      await send("Input.dispatchKeyEvent", {
        type,
        key: step.key,
        code: step.key,
        windowsVirtualKeyCode: codes[step.key] ?? 0,
      });
    }
    await sleep(step.after ?? 900);
  } else if (step.swipe) {
    const box = await evaluate(`(() => {
      const el = ${step.sel ? `document.querySelector(${JSON.stringify(step.sel)})` : "null"};
      const r = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    })()`);
    if (!box) {
      errors.push(`swipe target not found: ${step.sel}`);
    } else {
      const dist = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[step.swipe];
      // `span` (fraction of the target's short side) and `dt` (ms between moves) tune the gesture:
      // a quick, long flick is needed to get past CSS scroll-snap in headless Chrome.
      const span = Math.min(box.w, box.h) * (step.span ?? 0.45);
      const point = (t) => ({ x: Math.round(box.x + dist[0] * span * t), y: Math.round(box.y + dist[1] * span * t), id: 1 });
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(0)] });
      for (let i = 1; i <= 8; i++) {
        await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(i / 8)] });
        await sleep(step.dt ?? 16);
      }
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    await sleep(step.after ?? 1200);
  } else if (step.notText) {
    const has = await evaluate(
      `document.body.innerText.replace(/\\s+/g, " ").includes(${JSON.stringify(step.notText.replace(/\s+/g, " "))})`,
    );
    console.log(`${has ? "MISS" : "ok  "} not "${step.notText}"`);
    if (has) errors.push(`unexpected text: ${step.notText}`);
  } else if (step.eval) {
    console.log(`eval: ${JSON.stringify(await evaluate(step.eval))}`);
  } else if (step.text) {
    // Whitespace-insensitive: "7 of 10" matches text split across elements ("7\nof 10").
    const has = await evaluate(
      `document.body.innerText.replace(/\\s+/g, " ").includes(${JSON.stringify(step.text.replace(/\s+/g, " "))})`,
    );
    console.log(`${has ? "ok  " : "MISS"} "${step.text}"`);
    if (!has) errors.push(`missing text: ${step.text}`);
  } else if (step.shot) {
    if (step.full) {
      await metrics(Math.min(await evaluate("document.documentElement.scrollHeight"), 6000));
      await sleep(500);
    }
    const res = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, "shots", `${step.shot}.png`), Buffer.from(res.result.data, "base64"));
    console.log(`shot: .qa/shots/${step.shot}.png`);
    if (step.full) await metrics(height);
  }
}

console.log(errors.length ? `FAILED:\n- ${errors.join("\n- ")}` : "PASS: all steps ok, no page errors");
ws.close();
chrome.kill();
process.exit(errors.length ? 1 : 0);
