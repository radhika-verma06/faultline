/**
 * The fault lines.
 *
 * Each entry is one misconception: a belief that is wrong in a specific,
 * describable way, that students hold for a reason, and that damages a knowable
 * list of later topics.
 *
 * The wording matters as much as the physics. `inTheirWords` is what a student
 * actually says out loud, and it is what the map shows, because a diagnosis a
 * student cannot recognise is a diagnosis they will not act on. Nothing here is
 * phrased as an accusation: every one of these is a reasonable inference from
 * ordinary experience, and the entry says so.
 *
 * Provenance: this bank is authored for Faultline in the tradition of the
 * force-concept research that began with the Force Concept Inventory
 * (Hestenes, Wells & Swackhamer, 1992) and the decades of misconception
 * inventories that followed. It is *not* a reproduction of that instrument,
 * which is copyrighted and deliberately keeps its answers secret — a good
 * diagnostic is worthless once students can look up what each distractor means.
 * Every stem and option in `items.ts` is written for this project.
 */

export type Severity = "foundational" | "consequential" | "localised";

export type Misconception = {
  readonly id: string;
  /** Short label. This is what appears on the map. */
  readonly name: string;
  /** What the student says out loud. The map leads with this, not the label. */
  readonly inTheirWords: string;
  /** The belief, stated precisely enough to be argued with. */
  readonly belief: string;
  /** What is actually true. */
  readonly correction: string;
  /** Why the intuition is reasonable. Nothing here is called stupid. */
  readonly whyItSeduces: string;
  /** Later topics that this fault line runs underneath. */
  readonly breaks: readonly string[];
  readonly severity: Severity;
};

