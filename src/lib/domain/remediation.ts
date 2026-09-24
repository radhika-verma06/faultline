/**
 * What to do about a fault, once it has been found.
 *
 * Kept separate from the knowledge base on purpose. `misconceptions.ts` says what
 * is wrong and why it is tempting; this file says what to do next. They change for
 * different reasons — the diagnosis is physics, the remediation is teaching — and
 * separating them means the map can be rebuilt without rewriting the lessons.
 *
 * Every entry is authored, not generated. The language model's job downstream is
 * to *rewrite* one of these for the specific student, in their words, using what
 * they actually wrote. It is never asked to invent the physics, and it is never
 * asked to produce a lesson for a fault that has no entry here. A model that can
 * generate a physics correction from scratch is a model that can generate a wrong
 * one, and the student has no way to tell the difference.
 *
 * Three parts, and each has a job:
 *
 *   cue        one line, memorable, the reframing. This is what the student keeps.
 *   settleIt   the single question that resolves the ambiguity. Answers it and
 *              the misconception has nowhere to hide.
 *   tryIt      something they can do in two minutes with what is already around
 *              them. A demonstration beats an assertion, and it costs nothing.
 */

export type Remediation = {
  readonly faultId: string;
  readonly cue: string;
  readonly settleIt: string;
  readonly tryIt: string;
};

