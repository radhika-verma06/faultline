import { describe, expect, it } from "vitest";

import { ITEMS, type Item } from "../domain/items";
import { MISCONCEPTION_IDS, PRIOR } from "../domain/misconceptions";
import {
  applyEvidence,
  initialBeliefs,
  logit,
  sigmoid,
  type Beliefs,
} from "./belief";
import {
  bestSeenSoFar,
  chooseNextItem,
  coverageGain,
  hypotheses,
  informationGain,
  optionProbabilities,
  profileFor,
  tellStrength,
} from "./select";
import {
  CONFIRMED_AT,
  MIN_ITEMS,
  answer,
  beliefsOf,
  couldStillBeOverturned,
  diagnose,
  isConverged,
  nextItem,
  startSession,
  type Confidence,
  type Session,
} from "./session";

/** The key of the true option. */
function correctKey(target: Item): string {
  const correct = target.options.filter((o) => o.correct === true);
  return correct.length > 0 ? correct[0].key : target.options[0].key;
}

/**
 * A student who holds one fault line: on any item that carries a tell for it they
 * choose the strongest tell, and everywhere else they answer correctly. This is a
 * crude simulation and deliberately so — it is a stand-in for "someone with this
 * specific misunderstanding", which is the only kind of student the engine can be
 * tested against without a cohort.
 */
function tellingKeyFor(faultId: string) {
  return (target: Item): string => {
    const telling = target.options
      .filter((o) => (o.evidence[faultId] ?? 0) > 0)
      .sort((a, b) => (b.evidence[faultId] ?? 0) - (a.evidence[faultId] ?? 0));
    return telling.length > 0 ? telling[0].key : correctKey(target);
  };
}

function simulate(pick: (target: Item) => string, confidence: Confidence = 3) {
  let session: Session = startSession();

  for (;;) {
    const next = nextItem(session);
    if (next === null) break;
    session = answer(session, {
      itemId: next.id,
      optionKey: pick(next),
      confidence,
    });
  }

  return { session, diagnosis: diagnose(session) };
}

const PUCK = ITEMS.filter((i) => i.id === "puck-on-ice")[0];

describe("the belief state", () => {
  it("inverts log-odds", () => {
    for (const p of [0.01, 0.2, 0.5, 0.8, 0.99]) {
      expect(sigmoid(logit(p))).toBeCloseTo(p, 10);
    }
  });

  it("starts every known fault at the prior, and knows nothing else", () => {
    const beliefs = initialBeliefs();
    expect(Object.keys(beliefs)).toHaveLength(MISCONCEPTION_IDS.length);
    for (const id of MISCONCEPTION_IDS) {
      expect(beliefs[id]).toBe(PRIOR);
    }
  });

  it("drops evidence for a fault that does not exist", () => {
    // The free-text classifier is a language model, so this is reachable in
    // production: a hallucinated id must not appear on a student's map.
    const after = applyEvidence(initialBeliefs(), { "invented-by-a-model": 2.5 });
    expect(after).toEqual(initialBeliefs());
  });

  it("refuses to let one response claim certainty", () => {
    const after = applyEvidence(initialBeliefs(), { "motion-implies-force": 1e6 });
    expect(after["motion-implies-force"]).toBeGreaterThan(PRIOR);
    expect(after["motion-implies-force"]).toBeLessThan(0.99);
  });

  it("composes two pieces of evidence the same way in either order", () => {
    const forward = applyEvidence(
      applyEvidence(initialBeliefs(), { "motion-implies-force": 1.5 }),
      { "energy-is-consumed": -2 },
    );
    const backward = applyEvidence(
      applyEvidence(initialBeliefs(), { "energy-is-consumed": -2 }),
      { "motion-implies-force": 1.5 },
    );
    expect(forward["motion-implies-force"]).toBeCloseTo(
      backward["motion-implies-force"],
      12,
    );
    expect(forward["energy-is-consumed"]).toBeCloseTo(
      backward["energy-is-consumed"],
      12,
    );
  });

  it("keeps every belief strictly inside (0,1) however much evidence arrives", () => {
    let beliefs: Beliefs = initialBeliefs();
    for (let i = 0; i < 200; i += 1) {
      beliefs = applyEvidence(beliefs, { "energy-is-consumed": 3 });
    }
    const settled = beliefs["energy-is-consumed"];
    expect(settled).toBeGreaterThan(0);
    expect(settled).toBeLessThan(1);
    expect(Number.isFinite(logit(settled))).toBe(true);
  });

  it("treats a telling answer as evidence for, and the true answer as evidence against", () => {
    const raised = beliefsOf(
      answer(startSession(), { itemId: PUCK.id, optionKey: "A", confidence: 2 }),
    );
    const lowered = beliefsOf(
      answer(startSession(), { itemId: PUCK.id, optionKey: "B", confidence: 2 }),
    );
    expect(raised["motion-implies-force"]).toBeGreaterThan(PRIOR);
    expect(lowered["motion-implies-force"]).toBeLessThan(PRIOR);
  });

  it("weights a guess less than a certainty", () => {
    const guessing = beliefsOf(
      answer(startSession(), { itemId: PUCK.id, optionKey: "A", confidence: 1 }),
    );
    const certain = beliefsOf(
      answer(startSession(), { itemId: PUCK.id, optionKey: "A", confidence: 3 }),
    );
    expect(certain["motion-implies-force"]).toBeGreaterThan(
      guessing["motion-implies-force"],
    );
  });
});

