# 0002 — The engine is pure, and stores nothing

**Status:** accepted
**Date:** 2026-09-23

## Context

A diagnostic session could reasonably be modelled as an object that accumulates state: it holds its
own beliefs, mutates them as answers arrive, and persists itself. That is the conventional shape.

It also makes three things hard.

**Replay.** If a diagnosis is a mutated object rather than a function of the answers, then the only
way to reproduce it is to snapshot it. A teacher who wants to know why the engine said what it said
has to be given a stored artifact rather than the answers the student actually gave.

**Testing.** Anything that reaches for local storage, a network or a clock cannot be tested in a
tight loop without mocking, and mocks drift from what they stand in for.

**Trust.** The product's claim is that the same answers always produce the same diagnosis. That
claim is much easier to keep — and to demonstrate — when it is structurally true rather than a
property someone remembers to preserve.

## Decision

The engine is a pure function of its inputs. `Session` is a list of answers and nothing else. Beliefs,
the fault map, the primary fault and the item sequence are all derived on demand from that list.
There is no randomness, no clock, no storage and no network anywhere in `src/lib/engine`.

The AI layer never mutates the engine. It returns evidence, which is *passed in* as part of a
response, so the engine stays synchronous and testable in Node with no DOM.

## Consequences

- Replay is free: give it the same answers and it produces the same diagnosis, and a test asserts it.
- The belief rail in the interface is a projection of the current answer list, not a parallel copy
  that could drift from it.
- The engine cannot make a network call mid-session even if it wanted to, which is why a failed AI
  read degrades one response instead of interrupting a diagnosis.
- Every derived value is recomputed on each session change. At twenty-five items and twenty-one
  hypotheses this is comfortably below the threshold where anyone could notice.