export const REMEDIATIONS = [
  {
    faultId: "motion-implies-force",
    cue: "A force does not keep motion going. A force changes motion.",
    settleIt: "Push a book across a table, then stop pushing. Does it stop the instant you let go, or does it coast?",
    tryIt: "Slide a glass across a wet worktop, then across a dry one. Only one thing changed between the two.",
  },
  {
    faultId: "force-velocity-conflated",
    cue: "Force sets the rate of change of speed, not the speed.",
    settleIt: "Your foot is holding the accelerator at a steady position. Are you travelling at one speed, or gaining speed?",
    tryIt: "Push a shopping trolley with a steady force down an empty aisle. It does not settle at a speed — it keeps gaining.",
  },
  {
    faultId: "heavier-falls-faster",
    cue: "Gravity pulls harder on more mass, and more mass is harder to move. The two cancel exactly.",
    settleIt: "A coin and a feather, dropped in a vacuum. Which lands first?",
    tryIt: "Drop a coin and a crumpled receipt together. Now flatten the receipt and drop both again. Same masses, different result.",
  },
  {
    faultId: "rest-means-no-force",
    cue: "Rest means the forces balance. It does not mean they are absent.",
    settleIt: "Slide your hand under a book on the table and push up gently. Does the book get lighter?",
    tryIt: "Rest a heavy book on a sponge. The sponge flattens — something is pressing down on it.",
  },
  {
    faultId: "gravity-only-when-falling",
    cue: "Gravity pulls the whole time, in one direction. A rising object is being pulled down too.",
    settleIt: "Throw a ball straight up. What is slowing it down on the way up, if not gravity?",
    tryIt: "Throw a ball up and watch it the whole way. It slows, stops and returns without anything switching on at the peak.",
  },
  {
    faultId: "third-law-cancels",
    cue: "The pair acts on two different objects, so it never cancels on either one.",
    settleIt: "You push a wall and the wall pushes you. You cannot move the wall — but can the wall move you?",
    tryIt: "Stand on a skateboard and push hard against a wall. You move. The wall does not.",
  },
  {
    faultId: "peak-means-zero-force",
    cue: "Speed and force are different things. At the top, the speed is zero and the force is unchanged.",
    settleIt: "At the top of a throw, if the force were zero, what would bring the ball back down?",
    tryIt: "Cycle slowly uphill and coast to a stop. At the instant you stop, the hill is still pulling exactly as hard.",
  },
  {
    faultId: "circular-needs-outward-force",
    cue: "The net force points inward. The outward feeling is your own inertia.",
    settleIt: "Let go of the string. Does the ball leave straight outward from the centre, or off at a tangent?",
    tryIt: "Swing a ball on a string and release it. It does not fly outward from the centre — it leaves along the tangent.",
  },
  {
    faultId: "object-carries-its-force",
    cue: "Nothing is carried. The hand accelerates the ball only while they are touching.",
    settleIt: "After the ball has left your hand, what is still touching it?",
    tryIt: "Throw a ball straight up as hard as you can. It starts slowing the instant it leaves your hand.",
  },
  {
    faultId: "mass-is-weight",
    cue: "Mass is how much matter. Weight is how hard gravity pulls on that matter.",
    settleIt: "If you took the bathroom scales to the Moon, would your body have changed?",
    tryIt: "Push a loaded trolley on the level, then on a slope. Your mass is identical in both places; the pull is not.",
  },
  {
    faultId: "distance-is-displacement",
    cue: "Distance is ground covered. Displacement is the arrow from start to finish.",
    settleIt: "Walk all the way round the room and sit back down. How far are you from where you started?",
    tryIt: "Walk down one corridor and along another, counting steps, then note you ended a few metres from the start.",
  },
  {
    faultId: "friction-opposes-all-motion",
    cue: "Friction opposes slipping between two surfaces. That is often what drives you forward.",
    settleIt: "The engine only spins the wheels, so what is pushing the car forward, if not friction?",
    tryIt: "Press a hand flat on the table and push it forward. The friction on your palm is the thing moving your arm.",
  },
  {
    faultId: "acceleration-means-speeding-up",
    cue: "Acceleration is any change in velocity: speeding up, slowing down, or turning.",
    settleIt: "You drive round a roundabout at a steady 20 mph. Is your velocity constant?",
    tryIt: "Whirl a ball on a string at a steady speed and feel the steady pull. Constant speed, continuous acceleration.",
  },
  {
    faultId: "work-means-speed-up",
    cue: "Work is force applied along a distance. Effort is not work.",
    settleIt: "Hold a heavy bag perfectly still for a minute. How far did the bag move?",
    tryIt: "Hold a bag still for two minutes. Your arms will burn, and the bag will gain no energy at all.",
  },
  {
    faultId: "energy-is-consumed",
    cue: "Energy is transformed, never destroyed. What runs out is usefulness, not energy.",
    settleIt: "A cyclist brakes to a stop. Where did the heat in the brake blocks come from?",
    tryIt: "Rub your palms together hard. The warmth is the movement you put in, still there.",
  },
  {
    faultId: "vector-scalar-addition",
    cue: "Only components along one line add as numbers. Perpendicular ones combine by Pythagoras.",
    settleIt: "Walk 3 metres north, then 4 metres east. How far are you from where you started?",
    tryIt: "Walk 3 m forward and 4 m right, then measure straight back to the start. It is 5 m, not 7.",
  },
  {
    faultId: "terminal-velocity-means-no-force",
    cue: "Constant velocity means the forces balance. It does not mean they disappear.",
    settleIt: "At terminal velocity, is the skydiver still being pulled downward by anything?",
    tryIt: "Drop a single sheet of paper flat. It reaches a steady speed within a hand's width of falling.",
  },
  {
    faultId: "equilibrium-means-at-rest",
    cue: "Equilibrium is zero net force, and therefore constant velocity — at any speed.",
    settleIt: "An airliner cruising at 900 km/h — is it accelerating?",
    tryIt: "Notice that a lift moving at a steady speed feels exactly like standing still.",
  },
  {
    faultId: "energy-is-a-force",
    cue: "Force is measured in newtons. Energy is measured in joules. They are different dimensions.",
    settleIt: "Can you have a very large force while transferring no energy at all?",
    tryIt: "Lean hard against a wall for thirty seconds. A large force, and not one joule transferred.",
  },
  {
    faultId: "gravity-ends-above-sky",
    cue: "Gravity barely weakens with altitude. An orbit is falling, not escaping.",
    settleIt: "If there were no gravity at the space station's height, what would keep it going round in a circle?",
    tryIt: "Kick a ball hard and watch it curve. That same curve, continued far enough, is an orbit.",
  },
] as const satisfies readonly Remediation[];

const BY_ID = new Map<string, Remediation>(
  REMEDIATIONS.map((r) => [r.faultId, r as Remediation] as const),
);

export function remediation(faultId: string): Remediation {
  const found = BY_ID.get(faultId);
  if (!found) {
    throw new Error(`No remediation authored for: ${faultId}`);
  }
  return found;
}

export function hasRemediation(faultId: string): boolean {
  return BY_ID.has(faultId);
}
