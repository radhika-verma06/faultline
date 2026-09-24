"use client";

import type { Item } from "@/lib/domain/items";
import type { FaultReading, Confidence } from "@/lib/engine/session";

import {
  Button,
  Chip,
  FaultTile,
  Field,
  Legend,
  Meter,
  swatchForState,
  toneForState,
} from "./ui";

const CONFIDENCE_WORDS: Record<Confidence, string> = {
  1: "Guessing",
  2: "Fairly sure",
  3: "Certain",
};

export type ReadNote = {
  source: string;
  because: string;
  moved: string;
};

/**
 * Two students, one wrong answer, two different reasons.
 *
 * This is the entire argument of the product and it fits in a small card, so it
 * is a card rather than two paragraphs. A student should be able to see it before
 * they have agreed to read anything.
 */
function TwoStudents() {
  const students = [
    {
      who: "A",
      tone: "border-belief/40 bg-belief-soft text-belief",
      says: "a moving object is still being pushed",
    },
    {
      who: "B",
      tone: "border-signal/40 bg-signal-soft text-signal",
      says: "the force of the throw is stored in the ball",
    },
  ];

  return (
    <div className="mt-8 rounded-xl border-2 border-rule bg-raised p-4 shadow-[0_1px_0_0_rgb(197_187_164_/_0.5)]">
      <span className="label">Two students · one wrong answer · two different faults</span>
      <ul className="mt-3 flex flex-col gap-2.5">
        {students.map((student) => (
          <li key={student.who} className="flex items-center gap-3">
            <span
              className={`reading flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[0.75rem] ${student.tone}`}
            >
              {student.who}
            </span>
            <span className="flex items-baseline gap-2 text-[0.875rem] leading-snug text-ink-soft">
              <span className="reading shrink-0 rounded border-2 border-ink/70 px-1.5 text-[0.6875rem] text-ink">
                C
              </span>
              <span>{student.says}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.8125rem] leading-snug text-ink-faint">
        Same red cross, opposite fixes. A score cannot see the difference.
      </p>
    </div>
  );
}

/**
 * What actually happens, in three pictures.
 *
 * The first version of this screen explained the product in two paragraphs, which
 * is a way of not explaining it: a student has to hold three ideas in their head
 * before the first one pays off. Three numbered panels, each four words long, do
 * the same work in a glance.
 */
function HowItWorks() {
  const steps = [
    {
      tone: "border-belief/35 bg-belief-soft/60 text-belief",
      dot: "bg-belief",
      title: "It asks",
      detail: "the question that splits the remaining faults",
    },
    {
      tone: "border-suspect/40 bg-suspect-soft text-suspect",
      dot: "bg-suspect",
      title: "It reads why",
      detail: "your answer, how sure you were, and your own words",
    },
    {
      tone: "border-signal/40 bg-signal-soft text-signal",
      dot: "bg-signal",
      title: "It teaches one thing",
      detail: "the fault underneath, and nothing else",
    },
  ];

  return (
    <ol className="mt-8 grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} className={`rounded-xl border-2 p-3.5 ${step.tone}`}>
          <div className="flex items-center gap-2">
            <span
              className={`reading flex h-5 w-5 items-center justify-center rounded-full text-[0.6875rem] text-paper ${step.dot}`}
            >
              {index + 1}
            </span>
            <span className="text-[0.8125rem] font-semibold tracking-tight">{step.title}</span>
          </div>
          <p className="mt-2 text-[0.8125rem] leading-snug text-ink-soft">{step.detail}</p>
        </li>
      ))}
      <li className="sr-only">
        Then it shows the map: every one of the twenty fault lines, marked live, suspected, ruled out
        or not yet asked.
      </li>
    </ol>
  );
}

