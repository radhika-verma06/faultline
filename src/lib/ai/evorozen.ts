/**
 * The Evorozen Neural Pulse client.
 *
 * Written against the documented contract (https://pulse.evorozen.com/docs):
 * a single POST endpoint, a Bearer key, and an `action_type` discriminator.
 *
 *   POST https://pulse.evorozen.com/api/neural
 *   Authorization: Bearer <key>
 *   { action_type, prompt?, data_payload? }
 *
 *   create_schema | insert_data | select_data | update_data | delete_data | chat
 *
 * Raw HTTP rather than the published SDK, for a specific reason: the SDK is an
 * install-time dependency, and this application must build, test and run with no
 * key and no extra package. The docs treat raw HTTP as a first-class option
 * ("use raw HTTP from any language"), so nothing is being worked around.
 *
 * Two parts of this integration are load-bearing rather than decorative:
 *
 *   1. `create_schema` / `insert_data` / `select_data` are the reason this app has
 *      no backend. A student's fault profile has to survive between sessions, and
 *      the Neural Pulse virtual database is what makes that possible without a
 *      database, a migration or a server.
 *
 *   2. The kernel's AISecurityModule redacts PII before a prompt reaches the LLM.
 *      This product asks 13-year-olds to explain their reasoning in their own
 *      words and then sends that text to a model. Redaction is not a feature we
 *      wanted; it is a requirement we would otherwise have had to build.
 *
 * Everything in this file is designed to fail softly. Every call may throw, and
 * the layer above catches and falls back to the deterministic path. A diagnosis
 * already earned is never lost to a network.
 */

import { MISCONCEPTION_IDS, isKnownMisconception, misconception } from "../domain/misconceptions";
import { hasRemediation, remediation } from "../domain/remediation";
import { buildLocally } from "./offline";
import type {
  FaultProfile,
  IntelligenceLayer,
  MemoryLayer,
  ReasoningInput,
  RemediationDraft,
  RemediationInput,
  SessionRecord,
} from "./types";

export const DEFAULT_ENDPOINT = "https://pulse.evorozen.com/api/neural";

/** Where a key supplied at runtime is kept. Never in the bundle, never in a repo. */
export const KEY_STORAGE = "faultline.evorozen.key";
export const ENDPOINT_STORAGE = "faultline.evorozen.endpoint";

export type NeuralConfig = {
  readonly apiKey: string;
  readonly endpoint?: string;
};

