import type { ReactNode } from "react";

import type { FaultState } from "@/lib/engine/session";

/**
 * The four states, plus the colour the engine uses for its own readings.
 *
 * `belief` is not a fault state. It is what the instrument says about itself —
 * probabilities, meters, evidence trails — and giving it its own colour is what
 * stops the whole page from being one accent applied to everything. A student
 * should be able to tell, at a glance and without reading, which marks are the
 * engine measuring and which are the engine *telling them something*.
 */
export type Tone = "idle" | "belief" | "signal" | "suspect" | "resolved";

export function toneForState(state: FaultState): Tone {
  if (state === "confirmed") return "signal";
  if (state === "suspected") return "suspect";
  if (state === "ruled-out" || state === "clear") return "resolved";
  return "idle";
}

const CHIP: Record<Tone, string> = {
  idle: "border-rule-strong bg-sunk/60 text-ink-soft",
  belief: "border-belief/35 bg-belief-soft text-belief",
  signal: "border-signal/40 bg-signal-soft text-signal",
  suspect: "border-suspect/40 bg-suspect-soft text-suspect",
  resolved: "border-resolved/35 bg-resolved-soft text-resolved",
};

const BAR: Record<Tone, string> = {
  idle: "bg-idle",
  belief: "bg-belief",
  signal: "bg-signal",
  suspect: "bg-suspect",
  resolved: "bg-resolved",
};

const TILE: Record<Tone, string> = {
  idle: "border-rule bg-sunk/40 text-ink-faint",
  belief: "border-belief/40 bg-belief-soft text-belief",
  signal: "border-signal bg-signal text-paper shadow-[0_2px_0_0_rgb(200_55_26_/_0.35)]",
  suspect: "border-suspect bg-suspect text-paper shadow-[0_2px_0_0_rgb(163_112_15_/_0.3)]",
  resolved: "border-resolved bg-resolved-soft text-resolved",
};

const WORDS: Record<FaultState, string> = {
  confirmed: "live",
  suspected: "suspected",
  clear: "nothing found",
  "ruled-out": "ruled out",
  unprobed: "not asked",
};

export function stateWords(state: FaultState): string {
  return WORDS[state];
}

const SWATCH: Record<Tone, string> = {
  idle: "bg-idle",
  belief: "bg-belief",
  signal: "bg-signal",
  suspect: "bg-suspect",
  resolved: "bg-resolved",
};

/**
 * The colour of a fault, as a single class, so a legend, a tile and a progress
 * board cannot drift apart. Every place a state is shown as a dot or a bar reads
 * it from here.
 */
export function swatchForState(state: FaultState): string {
  return SWATCH[toneForState(state)];
}

export function swatchForTone(tone: Tone): string {
  return SWATCH[tone];
}

const LEGEND: ReadonlyArray<readonly [Tone, string]> = [
  ["idle", "not tested"],
  ["suspect", "suspected"],
  ["signal", "live"],
  ["resolved", "ruled out"],
];

/** Four states, four colours, spelled out once and reused on every screen. */
export function Legend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      {LEGEND.map(([tone, word]) => (
        <span key={tone} className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${SWATCH[tone]}`} />
          <span className="label">{word}</span>
        </span>
      ))}
    </div>
  );
}

export function Rule({ strong = false, className = "" }: { strong?: boolean; className?: string }) {
  return <div aria-hidden="true" className={`h-px w-full ${strong ? "bg-rule-strong" : "bg-rule"} ${className}`} />;
}

export function Chip({ tone = "idle", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] leading-none whitespace-nowrap ${CHIP[tone]}`}
    >
      {children}
    </span>
  );
}

export function StateChip({ state }: { state: FaultState }) {
  return (
    <Chip tone={toneForState(state)}>
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          state === "confirmed" ? "bg-signal" : "bg-current opacity-60"
        }`}
      />
      {stateWords(state)}
    </Chip>
  );
}

/**
 * A reading, not a decoration: the bar is the number.
 *
 * Thicker than a hairline because it is the one thing on the question screen that
 * moves while a student answers, and a student who can see the engine change its
 * mind is a student who believes the engine is doing something.
 */
export function Meter({
  value,
  tone = "belief",
  animate = true,
  height = 6,
}: {
  value: number;
  tone?: Tone;
  animate?: boolean;
  height?: number;
}) {
  const percent = Math.max(2, Math.min(100, value * 100));
  return (
    <div
      aria-hidden="true"
      className="w-full overflow-hidden rounded-full bg-sunk"
      style={{ height }}
    >
      <div
        className={`h-full rounded-full ${BAR[tone]} ${animate ? "transition-[width,background-color] duration-700 ease-out" : ""}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * One fault line, as a square.
 *
 * Twenty of these in a grid is the map, and the map is the point of the product:
 * it is the picture a student can take in before reading a word of it, and the
 * thing they send to a friend. Colour does the work, so the tile needs no label
 * until it is hovered or opened.
 */
export function FaultTile({
  index,
  tone,
  name,
  emphasis = false,
}: {
  index: number;
  tone: Tone;
  name: string;
  emphasis?: boolean;
}) {
  return (
    <div
      title={name}
      className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 px-1 text-center transition-transform duration-200 hover:-translate-y-0.5 ${TILE[tone]} ${
        emphasis ? "animate-pop" : ""
      }`}
    >
      <span className="reading text-[0.6875rem] leading-none opacity-70">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="hidden text-[0.625rem] leading-[1.15] font-semibold sm:block">
        {name.length > 22 ? `${name.slice(0, 21)}…` : name}
      </span>
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = "solid",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "solid" | "outline" | "quiet";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles =
    variant === "solid"
      ? "bg-belief text-paper shadow-[0_2px_0_0_rgb(31_95_139_/_0.35)] hover:bg-belief/90 active:translate-y-px active:shadow-none disabled:bg-idle disabled:shadow-none"
      : variant === "outline"
        ? "border-2 border-rule-strong text-ink hover:border-belief hover:text-belief disabled:border-rule disabled:text-idle"
        : "text-ink-soft hover:text-belief disabled:text-idle";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`label rounded-md px-4 py-2.5 transition-all disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  hint,
  id,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  id: string;
  autoFocus?: boolean;
}) {
  const shared =
    "w-full rounded-md border-2 border-rule bg-raised px-3 py-2.5 text-[0.9375rem] text-ink placeholder:text-ink-faint/80 transition-colors focus:border-belief focus:outline-none";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${shared} resize-y font-sans leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          className={shared}
        />
      )}
      {hint !== undefined && <p className="text-[0.8125rem] leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-6 pb-24">{children}</div>;
}