export function StartScreen({
  name,
  onName,
  onBegin,
  faultNames,
  priorConfirmed,
}: {
  name: string;
  onName: (next: string) => void;
  onBegin: () => void;
  faultNames: readonly string[];
  priorConfirmed: number;
}) {
  return (
    <div className="wash -mx-6 grid gap-12 px-6 pt-10 pb-12 md:grid-cols-[1.08fr_0.92fr] md:gap-14 md:pt-14">
      <div className="animate-rise">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="belief">{faultNames.length} fault lines</Chip>
          <Chip tone="idle">12 questions, at most</Chip>
          <Chip tone="resolved">nothing uploaded</Chip>
        </div>

        <h2 className="prose-page mt-6 text-[2.125rem] leading-[1.1] tracking-[-0.02em] md:text-[2.875rem]">
          You did not get it wrong
          <br />
          <span className="text-signal">for no reason.</span>
        </h2>

        <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
          Most quizzes tell you which answer was right. Faultline reads <em>why</em> you chose the
          one you did, finds the exact misconception behind it, and teaches only that.
        </p>

        <TwoStudents />

        <HowItWorks />

        {priorConfirmed > 0 && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border-2 border-resolved/40 bg-resolved-soft px-4 py-3">
            <span className="reading text-[1.25rem] font-semibold text-resolved">
              {priorConfirmed}
            </span>
            <p className="text-[0.8125rem] leading-snug text-resolved">
              {priorConfirmed === 1 ? "fault line was" : "fault lines were"} live last time. Run it
              again and this session will tell you which have closed.
            </p>
          </div>
        )}

        {/* A form, not a button, so Return starts the diagnosis. A student who
            types their name and presses Enter and gets nothing concludes the app
            is broken, which is exactly what happened here. */}
        <form
          className="mt-8 max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            onBegin();
          }}
        >
          <Field
            id="learner"
            label="What should the page call you?"
            value={name}
            onChange={onName}
            placeholder="First name or initials"
            hint="Kept on this device, so you can come back to your map."
            autoFocus
          />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="submit">Begin the diagnosis</Button>
            <span className="label">or press return</span>
          </div>
        </form>
      </div>

      <aside className="animate-rise md:pt-2">
        <div className="rounded-xl border-2 border-rule bg-raised/70 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label">The map you are about to earn</span>
            <span className="reading text-[0.75rem] text-ink-faint">{faultNames.length}</span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {faultNames.map((fault, index) => (
              <FaultTile key={fault} index={index} tone="idle" name={fault} />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-3">
            <Legend />
          </div>
        </div>

        <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-faint">
          One tile per fault line. You will not be asked about all of them — that is the point.
        </p>
      </aside>
    </div>
  );
}

/**
 * The live reading.
 *
 * Deliberately visible while a student answers: watching the engine change its
 * mind is the only evidence a student has that any of this is being measured
 * rather than marked.
 */
export function BeliefRail({
  readings,
  probed,
  total,
  source,
}: {
  readings: readonly FaultReading[];
  probed: number;
  total: number;
  source: string;
}) {
  const shown = [...readings]
    .filter((reading) => reading.state !== "unprobed")
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 6);

  const leader = shown[0];

  return (
    <aside className="md:sticky md:top-8">
      <div className="rounded-xl border-2 border-rule bg-raised/70 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="label">What the engine believes</span>
          <Chip tone={source === "Neural Pulse" ? "belief" : "idle"}>{source}</Chip>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="reading text-[1.5rem] leading-none text-belief">{probed}</span>
          <span className="reading text-[0.8125rem] text-ink-faint">of {total} tested</span>
        </div>

        {/* The map, filling in. Twenty squares, so the board a student met on the
            start screen is visibly going from empty to answered — progress they
            can take in without reading a single probability. */}
        <div className="mt-3 flex flex-wrap gap-1" aria-hidden="true">
          {readings.map((reading) => (
            <span
              key={reading.id}
              className={`h-2.5 w-2.5 rounded-[2px] transition-colors duration-500 ${swatchForState(reading.state)}`}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3.5">
          {shown.length === 0 && (
            <p className="text-[0.875rem] leading-relaxed text-ink-faint">
              Nothing yet. Your first answer starts the instrument.
            </p>
          )}

          {shown.map((reading) => (
            <div key={reading.id} className="animate-ink">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-2 text-[0.8125rem] leading-snug text-ink">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${swatchForState(reading.state)}`}
                  />
                  {reading.misconception.name}
                </span>
                <span
                  className={`reading shrink-0 text-[0.8125rem] ${
                    reading.state === "confirmed" ? "text-signal" : "text-ink-faint"
                  }`}
                >
                  {Math.round(reading.probability * 100)}%
                </span>
              </div>
              <div className="mt-1.5">
                <Meter value={reading.probability} tone={toneForState(reading.state)} />
              </div>
            </div>
          ))}
        </div>

        {leader !== undefined && leader.state === "confirmed" && (
          <p className="mt-4 rounded-lg bg-signal-soft px-3 py-2 text-[0.75rem] leading-snug text-signal">
            Live: <strong>{leader.misconception.inTheirWords}</strong>
          </p>
        )}

        <p className="mt-4 border-t border-rule pt-3 text-[0.75rem] leading-relaxed text-ink-faint">
          A fault is called live above 82%, and only when it leads the next candidate by 25 points.
        </p>
      </div>
    </aside>
  );
}

export function QuestionCard({
  item,
  index,
  budget,
  selected,
  onSelect,
  confidence,
  onConfidence,
  reasoning,
  onReasoning,
  onSubmit,
  busy,
  readNote,
}: {
  item: Item;
  index: number;
  budget: number;
  selected: string | null;
  onSelect: (key: string) => void;
  confidence: Confidence;
  onConfidence: (next: Confidence) => void;
  reasoning: string;
  onReasoning: (next: string) => void;
  onSubmit: () => void;
  busy: boolean;
  readNote: ReadNote | null;
}) {
  return (
    <div className="animate-rise">
      <div className="flex items-baseline justify-between gap-4">
        <span className="label">
          Question <span className="reading text-belief">{String(index).padStart(2, "0")}</span> of{" "}
          {budget}
        </span>
        <span className="reading text-[0.75rem] text-ink-faint">{item.id}</span>
      </div>
      <div className="mt-3">
        <Meter value={index / budget} tone="belief" height={5} />
      </div>

      <h3 className="prose-page mt-8 text-[1.3125rem] leading-[1.4] tracking-[-0.005em] text-ink md:text-[1.5rem]">
        {item.stem}
      </h3>

      <fieldset className="mt-6 flex flex-col gap-2.5">
        <legend className="sr-only">Choose one</legend>
        {item.options.map((option) => {
          const isSelected = option.key === selected;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.key)}
              className={`group flex items-start gap-3.5 rounded-xl border-2 px-3.5 py-3.5 text-left transition-all ${
                isSelected
                  ? "border-belief bg-belief-soft/70 shadow-[0_2px_0_0_rgb(31_95_139_/_0.22)]"
                  : "border-rule bg-raised/60 hover:-translate-y-px hover:border-belief/50 hover:bg-belief-soft/35"
              }`}
            >
              <span
                className={`reading mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-[0.75rem] transition-colors ${
                  isSelected
                    ? "border-belief bg-belief text-paper"
                    : "border-rule-strong text-ink-faint group-hover:border-belief group-hover:text-belief"
                }`}
              >
                {option.key}
              </span>
              <span
                className={`text-[0.9375rem] leading-relaxed ${isSelected ? "text-ink" : "text-ink-soft"}`}
              >
                {option.text}
              </span>
            </button>
          );
        })}
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="label">How sure are you?</span>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={confidence === level}
              onClick={() => onConfidence(level)}
              className={`label rounded-full border-2 px-3.5 py-2 transition-all ${
                confidence === level
                  ? "border-belief bg-belief text-paper shadow-[0_2px_0_0_rgb(31_95_139_/_0.28)]"
                  : "border-rule text-ink-faint hover:border-belief/50 hover:text-belief"
              }`}
            >
              {CONFIDENCE_WORDS[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Field
          id="reasoning"
          label="Why? Optional"
          value={reasoning}
          onChange={onReasoning}
          multiline
          rows={2}
          placeholder="Say it in your own words, the way you'd tell a friend."
          hint="One sentence is often worth three questions. This is what separates two faults that produce the same wrong answer."
        />
      </div>

      {readNote && (
        <div className="mt-5 flex gap-3 rounded-xl border-2 border-belief/30 bg-belief-soft/60 px-4 py-3">
          <span className="label shrink-0 pt-0.5 text-belief">{readNote.source}</span>
          <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
            {readNote.because} — <span className="text-belief">{readNote.moved}</span>
          </p>
        </div>
      )}

      <div className="mt-7 flex items-center gap-4">
        <Button onClick={onSubmit} disabled={selected === null || busy}>
          {busy ? "Reading…" : "Send this answer"}
        </Button>
        {selected === null && (
          <span className="text-[0.8125rem] text-ink-faint">Pick an option to continue.</span>
        )}
      </div>
    </div>
  );
}
