/**
 * The item bank.
 *
 * Every option carries `evidence`: a map from misconception id to a signed
 * log-odds weight describing what choosing that option tells us about the
 * student.
 *
 *   positive weight   choosing this is a tell. The student likely holds it.
 *   negative weight   choosing this argues against it. The student likely doesn't.
 *
 * The magnitudes are the honest part. A weight of 2.0 says "this option is
 * almost impossible to choose while believing the correct model". A weight of
 * 0.4 says "weak tell, barely worth updating on". Most distractors are strong
 * tells for exactly one fault and weak tells for one or two neighbours, which is
 * what an item that can discriminate actually looks like.
 *
 * Weights are not tuned to make any particular student come out of the model
 * looking good. They are set once, by hand, and the engine's behaviour is then
 * whatever the arithmetic says — the tests assert the properties that must hold
 * (every key resolves, exactly one correct option, likelihoods in range) rather
 * than asserting any particular diagnosis.
 *
 * Option order is fixed rather than shuffled. Determinism is worth more than
 * position-randomisation here: it is what lets the flow suite and the screenshots
 * reproduce exactly, and a diagnosis that changes when the same answers are
 * replayed is a diagnosis nobody trusts. See docs/adr/0005.
 */

export type Option = {
  readonly key: string;
  readonly text: string;
  readonly evidence: Readonly<Record<string, number>>;
  /** Exactly one option per item is true. A test enforces this. */
  readonly correct?: boolean;
};

export type Item = {
  readonly id: string;
  readonly stem: string;
  readonly options: readonly Option[];
};

