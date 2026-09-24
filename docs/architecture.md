# Architecture

## The shape of it

Three layers, and the dependency arrows only ever point one way.

```
  domain/            what is true about physics, and what a student says when they get it wrong
                     misconceptions.ts  20 faults   items.ts  25 items   remediation.ts  20 lessons
                     ▲ no imports from anything below
  engine/            belief.ts  ·  select.ts  ·  session.ts
                     ▲ pure functions; no network, no clock, no storage, no randomness
  ai/                lexicon.ts  ·  offline.ts  ·  evorozen.ts  ·  index.ts
                     ▲ proposes evidence; never decides a diagnosis
  components/        Session.tsx  ·  Report.tsx  ·  Masthead.tsx  ·  ui.tsx
```

One thing sits across the layers rather than inside them: `src/app/globals.css` holds the design
tokens, and `components/ui.tsx` is the only place a fault's *state* becomes a colour. Every screen
derives its colour from that one mapping, which is why a live fault is the same brick red on the
question screen, in the rail and on the map, and why the map can be read before any of it is read.

The engine does not import the AI layer. The AI layer cannot mutate the engine. The interface reads
both and writes neither. This is enforced by the import graph rather than by convention, which is the
only way it survives contact with a deadline.

## The three modules that do the work

### `engine/belief.ts`

One probability per fault line, updated additively in log-odds. Additive-in-log-odds is the right
idiom for hand-authored tells: a weight means the same thing whatever the student's prior, and two
independent tells compose by adding.

Everything crossing into the belief state is clamped — unknown ids dropped, weights capped, and
beliefs held strictly inside `(0, 1)` on the way out as well as in. That last one is not decoration:
sigmoid saturates to exactly 1, and a belief of exactly 1 is a probability no later update can move.

### `engine/select.ts`

Question choice as Bayesian experimental design in the small. Name the hypotheses; for each, build the
profile a student holding it would have and predict how they would answer each candidate; score by the
mutual information between the answer and the hypothesis — **plus** what the item would let the engine
see for the first time, weighted by how live each fault still is; ask the highest scorer.

The second term is not decoration. Information gain on its own prefers items that discriminate many
hypotheses at once, so items testing a single fault lose every contest, are never asked, and leave
that fault at the base rate where it is indistinguishable from a fault that has been ruled out. That
is [ADR 0007](adr/0007-a-question-is-worth-asking-for-coverage.md), and it is the same deadlock as
[ADR 0001](adr/0001-every-fault-is-a-live-hypothesis.md) in a form the first fix did not reach: every
fault was live, and three of them still had no question that could ever show them.

The response model underneath is a softmax over per-option affinity: a distractor is attractive in
proportion to the beliefs it is evidence for *measured against the base rate*, and the true option
carries a small standing preference representing that most students, asked cold, get most items right.
It is a simplification, it is documented as one, and the test suite asserts the properties that keep
it honest — that every item's true option is the model's most likely answer both at the prior and for
a student believed to hold nothing. An item that failed either check would be one where the model
could not predict a student getting it right, which would make it quietly useless.

The session's stopping rule belongs to the same principle. Convergence — a fault above 82%, leading by
25 points — is not on its own enough to close the map, because a fault sitting at the base rate looks
the same whether it has been ruled out or never asked about. So a session also checks that no unasked
item carries a tell strong enough, at full confidence, to lift any fault past the leader. Only when
that bound is false is the diagnosis settled by arithmetic rather than by the engine's patience.

### `engine/session.ts`

A session is a list of answers and nothing else. Beliefs, the fault map, the primary fault and the
question sequence are all derived on demand. Replay is therefore free, and the same answers always
produce the same diagnosis.

## The two seams

Both the intelligence layer and the memory layer are interfaces with two implementations — one that
talks to a service and one that does not. This is not a courtesy to the vendors. It is what lets the
test suite and CI run with no keys and no network, what makes the deployed build work on first load,
and what stops a dropped connection from ending a student's session mid-diagnosis.

`resilientIntelligence` and `resilientMemory` wrap rather than select, so degradation is a property of
the composition instead of something every call site remembers to do.

## What is deliberately absent

- **No database.** The only persistence is the Neural Pulse virtual database and `localStorage`. The
  app owns no schema of its own.
- **No backend.** Every screen is a client component, so the same build runs as a Node server locally
  and as static files on GitHub Pages.
- **No state library.** Three screens and one list of answers do not need one.
- **No charting or icon dependency.** Every drawing is inline SVG: the masthead mark is five lines, and
  the meters are divs. The app ships three runtime dependencies, and two of them are React.
- **No auth.** A student's identity is a slug of a name they type, kept on their device. Real accounts
  are the first thing to add for a school deployment, and the memory layer already has the seam for it.
- **No item-response calibration.** The weights are authored, not fitted. With twenty-five items and
  no cohort, fitting them would be curve-fitting a population that does not exist yet.
- **No visual regression testing.** `src/app/flow.test.tsx` drives the real components in jsdom, and
  `scripts/smoke.mjs` drives the real app in a real browser, so a dead handler or a page that never
  hydrates fails the build. Neither has a layout engine or a baseline image, so anything that depends
  on computed style — a control under an overlay, text the colour of its background, a breakpoint that
  hides the button — is still unchecked by eye rather than by check. See `verification.md`.
- **No lockfile-independent dev server.** Next runs one dev server per directory, so the smoke test
  borrows the one on :3311 when it is already up and only starts its own when nothing answers. In CI
  it always starts its own.

## The failure mode this repository keeps producing

Twice now the same shape of bug has shipped: **everything passes and nothing works.** The engine was
correct and unreachable for three faults, because the tests proved the arithmetic rather than the
route. The start screen was correct and completely inert, because the tests proved the components and
not the page they were served on. Both failed silently — no error, no warning, a page or a diagnosis
that simply was not there.

The response is not more care; it is a check at one level further out. Every claim in the README now
has a test that fails when the claim stops being true, and the layers go outward: arithmetic, then the
route through the engine, then the components wired together, then the real page in a real browser.
When something is added here, the question to answer is what would still pass if it were broken.

## Where the real risk sits

The engine's arithmetic is the least risky part of this system, because it is pure and it is tested.
The risk is in the **weights**: they encode a claim about how diagnostic each wrong option is, and that
claim is currently the author's judgement rather than a measurement.

The honest next step is not more items. It is collecting a cohort — one class of thirty, answering all
twenty-five items — and comparing the model's diagnosis against a teacher's, per student. Until that
exists, `docs/verification.md` says "authored, not calibrated" rather than implying otherwise.