export const MISCONCEPTIONS = [
  {
    id: "motion-implies-force",
    name: "Motion implies force",
    inTheirWords: "It's still moving, so something must still be pushing it.",
    belief: "Sustained motion requires a sustained force.",
    correction:
      "Motion needs no force to continue — only a force to change. If a net force were acting, the speed would be changing, which contradicts what you can see.",
    whyItSeduces:
      "Everything you have ever pushed stopped the moment you let go. Friction was quietly supplying the explanation, and a kitchen table is the worst laboratory in the world for this intuition.",
    breaks: ["inertia", "Newton's first law", "free-body diagrams of moving objects", "orbital motion"],
    severity: "foundational",
  },
  {
    id: "force-velocity-conflated",
    name: "Force sets the speed",
    inTheirWords: "If the force stays the same, the speed should stay the same.",
    belief: "A constant force produces constant velocity, rather than constant acceleration.",
    correction:
      "A constant net force produces a constant acceleration. The object gains speed steadily, for as long as the force acts, without a ceiling.",
    whyItSeduces:
      "Shoving a heavy box across a floor really does give constant speed — because friction grows with the shove and cancels the accelerating part. The friction is invisible; the constant speed is not.",
    breaks: ["Newton's second law", "motion graphs", "free fall", "projectiles"],
    severity: "foundational",
  },
  {
    id: "heavier-falls-faster",
    name: "Heavier falls faster",
    inTheirWords: "The heavy one lands first, obviously.",
    belief: "Weight determines how fast an object falls.",
    correction:
      "Without air, every mass falls at the same rate: gravity scales the force with the mass, and the mass divides that straight back out again.",
    whyItSeduces:
      "It is true in the room you are sitting in. A coin really does beat a feather, and the air responsible for that is invisible.",
    breaks: ["free fall", "gravitational field strength", "terminal velocity", "two-body problems"],
    severity: "foundational",
  },
  {
    id: "rest-means-no-force",
    name: "At rest means no force",
    inTheirWords: "It's just sitting there, so there are no forces on it.",
    belief: "A stationary object has no forces acting on it.",
    correction:
      "Rest means the forces balance, not that they are absent. A book on a table has gravity pulling it down and a normal force pushing it up, both fully present.",
    whyItSeduces:
      "Balance is invisible. Nothing about a resting book announces that two forces are grinding against each other through it.",
    breaks: ["free-body diagrams", "equilibrium", "normal force", "Newton's first law"],
    severity: "foundational",
  },
  {
    id: "gravity-only-when-falling",
    name: "Gravity only pulls downward",
    inTheirWords: "Gravity only starts pulling once it's on the way down.",
    belief: "Gravity acts only on falling objects, or only when the object is moving down.",
    correction:
      "Gravity acts the entire time, in one direction, wherever the object is and whichever way it is heading. On the way up it is still being pulled down — which is exactly why it slows.",
    whyItSeduces:
      "You can feel yourself being held down. You cannot feel yourself being decelerated upward by the same attraction.",
    breaks: ["projectiles", "circular motion", "vertical Newton's second law"],
    severity: "foundational",
  },
  {
    id: "third-law-cancels",
    name: "Third-law pairs cancel",
    inTheirWords: "The lorry pushes the car back just as hard, so nothing should move.",
    belief: "Newton's third-law pairs cancel, so they can never produce motion.",
    correction:
      "The pair acts on different objects. The force on the car and the force on the lorry are never added together, because they do not share a free-body diagram. Cancelling only applies to forces on the *same* object.",
    whyItSeduces:
      "The phrase 'equal and opposite' invites exactly the reading that they cancel, and stating it aloud makes it sound like a contradiction.",
    breaks: ["collisions", "contact forces", "momentum", "rocketry"],
    severity: "foundational",
  },
  {
    id: "peak-means-zero-force",
    name: "Zero speed means zero force",
    inTheirWords: "At the top it stops for a moment, so the acceleration must be zero.",
    belief: "Where velocity is zero, acceleration is zero.",
    correction:
      "Velocity and acceleration are independent. At the peak the velocity is momentarily zero while the acceleration is still g downward — and that is precisely why the object does not stay there.",
    whyItSeduces:
      "The object genuinely hangs for an instant. Stillness reads as balance, and the eye cannot see an acceleration.",
    breaks: ["projectiles", "simple harmonic motion", "the calculus of motion"],
    severity: "consequential",
  },
  {
    id: "circular-needs-outward-force",
    name: "Circular motion needs an outward force",
    inTheirWords: "There's an outward force throwing it away from the centre.",
    belief: "Circular motion is sustained by an outward force.",
    correction:
      "The net force on a circling object points inward, always. Nothing is thrown outward: the outward sensation is your own inertia resisting the turn, and inertia is not a force.",
    whyItSeduces:
      "In a turning car your body is pressed hard against the door and the sensation is completely real. It is also not a force acting on you.",
    breaks: ["circular motion", "orbits", "banked turns", "pseudo-forces"],
    severity: "consequential",
  },
  {
    id: "object-carries-its-force",
    name: "The throw is stored in the ball",
    inTheirWords: "The force of the throw is still in the ball — when it runs out, the ball falls.",
    belief: "A push deposits a quantity of force into an object, which is spent up as it travels.",
    correction:
      "Nothing is carried. The hand accelerates the ball only while they are touching. From the instant of release exactly one force acts, gravity, and the ball is in free fall from that moment onward.",
    whyItSeduces:
      "It explains, elegantly, why things slow down and stop. It is the oldest surviving physical theory, and nearly every child reinvents it unassisted.",
    breaks: ["projectiles", "Newton's first law", "energy", "momentum"],
    severity: "foundational",
  },
  {
    id: "mass-is-weight",
    name: "Mass and weight are the same",
    inTheirWords: "I weigh 60 kilograms here and about 10 on the Moon.",
    belief: "Mass and weight are one property, measured in one unit.",
    correction:
      "Mass is a quantity of matter and does not change anywhere. Weight is the gravitational force on it and changes with the local field. Your scales report newtons and are labelled in kilograms.",
    whyItSeduces:
      "Bathroom scales are printed in kilograms, so in every everyday situation the two words name the same number.",
    breaks: ["Newton's second law", "inertia versus gravity", "orbits", "apparent weight"],
    severity: "localised",
  },
  {
    id: "distance-is-displacement",
    name: "Distance is displacement",
    inTheirWords: "It travelled 400 metres, so the displacement is 400 metres.",
    belief: "Distance travelled and displacement are the same quantity.",
    correction:
      "Distance is a scalar total of ground covered. Displacement is the vector from start to finish. They agree only on a straight trip in a single direction.",
    whyItSeduces:
      "Almost every journey a student measures is a straight line out and back, where the distinction costs nothing.",
    breaks: ["velocity versus speed", "work", "vector addition", "kinematics equations"],
    severity: "consequential",
  },
  {
    id: "friction-opposes-all-motion",
    name: "Friction only slows things down",
    inTheirWords: "Friction always works against you.",
    belief: "Friction can only oppose motion.",
    correction:
      "Static friction is what drives a car forward, lets you walk, and holds a ladder against a wall. Friction opposes *relative slipping between two surfaces*, which frequently means it propels the object you are watching.",
    whyItSeduces:
      "You were told 'friction opposes motion' at primary school, and for a sliding block on a bench that answer is usually right.",
    breaks: ["vehicles", "static versus kinetic friction", "inclined planes", "walking"],
    severity: "consequential",
  },
  {
    id: "acceleration-means-speeding-up",
    name: "Acceleration means speeding up",
    inTheirWords: "It's slowing down, so there isn't any acceleration.",
    belief: "Acceleration means gaining speed. Slowing down and turning are something else.",
    correction:
      "Acceleration is any change in the velocity vector: speeding up, slowing down or changing direction. A car cornering at a steady 30 mph is accelerating the whole time.",
    whyItSeduces: "In ordinary speech, 'acceleration' is the pedal on the right.",
    breaks: ["circular motion", "motion graphs", "Newton's second law"],
    severity: "consequential",
  },
  {
    id: "work-means-speed-up",
    name: "Effort is work",
    inTheirWords: "I'm holding it up, so I'm doing work on it.",
    belief: "Work is anything tiring, and doing work means gaining speed.",
    correction:
      "Work is force multiplied by displacement *along* that force. Holding a weight still does no work on it, however much your arms disagree — and work done against friction appears as heat, not as speed.",
    whyItSeduces:
      "Muscles burning is unmistakable evidence of effort, and it has nothing to do with the physics definition.",
    breaks: ["conservation of energy", "power", "efficiency"],
    severity: "consequential",
  },
  {
    id: "energy-is-consumed",
    name: "Energy gets used up",
    inTheirWords: "The energy gets used up and then it's gone.",
    belief: "Energy is destroyed by being used.",
    correction:
      "Energy is conserved and only ever transformed, usually into spread-out thermal energy that can no longer do anything useful. Nothing is destroyed; only the usefulness is.",
    whyItSeduces:
      "This is a trap of language rather than of observation: the word 'use' implies consumption, and 'using up' is what it sounds like.",
    breaks: ["conservation of energy", "efficiency", "thermodynamics"],
    severity: "foundational",
  },
  {
    id: "vector-scalar-addition",
    name: "Vectors add like numbers",
    inTheirWords: "Five newtons north and five east makes ten newtons.",
    belief: "Vector quantities combine by ordinary arithmetic.",
    correction:
      "Perpendicular vectors combine by Pythagoras: 5 and 5 give 7.07, pointing between them. Only the components along one line add as numbers.",
    whyItSeduces:
      "Every number you have added since you were five years old added exactly like that.",
    breaks: ["forces at angles", "momentum", "projectiles", "equilibrium"],
    severity: "consequential",
  },
  {
    id: "terminal-velocity-means-no-force",
    name: "Constant speed means no forces",
    inTheirWords: "It's not falling any faster, so gravity must have stopped.",
    belief: "Constant speed means no forces act, rather than that the forces balance.",
    correction:
      "Constant velocity means zero *net* force, and therefore forces that cancel. It does not mean the forces vanish: at terminal velocity gravity and drag are both acting, fully, in opposite directions.",
    whyItSeduces:
      "The first half of the belief is correct — constant speed really does mean zero net force — which makes the second half feel like it follows.",
    breaks: ["drag", "equilibrium", "free-body diagrams"],
    severity: "localised",
  },
  {
    id: "equilibrium-means-at-rest",
    name: "Equilibrium means stopped",
    inTheirWords: "If it's in equilibrium then it must be parked.",
    belief: "Equilibrium requires zero velocity.",
    correction:
      "Equilibrium means zero net force, and therefore zero acceleration. Constant velocity at any speed is equilibrium, including an airliner at 900 km/h.",
    whyItSeduces: "Static equilibrium is the example every textbook opens with.",
    breaks: ["Newton's first law", "dynamics problems", "terminal velocity"],
    severity: "consequential",
  },
  {
    id: "energy-is-a-force",
    name: "'Force' and 'energy' mean the same thing",
    inTheirWords: "The car has a lot of force, so it hits hard.",
    belief: "Force and energy are two words for one quantity.",
    correction:
      "They are different dimensions: force is measured in newtons, energy in joules. One can be large while the other is zero — a wall can exert a large force on you while transferring no energy at all.",
    whyItSeduces:
      "Sports commentary and news copy use the two words interchangeably, so the confusion is installed years before the physics lesson arrives.",
    breaks: ["conservation of energy", "momentum versus energy", "work"],
    severity: "localised",
  },
  {
    id: "gravity-ends-above-sky",
    name: "Gravity stops above the sky",
    inTheirWords: "There's no gravity up there, that's why astronauts float.",
    belief: "Gravity stops above the atmosphere, and altitude is what makes an orbiting crew weightless.",
    correction:
      "Gravity at the space station is about 89% of its value at the surface. Astronauts float because they are in continuous free fall around the planet, not because they have escaped anything.",
    whyItSeduces:
      "The floating is unmistakable in every photograph, and the throwaway explanation most people meet first is simply wrong.",
    breaks: ["orbits", "free fall", "gravitational field", "apparent weight"],
    severity: "consequential",
  },
] as const satisfies readonly Misconception[];

export type MisconceptionId = (typeof MISCONCEPTIONS)[number]["id"];

export const MISCONCEPTION_IDS = MISCONCEPTIONS.map((m) => m.id);

// `as const` on each pair, so the array literal infers as a tuple rather than as
// an array of a union. Without it the Map constructor's entry type does not match.
const BY_ID = new Map<string, Misconception>(
  MISCONCEPTIONS.map((m) => [m.id, m as Misconception] as const),
);

/**
 * Throws rather than returning undefined. Every id in this codebase is a literal
 * written by hand, so a miss is a typo, and a typo should fail loudly and early
 * instead of rendering an empty space on a student's map.
 */
export function misconception(id: string): Misconception {
  const found = BY_ID.get(id);
  if (!found) {
    throw new Error(`Unknown misconception: ${id}`);
  }
  return found;
}

export function isKnownMisconception(id: string): boolean {
  return BY_ID.has(id);
}

/** The base rate, before any evidence: the share of students who hold any one of these. */
export const PRIOR = 0.32;

/** Ordering used on the map: most damaging first, then alphabetically. */
export const SEVERITY_ORDER: readonly Severity[] = [
  "foundational",
  "consequential",
  "localised",
];