export const ITEMS: readonly Item[] = [
  {
    id: "puck-on-ice",
    stem: "A hockey puck slides across frictionless ice in a straight line at a steady 4 m/s. Which statement about it is correct?",
    options: [
      {
        key: "A",
        text: "A small forward force keeps it moving, balancing the drag of the ice.",
        evidence: { "motion-implies-force": 1.8, "force-velocity-conflated": 0.4 },
      },
      {
        key: "B",
        text: "No horizontal force acts on it. The only forces are vertical, and they balance.",
        evidence: {
          "motion-implies-force": -1.4,
          "equilibrium-means-at-rest": -0.6,
          "rest-means-no-force": -0.4,
        },
        correct: true,
      },
      {
        key: "C",
        text: "The force of the stick is still inside the puck, draining away as it travels.",
        evidence: { "object-carries-its-force": 2.0 },
      },
      {
        key: "D",
        text: "A constant net forward force makes it travel at constant speed.",
        evidence: { "force-velocity-conflated": 1.8, "motion-implies-force": 0.3 },
      },
    ],
  },
  {
    id: "vacuum-drop",
    stem: "Two steel balls, one with twice the mass of the other, are released together in a vacuum. What happens?",
    options: [
      {
        key: "A",
        text: "The heavier ball lands first.",
        evidence: { "heavier-falls-faster": 2.0 },
      },
      {
        key: "B",
        text: "They land together.",
        evidence: { "heavier-falls-faster": -1.6, "gravity-only-when-falling": -0.3 },
        correct: true,
      },
      {
        key: "C",
        text: "The lighter ball lands first, because it has less inertia to overcome.",
        evidence: { "heavier-falls-faster": 1.0, "mass-is-weight": -0.3 },
      },
    ],
  },
  {
    id: "book-on-table",
    stem: "A book is at rest on a table. Which statement is correct?",
    options: [
      {
        key: "A",
        text: "No forces act on the book, because it is not moving.",
        evidence: { "rest-means-no-force": 2.0 },
      },
      {
        key: "B",
        text: "Gravity pulls down and the table pushes up, and the two are equal in size.",
        evidence: { "rest-means-no-force": -1.6, "third-law-cancels": 0.3 },
        correct: true,
      },
      {
        key: "C",
        text: "The two forces are a Newton's third-law pair, which is why they cancel out.",
        evidence: { "third-law-cancels": 1.8, "rest-means-no-force": 0.5 },
      },
      {
        key: "D",
        text: "Gravity is the only force on it. The table simply gets in the way.",
        evidence: { "rest-means-no-force": 1.2, "equilibrium-means-at-rest": 0.4 },
      },
    ],
  },
  {
    id: "ball-at-apex",
    stem: "A ball is thrown straight upward. At the highest point of its flight, what is the net force on it?",
    options: [
      {
        key: "A",
        text: "Zero, because it has stopped moving.",
        evidence: { "peak-means-zero-force": 2.0, "gravity-only-when-falling": 0.5 },
      },
      {
        key: "B",
        text: "Its weight, acting downward.",
        evidence: { "peak-means-zero-force": -1.6, "gravity-only-when-falling": -1.0 },
        correct: true,
      },
      {
        key: "C",
        text: "An upward force, which is what brings it back down again.",
        evidence: { "gravity-only-when-falling": 1.6, "peak-means-zero-force": 0.3 },
      },
      {
        key: "D",
        text: "Zero, because the upward force of the throw has exactly cancelled gravity.",
        evidence: {
          "object-carries-its-force": 1.2,
          "peak-means-zero-force": 1.0,
        },
      },
    ],
  },
  {
    id: "ball-in-flight",
    stem: "A ball has been thrown and is now in mid-air, well clear of the hand. Ignoring air resistance, which forces act on it?",
    options: [
      {
        key: "A",
        text: "Only gravity.",
        evidence: {
          "object-carries-its-force": -1.8,
          "motion-implies-force": -0.8,
          "gravity-only-when-falling": -0.4,
        },
        correct: true,
      },
      {
        key: "B",
        text: "Gravity, plus the force of the throw still pushing it forward.",
        evidence: { "object-carries-its-force": 2.0, "motion-implies-force": 1.2 },
      },
      {
        key: "C",
        text: "Gravity, plus a forward force that is steadily decreasing.",
        evidence: { "object-carries-its-force": 1.4, "motion-implies-force": 0.6 },
      },
      {
        key: "D",
        text: "Only the force of the throw while it rises; gravity acts only from the peak onward.",
        evidence: { "gravity-only-when-falling": 1.8, "object-carries-its-force": 0.8 },
      },
    ],
  },
  {
    id: "lorry-and-car",
    stem: "A loaded lorry collides head-on with a small car. During the collision, which force is larger?",
    options: [
      {
        key: "A",
        text: "The force on the car, because the car is pushed back further.",
        evidence: { "third-law-cancels": 1.4, "mass-is-weight": 0.4 },
      },
      {
        key: "B",
        text: "Neither. The two forces are equal in size and opposite in direction.",
        evidence: { "third-law-cancels": -1.8 },
        correct: true,
      },
      {
        key: "C",
        text: "They are equal, so they cancel and neither vehicle is really pushed at all.",
        evidence: { "third-law-cancels": 2.0 },
      },
      {
        key: "D",
        text: "The lorry's force is larger, because it carries more momentum.",
        evidence: { "third-law-cancels": 1.0, "energy-is-a-force": 0.5 },
      },
    ],
  },
  {
    id: "ball-on-string",
    stem: "A ball is whirled in a horizontal circle on a string at constant speed. The net force on the ball points…",
    options: [
      {
        key: "A",
        text: "Outward, away from the centre.",
        evidence: { "circular-needs-outward-force": 2.0 },
      },
      {
        key: "B",
        text: "Inward, towards the centre.",
        evidence: {
          "circular-needs-outward-force": -1.8,
          "acceleration-means-speeding-up": -0.6,
        },
        correct: true,
      },
      {
        key: "C",
        text: "Nowhere. The speed is constant, so the net force is zero.",
        evidence: {
          "terminal-velocity-means-no-force": 1.0,
          "acceleration-means-speeding-up": 0.8,
          "circular-needs-outward-force": 0.6,
        },
      },
      {
        key: "D",
        text: "Forward, along the direction the ball is travelling.",
        evidence: {
          "circular-needs-outward-force": 0.8,
          "acceleration-means-speeding-up": 1.0,
        },
      },
    ],
  },
  {
    id: "steady-cornering",
    stem: "A car drives round a bend at a steady 30 km/h. Is it accelerating?",
    options: [
      {
        key: "A",
        text: "No, because its speed is not changing.",
        evidence: { "acceleration-means-speeding-up": 2.0, "terminal-velocity-means-no-force": 0.8 },
      },
      {
        key: "B",
        text: "Yes, because its direction is changing.",
        evidence: {
          "acceleration-means-speeding-up": -1.8,
          "circular-needs-outward-force": -0.5,
        },
        correct: true,
      },
      {
        key: "C",
        text: "Only if the driver presses the accelerator pedal.",
        evidence: { "acceleration-means-speeding-up": 1.4, "work-means-speed-up": 0.5 },
      },
    ],
  },
  {
    id: "holding-the-box",
    stem: "A student holds a 20 kg box at shoulder height, perfectly still, for one minute. How much work do they do on the box?",
    options: [
      {
        key: "A",
        text: "A great deal of work — holding it is exhausting.",
        evidence: { "work-means-speed-up": 1.6, "energy-is-a-force": 0.6 },
      },
      {
        key: "B",
        text: "None. The box never moves, so there is no displacement.",
        evidence: { "work-means-speed-up": -1.8, "distance-is-displacement": -0.4 },
        correct: true,
      },
      {
        key: "C",
        text: "It is work, and its size is the weight multiplied by the time held.",
        evidence: { "work-means-speed-up": 1.2, "energy-is-a-force": 0.5 },
      },
    ],
  },
  {
    id: "mass-on-the-moon",
    stem: "A student's mass on Earth is 75 kg. On the Moon, where the gravitational field strength is about one sixth of Earth's…",
    options: [
      {
        key: "A",
        text: "Their mass is about 12.5 kg.",
        evidence: { "mass-is-weight": 2.0 },
      },
      {
        key: "B",
        text: "Their mass is still 75 kg, and their weight is about one sixth.",
        evidence: { "mass-is-weight": -1.8, "heavier-falls-faster": -0.3 },
        correct: true,
      },
      {
        key: "C",
        text: "Their mass and their weight both fall to about one sixth.",
        evidence: { "mass-is-weight": 1.6 },
      },
      {
        key: "D",
        text: "Their mass drops to 12.5 kg, and their weight is unchanged.",
        evidence: { "mass-is-weight": 1.2 },
      },
    ],
  },
  {
    id: "gravity-at-the-station",
    stem: "The International Space Station orbits roughly 400 km above the surface. What is gravity like there, and why do the crew float?",
    options: [
      {
        key: "A",
        text: "There is no gravity, which is why they float.",
        evidence: { "gravity-ends-above-sky": 2.0, "heavier-falls-faster": 0.3 },
      },
      {
        key: "B",
        text: "It is about 89% of its surface value. They float because they are falling continuously around the planet.",
        evidence: {
          "gravity-ends-above-sky": -2.0,
          "circular-needs-outward-force": -0.6,
          "heavier-falls-faster": -0.4,
        },
        correct: true,
      },
      {
        key: "C",
        text: "It is extremely weak — perhaps a thousandth of its surface value.",
        evidence: { "gravity-ends-above-sky": 1.4 },
      },
      {
        key: "D",
        text: "There is no gravity, because space is a vacuum.",
        evidence: { "gravity-ends-above-sky": 1.2 },
      },
    ],
  },
  {
    id: "terminal-velocity",
    stem: "A skydiver is falling at a constant 55 m/s with their parachute still packed. Which statement is correct?",
    options: [
      {
        key: "A",
        text: "No forces act on them any more.",
        evidence: { "terminal-velocity-means-no-force": 2.0, "equilibrium-means-at-rest": 0.6 },
      },
      {
        key: "B",
        text: "Gravity and air resistance are equal in size and opposite in direction.",
        evidence: {
          "terminal-velocity-means-no-force": -1.8,
          "equilibrium-means-at-rest": -1.0,
        },
        correct: true,
      },
      {
        key: "C",
        text: "Gravity has effectively switched off, leaving only air resistance.",
        evidence: { "terminal-velocity-means-no-force": 1.6, "gravity-only-when-falling": 0.5 },
      },
      {
        key: "D",
        text: "They are in equilibrium, which is impossible while moving.",
        evidence: { "equilibrium-means-at-rest": 1.8 },
      },
    ],
  },
  {
    id: "cruising-airliner",
    stem: "An airliner cruises in level flight at a constant 900 km/h. Is it in equilibrium?",
    options: [
      {
        key: "A",
        text: "No, because it is moving so fast.",
        evidence: { "equilibrium-means-at-rest": 1.8, "motion-implies-force": 0.5 },
      },
      {
        key: "B",
        text: "Yes. Constant velocity means zero net force.",
        evidence: {
          "equilibrium-means-at-rest": -1.8,
          "terminal-velocity-means-no-force": -1.0,
        },
        correct: true,
      },
      {
        key: "C",
        text: "No. Equilibrium means it would have to be stationary.",
        evidence: { "equilibrium-means-at-rest": 1.8, "rest-means-no-force": 0.5 },
      },
    ],
  },
  {
    id: "perpendicular-forces",
    stem: "Two forces act on the same point: 3 N toward the east, and 4 N toward the north. What is the resultant force?",
    options: [
      {
        key: "A",
        text: "7 N.",
        evidence: { "vector-scalar-addition": 2.0 },
      },
      {
        key: "B",
        text: "5 N, directed between the two forces.",
        evidence: { "vector-scalar-addition": -1.8 },
        correct: true,
      },
      {
        key: "C",
        text: "1 N.",
        evidence: { "vector-scalar-addition": 1.0 },
      },
      {
        key: "D",
        text: "7 N, directed north-east.",
        evidence: { "vector-scalar-addition": 1.6 },
      },
    ],
  },
  {
    id: "what-propels-a-walker",
    stem: "A student walks forward across level ground. Which force propels them forward?",
    options: [
      {
        key: "A",
        text: "Friction from the ground, acting forward. Friction is what drives walking.",
        evidence: { "friction-opposes-all-motion": -1.8 },
        correct: true,
      },
      {
        key: "B",
        text: "Friction from the ground, acting backward — it simply is not large enough to stop them.",
        evidence: { "friction-opposes-all-motion": 1.8 },
      },
      {
        key: "C",
        text: "Nothing. Friction cannot propel anything; it can only resist motion.",
        evidence: { "friction-opposes-all-motion": 2.0 },
      },
      {
        key: "D",
        text: "Their own forward push, since friction only ever opposes motion.",
        evidence: { "friction-opposes-all-motion": 1.6, "motion-implies-force": 0.4 },
      },
    ],
  },
  {
    id: "one-lap-of-the-track",
    stem: "A runner completes one lap of a 400 m track and stops exactly where they started. What are their distance travelled and displacement?",
    options: [
      {
        key: "A",
        text: "Both are 400 m.",
        evidence: { "distance-is-displacement": 2.0 },
      },
      {
        key: "B",
        text: "Distance is 400 m; displacement is zero.",
        evidence: { "distance-is-displacement": -1.8 },
        correct: true,
      },
      {
        key: "C",
        text: "Both are zero, since they returned to the start.",
        evidence: { "distance-is-displacement": 1.4 },
      },
      {
        key: "D",
        text: "Distance is zero; displacement is 400 m.",
        evidence: { "distance-is-displacement": 1.0 },
      },
    ],
  },
  {
    id: "ball-rolling-to-a-stop",
    stem: "A ball rolls across a floor and gradually comes to a stop. What happened to its kinetic energy?",
    options: [
      {
        key: "A",
        text: "It was used up, and it no longer exists.",
        evidence: { "energy-is-consumed": 1.8, "work-means-speed-up": 0.4 },
      },
      {
        key: "B",
        text: "It became thermal energy in the ball, the floor and the air.",
        evidence: { "energy-is-consumed": -1.8 },
        correct: true,
      },
      {
        key: "C",
        text: "It turned back into force.",
        evidence: { "energy-is-a-force": 1.6 },
      },
      {
        key: "D",
        text: "The ball's force ran out.",
        evidence: { "object-carries-its-force": 1.2, "energy-is-a-force": 0.8 },
      },
    ],
  },
  {
    id: "force-or-energy",
    stem: "Which of these statements about force and energy is correct?",
    options: [
      {
        key: "A",
        text: "They are the same kind of quantity, measured in different units.",
        evidence: { "energy-is-a-force": 2.0 },
      },
      {
        key: "B",
        text: "Force is measured in newtons and energy in joules, and they are independent.",
        evidence: { "energy-is-a-force": -1.8 },
        correct: true,
      },
      {
        key: "C",
        text: "Energy is another word for the force carried by a moving object.",
        evidence: { "energy-is-a-force": 1.8, "object-carries-its-force": 0.5 },
      },
      {
        key: "D",
        text: "A moving object's energy is its mass multiplied by its acceleration.",
        evidence: { "energy-is-a-force": 1.0, "force-velocity-conflated": 0.4 },
      },
    ],
  },
  {
    id: "rising-ball-direction",
    stem: "A ball thrown upward is on its way up, before the peak. Which way does the net force on it point?",
    options: [
      {
        key: "A",
        text: "Upward — that is why it is still rising.",
        evidence: { "gravity-only-when-falling": 1.6, "motion-implies-force": 0.8 },
      },
      {
        key: "B",
        text: "Downward, exactly as at every other moment of the flight.",
        evidence: {
          "gravity-only-when-falling": -1.8,
          "object-carries-its-force": -0.8,
          "peak-means-zero-force": -0.5,
        },
        correct: true,
      },
      {
        key: "C",
        text: "Upward while rising, zero at the top, downward on the way down.",
        evidence: { "gravity-only-when-falling": 1.8, "peak-means-zero-force": 0.8 },
      },
      {
        key: "D",
        text: "It alternates, reversing direction at the peak.",
        evidence: { "gravity-only-when-falling": 1.0, "peak-means-zero-force": 0.6 },
      },
    ],
  },
  {
    id: "dropped-and-fired",
    stem: "One ball is dropped from a table edge. At the same instant, another is fired horizontally from the same height. Which reaches the floor first?",
    options: [
      {
        key: "A",
        text: "The dropped ball.",
        evidence: {
          "object-carries-its-force": 1.0,
          "gravity-only-when-falling": 0.6,
          "heavier-falls-faster": 0.5,
        },
      },
      {
        key: "B",
        text: "The fired ball, because it has further to travel.",
        evidence: { "object-carries-its-force": 1.2, "heavier-falls-faster": 0.5 },
      },
      {
        key: "C",
        text: "They reach the floor at the same time. Vertical and horizontal motion are independent.",
        evidence: {
          "object-carries-its-force": -1.6,
          "gravity-only-when-falling": -1.0,
          "heavier-falls-faster": -0.5,
        },
        correct: true,
      },
      {
        key: "D",
        text: "The fired ball, because its forward motion slows its fall.",
        evidence: { "object-carries-its-force": 1.4 },
      },
    ],
  },
  {
    id: "carrying-a-suitcase",
    stem: "A porter carries a suitcase at constant speed along a level corridor. How much work does the porter do on the suitcase against gravity?",
    options: [
      {
        key: "A",
        text: "None. The motion is perpendicular to gravity.",
        evidence: { "work-means-speed-up": -1.4 },
        correct: true,
      },
      {
        key: "B",
        text: "A large amount, since the porter supports its weight the whole way.",
        evidence: { "work-means-speed-up": 1.8 },
      },
      {
        key: "C",
        text: "The suitcase's weight multiplied by the length of the corridor.",
        evidence: { "work-means-speed-up": 1.2, "distance-is-displacement": 0.6 },
      },
      {
        key: "D",
        text: "The suitcase's energy multiplied by the distance walked.",
        evidence: { "energy-is-a-force": 1.2, "work-means-speed-up": 0.6 },
      },
    ],
  },
  {
    id: "pendulum-swing",
    stem: "A pendulum swings, moving fastest as it passes through the lowest point. Which description of the energy is correct?",
    options: [
      {
        key: "A",
        text: "Potential energy becomes kinetic energy and back again, with the total staying constant.",
        evidence: { "energy-is-consumed": -1.8 },
        correct: true,
      },
      {
        key: "B",
        text: "The energy is gradually used up, which is why the swinging eventually dies away.",
        evidence: { "energy-is-consumed": 1.4, "object-carries-its-force": 0.5 },
      },
      {
        key: "C",
        text: "The energy becomes force at the lowest point, then turns back into energy.",
        evidence: { "energy-is-a-force": 1.6, "energy-is-consumed": 0.4 },
      },
    ],
  },
  {
    id: "what-accelerates-a-car",
    stem: "A car accelerates from rest along a level road. Which force accelerates it forward?",
    options: [
      {
        key: "A",
        text: "Friction from the road, acting in the direction of travel. Friction is what accelerates almost every vehicle.",
        evidence: { "friction-opposes-all-motion": -2.0, "motion-implies-force": -0.4 },
        correct: true,
      },
      {
        key: "B",
        text: "The engine, pushing the car forward, with friction resisting it.",
        evidence: { "friction-opposes-all-motion": 1.8, "motion-implies-force": 0.4 },
      },
      {
        key: "C",
        text: "Friction from the road, acting backward. The car moves because the engine's force is larger.",
        evidence: { "friction-opposes-all-motion": 2.0, "motion-implies-force": 0.5 },
      },
      {
        key: "D",
        text: "Nothing pushes it forward. It moves because the engine turns the wheels.",
        evidence: { "friction-opposes-all-motion": 1.6, "motion-implies-force": 0.8 },
      },
    ],
  },
  {
    id: "pulling-at-an-angle",
    stem: "A rope pulls a sledge with a force of 200 N, at 30 degrees above the horizontal. What is the horizontal component of that pull?",
    options: [
      {
        key: "A",
        text: "200 N. The whole pull acts along the rope, so all of it counts.",
        evidence: { "vector-scalar-addition": 1.6, "distance-is-displacement": 0.3 },
      },
      {
        key: "B",
        text: "About 173 N.",
        evidence: {
          "vector-scalar-addition": -1.8,
          "acceleration-means-speeding-up": -0.3,
        },
        correct: true,
      },
      {
        key: "C",
        text: "About 100 N, from 200 times the sine of 30 degrees.",
        evidence: { "vector-scalar-addition": 0.6 },
      },
    ],
  },
  {
    id: "what-holds-the-moon",
    stem: "What keeps the Moon in orbit around the Earth, rather than travelling off in a straight line?",
    options: [
      {
        key: "A",
        text: "The Earth's gravity pulls on it at every moment, continuously bending its path.",
        evidence: {
          "gravity-ends-above-sky": -1.8,
          "circular-needs-outward-force": -0.6,
          "object-carries-its-force": -0.5,
        },
        correct: true,
      },
      {
        key: "B",
        text: "Nothing holds it. It simply happens to move at the right speed through a vacuum.",
        evidence: { "gravity-ends-above-sky": 1.4, "object-carries-its-force": 0.8 },
      },
      {
        key: "C",
        text: "An outward force balances the Earth's pull, holding it in a ring.",
        evidence: {
          "circular-needs-outward-force": 1.8,
          "gravity-ends-above-sky": 0.6,
          "third-law-cancels": 0.4,
        },
      },
      {
        key: "D",
        text: "Gravity is far too weak at that distance to matter, so it drifts in a circle.",
        evidence: { "gravity-ends-above-sky": 1.6, "circular-needs-outward-force": 0.4 },
      },
    ],
  },
];

const ITEM_BY_ID = new Map<string, Item>(ITEMS.map((i) => [i.id, i] as const));

export function item(id: string): Item {
  const found = ITEM_BY_ID.get(id);
  if (!found) {
    throw new Error(`Unknown item: ${id}`);
  }
  return found;
}
