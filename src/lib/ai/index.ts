/**
 * Which intelligence and memory to use, and what happens when they fail.
 *
 * The rule is that the deterministic layer is the floor, never the ceiling. The
 * live layers are wrapped rather than selected, so a timeout, a rate limit or a
 * malformed response degrades one answer to the lexicon instead of ending a
 * student's session. Nothing a student has already earned is thrown away because
 * a third party was slow.
 *
 * Configuration is deliberately not baked into the public build. A key present at
 * build time is inlined by Next and would be readable by anyone who opens the
 * deployed page — so the deployed demo ships with no key, runs the lexicon, and
 * works completely. A key can instead be supplied at runtime by the person using
 * the app, and it is then kept in their browser, not in a bundle.
 * See docs/adr/0006.
 */

import type { FaultProfile, IntelligenceLayer, MemoryLayer } from "./types";
import { offlineIntelligence, localMemory } from "./offline";
import {
  DEFAULT_ENDPOINT,
  neuralIntelligence,
  neuralPulseMemory,
  runtimeEndpoint,
  runtimeKey,
} from "./evorozen";

export * from "./types";
export { neural, NeuralError, parseEnvelope, sanitiseEvidence } from "./evorozen";
export { offlineIntelligence, localMemory, readReasoningLocally } from "./offline";

export type LayerConfig = {
  readonly apiKey: string | null;
  readonly endpoint: string;
};

function fromEnv(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

const layerListeners = new Set<() => void>();

/**
 * The layer configuration is browser state, so the interface subscribes to it
 * rather than copying it into React state on mount. A screen that displayed a
 * stale "not connected" because it read the key once during an effect is exactly
 * the sort of bug this avoids — and a write from another tab is picked up too.
 */
export function subscribeToLayerConfig(listener: () => void): () => void {
  layerListeners.add(listener);
  return () => {
    layerListeners.delete(listener);
  };
}

/** Called after a key is stored or removed, so every screen re-reads the config. */
export function notifyLayerConfigChanged(): void {
  for (const listener of [...layerListeners]) listener();
}

/**
 * Runtime key first, then the build-time one.
 *
 * The order matters: a key typed into the running app should win over whatever the
 * bundle was built with, so someone can point a deployed build at their own
 * account without a rebuild.
 */
export function resolveConfig(): LayerConfig {
  return {
    apiKey:
      runtimeKey() ?? fromEnv(process.env.NEXT_PUBLIC_EVOROZEN_API_KEY),
    endpoint:
      runtimeEndpoint() ??
      fromEnv(process.env.NEXT_PUBLIC_EVOROZEN_ENDPOINT) ??
      DEFAULT_ENDPOINT,
  };
}

export function isLive(): boolean {
  return resolveConfig().apiKey !== null;
}

/** Live reads, with every failure falling back to the lexicon. */
export function resilientIntelligence(
  primary: IntelligenceLayer,
  fallback: IntelligenceLayer,
): IntelligenceLayer {
  return {
    name: `${primary.name}, falling back to the ${fallback.name}`,
    live: primary.live,

    async readReasoning(input) {
      try {
        const read = await primary.readReasoning(input);
        // An empty read is a miss, not an answer: an unparsable response should
        // not silently count as "this student's wording shows nothing".
        if (Object.keys(read.evidence).length > 0) return read;
      } catch {
        // Degrade this one answer to the deterministic reader.
      }
      return fallback.readReasoning(input);
    },

    async writeRemediation(input) {
      try {
        return await primary.writeRemediation(input);
      } catch {
        // The authored lesson is unaffected; only the framing is lost.
        return fallback.writeRemediation(input);
      }
    },
  };
}

/**
 * Memory writes go to the local store as well as the live one, always.
 *
 * A profile is a student's history. Losing it to a failed write would be worse
 * than a duplicate row, so the durable local copy is written first and is not
 * conditional on the remote call succeeding.
 */
export function resilientMemory(primary: MemoryLayer, fallback: MemoryLayer): MemoryLayer {
  return {
    name: `${primary.name}, falling back to ${fallback.name}`,
    live: primary.live,

    async loadProfile(studentId: string): Promise<FaultProfile | null> {
      try {
        const remote = await primary.loadProfile(studentId);
        if (remote !== null) return remote;
      } catch {
        // Fall through to the local copy.
      }
      return fallback.loadProfile(studentId);
    },

    async saveProfile(profile: FaultProfile): Promise<void> {
      await fallback.saveProfile(profile);
      try {
        await primary.saveProfile(profile);
      } catch {
        // The local copy stands, and the student keeps their profile.
      }
    },

    async saveSession(record): Promise<void> {
      await fallback.saveSession(record);
      try {
        await primary.saveSession(record);
      } catch {
        // As above.
      }
    },

    async cohortSummary(prompt: string): Promise<string> {
      try {
        return await primary.cohortSummary(prompt);
      } catch {
        return fallback.cohortSummary(prompt);
      }
    },
  };
}

export function intelligence(): IntelligenceLayer {
  const config = resolveConfig();
  if (config.apiKey === null) return offlineIntelligence;
  return resilientIntelligence(
    neuralIntelligence({ apiKey: config.apiKey, endpoint: config.endpoint }),
    offlineIntelligence,
  );
}

export function memory(): MemoryLayer {
  const config = resolveConfig();
  if (config.apiKey === null) return localMemory;
  return resilientMemory(
    neuralPulseMemory({ apiKey: config.apiKey, endpoint: config.endpoint }),
    localMemory,
  );
}
