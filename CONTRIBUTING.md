# Contributing

Small repository, three runtime dependencies, and one rule that matters: **the code is the claim.**
Everything the README says about the engine is recomputed by a check that runs in CI, so a change that
makes one of those statements false fails the build rather than shipping as copy.

## Getting set up

```bash
npm install
npm run dev        # http://127.0.0.1:3311, hot reload
npm run verify     # lint → typecheck → unit tests → build: exactly what CI runs
```

There is no API key to set, and nothing to configure. The app is fully functional offline: the
built-in phrase reader, the authored lessons and `localStorage`. Pointing it at a live Neural Pulse
account is an upgrade, not a prerequisite, and `NEXT_PUBLIC_EVOROZEN_API_KEY` is only for local
experiments — see [ADR 0006](docs/adr/0006-no-key-in-the-public-bundle.md) for why the deployed build
must not have one.

## What a change has to clear

| Area | The bar |
|---|---|
| Engine (`src/lib/engine`) | Pure functions only: no clock, no network, no randomness, no storage. Beliefs and evidence are clamped at the boundary in `applyEvidence`, and new arithmetic comes with a test that pins the property rather than the number. |
| Domain (`src/lib/domain`) | Every option carries evidence; exactly one option per item is true; no wording calls a student careless, silly or stupid. All three are asserted. |
| AI layer (`src/lib/ai`) | It may propose evidence and rewrite the framing of a lesson. It may never name a fault, reach certainty, or invent the physics — those are enforced in code, not requested in a prompt. |
| Components (`src/components`) | Presentational. A colour means one thing everywhere because the tone is derived from a fault's state in `ui.tsx`, not chosen per screen. |
| Dependencies | Three runtime dependencies, and two of them are React. A fourth needs a reason in the pull request. |

## Two things people get wrong

**Do not tune the weights to make a particular student come out of the model well.** The weights in
`items.ts` are authored once, by hand, and the engine's behaviour is then whatever the arithmetic says.
The tests assert the properties that must hold — every key resolves, every fault is reachable, no item
repeats, the same answers give the same diagnosis — not any particular diagnosis. A weight changed to
produce a nicer result is indistinguishable, six months later, from a weight that is simply wrong.

**A fault tested by one item is a fault the product cannot reliably see.** If you add a fault, add
enough items that at least one of them carries a tell strong enough to confirm it, and check that the
selector actually asks it: `leaves no fault invisible across a whole session` is the test that fails
when it does not. [ADR 0007](docs/adr/0007-a-question-is-worth-asking-for-coverage.md) is the history
of getting this wrong twice.

## Adding a fault line

1. `src/lib/domain/misconceptions.ts` — the belief, the correction, why the intuition is reasonable,
   what it breaks later, and how damaging it is.
2. `src/lib/domain/items.ts` — at least one distractor that tells for it, and negative evidence on the
   correct options of the items it should be ruled out by.
3. `src/lib/domain/remediation.ts` — the line to remember, the settling question (it must end in a
   question mark, which is asserted), and the two-minute experiment.
4. `src/lib/ai/lexicon.ts` — the phrases a student would actually use, lower-case, plus denials.
5. `npm run verify`, and read the reachability failure if there is one. It names the fault and what the
   engine read it as.

## Commits and pull requests

Small and focused, with the reasoning in the message — why, not what. A pull request that changes a
weight, an item or a threshold is expected to say what it is trying to make truer, because those are
the parts of this system that are judgement rather than arithmetic.

Anything that touches authentication, user input, secrets or a third-party call: read
[SECURITY.md](SECURITY.md) first and say in the pull request what you checked.