export const ACTION_TYPES = [
  "create_schema",
  "insert_data",
  "select_data",
  "update_data",
  "delete_data",
  "chat",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type NeuralRequest = {
  readonly action_type: ActionType;
  readonly prompt?: string;
  readonly data_payload?: Record<string, unknown>;
};

export class NeuralError extends Error {}

/**
 * One request, with a deadline. The deadline is not paranoia: this call sits in
 * the middle of a diagnostic session, and a hung request is worse than a failed
 * one, because the student is waiting on it.
 */
export async function neural(
  config: NeuralConfig,
  request: NeuralRequest,
  timeoutMs = 12000,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(config.endpoint ?? DEFAULT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new NeuralError(`Neural API returned ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      throw new NeuralError("Neural API returned a payload that is not an object");
    }
    return payload as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * Pulls a JSON object out of whatever the model returned.
 *
 * Models wrap JSON in prose, in code fences, or in a sentence of encouragement.
 * This finds the outermost braces and tries to parse that, rather than asking a
 * prompt to please behave.
 */
export function parseEnvelope(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** The largest move one model-supplied weight is allowed to make. */
export const MAX_LIVE_WEIGHT = 2;

/**
 * The gate between a model's opinion and a student's diagnosis: ids that are not
 * real faults are dropped, and weights are clamped. A model can contribute
 * evidence. It cannot name a fault, and it cannot reach certainty.
 */
export function sanitiseEvidence(raw: unknown): Record<string, number> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isKnownMisconception(id)) continue;
    const weight = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(weight)) continue;
    out[id] = Math.max(-MAX_LIVE_WEIGHT, Math.min(MAX_LIVE_WEIGHT, weight));
  }
  return out;
}

function catalogue(): string {
  return MISCONCEPTION_IDS.map((id) => `- ${id}: ${misconception(id).belief}`).join("\n");
}

export function reasoningInstruction(input: ReasoningInput): string {
  return [
    "You are reading a physics student's own explanation of their reasoning.",
    "Identify which of the listed misconceptions their wording gives evidence FOR or AGAINST.",
    "",
    "The question they answered:",
    input.itemStem,
    "",
    "The option they chose:",
    input.chosenOption,
    "",
    "What they wrote:",
    `"""${input.reasoning}"""`,
    "",
    "The misconceptions, by id:",
    catalogue(),
    "",
    "Reply with one JSON object and nothing else:",
    '{"evidence": {"<misconception-id>": <number between -2 and 2>, ...}, "because": "<one short clause>"}',
    "",
    "Rules:",
    "- A positive weight means their wording shows they hold that misconception.",
    "- A negative weight means their wording argues against it.",
    "- Omit misconceptions their wording says nothing about. Do not pad the list.",
    "- Never invent an id. Use only ids from the list above.",
    "- The because clause is shown directly to the student. Keep it plain and non-judgemental.",
  ].join("\n");
}

export function remediationInstruction(input: RemediationInput): string {
  // The authored lesson is deliberately absent from this prompt: the cue, the
  // settling question and the experiment are supplied verbatim afterwards, so the
  // model is never in a position to paraphrase them.
  const fault = misconception(input.faultId);

  return [
    "Rewrite a physics correction for one student, in their voice, without changing the physics.",
    "",
    `The misconception, stated precisely: ${fault.belief}`,
    `Their own words for it: "${fault.inTheirWords}"`,
    `Why it is a reasonable thing to have believed: ${fault.whyItSeduces}`,
    `What is actually true: ${fault.correction}`,
    `What it will break later: ${fault.breaks.join("; ")}`,
    input.reasoning ? `What they wrote during the diagnosis: "${input.reasoning}"` : "",
    "",
    "Reply with one JSON object and nothing else:",
    '{"opening": "<name the belief back to them>", "shift": "<why it was tempting, then what is true>"}',
    "",
    "Rules:",
    "- Do not add, remove or soften any physics.",
    "- Do not invent an experiment, a number or a question. Those are supplied separately.",
    "- Never call the student wrong-headed. The belief was reasonable; that is why it is common.",
    "- Keep opening under 25 words and shift under 90.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function neuralIntelligence(config: NeuralConfig): IntelligenceLayer {
  return {
    name: "Neural Pulse",
    live: true,

    async readReasoning(input: ReasoningInput) {
      const envelope = await neural(config, {
        action_type: "chat",
        prompt: reasoningInstruction(input),
      });

      const text = asString(envelope.response) ?? "";
      const parsed = parseEnvelope(text);
      const evidence = sanitiseEvidence(parsed?.evidence);

      return {
        source: "Neural Pulse",
        evidence,
        because: asString(parsed?.because) ?? "",
      };
    },

    async writeRemediation(input: RemediationInput): Promise<RemediationDraft> {
      // A fault with no authored lesson never reaches a model. The three parts a
      // student acts on are fixed; only the framing is written for them.
      if (!hasRemediation(input.faultId)) return buildLocally(input);

      const fault = misconception(input.faultId);
      const lesson = remediation(input.faultId);

      const envelope = await neural(config, {
        action_type: "chat",
        prompt: remediationInstruction(input),
      });

      const parsed = parseEnvelope(asString(envelope.response) ?? "");

      return {
        source: "Neural Pulse",
        faultId: input.faultId,
        opening: asString(parsed?.opening) ?? fault.inTheirWords,
        shift: asString(parsed?.shift) ?? `${fault.whyItSeduces} ${fault.correction}`,
        // Supplied, never generated.
        cue: lesson.cue,
        settleIt: lesson.settleIt,
        tryIt: lesson.tryIt,
      };
    },
  };
}

/** The two tables this application's cognitive memory lives in. */
export const TABLES = {
  profiles: "fault_profiles",
  sessions: "sessions",
} as const;

const SCHEMA = {
  tables: [
    {
      name: TABLES.profiles,
      columns: [
        { name: "student_id", type: "text", primary: true },
        { name: "student_label", type: "text" },
        { name: "beliefs", type: "json" },
        { name: "answered", type: "int" },
        { name: "primary_fault", type: "text" },
        { name: "updated_at", type: "text" },
      ],
    },
    {
      name: TABLES.sessions,
      columns: [
        { name: "student_id", type: "text" },
        { name: "asked", type: "json" },
        { name: "correct", type: "int" },
        { name: "primary_fault", type: "text" },
        { name: "finished_at", type: "text" },
      ],
    },
  ],
};

function parseBeliefs(raw: unknown): Record<string, number> {
  let source: unknown = raw;
  if (typeof raw === "string") {
    try {
      source = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (source === null || typeof source !== "object" || Array.isArray(source)) return {};

  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(source as Record<string, unknown>)) {
    if (!isKnownMisconception(id)) continue;
    const belief = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(belief)) out[id] = belief;
  }
  return out;
}

function rowsOf(envelope: Record<string, unknown>): Record<string, unknown>[] {
  const data = envelope.data;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (row): row is Record<string, unknown> =>
      row !== null && typeof row === "object" && !Array.isArray(row),
  );
}

export function neuralPulseMemory(config: NeuralConfig): MemoryLayer {
  let schema: Promise<void> | null = null;

  const ensureSchema = (): Promise<void> => {
    schema ??= neural(config, {
      action_type: "create_schema",
      prompt: "Define the Faultline diagnosis tables",
      data_payload: SCHEMA,
    }).then(() => undefined);
    return schema;
  };

  return {
    name: "Neural Pulse",
    live: true,

    async loadProfile(studentId: string): Promise<FaultProfile | null> {
      await ensureSchema();

      const envelope = await neural(config, {
        action_type: "select_data",
        prompt: `Load the fault profile for ${studentId}`,
        data_payload: { table: TABLES.profiles, where: { student_id: studentId } },
      });

      const rows = rowsOf(envelope);
      const row = rows[rows.length - 1];
      if (row === undefined) return null;

      return {
        studentId,
        studentLabel: asString(row.student_label) ?? "student",
        beliefs: parseBeliefs(row.beliefs),
        answered: Number(row.answered) || 0,
        primary: asString(row.primary_fault),
        updatedAt: asString(row.updated_at) ?? new Date().toISOString(),
      };
    },

    async saveProfile(profile: FaultProfile): Promise<void> {
      await ensureSchema();

      const fields: Record<string, unknown> = {
        student_label: profile.studentLabel,
        beliefs: JSON.stringify(profile.beliefs),
        answered: profile.answered,
        primary_fault: profile.primary,
        updated_at: profile.updatedAt,
      };

      const existing = await neural(config, {
        action_type: "select_data",
        prompt: `Find the existing profile row for ${profile.studentId}`,
        data_payload: { table: TABLES.profiles, where: { student_id: profile.studentId } },
      });

      // A virtual database with no documented upsert gets one written here: find,
      // then update or insert. Two calls, and the alternative is guessing at
      // ordering when reading rows back.
      if (rowsOf(existing).length > 0) {
        await neural(config, {
          action_type: "update_data",
          prompt: `Update the fault profile for ${profile.studentId}`,
          data_payload: {
            table: TABLES.profiles,
            where: { student_id: profile.studentId },
            changes: fields,
          },
        });
        return;
      }

      await neural(config, {
        action_type: "insert_data",
        prompt: `Record the fault profile for ${profile.studentId}`,
        data_payload: {
          table: TABLES.profiles,
          record: { student_id: profile.studentId, ...fields },
        },
      });
    },

    async saveSession(record: SessionRecord): Promise<void> {
      await ensureSchema();

      await neural(config, {
        action_type: "insert_data",
        prompt: `Record the session for ${record.studentId}`,
        data_payload: {
          table: TABLES.sessions,
          record: {
            student_id: record.studentId,
            asked: JSON.stringify(record.asked),
            correct: record.correct,
            primary_fault: record.primary,
            finished_at: record.finishedAt,
          },
        },
      });
    },

    async cohortSummary(prompt: string): Promise<string> {
      await ensureSchema();

      const envelope = await neural(config, {
        action_type: "chat",
        prompt: [
          `Query the ${TABLES.profiles} table.`,
          "Each row is one student's live belief, per misconception, in 0 to 1.",
          prompt,
          "Answer in at most five short lines. Name the misconceptions by their human name, not their id.",
        ].join("\n"),
      });

      return asString(envelope.response) ?? "The engine returned no readable answer.";
    },
  };
}

/** A key supplied at runtime by the person using the app, if any. */
export function runtimeKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(KEY_STORAGE);
    return stored !== null && stored.trim().length > 0 ? stored.trim() : null;
  } catch {
    return null;
  }
}

export function runtimeEndpoint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(ENDPOINT_STORAGE);
    return stored !== null && stored.trim().length > 0 ? stored.trim() : null;
  } catch {
    return null;
  }
}
