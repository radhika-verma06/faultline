import { describe, expect, it } from "vitest";

import { MAX_WEIGHT } from "../engine/belief";
import { ITEMS, item } from "./items";
import {
  MISCONCEPTIONS,
  MISCONCEPTION_IDS,
  SEVERITY_ORDER,
  isKnownMisconception,
  misconception,
} from "./misconceptions";

describe("the knowledge base", () => {
  it("has unique ids", () => {
    expect(new Set(MISCONCEPTION_IDS).size).toBe(MISCONCEPTION_IDS.length);
  });

  it("resolves every id, and refuses an unknown one loudly", () => {
    for (const id of MISCONCEPTION_IDS) {
      expect(misconception(id).id).toBe(id);
    }
    expect(() => misconception("no-such-fault")).toThrow(/Unknown misconception/);
    expect(isKnownMisconception("no-such-fault")).toBe(false);
  });

  it("gives every fault a usable severity", () => {
    for (const entry of MISCONCEPTIONS) {
      expect(SEVERITY_ORDER).toContain(entry.severity);
    }
  });

  it("writes every fault in the student's own words, and never as an accusation", () => {
    for (const entry of MISCONCEPTIONS) {
      expect(entry.inTheirWords.length).toBeGreaterThan(20);
      expect(entry.correction.length).toBeGreaterThan(40);
      expect(entry.whyItSeduces.length).toBeGreaterThan(40);
      expect(entry.breaks.length).toBeGreaterThan(0);
    }
  });

  it("says why every fault is seductive, without ever calling the student wrong-headed", () => {
    const forbidden = ["stupid", "obviously wrong", "silly", "careless"];
    for (const entry of MISCONCEPTIONS) {
      const prose = `${entry.whyItSeduces} ${entry.inTheirWords}`.toLowerCase();
      for (const word of forbidden) {
        expect(prose).not.toContain(word);
      }
    }
  });

  it("is big enough for adaptivity to mean anything", () => {
    // With a handful of faults there is nothing to choose between, and the
    // selector would be decoration. This is a floor, not a target.
    expect(MISCONCEPTIONS.length).toBeGreaterThanOrEqual(18);
  });
});

describe("the item bank", () => {
  it("has unique ids", () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(item(ids[0]).id).toBe(ids[0]);
    expect(() => item("no-such-item")).toThrow(/Unknown item/);
  });

  it("has exactly one correct option per item", () => {
    for (const entry of ITEMS) {
      const correct = entry.options.filter((o) => o.correct === true);
      expect(correct, `${entry.id} correct options`).toHaveLength(1);
    }
  });

  it("offers at least two distinct options, with unique keys", () => {
    for (const entry of ITEMS) {
      expect(entry.options.length).toBeGreaterThanOrEqual(2);
      const keys = entry.options.map((o) => o.key);
      expect(new Set(keys).size).toBe(keys.length);
      const texts = entry.options.map((o) => o.text.trim());
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it("gives every item a real stem", () => {
    for (const entry of ITEMS) {
      expect(entry.stem.length).toBeGreaterThan(30);
      expect(entry.stem.trim().endsWith("?") || entry.stem.includes("…")).toBe(true);
    }
  });

  it("points every weight at a fault that exists", () => {
    for (const entry of ITEMS) {
      for (const option of entry.options) {
        for (const id of Object.keys(option.evidence)) {
          expect(isKnownMisconception(id), `${entry.id}/${option.key} -> ${id}`).toBe(true);
        }
      }
    }
  });

  it("keeps every weight finite, non-zero, and within the clamp", () => {
    for (const entry of ITEMS) {
      for (const option of entry.options) {
        for (const weight of Object.values(option.evidence)) {
          expect(Number.isFinite(weight)).toBe(true);
          expect(weight).not.toBe(0);
          expect(Math.abs(weight)).toBeLessThanOrEqual(MAX_WEIGHT);
        }
      }
    }
  });

  it("carries evidence on every option, so no option is a wasted click", () => {
    for (const entry of ITEMS) {
      for (const option of entry.options) {
        expect(
          Object.keys(option.evidence).length,
          `${entry.id}/${option.key}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("carries evidence against something on every correct option", () => {
    // A correct option's evidence is what pushes it down for a student believed to
    // hold the faults it argues against, and up for a student believed to hold
    // none of them. A correct option with no negative evidence at all would be
    // inert: a student holding one of that item's faults and answering correctly
    // would tell the engine nothing, which quietly makes the item one-sided. This
    // is the check that catches it.
    for (const entry of ITEMS) {
      const correct = entry.options.filter((o) => o.correct === true);
      expect(correct, entry.id).toHaveLength(1);
      if (correct.length === 0) continue;
      const magnitudes = Object.entries(correct[0].evidence).filter(
        ([, weight]) => weight < 0,
      );
      expect(magnitudes.length, `${entry.id} correct option has no negative evidence`)
        .toBeGreaterThan(0);
    }
  });

  it("makes every fault detectable by at least one option", () => {
    // A fault with no positive tell anywhere is a fault the engine can only ever
    // rule out, never confirm — it would sit on the map forever and never light.
    const detectable = new Set<string>();
    for (const entry of ITEMS) {
      for (const option of entry.options) {
        for (const [id, weight] of Object.entries(option.evidence)) {
          if (weight > 0) detectable.add(id);
        }
      }
    }
    for (const id of MISCONCEPTION_IDS) {
      expect(detectable.has(id), `${id} has no positive tell in the bank`).toBe(true);
    }
  });

  it("keeps pace with the knowledge base: at least as many items as faults", () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(MISCONCEPTIONS.length);
  });
});
