/**
 * Belief over the fault lines.
 *
 * One number per misconception: the probability that the student holds it. The
 * state is a plain object of probabilities rather than an opaque model, for a
 * specific reason — a diagnosis a teacher cannot interrogate is a diagnosis a
 * teacher will not act on. Everything the engine believes is inspectable here.
 *
 * Updating is additive in log-odds, which is the right idiom for hand-authored
 * "tells": a weight of 1.8 means the same thing whatever the student's prior, and
 * two independent tells compose by adding. It is deliberately not a learned
 * model. With 22 items and no training data, a learned weight would be a
 * confident guess dressed as a measurement.
 */

import { MISCONCEPTION_IDS, PRIOR } from "../domain/misconceptions";

export type Beliefs = Readonly<Record<string, number>>;

/** Probabilities are kept strictly inside (0, 1) so log-odds never blows up. */
export const EPSILON = 1e-6;

/** No single response may move a belief by more than this, whatever it claims. */
export const MAX_WEIGHT = 3;

export function clampProbability(p: number): number {
  if (!Number.isFinite(p)) return PRIOR;
  return Math.min(1 - EPSILON, Math.max(EPSILON, p));
}

export function logit(p: number): number {
  const c = clampProbability(p);
  return Math.log(c / (1 - c));
}

export function sigmoid(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

export function initialBeliefs(): Beliefs {
  const beliefs: Record<string, number> = {};
  for (const id of MISCONCEPTION_IDS) {
    beliefs[id] = PRIOR;
  }
  return beliefs;
}

/**
 * Applies an evidence map.
 *
 * This function is the boundary where untrusted input enters the model: the
 * evidence map for a free-text answer is produced by a language model, not by
 * this codebase. So it is tolerant by construction.
 *
 *   - an id that is not in the knowledge base is dropped, so a model cannot
 *     invent a fault line and have it appear on a student's map;
 *   - a weight is clamped to +/- MAX_WEIGHT, so a model cannot saturate a belief
 *     to certainty with a single confident-sounding sentence.
 *
 * Both are enforced here rather than in a prompt, because a prompt is a request
 * and this is a guarantee.
 */
export function applyEvidence(
  beliefs: Beliefs,
  evidence: Readonly<Record<string, number>>,
  scale = 1,
): Beliefs {
  const next: Record<string, number> = { ...beliefs };

  for (const [id, rawWeight] of Object.entries(evidence)) {
    if (!(id in next)) continue;
    if (!Number.isFinite(rawWeight)) continue;

    // Clamped on the way back out as well: sigmoid saturates to exactly 1.0 once
    // it has seen enough evidence, and a belief of exactly 1 is a probability
    // that a later update can no longer move. Keeping every belief strictly
    // inside (0, 1) means no amount of stacked evidence can make it unrevisable.
    const weight = Math.max(-MAX_WEIGHT, Math.min(MAX_WEIGHT, rawWeight)) * scale;
    next[id] = clampProbability(sigmoid(logit(next[id]) + weight));
  }

  return next;
}

/** Shannon entropy in bits. The currency the item selector spends. */
export function entropyOf(distribution: readonly number[]): number {
  let h = 0;
  for (const p of distribution) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

/** Highest beliefs first, with a stable order so selection is reproducible. */
export function rankedFaults(beliefs: Beliefs): string[] {
  return [...MISCONCEPTION_IDS].sort(
    (a, b) => (beliefs[b] ?? PRIOR) - (beliefs[a] ?? PRIOR),
  );
}

export function strongestFault(beliefs: Beliefs): string | null {
  const ranked = rankedFaults(beliefs);
  return ranked.length > 0 ? ranked[0] : null;
}
