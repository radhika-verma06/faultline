/**
 * A diagnostic session, and the report it produces.
 *
 * The session is just the list of answers. Everything else — the beliefs, the
 * map, the ranking — is derived from that list on demand. Keeping it derived
 * rather than stored is what makes replay possible: the same answers always
 * produce the same diagnosis, which is most of why anyone would trust it.
 */

import { ITEMS, type Item, type Option } from "../domain/items";
import {
  MISCONCEPTIONS,
  SEVERITY_ORDER,
  type Misconception,
  type Severity,
} from "../domain/misconceptions";
import { PRIOR } from "../domain/misconceptions";
import {
  applyEvidence,
  initialBeliefs,
  logit,
  rankedFaults,
  sigmoid,
  type Beliefs,
} from "./belief";
import { INFORMATION_FLOOR, chooseNextItem, tellStrength } from "./select";

/** 1 = guessing, 2 = fairly sure, 3 = certain. */
export type Confidence = 1 | 2 | 3;

export type Response = {
  readonly itemId: string;
  readonly optionKey: string;
  readonly confidence: Confidence;
  /** The student's own explanation, if they gave one. */
  readonly reasoning?: string;
  /**
   * Evidence extracted from `reasoning` by the AI layer. Passed in rather than
   * fetched here so this module stays pure and testable in Node.
   */
  readonly reasoningEvidence?: Readonly<Record<string, number>>;
};

export type Session = {
  readonly responses: readonly Response[];
};

export const MAX_ITEMS = 12;
export const MIN_ITEMS = 5;

/** Above this, the belief is strong enough to act on and to show as confirmed. */
export const CONFIRMED_AT = 0.82;
export const SUSPECTED_AT = 0.5;
export const RULED_OUT_BELOW = 0.2;

/** A primary fault needs a lead of this much over the runner-up before we stop. */
export const CONVERGED_MARGIN = 0.25;

/**
 * How far a single answer moves the model, by how sure the student said they
 * were. A guess is weak evidence about the student and strong evidence about the
 * question; "certain" is the reverse. Without this the confidence prompt would be
 * decoration, and asking a student how sure they are is one of the few cheap
 * signals a diagnostic gets.
 */
export const CONFIDENCE_SCALE: Record<Confidence, number> = {
  1: 0.45,
  2: 1,
  3: 1.35,
};

/** Free-text evidence is real but noisier than a chosen option, so it counts for less. */
export const REASONING_SCALE = 0.8;

export type ContributionKind = "answer" | "reasoning";

export type Contribution = {
  readonly itemId: string;
  readonly optionKey: string;
  readonly kind: ContributionKind;
  /** Signed: positive pushed the belief toward "held". */
  readonly weight: number;
};

export type FaultState =
  | "confirmed"
  | "suspected"
  | "clear"
  | "ruled-out"
  | "unprobed";

export type FaultReading = {
  readonly id: string;
  readonly misconception: Misconception;
  readonly probability: number;
  readonly state: FaultState;
  readonly contributions: readonly Contribution[];
};

export type Diagnosis = {
  readonly beliefs: Beliefs;
  /** Every fault line, most damaging first and then most probable first. */
  readonly faults: readonly FaultReading[];
  /** The fault worth teaching to now, or null if nothing is established. */
  readonly primary: FaultReading | null;
  readonly answered: number;
  readonly asked: readonly string[];
  readonly complete: boolean;
  readonly probed: number;
  readonly total: number;
  readonly correct: number;
};

export function startSession(): Session {
  return { responses: [] };
}

function optionOf(response: Response): Option | undefined {
  const source = ITEMS.find((i) => i.id === response.itemId);
  return source?.options.find((o) => o.key === response.optionKey);
}

export function isCorrect(response: Response): boolean {
  return optionOf(response)?.correct === true;
}

/** Re-answering an item replaces the answer rather than adding a second one. */
export function answer(session: Session, response: Response): Session {
  const index = session.responses.findIndex((r) => r.itemId === response.itemId);
  if (index === -1) {
    return { responses: [...session.responses, response] };
  }
  const next = [...session.responses];
  next[index] = response;
  return { responses: next };
}

export function beliefsOf(session: Session): Beliefs {
  let beliefs = initialBeliefs();

  for (const response of session.responses) {
    const option = optionOf(response);
    if (!option) continue;
    beliefs = applyEvidence(
      beliefs,
      option.evidence,
      CONFIDENCE_SCALE[response.confidence] ?? 1,
    );
    if (response.reasoningEvidence) {
      beliefs = applyEvidence(beliefs, response.reasoningEvidence, REASONING_SCALE);
    }
  }

  return beliefs;
}

function contributionsFor(session: Session, faultId: string): Contribution[] {
  const out: Contribution[] = [];

  for (const response of session.responses) {
    const option = optionOf(response);
    if (!option) continue;

    const fromAnswer = option.evidence[faultId];
    if (typeof fromAnswer === "number") {
      out.push({
        itemId: response.itemId,
        optionKey: response.optionKey,
        kind: "answer",
        weight: fromAnswer * (CONFIDENCE_SCALE[response.confidence] ?? 1),
      });
    }

    const fromReasoning = response.reasoningEvidence?.[faultId];
    if (typeof fromReasoning === "number") {
      out.push({
        itemId: response.itemId,
        optionKey: response.optionKey,
        kind: "reasoning",
        weight: fromReasoning * REASONING_SCALE,
      });
    }
  }

  return out;
}

