/**
 * "Help me write this": a first draft of the brief from the saved product and the format. Plain
 * templates (no model), so the same product and format always give the same draft.
 */

import type { FormatId, Product } from "@/lib/types";

/** The first sentence of a product's problem, without its full stop. */
function painOf(product: Product): string {
  const first = product.problem.split(/(?<=[.!?])\s+/)[0] ?? product.problem;
  return first.replace(/[.!?]$/, "").trim();
}

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const clean = (text: string) => text.replace(/\.$/, "").trim();

export type BriefDraft = { hook: string; mustShow: string; goal: string; keyMessage: string };

export function draftBrief(format: FormatId | null, product: Product, adCopy: boolean): BriefDraft {
  const pain = painOf(product);
  const feature = clean(product.features[0] ?? product.oneLiner);
  const second = product.features[1] ? clean(product.features[1]) : "";
  const cta = clean(product.cta || `Try ${product.name}`);
  const name = product.name;

  if (adCopy) {
    return {
      hook: `Open on the line a customer would say out loud: ${lower(pain)}.`,
      mustShow: [feature, second, `End on: "${cta}"`].filter(Boolean).join("\n"),
      goal: `Copy that sounds like ${name}'s customers and gets them to act.`,
      keyMessage: clean(product.oneLiner),
    };
  }

  const hooks: Record<FormatId, string> = {
    "app-demo": `Open mid-moment, phone in hand: ${lower(pain)}. Then fix it with ${name} on screen.`,
    "screen-walkthrough": `Start on the finished result, then rewind: "Here's how I ${lower(feature)}."`,
    unboxing: `Box in hand, one honest line about why you wanted to try ${name}, then open it.`,
    "problem-solution": `Act out the problem in one shot, no words needed: ${lower(pain)}.`,
    comparison: `Same task, side by side: the usual way on the left, ${name} on the right.`,
    testimonial: `Straight to camera: "Here's what changed when I switched to ${name}."`,
    "talking-head": `Say the one thing in the first line: "${feature}."`,
    voiceover: `First line over the screen: "${clean(product.oneLiner)}."`,
    "hook-pack": `Five different first lines for the same ad, each under two seconds. Lead with: ${lower(pain)}.`,
    "ad-copy": `Open on the line a customer would say out loud: ${lower(pain)}.`,
  };
  const goals: Record<FormatId, string> = {
    "app-demo": `Make ${name} feel like the obvious fix for a problem viewers have every week.`,
    "screen-walkthrough": `A new user gets it right on the first try.`,
    unboxing: `Capture the first few minutes with ${name}: out of the box, set up, first impressions.`,
    "problem-solution": `Viewers recognize the pain, then see ${name} fix it in seconds.`,
    comparison: `Viewers see the difference for themselves, told fairly.`,
    testimonial: `Build trust with a real-feeling story of switching to ${name}.`,
    "talking-head": `Explain one thing ${name} does so viewers can try it themselves.`,
    voiceover: `A short story over ${name} footage where the product is the turning point.`,
    "hook-pack": `Find the opening that stops the scroll, ready for paid testing.`,
    "ad-copy": `Copy that sounds like ${name}'s customers and gets them to act.`,
  };
  const key = format ?? "app-demo";
  return {
    hook: hooks[key],
    mustShow: [feature, second, `End on: "${cta}"`].filter(Boolean).join("\n"),
    goal: goals[key],
    keyMessage: clean(product.oneLiner),
  };
}
