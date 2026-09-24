# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Dates are ISO 8601.

## [Unreleased]

### Fixed

- **The whole page was inert when opened on `127.0.0.1`, and the only way out was a reload.** Next
  serves its client runtime — the thing that hydrates the page — from dev-only resources, and it
  refuses those to any host it does not recognise as its own origin. `127.0.0.1` and `localhost` are
  different origins even though they are the same machine, so every URL that said `127.0.0.1` got
  finished, correct HTML with **nothing attached to it**: no handler fired, no error appeared, and the
  form submitted natively, which is the page reload a student reported. `allowedDevOrigins` now
  declares both loopback names, and `npm run smoke` asserts hydration on each of them in a real
  browser, because no unit test and no jsdom test can see this class of failure.
- **Pressing Return in the name field did nothing, and there was no form to submit.** The start screen
  had a button and no `form` around the field, so the single most natural way to begin — type a name,
  press Return — silently did nothing and the app looked broken, because from the student's side it
  was. The field is now inside a form, Return submits it, and `starts the diagnosis when Return is
  pressed in the name field` fails if the form is ever removed.

- **Three fault lines could not be diagnosed at all, and the engine reported no fault instead.** The
  question selector ranked candidates by mutual information alone, which systematically prefers items
  that discriminate several hypotheses at once, so items testing a single fault were never asked. A
  student holding "force sets the speed", "mass and weight are the same" or "distance is displacement"
  answered every question correctly and was told there was nothing wrong with their physics. Selection
  now also credits an item for the faults it would let the engine see properly for the first time.
  See [ADR 0007](docs/adr/0007-a-question-is-worth-asking-for-coverage.md).
- **A session could close on the wrong fault before the right one had been asked about.** Convergence
  ended a session on the leading belief, but a fault sitting at the base rate looks the same whether it
  has been ruled out or never asked about. A session now also checks that no unasked item carries a
  tell strong enough, at full confidence, to lift a rival past the leader. A student who holds "work
  means speeding up" was previously diagnosed with "energy gets used up" after five questions; the
  item that could have shown the truth was never asked.
- **The response model could not predict a student choosing a distractor.** It scored an option by raw
  belief and gave the true answer a bonus equal to the magnitude of its own evidence, which made the
  true answer the most likely response for almost every student on almost every item. Affinity is now
  measured against the base rate, so a fault believed above it lifts its distractor above the correct
  answer — which is the prediction the selector needs to see any reason to ask a discriminating item.
- `npm run lint` reported an error in `page.tsx` (a synchronous `setState` in an effect) and a warning
  in `evorozen.ts` (an unused binding). The layer configuration is now read through
  `useSyncExternalStore`, which also means a key applied in one tab is picked up in another.
- `npm run typecheck` failed in `ai.test.ts`: a `Set` inferred from the knowledge base was compared
  against lexicon ids typed as `string`, so the comparison could not catch the typo it exists to catch.
- The settling question for "friction opposes all motion" was two sentences ending in a full stop, which
  the authored-lesson check requires to end in a question mark.

### Changed

- **The interface.** The first version was set like a lab notebook: warm paper, hairlines and one
  reserved accent, with the argument for the product written out in two paragraphs. It was honest and
  it was a report, and students do not return to reports. The paper stays — it is what makes this look
  unlike every other quiz — and everything on top of it changed:
  - **The map is the page.** Twenty tiles, coloured by state, leading both the start screen (empty, as
    a promise) and the report (filled, as the result). It is the artifact a student screenshots, which
    the go-to-market plan says is the whole growth loop, and there is now a button to copy it as text.
  - **Colour carries meaning rather than decoration.** Blue for the engine's own readings, brick for a
    fault that is live, amber for suspected, green for resolved — and the brick appears roughly once
    per session, which is what makes it mean something. The masthead carries a four-colour rule.
  - **Less prose, in the same words.** The two opening paragraphs became a card showing two students
    choosing the same wrong option for different reasons, which is the entire argument and fits in a
    glance. The lesson's three authored parts became three coloured cards. Nothing was cut from the
    physics; it was taken off the wall.
  - **The concept is shown, not described.** Three numbered panels — it asks, it reads why, it teaches
    one thing — sit next to the two-students card, so the product is legible before anything is read.
    The start screen lost its two opening paragraphs to it.
  - **The question screen carries the map.** Twenty squares fill in as fault lines are tested, so a
    student watches the board go from empty to answered instead of watching a number move.
  - The live belief rail, the options, the confidence control and the meters are all coloured and
    filled, so the question screen shows something changing while the student answers.
  - **The report leads with the map, not the prose.** The twenty rows of quoted beliefs — 765 words of
    them — fold behind a disclosure, taking the visible page to under 400 words while nothing was cut
    from the physics.
- `vitest.config.mts` now picks up `*.test.tsx` alongside `*.test.ts`, with the two kinds of test
  explained where the include list is defined.

### Added

- **`scripts/smoke.mjs`, the browser smoke test.** Starts (or borrows) a real Next dev server, drives
  it in Chromium, and checks the two things only a browser can: that React attached to the
  server-rendered HTML, and that a student can get from a typed name to a report with a map — on both
  `127.0.0.1` and `localhost`. `npm run smoke:install` fetches the one browser it needs into
  `.pw-browsers/` inside the project, so nothing is written to a shared cache. CI runs it as its own
  job.
- **`src/app/flow.test.tsx`, the flow suite.** 7 tests that render the real component tree in jsdom
  and drive it the way a student does: type a name, press Return, answer twelve questions, arrive at a
  report with a map. `docs/verification.md` had listed the absence of this as the largest known gap,
  and the Return-key bug is exactly the class of defect it exists to catch. `jsdom` is a devDependency;
  the runtime dependencies are still three.
- Tests for the guarantees above: a full session in which every answer is correct still asks a question
  that could show each of the twenty faults; the coverage term is positive before an item is asked and
  zero afterwards; a session stays open while a remaining question could change the answer and closes
  when it could not; and the response model predicts the true answer for a student believed to hold
  nothing, not only at the base rate. 72 tests, and `npm run verify` is clean.

## [0.1.0] — 2026-09-23

### Added

- The diagnostic engine: belief per fault line updated additively in log-odds, information-gain
  question choice, and a diagnosis derived from the answer list so the same answers always produce the
  same map.
- Twenty authored fault lines and twenty-five items, in the tradition of the force-concept research
  that began with the Force Concept Inventory. No item or distractor from that instrument is
  reproduced here.
- Start screen, question card with the live belief rail, and a report carrying the diagnosis, the
  lesson, the full map and the evidence trail behind every belief.
- The offline layer: a built-in phrase reader, the authored lessons, and `localStorage`, so the app is
  fully functional with no key, no account and no server.
- The Evorozen Neural Pulse integration: reasoning reads, persistent fault profiles, and a rewrite of
the authored lesson's framing in the student's own words — each call wrapped, so that no failure path
can end a session in progress.
- `npm run verify` — lint, typecheck, unit tests and build — running in CI on every push and pull
  request, plus a second job that builds the static export so the deployed path is verified before the
  push that publishes it.
