"use client";

import { Check, CheckCircle2, EyeOff, Lightbulb, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { StarInput, StarRow } from "@/components/domain/stars";
import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { plural, quoted, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { reviewById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { FEE_PCT } from "@/lib/taxonomy";

import { cash, FORM, includedLine, reveal, suggestedLearnings, type Job } from "./helpers";
import { followUp } from "./next-action";
import { Panel } from "./panel";
import { ReviewArea } from "./review-area";

export type CompletedFlow = {
  afterReview: boolean;
  learningsDone: boolean;
  justApproved: boolean;
  onReviewed: () => void;
  onLearningsDone: () => void;
};

const MIN_TEXT = 20;

/* -------------------------------------------------------------------------- */
/* Ordering side: approved and paid, then review → learnings → order again     */
/* -------------------------------------------------------------------------- */

export function BusinessCompleted({ job, flow }: { job: Job; flow: CompletedFlow }) {
  const s = useDemo();
  const { commission: c, creatorName, totals, selected, product, adCopy } = job;
  const review = c.reviewId ? reviewById(s, c.reviewId) : undefined;
  const step = followUp(job, flow);
  const saved = product?.learnings.filter((l) => l.sourceCommissionId === c.id) ?? [];
  const [addingMore, setAddingMore] = useState(false);

  const steps = (
    <ol className="flex min-w-0 flex-col" aria-label="What's next">
      <Step n={1} title={review ? "Your review" : `How did ${creatorName} do?`} state={review ? "done" : "current"}>
        {review ? (
          <figure className="flex flex-col gap-1.5">
            <StarRow value={review.rating} size={15} />
            <blockquote className="y-small">{quoted(review.text)}</blockquote>
            <figcaption className="y-micro y-fg-2">
              {shortDate(review.createdAt)}
              {review.wouldRehire ? " · Would hire again" : ""}
            </figcaption>
          </figure>
        ) : (
          <ReviewForm job={job} onDone={flow.onReviewed} />
        )}
      </Step>

      {product ? (
        <Step
          n={2}
          title="Save what you learned"
          state={step === "learnings" || addingMore ? "current" : saved.length ? "done" : step === "review" ? "next" : "done"}
        >
          {step === "learnings" || addingMore ? (
            <LearningsForm
              job={job}
              onDone={() => {
                setAddingMore(false);
                flow.onLearningsDone();
              }}
            />
          ) : step === "review" ? (
            <p className="y-small y-fg-2">Comments worth keeping go with your next brief for {product.name}.</p>
          ) : (
            <p className="y-small y-fg-2">
              {saved.length
                ? `${plural(saved.length, "learning")} from this job saved to ${product.name}. `
                : `Nothing saved from this job. `}
              <button type="button" className="y-link font-medium text-(--b-fg)" onClick={() => setAddingMore(true)}>
                Add a learning
              </button>
            </p>
          )}
        </Step>
      ) : null}

      <Step n={product ? 3 : 2} title={`Order again from ${creatorName}`} state={step === "again" && !addingMore ? "current" : "next"} last>
        <p className="y-small y-fg-2">
          Your brief, the product context and every learning carry over.{" "}
          {job.latest?.video ? (
            <Link href={paths.library({ video: job.latest.video.id })} className="y-link font-medium text-(--b-fg)">
              See it in your Library
            </Link>
          ) : null}
        </p>
      </Step>
    </ol>
  );

  return (
    <Panel
      title={`Approved · ${cash(totals.total)} payment released`}
      line={`${c.completedAt ? `Approved ${shortDate(c.completedAt)}. ` : ""}${adCopy ? "The copy is yours to use." : "The video is yours to post."} ${includedLine(job)}`}
      icon={<CheckCircle2 size={24} aria-hidden className="text-(--y-success)" />}
    >
      {selected ? <ReviewArea job={job} delivery={selected} aside={steps} collapsed /> : steps}
    </Panel>
  );
}

function Step({
  n,
  title,
  state,
  children,
  last = false,
}: {
  n: number;
  title: string;
  state: "done" | "current" | "next";
  children?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className="flex gap-3.5" aria-current={state === "current" ? "step" : undefined}>
      <div className="flex flex-col items-center">
        <span
          className={`y-num grid size-7 flex-none place-items-center rounded-full text-[13px] font-semibold ${
            state === "done"
              ? "bg-(--b-fg) text-(--b-bg)"
              : state === "current"
                ? "shadow-[inset_0_0_0_2px_var(--b-fg)]"
                : "y-fg-2 shadow-[inset_0_0_0_1.5px_var(--b-line-strong)]"
          }`}
        >
          {state === "done" ? <Check size={14} strokeWidth={3} aria-hidden /> : n}
          <span className="sr-only">{state === "done" ? ", done" : state === "current" ? ", now" : ", next"}</span>
        </span>
        {last ? null : <span aria-hidden className="my-1 w-px flex-1 bg-(--b-line)" />}
      </div>
      <div className={`flex min-w-0 flex-1 flex-col gap-2 ${last ? "" : "pb-5"}`}>
        <h3 className={`y-head pt-0.5 ${state === "next" ? "y-fg-2" : ""}`}>{title}</h3>
        {children}
      </div>
    </li>
  );
}

function ReviewForm({ job, onDone }: { job: Job; onDone: () => void }) {
  const toast = useToast();
  const { creatorName } = job;
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [timeliness, setTimeliness] = useState(0);
  const [text, setText] = useState("");
  const [rehire, setRehire] = useState(true);
  const [tried, setTried] = useState(false);
  const length = text.trim().length;
  const starsMissing = !quality || !communication || !timeliness;
  const textError = tried && length < MIN_TEXT ? `A few more words, please: at least ${MIN_TEXT} characters (${length} so far).` : null;

  return (
    <form
      id={FORM.review}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (starsMissing || length < MIN_TEXT) {
          reveal(event.currentTarget, "center");
          return;
        }
        const rating = Math.round((quality + communication + timeliness) / 3);
        actions.leaveReview({
          commissionId: job.commission.id,
          rating,
          quality,
          communication,
          timeliness,
          text: text.trim(),
          wouldRehire: rehire,
          learnings: [],
        });
        toast({ message: `Review posted to ${creatorName}'s profile. Thank you.` });
        onDone();
      }}
    >
      <p className="y-small y-fg-2">Your review appears on {creatorName}&apos;s profile with your name.</p>
      <div className="flex flex-col">
        {(
          [
            [job.adCopy ? "Quality of the copy" : "Quality of the video", quality, setQuality],
            ["Communication", communication, setCommunication],
            ["On time", timeliness, setTimeliness],
          ] as const
        ).map(([label, value, set]) => (
          <div
            key={label}
            className="flex flex-col gap-1 border-b border-(--b-line) py-1.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="y-small font-medium">{label}</span>
            <StarInput value={value} onChange={set} label={label} size={24} />
          </div>
        ))}
        {tried && starsMissing ? (
          <p role="alert" className="y-small pt-1 font-medium text-(--y-danger)">
            Give each one a rating from 1 to 5 stars.
          </p>
        ) : null}
      </div>
      <TextArea
        label="Your review"
        name="review-text"
        required
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        error={textError}
        placeholder={
          job.adCopy
            ? `e.g. ${creatorName} wrote the way our customers talk. Headline 1 is already our best ad.`
            : `e.g. ${creatorName} got our customers straight away. The hook landed in the first two seconds.`
        }
      />
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="y-small font-medium">I&apos;d hire {creatorName} again</span>
        <input type="checkbox" role="switch" className="y-switch" checked={rehire} onChange={(event) => setRehire(event.target.checked)} />
      </label>
      <div className="max-lg:hidden">
        <PillButton type="submit" variant="neon">
          Post review
        </PillButton>
      </div>
    </form>
  );
}

function LearningsForm({ job, onDone }: { job: Job; onDone: () => void }) {
  const toast = useToast();
  const { commission: c, product } = job;
  const already = new Set(product?.learnings.map((l) => l.text.trim().toLowerCase()) ?? []);
  const suggestions = suggestedLearnings(c).filter((text) => !already.has(text.toLowerCase()));
  const [extra, setExtra] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [tried, setTried] = useState(false);
  const all = [...suggestions, ...extra];
  if (!product) return null;

  const addDraft = () => {
    const value = draft.trim();
    if (!value) return;
    if (!all.some((item) => item.toLowerCase() === value.toLowerCase())) setExtra((list) => [...list, value]);
    setChosen((list) => (list.includes(value) ? list : [...list, value]));
    setDraft("");
  };

  return (
    <form
      id={FORM.learnings}
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const picked = all.filter((item) => chosen.includes(item));
        if (!picked.length) {
          setTried(true);
          reveal(event.currentTarget, "center");
          return;
        }
        for (const text of picked) actions.addLearning(product.id, text, { commissionId: c.id, creatorId: c.creatorId });
        toast({ message: `${plural(picked.length, "learning")} saved to ${product.name}. They go with your next brief.` });
        onDone();
      }}
    >
      <p className="y-small y-fg-2">
        Tick what should carry into your next brief for {product.name}. Every creator you work with sees these.
      </p>
      {all.length ? (
        <ul className="flex flex-col gap-1.5">
          {all.map((item) => (
            <li key={item}>
              <label className="y-tile flex cursor-pointer items-start gap-3 p-3">
                <input
                  type="checkbox"
                  className="y-check mt-0.5"
                  checked={chosen.includes(item)}
                  onChange={() => setChosen((list) => (list.includes(item) ? list.filter((v) => v !== item) : [...list, item]))}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="y-small">{item}</span>
                  <span className="y-micro y-fg-2">{extra.includes(item) ? "Added by you" : "From your comments"}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-micro y-fg-2">There are no comments on this job to suggest from. Add your own below.</p>
      )}
      <div className="flex gap-2">
        <label htmlFor="job-learning" className="sr-only">
          Add a learning
        </label>
        <input
          id="job-learning"
          className="y-input min-w-0 flex-1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
          placeholder="e.g. Open on the shop counter, not the phone"
        />
        <PillButton variant="soft" icon={<Plus size={16} aria-hidden />} onClick={addDraft} disabled={!draft.trim()}>
          Add
        </PillButton>
      </div>
      {tried && !chosen.length ? (
        <p role="alert" className="y-small font-medium text-(--y-danger)">
          Tick at least one, or skip this step.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="max-lg:hidden">
          <PillButton type="submit" variant="neon" icon={<Lightbulb size={16} aria-hidden />}>
            {chosen.length ? `Save ${plural(chosen.length, "learning")}` : "Save learnings"}
          </PillButton>
        </span>
        <PillButton variant="ghost" onClick={onDone}>
          Skip
        </PillButton>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Making side: paid, the brand's review, private feedback about the client     */
/* -------------------------------------------------------------------------- */

export function CreatorCompleted({ job }: { job: Job; flow: CompletedFlow }) {
  const s = useDemo();
  const { commission: c, businessName, totals, selected } = job;
  const review = c.reviewId ? reviewById(s, c.reviewId) : undefined;
  const feedback = c.clientFeedback;
  const aside = (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="flex flex-col gap-2" aria-labelledby="their-review">
        <h3 id="their-review" className="y-head">
          {businessName}&apos;s review
        </h3>
        {review ? (
          <figure className="flex flex-col gap-1.5">
            <StarRow value={review.rating} size={15} />
            <blockquote className="y-small">{quoted(review.text)}</blockquote>
            <figcaption className="y-micro y-fg-2">
              {review.authorName}, {review.authorTitle}
              {review.wouldRehire ? " · Would hire again" : ""}
            </figcaption>
          </figure>
        ) : (
          <p className="y-small y-fg-2">No review yet. It shows on your profile when they leave one.</p>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t border-(--b-line) pt-5" aria-labelledby="private-rating">
        <h3 id="private-rating" className="y-head inline-flex items-center gap-2">
          <EyeOff size={16} aria-hidden /> How was working with {businessName}?
        </h3>
        {feedback ? (
          <p className="y-small inline-flex flex-wrap items-center gap-2">
            You rated them <StarRow value={feedback.rating} size={14} />
            <span className="y-fg-2">Only Yapp sees this.</span>
          </p>
        ) : (
          <FeedbackForm job={job} />
        )}
      </section>
    </div>
  );
  return (
    <Panel
      title={`Paid · ${cash(totals.creatorEarns)} is in your earnings`}
      line={`${businessName} approved ${job.noun} ${job.latest?.version ?? 1}${c.completedAt ? ` on ${shortDate(c.completedAt)}` : ""}. That's the ${cash(totals.total)} price after Yapp's ${FEE_PCT}% fee.`}
      icon={<CheckCircle2 size={24} aria-hidden className="text-(--y-success)" />}
    >
      {selected ? <ReviewArea job={job} delivery={selected} aside={aside} collapsed /> : aside}
    </Panel>
  );
}

function FeedbackForm({ job }: { job: Job }) {
  const toast = useToast();
  const { businessName } = job;
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  return (
    <form
      id={FORM.feedback}
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!rating) {
          reveal(event.currentTarget, "center");
          return;
        }
        actions.leaveClientFeedback(job.commission.id, rating, text.trim());
        toast({ message: "Thanks. Your rating stays private." });
      }}
    >
      <p className="y-small y-fg-2">
        Private: only Yapp sees it, never {businessName}. It helps us send you good clients.
      </p>
      <StarInput value={rating} onChange={setRating} label={`Rate ${businessName}`} size={28} />
      {tried && !rating ? (
        <p role="alert" className="y-small font-medium text-(--y-danger)">
          Pick a rating from 1 to 5 stars.
        </p>
      ) : null}
      <TextArea
        label="Anything we should know?"
        rows={2}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="e.g. Clear brief, fast replies, and the notes were specific."
      />
      <div className="max-lg:hidden">
        <PillButton type="submit" variant="neon">
          Send rating
        </PillButton>
      </div>
    </form>
  );
}