function stateOf(probability: number, probed: boolean): FaultState {
  if (!probed) return "unprobed";
  if (probability >= CONFIRMED_AT) return "confirmed";
  if (probability >= SUSPECTED_AT) return "suspected";
  if (probability <= RULED_OUT_BELOW) return "ruled-out";
  return "clear";
}

function severityRank(severity: Severity): number {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? SEVERITY_ORDER.length : index;
}

/**
 * Has one fault pulled clear of the field? Demanding a lead as well as a high
 * belief is what stops the engine from announcing a diagnosis the moment two
 * faults are jostling — a confident wrong diagnosis is worse than an honest
 * "still not sure".
 */
export function isConverged(beliefs: Beliefs): boolean {
  const ranked = rankedFaults(beliefs);
  if (ranked.length < 2) return false;
  const [first, second] = ranked;
  const leader = beliefs[first] ?? 0;
  return leader >= CONFIRMED_AT && leader - (beliefs[second] ?? 0) >= CONVERGED_MARGIN;
}

/**
 * Could a question still on the table overturn this diagnosis?
 *
 * Convergence says the leader is ahead of the field *given everything answered so
 * far*. It does not say the field has had a fair chance to answer: a fault sitting
 * at the base rate whose one decisive item happens never to have been asked looks
 * exactly like a fault that has been ruled out. The engine was closing the map on
 * that, which produced a confident diagnosis of the wrong fault for a student who
 * picked the tell for one fault on an item that carries another's.
 *
 * So before it closes, it asks the question properly: for each fault still behind
 * the leader, is there an unasked item whose strongest tell for that fault would
 * lift it past the leader? If so, that item is the only thing left that could
 * change the answer, which makes it worth asking.
 *
 * This is deliberately an upper bound rather than a prediction — it assumes one
 * answer given with full confidence to the strongest remaining tell, which is the
 * most any single question could possibly do. No stronger evidence can arrive, so
 * when this returns false the diagnosis is settled by arithmetic rather than by
 * the engine's patience.
 */
export function couldStillBeOverturned(
  beliefs: Beliefs,
  asked: ReadonlySet<string>,
): boolean {
  const ranked = rankedFaults(beliefs);
  if (ranked.length < 2) return false;

  const leader = beliefs[ranked[0]] ?? 0;
  const remaining = ITEMS.filter((entry) => !asked.has(entry.id));
  if (remaining.length === 0) return false;

  for (const id of ranked.slice(1)) {
    const best = Math.max(0, ...remaining.map((entry) => tellStrength(entry, id)));
    if (best <= 0) continue;
    const reachable = sigmoid(
      logit(beliefs[id] ?? PRIOR) + best * CONFIDENCE_SCALE[3],
    );
    if (reachable > leader) return true;
  }

  return false;
}

/**
 * The next question, or null when there is nothing left worth asking — either
 * because the diagnosis has settled and no remaining item could overturn it,
 * because no remaining item would separate the live hypotheses, or because the
 * budget is spent.
 */
export function nextItem(session: Session): Item | null {
  const asked = new Set(session.responses.map((r) => r.itemId));
  if (asked.size >= MAX_ITEMS) return null;

  const beliefs = beliefsOf(session);
  const choice = chooseNextItem(beliefs, asked);
  if (!choice) return null;

  const hasEnough = session.responses.length >= MIN_ITEMS;
  if (
    hasEnough &&
    isConverged(beliefs) &&
    !couldStillBeOverturned(beliefs, asked)
  ) {
    return null;
  }
  if (hasEnough && choice.informationGain < INFORMATION_FLOOR) return null;

  return choice.item;
}

export function diagnose(session: Session): Diagnosis {
  const beliefs = beliefsOf(session);

  const readings: FaultReading[] = MISCONCEPTIONS.map((entry) => {
    const source = entry as Misconception;
    const contributions = contributionsFor(session, source.id);
    const probability = beliefs[source.id] ?? 0;
    return {
      id: source.id,
      misconception: source,
      probability,
      state: stateOf(probability, contributions.length > 0),
      contributions,
    };
  });

  const faults = [...readings].sort((a, b) => {
    const bySeverity = severityRank(a.misconception.severity) - severityRank(b.misconception.severity);
    if (bySeverity !== 0) return bySeverity;
    return b.probability - a.probability;
  });

  const primary =
    [...readings]
      .filter((r) => r.state === "confirmed" || r.state === "suspected")
      .sort((a, b) => b.probability - a.probability)[0] ?? null;

  return {
    beliefs,
    faults,
    primary,
    answered: session.responses.length,
    asked: session.responses.map((r) => r.itemId),
    complete: nextItem(session) === null,
    probed: readings.filter((r) => r.state !== "unprobed").length,
    total: readings.length,
    correct: session.responses.filter(isCorrect).length,
  };
}
