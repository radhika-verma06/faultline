/**
 * The two things Faultline delegates, and the seam in front of each.
 *
 * Both are interfaces with two implementations: one that talks to a service, and
 * one that does not. That is not politeness to the judges' API — it is what lets
 * `npm test` and `npm run smoke` run with no keys, no network and no flakiness,
 * and what stops a live demo from dying on a dropped connection in front of an
 * audience. A diagnosis the student already earned is never lost because an API
 * was slow.
 *
 * Everything either layer returns is *evidence*, never a verdict. The engine
 * decides what a student's diagnosis is; these layers only propose weights, and
 * every weight is clamped on the way in (see engine/belief.ts). A model cannot
 * name a fault, and it cannot move a belief to certainty.
 */

import type { Beliefs } from "../engine/belief";

export type ReasoningInput = {
  /** What the student wrote, verbatim. */
  readonly reasoning: string;
  readonly itemStem: string;
  readonly chosenOption: string;
  readonly beliefs: Beliefs;
};

export type ReasoningRead = {
  /** Which layer produced this, so the interface can be honest about it. */
  readonly source: string;
  /** Fault id to signed weight. Unknown ids are dropped by the engine. */
  readonly evidence: Readonly<Record<string, number>>;
  /** One short clause explaining the read, shown to the student. */
  readonly because: string;
};

export type RemediationInput = {
  readonly faultId: string;
  readonly beliefs: Beliefs;
  readonly answered: number;
  /** The student's own words, when they gave any: the model rewrites into these. */
  readonly reasoning?: string;
};

export type RemediationDraft = {
  readonly source: string;
  readonly faultId: string;
  /** Names the belief back to the student, in their words. */
  readonly opening: string;
  /** Why it is tempting, then what is actually happening. */
  readonly shift: string;
  readonly settleIt: string;
  readonly tryIt: string;
  readonly cue: string;
};

export interface IntelligenceLayer {
  readonly name: string;
  /** False when this is the deterministic fallback, so the UI can say so. */
  readonly live: boolean;
  readReasoning(input: ReasoningInput): Promise<ReasoningRead>;
  writeRemediation(input: RemediationInput): Promise<RemediationDraft>;
}

/** One student's persistent fault state: the cognitive memory. */
export type FaultProfile = {
  readonly studentId: string;
  readonly studentLabel: string;
  readonly beliefs: Record<string, number>;
  readonly answered: number;
  readonly primary: string | null;
  readonly updatedAt: string;
};

/** One completed session, kept so progress across sessions is visible. */
export type SessionRecord = {
  readonly studentId: string;
  readonly asked: readonly string[];
  readonly correct: number;
  readonly primary: string | null;
  readonly finishedAt: string;
};

export interface MemoryLayer {
  readonly name: string;
  readonly live: boolean;
  loadProfile(studentId: string): Promise<FaultProfile | null>;
  saveProfile(profile: FaultProfile): Promise<void>;
  saveSession(record: SessionRecord): Promise<void>;
  /** The teacher's view: "which faults are common in this cohort?" */
  cohortSummary(prompt: string): Promise<string>;
}