describe("the response model", () => {
  it("produces a distribution over the options of every item", () => {
    for (const entry of ITEMS) {
      const probabilities = optionProbabilities(entry, initialBeliefs());
      expect(probabilities).toHaveLength(entry.options.length);
      const total = probabilities.reduce((sum, p) => sum + p.probability, 0);
      expect(total, entry.id).toBeCloseTo(1, 10);
      for (const p of probabilities) {
        expect(p.probability).toBeGreaterThanOrEqual(0);
        expect(p.probability).toBeLessThanOrEqual(1);
      }
    }
  });

  it("makes the true answer the most likely one under the prior, for every item", () => {
    // If this fails for an item, that item is malformed: the model can never
    // predict a student getting it right, so it cannot ever rule anything out.
    const broken: string[] = [];
    for (const entry of ITEMS) {
      const probabilities = optionProbabilities(entry, initialBeliefs());
      const top = [...probabilities].sort((a, b) => b.probability - a.probability)[0];
      if (top.optionKey !== correctKey(entry)) {
        broken.push(`${entry.id} prefers ${top.optionKey} over ${correctKey(entry)}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("still prefers the true answer for a student believed to hold nothing", () => {
    // Stricter than the check above, which only holds beliefs at the base rate,
    // where every distractor scores zero and the true option wins by default. Here
    // the faults are believed positively absent, so a distractor that carries no
    // tell has nothing to lift it and the true option has to earn the top spot
    // through the evidence it argues against. If this failed, the response model
    // would be predicting a student with no fault choosing a wrong answer.
    const broken: string[] = [];
    for (const entry of ITEMS) {
      const probabilities = optionProbabilities(entry, profileFor(null));
      const top = [...probabilities].sort((a, b) => b.probability - a.probability)[0];
      if (top.optionKey !== correctKey(entry)) {
        broken.push(`${entry.id} prefers ${top.optionKey} over ${correctKey(entry)}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe("the hypothesis set", () => {
  it("carries every fault, plus the possibility of none", () => {
    const live = hypotheses(initialBeliefs());
    expect(live).toHaveLength(MISCONCEPTION_IDS.length + 1);
    expect(live.filter((h) => h.id === null)).toHaveLength(1);
  });

  it("is a probability distribution", () => {
    const live = hypotheses(initialBeliefs());
    const total = live.reduce((sum, h) => sum + h.prior, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("leads with the strongest fault", () => {
    const beliefs = applyEvidence(initialBeliefs(), { "gravity-ends-above-sky": 3 });
    expect(hypotheses(beliefs)[0].id).toBe("gravity-ends-above-sky");
  });
});

describe("information gain", () => {
  it("is never negative, for any item", () => {
    const live = hypotheses(initialBeliefs());
    for (const entry of ITEMS) {
      expect(informationGain(entry, live), entry.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("is zero for an item whose options are indistinguishable", () => {
    const flat: Item = {
      id: "flat",
      stem: "Do these two options carry any different information at all?",
      options: [
        { key: "A", text: "one", evidence: { "motion-implies-force": 1.2 } },
        { key: "B", text: "two", evidence: { "motion-implies-force": 1.2 } },
      ],
    };
    expect(informationGain(flat, hypotheses(initialBeliefs()))).toBeCloseTo(0, 10);
  });

  it("is positive for an item whose options split on a fault", () => {
    const split: Item = {
      id: "split",
      stem: "Do these two options separate one fault from the rest?",
      options: [
        { key: "A", text: "tell", evidence: { "energy-is-consumed": 2 } },
        {
          key: "B",
          text: "no tell",
          evidence: { "energy-is-consumed": -2 },
          correct: true,
        },
      ],
    };
    expect(informationGain(split, hypotheses(initialBeliefs()))).toBeGreaterThan(0);
  });
});

describe("item selection", () => {
  it("never repeats an item, and stops when the bank is spent", () => {
    const asked = new Set<string>();
    const offered: string[] = [];

    for (let i = 0; i < ITEMS.length; i += 1) {
      const choice = chooseNextItem(initialBeliefs(), asked);
      expect(choice).not.toBeNull();
      if (choice === null) break;
      expect(asked.has(choice.item.id)).toBe(false);
      asked.add(choice.item.id);
      offered.push(choice.item.id);
    }

    expect(offered).toHaveLength(ITEMS.length);
    expect(new Set(offered).size).toBe(ITEMS.length);
    expect(chooseNextItem(initialBeliefs(), asked)).toBeNull();
  });

  it("resolves ties the same way every time", () => {
    const first = chooseNextItem(initialBeliefs(), new Set<string>());
    const second = chooseNextItem(initialBeliefs(), new Set<string>());
    expect(first).toEqual(second);
  });

  it("credits an item for the faults it would let the engine see for the first time", () => {
    // Mutual information alone is biased against items that test few faults, so
    // the single-fault items lose every contest and the fault they alone can see
    // is never asked. The coverage term is what stops that.
    const live = hypotheses(initialBeliefs());
    const puck = ITEMS.filter((entry) => entry.id === "puck-on-ice")[0];
    const nothingAsked = bestSeenSoFar(new Set<string>());
    const afterPuck = bestSeenSoFar(new Set(["puck-on-ice"]));

    expect(coverageGain(puck, live, nothingAsked)).toBeGreaterThan(0);
    expect(coverageGain(puck, live, afterPuck)).toBe(0);
    expect(tellStrength(puck, "force-velocity-conflated")).toBeGreaterThan(0);
    expect(tellStrength(puck, "gravity-ends-above-sky")).toBe(0);
  });

  it("leaves no fault invisible across a whole session", () => {
    // The guarantee the earlier selector broke: three faults were detectable only
    // by a single item each, the information-gain ranking never spent a question
    // on those items, and a student holding one of them answered everything
    // correctly and was told there was nothing wrong. Every fault has to be
    // reachable by *some* question the session actually asks.
    let session: Session = startSession();
    for (;;) {
      const next = nextItem(session);
      if (next === null) break;
      session = answer(session, {
        itemId: next.id,
        optionKey: correctKey(next),
        confidence: 3,
      });
    }

    const asked = new Set(session.responses.map((r) => r.itemId));
    const seen = bestSeenSoFar(asked);
    const blind = MISCONCEPTION_IDS.filter((id) => (seen[id] ?? 0) <= 0);
    expect(blind).toEqual([]);
  });
});

describe("a diagnostic session", () => {
  it("cannot conclude anything from the prior", () => {
    expect(isConverged(initialBeliefs())).toBe(false);
    expect(diagnose(startSession()).primary).toBeNull();
  });

  it("refuses to stop before it has asked enough questions", () => {
    const one = answer(startSession(), {
      itemId: PUCK.id,
      optionKey: "A",
      confidence: 3,
    });
    expect(beliefsOf(one)["motion-implies-force"]).toBeGreaterThan(CONFIRMED_AT);
    expect(one.responses).toHaveLength(1);
    expect(one.responses.length).toBeLessThan(MIN_ITEMS);
    expect(nextItem(one)).not.toBeNull();
  });

  it("replaces an answer rather than counting it twice", () => {
    let session = startSession();
    session = answer(session, { itemId: PUCK.id, optionKey: "A", confidence: 2 });
    session = answer(session, { itemId: PUCK.id, optionKey: "B", confidence: 2 });
    expect(session.responses).toHaveLength(1);
    expect(session.responses[0].optionKey).toBe("B");
    expect(beliefsOf(session)["motion-implies-force"]).toBeLessThan(PRIOR);
  });

  it("names a primary fault from a single telling answer", () => {
    const session = answer(startSession(), {
      itemId: PUCK.id,
      optionKey: "A",
      confidence: 2,
    });
    const report = diagnose(session);
    expect(report.primary?.id).toBe("motion-implies-force");
    expect(report.probed).toBeGreaterThan(0);
    expect(report.correct).toBe(0);
  });

  it("confirms nothing about a student who answers everything correctly", () => {
    const honest = simulate(correctKey);
    expect(honest.diagnosis.answered).toBeGreaterThanOrEqual(MIN_ITEMS);
    expect(honest.diagnosis.faults.filter((f) => f.state === "confirmed")).toEqual([]);
    expect(honest.diagnosis.primary).toBeNull();
  });

  it("is deterministic: the same answers give the same diagnosis", () => {
    const once = simulate(tellingKeyFor("motion-implies-force"));
    const twice = simulate(tellingKeyFor("motion-implies-force"));
    expect(twice.diagnosis).toEqual(once.diagnosis);
    expect(twice.diagnosis.asked).toEqual(once.diagnosis.asked);
  });

  it("asks different questions of different students", () => {
    const honest = simulate(correctKey);
    const confused = simulate(tellingKeyFor("motion-implies-force"));

    expect(confused.diagnosis.asked).not.toEqual(honest.diagnosis.asked);
    expect(confused.diagnosis.beliefs["motion-implies-force"]).toBeGreaterThan(
      honest.diagnosis.beliefs["motion-implies-force"],
    );
    expect(confused.diagnosis.primary?.id).toBe("motion-implies-force");
  });

  it("can reach every fault line it claims to know", () => {
    // The completeness check. A fault that some student holds, that the engine
    // can never name, is a fault the product silently does not cover — and the
    // failure mode is invisible without this loop.
    const missed: string[] = [];

    for (const fault of MISCONCEPTION_IDS) {
      const result = simulate(tellingKeyFor(fault));
      const named = result.diagnosis.primary?.id ?? "nothing";
      if (named !== fault) missed.push(`${fault} was read as ${named}`);
    }

    expect(missed).toEqual([]);
  });

  it("puts every fault on the map, most damaging first", () => {
    const report = diagnose(startSession());
    expect(report.faults).toHaveLength(MISCONCEPTION_IDS.length);
    expect(report.faults.every((f) => f.state === "unprobed")).toBe(true);
    expect(report.probed).toBe(0);
    expect(report.total).toBe(MISCONCEPTION_IDS.length);
    expect(report.faults[0].misconception.severity).toBe("foundational");
    expect(report.faults[report.faults.length - 1].misconception.severity).toBe(
      "localised",
    );
  });

  it("can explain every belief it holds", () => {
    const session = answer(startSession(), {
      itemId: PUCK.id,
      optionKey: "A",
      confidence: 2,
    });
    const reading = diagnose(session).faults.filter((f) => f.id === "motion-implies-force")[0];
    expect(reading.contributions).toHaveLength(1);
    expect(reading.contributions[0].itemId).toBe(PUCK.id);
    expect(reading.contributions[0].weight).toBeGreaterThan(0);
  });

  it("does not close the map while a question could still overturn it", () => {
    // A fault sitting at the base rate whose one decisive item was never asked
    // looks exactly like a fault that has been ruled out. The session used to stop
    // here and name the wrong one.
    const leader = applyEvidence(initialBeliefs(), { "energy-is-consumed": 2.07 });
    const beliefs = { ...leader, "work-means-speed-up": 0.45 };
    const everything = new Set(ITEMS.map((entry) => entry.id));

    const untouched = new Set<string>();
    expect(couldStillBeOverturned(beliefs, untouched)).toBe(true);
    // Once every item has been asked there is nothing left that could change it,
    // whatever the beliefs say.
    expect(couldStillBeOverturned(beliefs, everything)).toBe(false);
  });

  it("stops as soon as no remaining question could change the answer", () => {
    // The look-ahead is a bound, not a refusal to ever stop: a leader that no
    // single remaining tell can reach closes the session, which is what keeps
    // sessions short when the diagnosis is genuinely settled.
    const settled = applyEvidence(initialBeliefs(), { "gravity-ends-above-sky": 3 });
    const nothingAsked = new Set<string>();
    expect(couldStillBeOverturned(settled, nothingAsked)).toBe(false);
  });
});
