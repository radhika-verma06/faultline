# 0005 — Option order is fixed, and never shuffled

**Status:** accepted
**Date:** 2026-09-23

## Context

A diagnostic that always shows the same options in the same positions can be gamed. A student who uses
it twice may notice that the third option tends to be a particular kind of wrong answer, and answer
accordingly. Shuffling the options is the standard mitigation, and it is a few lines of code.

Against that: everything downstream of an answer becomes non-deterministic. Both the option labels and
the recorded responses change between runs on the same inputs.

## Decision

Option order is fixed and never randomised.

## Consequences

- **Replay stays exact.** The same answers produce the same diagnosis, on any machine, every time.
  With shuffled options, replay would require storing the permutation alongside the answers — at which
  point the shuffle has bought nothing that storing the seed would not.
- **The evidence trail stays checkable.** The report can say "your answer to `puck-on-ice`, option C,
  moved this by +2.00", and that sentence remains true when someone reads it a week later. With
  shuffling it becomes "option C, on that run".
- **Screenshots and tests reproduce.** This is the practical reason. A flow suite that drives a
  shuffling interface has to either seed the randomness or stop asserting on specifics.
- **The gaming risk is accepted, not dismissed.** The mitigation is structural rather than
  positional: a student who wants to fake a diagnosis has to fake a *consistent* belief across
  twelve adaptively chosen items, and the sequence itself changes in response to their answers. If
  that becomes insufficient, the fix is a seeded shuffle with the seed recorded in the session — which
  preserves replay — rather than an unseeded one.
