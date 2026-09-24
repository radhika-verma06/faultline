"use client";

import { useState } from "react";

import type { FaultProfile, RemediationDraft } from "@/lib/ai/types";
import { item as itemById } from "@/lib/domain/items";
import { SEVERITY_ORDER, type Misconception } from "@/lib/domain/misconceptions";
import type { Diagnosis, FaultReading } from "@/lib/engine/session";

import {
  Button,
  Chip,
  FaultTile,
  Legend,
  Meter,
  Rule,
  StateChip,
  stateWords,
  toneForState,
} from "./ui";

const SEVERITY_WORDS: Record<string, string> = {
  foundational: "everything built on this is affected",
  consequential: "produces specific wrong answers later",
  localised: "stays contained",
};

/**
 * What changed since the student was last here.
 *
 * This is the whole reason the memory layer exists. A diagnosis is only worth
 * recording if the next visit can tell the student that something closed.
 */
function closedSince(prior: FaultProfile | null, current: Diagnosis): FaultReading[] {
  if (prior === null) return [];
  return current.faults.filter((reading) => {
    const before = prior.beliefs[reading.id] ?? 0;
    return before >= 0.82 && reading.state === "ruled-out";
  });
}

export function Report({
  diagnosis,
  draft,
  prior,
  onRestart,
  onEditKey,
}: {
  diagnosis: Diagnosis;
  draft: RemediationDraft | null;
  prior: FaultProfile | null;
  onRestart: () => void;
  onEditKey: () => void;
}) {
  const primary = diagnosis.primary;
  const closed = closedSince(prior, diagnosis);

  return (
    <>
      <div className="animate-rise pt-10">
        <span className="label">The diagnosis</span>

        {primary === null ? (
          <div className="mt-4 rounded-2xl border-2 border-rule bg-raised p-5 md:p-7">
            <h2 className="prose-page text-[1.75rem] leading-[1.2] md:text-[2.125rem]">
              Nothing is established yet.
            </h2>
            <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
              The answers did not separate any single fault from the field, so there is no honest
              diagnosis to give. That happens when questions are answered consistently correctly, or
              when two faults pull the evidence in opposite directions.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              {[
                [`${diagnosis.correct} / ${diagnosis.answered}`, "answers correct"],
                [`${diagnosis.probed} / ${diagnosis.total}`, "fault lines tested"],
              ].map(([figure, caption]) => (
                <div key={caption}>
                  <div className="reading text-[1.25rem] text-belief">{figure}</div>
                  <div className="label mt-1">{caption}</div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[0.875rem] leading-relaxed text-ink-faint">
              A confident wrong answer is worse than this outcome, so the engine did not give one.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border-2 border-signal/35 bg-signal-soft/55 shadow-[0_2px_0_0_rgb(200_55_26_/_0.18)]">
            <div className="p-5 md:p-7">
              <div className="flex flex-wrap items-center gap-3">
                <StateChip state={primary.state} />
                <span className="reading text-[0.8125rem] text-ink-soft">
                  {primary.misconception.name} · {Math.round(primary.probability * 100)}%
                </span>
              </div>
              <h2 className="prose-page mt-4 text-[1.6875rem] leading-[1.18] tracking-[-0.015em] text-ink md:text-[2.375rem]">
                &ldquo;{primary.misconception.inTheirWords}&rdquo;
              </h2>
            </div>

            {draft !== null && (
              <div className="border-t-2 border-signal/20 bg-raised/70 px-5 py-4 md:px-7">
                <span className="label">The one line to keep</span>
                <p className="prose-page mt-1.5 text-[1.125rem] leading-snug text-ink md:text-[1.25rem]">
                  {draft.cue}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {primary !== null && draft !== null && <Lesson draft={draft} reading={primary} />}

      {closed.length > 0 && (
        <div className="mt-12 flex gap-4 rounded-2xl border-2 border-resolved/40 bg-resolved-soft p-5">
          <span className="reading text-[1.75rem] leading-none text-resolved">{closed.length}</span>
          <div>
            <span className="label text-resolved">Closed since your last session</span>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {closed.map((reading) => (
                <li key={reading.id} className="text-[0.9375rem] text-resolved">
                  {reading.misconception.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <FaultMap diagnosis={diagnosis} prior={prior} />

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button onClick={onRestart} variant="outline">
          Run it again
        </Button>
        <Button onClick={onEditKey} variant="quiet">
          Change the intelligence layer
        </Button>
      </div>
    </>
  );
}

/**
 * The teaching, as three cards rather than three paragraphs.
 *
 * The words are the authored ones — nothing here is generated — but a wall of
 * prose is a wall, however true it is. What to do sits on its own, in its own
 * colour, so a student who reads nothing else still leaves with something to try.
 */
function Lesson({ draft, reading }: { draft: RemediationDraft; reading: FaultReading }) {
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border-2 border-rule bg-raised p-5 md:col-span-2">
        <span className="label">What is actually going on</span>
        <p className="prose-page mt-3 text-[1.0625rem] leading-relaxed text-ink-soft">
          {draft.opening}
        </p>
        <p className="prose-page mt-3 text-[1.0625rem] leading-relaxed text-ink-soft">
          {draft.shift}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-rule pt-4">
          <span className="label mr-1 self-center">Where this bites next</span>
          {reading.misconception.breaks.map((topic) => (
            <Chip key={topic} tone="idle">
              {topic}
            </Chip>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-belief/35 bg-belief-soft/60 p-5">
        <span className="label text-belief">The one question that settles it</span>
        <p className="prose-page mt-3 text-[1.125rem] leading-snug text-ink">{draft.settleIt}</p>
      </div>

      <div className="rounded-2xl border-2 border-resolved/40 bg-resolved-soft/70 p-5">
        <span className="label text-resolved">Two minutes, with what is in the room</span>
        <p className="prose-page mt-3 text-[1.125rem] leading-snug text-ink">{draft.tryIt}</p>
      </div>

      <p className="text-[0.75rem] leading-relaxed text-ink-faint md:col-span-2">
        The line to keep, the settling question and the experiment are authored, not generated. The{" "}
        {draft.source} layer only rewrote the framing around them, in the student&rsquo;s own words.
      </p>
    </div>
  );
}

/**
 * The map.
 *
 * Twenty tiles, coloured by state, because this is the artifact the whole product
 * exists to produce and the thing a student screenshots. It leads, and the
 * evidence trail behind each fault folds out underneath it — a student who wants
 * to argue with the diagnosis can, but they are not made to read it to get the
 * picture.
 */
function FaultMap({ diagnosis, prior }: { diagnosis: Diagnosis; prior: FaultProfile | null }) {
  const [open, setOpen] = useState<string | null>(null);
  // Twenty rows of quoted beliefs is the wall of text this page used to be. The
  // tiles are the map; the rows are the appendix, and a student who wants them can
  // ask for them — which is also how the page stays short enough to read.
  const [showAll, setShowAll] = useState(false);

  const grouped = SEVERITY_ORDER.map((severity) => ({
    severity,
    readings: diagnosis.faults.filter((reading) => reading.misconception.severity === severity),
  }));

  return (
    <section className="mt-14">
      <Rule strong />
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label">The map</span>
          <div className="mt-1.5 flex items-baseline gap-6">
            <div>
              <span className="reading text-[1.5rem] text-belief">{diagnosis.probed}</span>
              <span className="reading ml-1 text-[0.8125rem] text-ink-faint">
                /{diagnosis.total} tested
              </span>
            </div>
            <div>
              <span className="reading text-[1.5rem] text-resolved">{diagnosis.correct}</span>
              <span className="reading ml-1 text-[0.8125rem] text-ink-faint">
                /{diagnosis.answered} correct
              </span>
            </div>
          </div>
        </div>
        <ShareMap diagnosis={diagnosis} />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-10">
        {diagnosis.faults.map((reading, index) => (
          <button
            key={reading.id}
            type="button"
            onClick={() => {
              setOpen(reading.id);
              setShowAll(true);
            }}
            className="rounded-md text-left"
            aria-label={`${reading.misconception.name} — ${stateWords(reading.state)}`}
          >
            <FaultTile
              index={index}
              tone={toneForState(reading.state)}
              name={reading.misconception.name}
              emphasis={reading.state === "confirmed"}
            />
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Legend />
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="label ml-auto text-ink-faint underline decoration-rule-strong underline-offset-4 hover:text-belief"
        >
          {showAll ? "hide the detail" : `every fault line, in detail (${diagnosis.total})`}
        </button>
      </div>

      {showAll &&
        grouped.map(({ severity, readings }) => (
        <div key={severity} className="mt-9">
          <div className="flex items-baseline justify-between gap-3 border-b-2 border-rule-strong pb-2">
            <span className="label">{severity}</span>
            <span className="text-[0.75rem] text-ink-faint">{SEVERITY_WORDS[severity] ?? severity}</span>
          </div>

          <ul className="flex flex-col">
            {readings.map((reading) => (
              <FaultRow
                key={reading.id}
                reading={reading}
                wasLive={prior !== null && (prior.beliefs[reading.id] ?? 0) >= 0.82}
                open={open === reading.id}
                onToggle={() => setOpen(open === reading.id ? null : reading.id)}
              />
            ))}
          </ul>
        </div>
        ))}
    </section>
  );
}

/**
 * The map, as text, on the clipboard.
 *
 * The go-to-market plan says the map is the growth loop: students send each other
 * the picture, because finding out exactly what you have wrong is more
 * interesting than finding out you scored 70%. A share button is the smallest
 * thing that makes that possible without a backend.
 */
function ShareMap({ diagnosis }: { diagnosis: Diagnosis }) {
  const [copied, setCopied] = useState(false);

  const share = () => {
    const lines = diagnosis.faults
      .filter((reading) => reading.state === "confirmed" || reading.state === "suspected")
      .map(
        (reading) =>
          `· ${reading.misconception.name} — ${Math.round(reading.probability * 100)}% (${stateWords(reading.state)})`,
      );
    const summary = [
      "My Faultline map",
      `${diagnosis.probed}/${diagnosis.total} fault lines tested, ${diagnosis.correct}/${diagnosis.answered} answers correct`,
      ...(lines.length > 0 ? lines : ["· nothing established this time"]),
    ].join("\n");

    try {
      void navigator.clipboard?.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // A blocked clipboard is not worth an error message.
    }
  };

  return (
    <Button onClick={share} variant="outline">
      {copied ? "Copied" : "Copy my map"}
    </Button>
  );
}

function FaultRow({
  reading,
  wasLive,
  open,
  onToggle,
}: {
  reading: FaultReading;
  wasLive: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const fault: Misconception = reading.misconception;
  const interactive = reading.contributions.length > 0;

  return (
    <li className="border-b border-rule">
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-5 gap-y-2 py-4 md:grid-cols-[1fr_9rem_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              aria-hidden="true"
              className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                reading.state === "confirmed"
                  ? "bg-signal"
                  : reading.state === "suspected"
                    ? "bg-suspect"
                    : reading.state === "unprobed"
                      ? "bg-idle"
                      : "bg-resolved"
              }`}
            />
            <span className="text-[0.9375rem] text-ink">{fault.name}</span>
            {wasLive && reading.state === "ruled-out" && <Chip tone="resolved">closed</Chip>}
          </div>
          <p className="mt-1 pl-[22px] text-[0.875rem] leading-snug text-ink-faint">
            &ldquo;{fault.inTheirWords}&rdquo;
          </p>
        </div>

        <div className="hidden md:block">
          <Meter value={reading.probability} tone={toneForState(reading.state)} height={5} />
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="reading text-[0.75rem] text-ink-faint">
              {Math.round(reading.probability * 100)}%
            </span>
            {interactive ? (
              <button
                type="button"
                onClick={onToggle}
                className="label text-[0.625rem] text-ink-faint underline decoration-rule-strong underline-offset-4 hover:text-belief"
              >
                {open ? "hide why" : "why"}
              </button>
            ) : (
              <span className="label text-[0.625rem] text-ink-faint/70">{stateWords(reading.state)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end md:justify-start">
          <StateChip state={reading.state} />
        </div>
      </div>

      {open && (
        <div className="pb-5">
          <div className="label">What moved this</div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {reading.contributions.map((contribution, index) => {
              const source = itemById(contribution.itemId);
              return (
                <li
                  key={`${contribution.itemId}-${contribution.kind}-${index}`}
                  className="reading flex flex-wrap items-baseline gap-x-2 text-[0.75rem] text-ink-faint"
                >
                  <span className="text-ink-soft">{source.id}</span>
                  <span>option {contribution.optionKey}</span>
                  <span>{contribution.kind === "reasoning" ? "your words" : "your answer"}</span>
                  <span className={contribution.weight > 0 ? "text-signal" : "text-resolved"}>
                    {contribution.weight > 0 ? "+" : ""}
                    {contribution.weight.toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="prose-page mt-3 max-w-2xl text-[0.875rem] leading-relaxed text-ink-soft">
            {fault.correction}
          </p>
        </div>
      )}
    </li>
  );
}
