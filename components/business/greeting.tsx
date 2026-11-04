"use client";

import { Fragment } from "react";

import { plural } from "@/lib/format";
import { commissionsForBusiness, me, requestsForBusiness } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

import { recentPitches } from "./next-step";

/** Page h1: a fixed greeting plus one line that says what needs you and what's moving. */
export function Greeting({ className = "" }: { className?: string }) {
  const s = useDemo();
  const firstName = me.member(s).name.split(" ")[0];
  const commissions = commissionsForBusiness(s);
  const toReview = commissions.filter((c) => c.status === "delivered").length;
  const inProduction = commissions.filter(
    (c) => c.status === "in_progress" || c.status === "revision",
  ).length;
  const newPitches = requestsForBusiness(s)
    .filter((r) => r.status === "open")
    .reduce((sum, r) => sum + recentPitches(s, r.id).length, 0);

  const parts = [
    toReview ? `${plural(toReview, "video")} ready for review` : "",
    newPitches ? plural(newPitches, "new pitch", "new pitches") : "",
    inProduction ? `${inProduction} in production` : "",
  ].filter(Boolean);

  return (
    <header className={`flex flex-col gap-2 px-1 pt-2 pb-5 md:pb-6 ${className}`}>
      <h1 className="y-display y-t-display">
        Good morning, <span className="y-strong">{firstName}</span>
      </h1>
      <p className="y-lead y-fg-2">
        {parts.length ? (
          <>
            {parts.map((part, index) => (
              <Fragment key={part}>
                {index > 0 ? (index === parts.length - 1 ? " and " : ", ") : null}
                {part}
              </Fragment>
            ))}
            .
          </>
        ) : (
          "Nothing needs you right now. Your creators are on it."
        )}
      </p>
    </header>
  );
}
