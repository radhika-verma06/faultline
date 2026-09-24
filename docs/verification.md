# Verification

Every claim the README makes, mapped to the check that recomputes it — and, at the end, the claims
nothing currently recomputes.

```bash
npm run verify     # lint → typecheck → 79 tests → build
npm run smoke      # a real browser against a real dev server (npm run smoke:install first)
```

Three kinds of check, and the distinction matters when reading the table below.

- `*.test.ts` runs in plain Node against the engine, the item bank and the knowledge base: pure
  functions, no DOM, nothing to flake.
- `src/app/flow.test.tsx` runs the real component tree in jsdom and drives it the way a student does —
  typing, pressing Return, choosing an option, reading the report.
- `scripts/smoke.mjs` runs the actual Next dev server and drives it in Chromium. It exists because the
  other two can both pass while the page is completely dead: Next refuses its client runtime to hosts
  it does not recognise as its own origin, and a page whose runtime never loads serves perfect HTML
  with no handlers attached. Nothing errors. The start screen shipped in exactly that state, so the
  smoke test asserts hydration on both loopback hostnames before it asserts anything else.

CI (`.github/workflows/ci.yml`) runs the same chain on every push and pull request, plus a second job
that builds the same app as a static export, so the deployed path is verified on the pull request
rather than on the push that publishes.

## Claim by claim

| Claim | Checked by |
|---|---|
| The engine names a fault only above 82%, and only with a 25-point lead | `isConverged` is asserted false at the prior, and the whole report from a single strong answer is asserted to leave two other faults unconfirmed |
| The same answers always produce the same diagnosis | `is deterministic: the same answers give the same diagnosis` compares two full simulations for deep equality |
| No item is ever asked twice in a session | `never repeats an item, and stops when the bank is spent` walks the entire bank and asserts no repeat, then asserts the selector returns null |
| Two students with different faults get different questions | `asks different questions of different students` compares the asked sequences of a student answering everything correctly against one holding a specific fault |
| Every fault line the product claims to know can actually be diagnosed | `can reach every fault line it claims to know` simulates a student holding each of the twenty in turn and asserts the engine names it. See [ADR 0001](adr/0001-every-fault-is-a-live-hypothesis.md) — this test is why that ADR exists |
| No fault is left without a question that could show it | `leaves no fault invisible across a whole session` walks a full session in which every answer is correct and asserts that each of the twenty faults was offered a tell. A fault detectable only by an item the ranking never picks is a fault the map lies about. See [ADR 0007](adr/0007-a-question-is-worth-asking-for-coverage.md) |
| An item is credited for the faults it would let the engine see for the first time | `credits an item for the faults it would let the engine see for the first time` asserts the coverage term is positive before the item is asked and zero afterwards |
| A session does not close while a remaining question could change the answer | `does not close the map while a question could still overturn it` (a rival within reach of a remaining tell keeps the session open; a fully asked bank closes it regardless) and `stops as soon as no remaining question could change the answer` (a leader no remaining tell can reach closes it) |
| Every weight points at a fault that exists | `points every weight at a fault that exists` in `domain.test.ts` |
| Every fault is detectable by at least one option | `makes every fault detectable by at least one option` |
| Every item has exactly one true option | `has exactly one correct option per item` |
| The model can predict the true answer for every item | `makes the true answer the most likely one under the prior, for every item`, and the stricter `still prefers the true answer for a student believed to hold nothing`, which holds the beliefs away from the base rate so the true option has to earn the top spot rather than win by default |
| The response model can never favour a correct option that carries no evidence | `carries evidence against something on every correct option` |
| Two independent tells compose the same way in either order | `composes two pieces of evidence the same way in either order` |
| A belief is never exactly 0 or exactly 1 | `keeps every belief strictly inside (0,1) however much evidence arrives` — 200 maximum-weight updates, then asserted |
| A single response can never claim certainty | `refuses to let one response claim certainty` — a weight of 1e6 moves the belief but does not saturate it |
| A model cannot put a fault that does not exist on a student's map | `drops a fault that a model invented` |
| A model cannot saturate a belief | `clamps a confident model`, against both directions |
| Unparsable model output is treated as a miss, not as an answer | `returns nothing rather than throwing on junk`, and `resilientIntelligence` treats an empty read as a fallback trigger |
| The teaching a student receives is authored | `assembles the authored parts verbatim, and never invents them` |
| Every fault has a lesson | `has one for every fault` |
| No fault description calls the student careless, silly or stupid | `says why every fault is seductive, without ever calling the student wrong-headed` |
| The lexicon can actually match its own phrases | `keeps every phrase lower-case, or it could never match` — `normalise()` lower-cases the student's text, so an upper-case phrase is dead weight |
| The lexicon covers every fault | `covers every fault in the knowledge base` |
| The report is ordered by severity, most damaging first | `puts every fault on the map, most damaging first` |
| Every belief can be explained | `can explain every belief it holds` — asserts the evidence trail is present and signed correctly |
| Typing a name and pressing Return starts a diagnosis | `starts the diagnosis when Return is pressed in the name field` asserts the field is inside a form and that submitting it reaches the first question. This is the flow test that exists because the app shipped without a form and a student concluding it was broken was right |
| Pressing Begin starts a diagnosis and leaves the start screen | `starts the diagnosis when the name is entered and Begin is pressed` |
| A question is answerable: options, a confidence control, and a disabled submit until one is chosen | `asks a question with options and a confidence control`, `will not accept an answer before an option is chosen` |
| Answering advances the sequence | `advances to the next question after an answer` |
| A full session reaches a report carrying a map | `reaches the report and shows a map` |
| The page actually hydrates, on `127.0.0.1` and on `localhost` | `npm run smoke` asserts a React fiber is attached to the server-rendered form before it does anything else. A page that renders and never hydrates is a page where nothing works |
| Return starts a diagnosis in a real browser, rather than submitting the form natively and reloading | `npm run smoke` — the same check as above, in the environment where it failed |
| A full session can be completed in a real browser, ending on a report with a map and something to try | `npm run smoke` |

## Deliberately not covered

Stated here rather than implied by omission.

- **The flow suite is real but thin.** `src/app/flow.test.tsx` now drives the interface in jsdom, so a
  handler that never fires, a stage that never advances or a screen that renders nothing fails the
  build. What it does not do is render. jsdom has no layout engine, so anything that depends on
  computed styles — a control underneath an overlay, text the same colour as its background, a
  responsive breakpoint that hides the button — is invisible to it, as is anything needing a real
  event loop beyond the handful of promises the tests await. A browser-driven suite (Playwright) is
  still the honest end state, and the gap is now one of fidelity rather than of coverage.
- **The weights are authored, not calibrated.** They encode a judgement about how diagnostic each
  wrong option is. No cohort has been measured against them, so the engine is internally consistent
  and externally unvalidated.
- **The Neural Pulse integration is not exercised by CI.** It requires a key, and by
  [ADR 0006](adr/0006-no-key-in-the-public-bundle.md) the deployed build has none. What the tests do
  cover is everything that can go wrong around it: envelope parsing, evidence sanitising, and the
  claim that no failure path can end a session.
- **No accessibility audit.** The interface uses real form controls, labelled fieldsets, `aria-pressed`
  and visible focus rings, but nobody has run it through a screen reader or axe, and no test asserts
  a contrast ratio.
- **No load or latency testing.** The engine's cost is not measured, only reasoned about.
- **The screenshots are not committed.** The README has no images yet. Capturing them needs a browser
  at build time, which is the same tooling the flow suite needs, and both are outstanding.
