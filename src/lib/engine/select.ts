/**
 * Which question to ask next.
 *
 * A fixed questionnaire asks everyone the same 30 items and hands back a score.
 * This asks for the item that is expected to cut the remaining uncertainty the
 * most, which is what makes the sequence itself different for every student — and
 * is the part a static quiz provably cannot do.
 *
 * The calculation is Bayesian experimental design, in the small:
 *
 *   1. Name the hypotheses: every fault line, plus "none of these".
 *   2. For each hypothesis, imagine a student who holds it and predict how they
 *      would answer each candidate item.
 *   3. Score each candidate by how much its answer would shrink the entropy over
 *      those hypotheses — the mutual information between answer and hypothesis.
 *   4. Credit the item for the faults it would let the engine see properly for the
 *      first time. Without this the ranking has a hole in it; see `coverageGain`.
 *   5. Ask the highest scorer.
 *
 * The response model underneath is a softmax over per-option affinity: an option
 * is attractive in proportion to the beliefs it is evidence for, measured against
 * the base rate, plus a small standing preference for the true answer. That is a
 * simplification and it is stated as one — with 25 authored items and no cohort to
 * fit, a richer response model would be precision theatre.
 */

import { ITEMS, type Item, type Option } from "../domain/items";
import { MISCONCEPTION_IDS, PRIOR } from "../domain/misconceptions";
import { entropyOf, type Beliefs } from "./belief";

/** Sharper preferences than a flatter temperature, which would ask uninformative questions forever. */
const TEMPERATURE = 0.7;

/** The profile of a student who holds the hypothesis fault: it is very likely, its neighbours are not. */
const HELD = 0.9;
const NOT_HELD = 0.15;

/** The profile of a student holding none of them. */
const CLEAR = 0.12;

/**
 * Below this, a question is not worth a student's time. Set deliberately low:
 * with the whole fault space live, no single item is enormously informative, and
 * a high floor would end sessions that still had something useful to ask.
 */
export const INFORMATION_FLOOR = 0.001;

export type Hypothesis = {
  /** null means "none of these faults is the dominant one". */
  readonly id: string | null;
  readonly prior: number;
};

export type OptionProbability = {
  readonly optionKey: string;
  readonly probability: number;
};

/**
 * A student asked cold gets most items right. This is the whole of the model's
 * preference for the correct option: a prior about students in general, kept
 * deliberately small, because it is not a measurement of this one.
 */
const CORRECT_BASELINE = 0.35;

/**
 * How attractive an option is to a student believed to be `beliefs`.
 *
 * A distractor scores by the tell it carries: sum of (weight x belief), measured
 * *against the base rate*. The centring is the load-bearing part. An earlier
 * version scored the raw belief and gave the correct option a bonus equal to the
 * magnitude of its own evidence, which made the right answer the model's most
 * likely response for every student on almost every item — so no item ever looked
 * like it could separate a student who holds a fault from one who does not, and
 * the selector was never given a reason to ask the questions that carry a fault's
 * tell. The complete set of faults stayed nominally live and several of them were
 * unreachable in practice. `can reach every fault line it claims to know` in
 * engine.test.ts is the check that caught it.
 *
 * A fault sitting at the base rate is not evidence that the student holds it, so
 * it must not move any option's score. A fault believed above the base rate lifts
 * every option that points at it — which is exactly the prediction a diagnostic
 * needs: the student who holds it picks its distractor instead of the right
 * answer. A fault believed below the base rate pushes its distractor down and, by
 * the same arithmetic through the negative weights on the true option, lifts the
 * correct answer.
 */function affinity(option: Option, beliefs: Beliefs): number {
  let score = option.correct ? CORRECT_BASELINE : 0;
  for (const [id, weight] of Object.entries(option.evidence)) {
    score += weight * ((beliefs[id] ?? PRIOR) - PRIOR);
  }
  return score;
}

/** Softmax over affinities, made numerically safe by subtracting the maximum. */
export function optionProbabilities(
  item: Item,
  beliefs: Beliefs,
): OptionProbability[] {
  const scores = item.options.map((o) => affinity(o, beliefs));
  const max = scores.length > 0 ? Math.max(...scores) : 0;
  const weights = scores.map((s) => Math.exp((s - max) / TEMPERATURE));
  const total = weights.reduce((a, b) => a + b, 0);

  return item.options.map((o, i) => ({
    optionKey: o.key,
    probability: total > 0 ? weights[i] / total : 1 / item.options.length,
  }));
}

/**
 * The live hypothesis set.
 *
 * Every fault line is a live hypothesis, not only the current leaders, and that
 * is load-bearing rather than generous. An earlier version kept only the top few,
 * which deadlocked: a fault outside the set was never live, so no item could be
 * shown to discriminate it, so its information gain was identically zero, so it
 * was never asked, so its belief never rose, so it could never enter the set. A
 * student holding a fault that started outside the cut could answer every
 * question honestly and never be diagnosed with it. The unit tests cover exactly
 * this: `perpendicular-forces` is the only item that can detect one of the
 * faults, and under the capped version it was unreachable.
 *
 * Weights are the current belief in each fault, with "none of these" weighted by
 * how much room is left above the strongest fault. Summing every fault would make
 * "none of these" vanish after the first item, which is the opposite of what you
 * want early in a diagnosis.
 */
