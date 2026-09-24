import { describe, expect, it } from "vitest";

import { MISCONCEPTION_IDS } from "../domain/misconceptions";
import { REMEDIATIONS, hasRemediation, remediation } from "../domain/remediation";
import { buildLocally, normalise, readReasoningLocally } from "./offline";
import { LEXICON, MAX_LEXICON_WEIGHT } from "./lexicon";
import { MAX_LIVE_WEIGHT, parseEnvelope, sanitiseEvidence } from "./evorozen";

describe("the offline reader", () => {
  it("hears the sentence that gives the fault away", () => {
    const read = readReasoningLocally("the force of the throw runs out slowly");
    expect(read.evidence["object-carries-its-force"]).toBeGreaterThan(0);
  });

  it("hears a second fault in a different sentence", () => {
    const read = readReasoningLocally("the energy gets used up and then it disappears");
    expect(read.evidence["energy-is-consumed"]).toBeGreaterThan(0);
  });

  it("counts a denial as evidence against", () => {
    const read = readReasoningLocally("friction pushes the car forward");
    expect(read.evidence["friction-opposes-all-motion"]).toBeLessThan(0);
  });

  it("reads nothing into an empty answer", () => {
    expect(readReasoningLocally("").evidence).toEqual({});
    expect(readReasoningLocally("   ").evidence).toEqual({});
  });

  it("reads nothing into a sentence that says nothing", () => {
    expect(readReasoningLocally("i am not sure about this one at all").evidence).toEqual({});
  });

  it("catches more than one fault in one answer", () => {
    const read = readReasoningLocally("there is no gravity in space so they float");
    expect(read.evidence["gravity-ends-above-sky"]).toBeGreaterThan(0);
  });

  it("ignores case and punctuation", () => {
    const shy = readReasoningLocally("The Energy Gets Used Up.");
    const loud = readReasoningLocally("the energy gets used up");
    expect(shy.evidence).toEqual(loud.evidence);
  });

  it("never moves one fault past the ceiling, however much is written", () => {
    const everything = LEXICON.filter((e) => e.faultId === "energy-is-consumed")[0];
    const read = readReasoningLocally(everything.tells.join(" and "));
    expect(read.evidence["energy-is-consumed"]).toBeLessThanOrEqual(MAX_LEXICON_WEIGHT);
  });

  it("keeps every phrase lower-case, or it could never match", () => {
    // normalise() lower-cases the student's words, so an upper-case phrase in the
    // lexicon would be dead weight — invisible for as long as nobody looked.
    const shouted: string[] = [];
    for (const entry of LEXICON) {
      for (const phrase of [...entry.tells, ...entry.denials]) {
        if (phrase !== phrase.toLowerCase()) shouted.push(`${entry.faultId}: ${phrase}`);
      }
    }
    expect(shouted).toEqual([]);
  });

  it("covers every fault in the knowledge base", () => {
    const covered = new Set(LEXICON.map((e) => e.faultId));
    const missing = MISCONCEPTION_IDS.filter((id) => !covered.has(id));
    expect(missing).toEqual([]);
  });

  it("points every phrase at a real fault", () => {
    // Widened deliberately: the point is to catch an id in the lexicon that the
    // knowledge base does not have, which is a typo this test can only find if
    // the comparison is not narrowed to the ids that do exist.
    const covered = new Set<string>(MISCONCEPTION_IDS);
    const broken = LEXICON.filter((e) => !covered.has(e.faultId)).map((e) => e.faultId);
    expect(broken).toEqual([]);
  });

  it("normalises punctuation away without eating the words", () => {
    expect(normalise("  The  Energy, gets USED-UP!  ")).toBe("the energy gets used up");
  });
});

describe("the authored lesson", () => {
  it("has one for every fault", () => {
    const missing = MISCONCEPTION_IDS.filter((id) => !hasRemediation(id));
    expect(missing).toEqual([]);
  });

  it("has no lesson for a fault that does not exist", () => {
    expect(REMEDIATIONS).toHaveLength(MISCONCEPTION_IDS.length);
    expect(() => remediation("no-such-fault")).toThrow(/No remediation authored/);
  });

  it("gives every fault something to do and something to settle it", () => {
    for (const lesson of REMEDIATIONS) {
      expect(lesson.cue.length, lesson.faultId).toBeGreaterThan(20);
      expect(lesson.settleIt.endsWith("?"), lesson.faultId).toBe(true);
      expect(lesson.tryIt.length, lesson.faultId).toBeGreaterThan(30);
    }
  });

  it("assembles the authored parts verbatim, and never invents them", () => {
    const draft = buildLocally({ faultId: "peak-means-zero-force", beliefs: {}, answered: 6 });
    const lesson = remediation("peak-means-zero-force");
    expect(draft.cue).toBe(lesson.cue);
    expect(draft.settleIt).toBe(lesson.settleIt);
    expect(draft.tryIt).toBe(lesson.tryIt);
    expect(draft.source).toBe("authored");
  });
});

describe("the gate in front of a model", () => {
  it("finds JSON wrapped in prose", () => {
    const parsed = parseEnvelope('Sure! Here you go:\n{"evidence":{"x":1}}\nHope that helps.');
    expect(parsed).toEqual({ evidence: { x: 1 } });
  });

  it("finds JSON inside a code fence", () => {
    const parsed = parseEnvelope('```json\n{"because":"yes"}\n```');
    expect(parsed).toEqual({ because: "yes" });
  });

  it("returns nothing rather than throwing on junk", () => {
    expect(parseEnvelope("no json here at all")).toBeNull();
    expect(parseEnvelope("{ broken")).toBeNull();
    expect(parseEnvelope("[1,2,3]")).toBeNull();
    expect(parseEnvelope("")).toBeNull();
  });

  it("drops a fault that a model invented", () => {
    const evidence = sanitiseEvidence({ "made-up-fault": 2, "motion-implies-force": 1 });
    expect(Object.keys(evidence)).toEqual(["motion-implies-force"]);
  });

  it("clamps a confident model", () => {
    const evidence = sanitiseEvidence({ "motion-implies-force": 99 });
    expect(evidence["motion-implies-force"]).toBe(MAX_LIVE_WEIGHT);
    const negative = sanitiseEvidence({ "motion-implies-force": -99 });
    expect(negative["motion-implies-force"]).toBe(-MAX_LIVE_WEIGHT);
  });

  it("accepts a number that arrived as a string, and rejects one that arrived as nonsense", () => {
    const evidence = sanitiseEvidence({
      "motion-implies-force": "1.5",
      "energy-is-consumed": "very much",
    });
    expect(evidence["motion-implies-force"]).toBe(1.5);
    expect(evidence["energy-is-consumed"]).toBeUndefined();
  });

  it("survives anything a model could put in the evidence field", () => {
    for (const junk of [null, undefined, 7, "text", [1, 2], true]) {
      expect(sanitiseEvidence(junk)).toEqual({});
    }
  });
});
