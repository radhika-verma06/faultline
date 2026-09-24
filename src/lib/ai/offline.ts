/**
 * Everything that works with no service attached.
 *
 * This is not a stub and it is not a placeholder for a real implementation. It is
 * the default, and it is what runs on the deployed build, in CI, and in every
 * unit test. The live layers are an upgrade, not a dependency.
 */

import { misconception } from "../domain/misconceptions";
import { remediation } from "../domain/remediation";
import { LEXICON, MAX_LEXICON_WEIGHT, PHRASE_WEIGHT } from "./lexicon";
import type {
  FaultProfile,
  IntelligenceLayer,
  MemoryLayer,
  ReasoningInput,
  RemediationDraft,
  RemediationInput,
  SessionRecord,
} from "./types";

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type LocalRead = {
  readonly evidence: Record<string, number>;
  readonly hits: readonly string[];
};

/** Matches a student's own words against the lexicon, in both directions. */
export function readReasoningLocally(reasoning: string): LocalRead {
  const text = normalise(reasoning);
  const evidence: Record<string, number> = {};
  const hits: string[] = [];

  if (text.length === 0) return { evidence, hits };

  for (const entry of LEXICON) {
    let score = 0;
    const found: string[] = [];

    for (const phrase of entry.tells) {
      if (text.includes(phrase)) {
        score += PHRASE_WEIGHT;
        found.push(phrase);
      }
    }
    for (const phrase of entry.denials) {
      if (text.includes(phrase)) {
        score -= PHRASE_WEIGHT;
        found.push(`not: ${phrase}`);
      }
    }

    if (score === 0) continue;
    evidence[entry.faultId] = Math.max(
      -MAX_LEXICON_WEIGHT,
      Math.min(MAX_LEXICON_WEIGHT, score),
    );
    hits.push(...found);
  }

  return { evidence, hits };
}

/**
 * The authored lesson, assembled. Nothing here is generated: the three parts a
 * student acts on — the line to remember, the question that settles it, the
 * experiment — come straight from the bank, and only the framing is written in
 * the student's own words.
 */
export function buildLocally(input: RemediationInput): RemediationDraft {
  const fault = misconception(input.faultId);
  const lesson = remediation(input.faultId);

  return {
    source: "authored",
    faultId: input.faultId,
    opening: fault.inTheirWords,
    shift: `${fault.whyItSeduces} ${fault.correction}`,
    settleIt: lesson.settleIt,
    tryIt: lesson.tryIt,
    cue: lesson.cue,
  };
}

export const offlineIntelligence: IntelligenceLayer = {
  name: "lexicon",
  live: false,

  async readReasoning(input: ReasoningInput) {
    const { evidence, hits } = readReasoningLocally(input.reasoning);
    return {
      source: "lexicon",
      evidence,
      because:
        hits.length > 0
          ? `your wording matched "${hits[0]}"`
          : "nothing in that wording pointed at one fault in particular",
    };
  },

  async writeRemediation(input: RemediationInput) {
    return buildLocally(input);
  },
};

const PROFILE_KEY = "faultline.profiles";
const SESSION_KEY = "faultline.sessions";

function readStore<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") return {};
    return parsed as Record<string, T>;
  } catch {
    return {};
  }
}

function writeStore<T>(key: string, value: Record<string, T>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or blocked store must never break a diagnosis in progress.
  }
}

/**
 * Memory that lives in the browser.
 *
 * Enough to make the product's central promise true on the deployed build: a
 * fault found in September is still on the map in October. It is per-device,
 * which is the honest limitation, and it is the reason the Neural Pulse layer is
 * worth having rather than a nice-to-have.
 */
export const localMemory: MemoryLayer = {
  name: "this browser",
  live: false,

  async loadProfile(studentId: string) {
    return readStore<FaultProfile>(PROFILE_KEY)[studentId] ?? null;
  },

  async saveProfile(profile: FaultProfile) {
    const store = readStore<FaultProfile>(PROFILE_KEY);
    store[profile.studentId] = profile;
    writeStore(PROFILE_KEY, store);
  },

  async saveSession(record: SessionRecord) {
    const store = readStore<SessionRecord[]>(SESSION_KEY);
    const existing = store[record.studentId] ?? [];
    store[record.studentId] = [...existing, record];
    writeStore(SESSION_KEY, store);
  },

  async cohortSummary() {
    const store = readStore<FaultProfile>(PROFILE_KEY);
    const profiles = Object.values(store);
    if (profiles.length === 0) {
      return "No student has finished a diagnosis on this device yet.";
    }

    const tally = new Map<string, number>();
    for (const profile of profiles) {
      if (profile.primary) {
        tally.set(profile.primary, (tally.get(profile.primary) ?? 0) + 1);
      }
    }

    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    const lines = ranked
      .slice(0, 5)
      .map(([faultId, count]) => `${count} of ${profiles.length}: ${misconception(faultId).name}`);

    return [`${profiles.length} students on this device.`, ...lines].join("\n");
  },
};