export function hypotheses(beliefs: Beliefs): Hypothesis[] {
  const ranked = [...MISCONCEPTION_IDS].sort(
    (a, b) => (beliefs[b] ?? PRIOR) - (beliefs[a] ?? PRIOR),
  );
  const faultWeights = ranked.map((id) => beliefs[id] ?? PRIOR);
  const strongest = faultWeights.length > 0 ? Math.max(...faultWeights) : 0;
  const noneWeight = Math.max(0.05, 1 - strongest);

  const total = faultWeights.reduce((a, b) => a + b, 0) + noneWeight;
  const entries: Hypothesis[] = ranked.map((id, i) => ({
    id,
    prior: faultWeights[i] / total,
  }));
  entries.push({ id: null, prior: noneWeight / total });

  return entries.filter((h) => h.prior > 0);
}

/** The profile a student would have if this single hypothesis were true. */
export function profileFor(hypothesis: string | null): Beliefs {
  const beliefs: Record<string, number> = {};
  for (const id of MISCONCEPTION_IDS) {
    if (hypothesis === null) beliefs[id] = CLEAR;
    else beliefs[id] = id === hypothesis ? HELD : NOT_HELD;
  }
  return beliefs;
}

/**
 * Expected reduction in entropy over the hypothesis set, in bits, from asking
 * this item. Zero means the item cannot tell any two of the live hypotheses
 * apart — it is not a hard question, it is an uninformative one.
 */
export function informationGain(item: Item, live: readonly Hypothesis[]): number {
  if (live.length < 2 || item.options.length < 2) return 0;

  const posteriorOf = live.map((h) =>
    optionProbabilities(item, profileFor(h.id)).map((o) => o.probability),
  );

  const marginal = item.options.map((_, optionIndex) =>
    live.reduce((sum, h, hIndex) => sum + h.prior * posteriorOf[hIndex][optionIndex], 0),
  );

  const before = entropyOf(live.map((h) => h.prior));

  let after = 0;
  item.options.forEach((_, optionIndex) => {
    const evidence = marginal[optionIndex];
    if (evidence <= 0) return;
    const posterior = live.map(
      (h, hIndex) => (h.prior * posteriorOf[hIndex][optionIndex]) / evidence,
    );
    after += evidence * entropyOf(posterior);
  });

  return Math.max(0, before - after);
}

export type Choice = {
  readonly item: Item;
  readonly informationGain: number;
  /** Information gain plus the coverage term: what selection actually ranks on. */
  readonly score: number;
};

/**
 * How well this item could possibly show a fault: the largest positive weight any
 * of its options carries for it. Zero means no answer to this item could ever move
 * that fault, in either direction.
 */
export function tellStrength(item: Item, faultId: string): number {
  let best = 0;
  for (const option of item.options) {
    const weight = option.evidence[faultId] ?? 0;
    if (weight > best) best = weight;
  }
  return best;
}

/** The strongest view of each fault that the questions asked so far have offered. */
export function bestSeenSoFar(asked: ReadonlySet<string>): Record<string, number> {
  const seen: Record<string, number> = {};
  for (const id of MISCONCEPTION_IDS) seen[id] = 0;
  for (const item of ITEMS) {
    if (!asked.has(item.id)) continue;
    for (const id of MISCONCEPTION_IDS) {
      const strength = tellStrength(item, id);
      if (strength > seen[id]) seen[id] = strength;
    }
  }
  return seen;
}

/**
 * The other half of the deadlock in ADR 0001.
 *
 * Keeping every fault live stops a fault being invisible *in principle*. It does
 * not stop a fault being invisible *in practice*, and the difference is what the
 * selector spends its questions on. Mutual information alone is biased against
 * items that test few faults: an item that splits one hypothesis off the set
 * reduces the entropy of a twenty-one-way distribution less than an item that
 * splits three, so the single-fault items lose every time and twelve questions go
 * by without the fault they alone can see ever being asked.
 *
 * That is not a ranking preference, it is a hole. A student holding a fault whose
 * only strong item never gets asked answers eleven questions correctly, looks like
 * a student with nothing wrong, and is told so.
 *
 * So an item is credited for the *new* view it offers: for each fault, how much
 * stronger a tell the student's answers would have been able to show than
 * anything asked so far, weighted by how live that fault still is. It is
 * deliberately not a threshold. A fault that has been seen only through a weak
 * tell still counts as under-seen, so an item that shows it properly is still
 * preferred to one that does not — which is what stops a single shared distractor
 * from being treated as though it settled the question.
 */
export const COVERAGE_WEIGHT = 1;

export function coverageGain(
  item: Item,
  live: readonly Hypothesis[],
  seen: Readonly<Record<string, number>>,
): number {
  let gain = 0;
  for (const hypothesis of live) {
    if (hypothesis.id === null) continue;
    const step = tellStrength(item, hypothesis.id) - (seen[hypothesis.id] ?? 0);
    if (step > 1e-9) gain += hypothesis.prior * step;
  }
  return gain;
}

/**
 * The most useful unasked item: the most informative one, plus what it would let
 * the engine see that it currently cannot. Ties resolve to the earlier item in the
 * bank, so the same session always produces the same sequence.
 */
export function chooseNextItem(
  beliefs: Beliefs,
  asked: ReadonlySet<string>,
): Choice | null {
  const candidates = ITEMS.filter((i) => !asked.has(i.id));
  if (candidates.length === 0) return null;

  const live = hypotheses(beliefs);
  const seen = bestSeenSoFar(asked);
  let best: Choice | null = null;

  for (const candidate of candidates) {
    const gain = informationGain(candidate, live);
    const coverage = coverageGain(candidate, live, seen);
    const score = gain + COVERAGE_WEIGHT * coverage;
    if (best === null || score > best.score) {
      best = { item: candidate, informationGain: gain, score };
    }
  }

  return best;
}
