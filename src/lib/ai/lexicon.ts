/**
 * The offline reader.
 *
 * A phrase lexicon, not a language model, and it is labelled as one everywhere it
 * surfaces. It exists for three reasons and none of them is to compete with a
 * model: the app works with no API key, CI can run the whole flow suite, and there
 * is always a floor under the behaviour when a network call fails mid-diagnosis.
 *
 * Phrases deliberately overlap between faults. "The energy gets used up" is a real
 * tell for two different mistakes, and the belief state — not this file — is what
 * arbitrates between them. A lexicon that forced one answer per sentence would be
 * inventing a certainty the language does not have.
 */

export type LexiconEntry = {
  readonly faultId: string;
  /** Present -> evidence for the fault. */
  readonly tells: readonly string[];
  /** Present -> evidence against it. */
  readonly denials: readonly string[];
};

/** Each phrase found is worth this much, before the engine's own scaling. */
export const PHRASE_WEIGHT = 0.9;

/** No matter how much a student writes, one fault cannot be told more than this. */
export const MAX_LEXICON_WEIGHT = 2.2;

export const LEXICON: readonly LexiconEntry[] = [
  {
    faultId: "motion-implies-force",
    tells: [
      "still moving",
      "keeps moving",
      "keep it moving",
      "something pushing",
      "something is pushing",
      "needs a force",
      "force to keep",
      "force keeps it",
      "momentum keeps",
    ],
    denials: ["no horizontal force", "nothing is pushing", "no force is needed", "no force needed"],
  },
  {
    faultId: "force-velocity-conflated",
    tells: [
      "constant force",
      "steady force",
      "same speed the whole time",
      "force makes it move at",
      "constant speed so",
    ],
    denials: ["keeps accelerating", "gains speed", "force changes the speed"],
  },
  {
    faultId: "heavier-falls-faster",
    tells: [
      "heavier falls faster",
      "heavier lands",
      "heavier one lands",
      "more mass falls faster",
      "weight makes it fall",
      "lighter falls slower",
      "heavier ball first",
    ],
    denials: ["land together", "at the same rate", "same rate", "land at the same time", "same time"],
  },
  {
    faultId: "rest-means-no-force",
    tells: [
      "no forces acting",
      "no forces act",
      "not moving so no",
      "nothing acting on it",
      "there are no forces",
    ],
    denials: ["balanced", "balances", "cancel out", "equal and opposite", "normal force"],
  },
  {
    faultId: "gravity-only-when-falling",
    tells: [
      "gravity only",
      "only pulls when",
      "gravity starts when",
      "only on the way down",
      "stops pulling",
      "gravity stops",
      "no gravity on the way up",
    ],
    denials: ["the whole time", "always acts", "throughout", "even on the way up", "all the way"],
  },
  {
    faultId: "third-law-cancels",
    tells: [
      "cancel each other",
      "they cancel",
      "equal and opposite so",
      "cancels out so",
      "nothing moves because",
    ],
    denials: ["different objects", "two different objects", "not on the same object", "acts on the car"],
  },
  {
    faultId: "peak-means-zero-force",
    tells: [
      "zero at the top",
      "no force at the top",
      "stops so",
      "stopped so",
      "acceleration is zero at the top",
      "zero force at the top",
    ],
    denials: ["still gravity", "force is unchanged", "always gravity", "still pulled"],
  },
  {
    faultId: "circular-needs-outward-force",
    tells: [
      "outward",
      "centrifugal",
      "away from the centre",
      "away from the center",
      "pushed out",
      "pulls it out",
    ],
    denials: ["inward", "towards the centre", "towards the center", "centripetal", "toward the center"],
  },
  {
    faultId: "object-carries-its-force",
    tells: [
      "runs out",
      "run out",
      "wears off",
      "force of the throw",
      "in the ball",
      "carries the force",
      "carried the force",
      "stored in",
      "gradually loses",
      "slowly loses",
    ],
    denials: ["only gravity", "nothing is touching", "no force from the hand", "gravity alone"],
  },
  {
    faultId: "mass-is-weight",
    tells: [
      "mass changes",
      "mass would change",
      "lose mass",
      "same weight",
      "weigh the same",
      "kilos on the moon",
      "mass is less",
    ],
    denials: ["mass stays", "mass is the same", "mass unchanged", "mass does not change"],
  },
  {
    faultId: "distance-is-displacement",
    tells: ["same thing", "they are the same", "both 400", "both are 400", "same as the distance"],
    denials: ["displacement is zero", "back at the start", "net distance", "displacement is 0"],
  },
  {
    faultId: "friction-opposes-all-motion",
    tells: [
      "friction opposes",
      "friction slows",
      "friction is against",
      "friction only",
      "friction resists",
      "against the motion",
      "friction cannot",
    ],
    denials: ["friction pushes", "friction drives", "friction propels", "friction forwards", "friction forward"],
  },
  {
    faultId: "acceleration-means-speeding-up",
    tells: [
      "not accelerating",
      "no acceleration",
      "only accelerating if",
      "speed is constant so",
      "constant speed so not",
    ],
    denials: ["direction is changing", "velocity is changing", "turning is acceleration", "changing direction"],
  },
  {
    faultId: "work-means-speed-up",
    tells: [
      "holding it is work",
      "holding is work",
      "doing work",
      "worked hard",
      "weight times the time",
      "it is work because",
    ],
    denials: ["no displacement", "does not move", "zero displacement", "not moving so no work", "never moves"],
  },
  {
    faultId: "energy-is-consumed",
    tells: ["used up", "gets used up", "disappears", "destroyed", "is gone", "lost forever"],
    denials: ["heat", "thermal", "transformed", "conserved", "becomes heat", "transferred"],
  },
  {
    faultId: "vector-scalar-addition",
    // No bare numerals here. Substring matching means "7 n" would fire inside
    // "17 n", and a false positive on the numbers is exactly the kind of quiet
    // error this file's tests exist to catch.
    tells: [
      "just add",
      "add them",
      "added together",
      "add the two",
      "sum them",
      "add the numbers",
    ],
    denials: ["pythagoras", "resultant", "component", "5 newtons", "square root"],
  },
  {
    faultId: "terminal-velocity-means-no-force",
    tells: ["no forces", "forces are gone", "nothing acting", "weight stops", "gravity stops"],
    denials: ["equal to the drag", "balances the drag", "still gravity", "balanced by"],
  },
  {
    faultId: "equilibrium-means-at-rest",
    tells: [
      "equilibrium means",
      "has to be still",
      "must be stopped",
      "not in equilibrium because",
      "equilibrium so it is not moving",
    ],
    denials: ["constant velocity", "any speed", "steady speed", "moving at a steady"],
  },
  {
    faultId: "energy-is-a-force",
    // "force of the" and "energy of the" were removed on purpose: they fire on
    // "the force of the throw", which is a tell for a different fault entirely.
    tells: [
      "force and energy are the same",
      "same thing as force",
      "lots of force",
      "force in it",
      "energy is a force",
      "more force so more energy",
    ],
    denials: ["different units", "newtons and joules", "not the same kind", "different things"],
  },
  {
    faultId: "gravity-ends-above-sky",
    tells: [
      "no gravity",
      "zero gravity",
      "weightless",
      "too far",
      "weak at that distance",
      "escaped",
      "no gravity in space",
    ],
    denials: ["still gravity", "free fall", "falling around", "falling towards the earth", "89 percent"],
  },
];
