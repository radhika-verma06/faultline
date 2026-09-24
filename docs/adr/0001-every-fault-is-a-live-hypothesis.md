# 0001 — Every fault line is a live hypothesis

**Status:** accepted
**Date:** 2026-09-23

## Context

The question selector works by entropy: it names a set of hypotheses, predicts how a student holding
each would answer a candidate item, and asks the item that would shrink the uncertainty over that set
the most. The obvious optimisation is to carry only the leading hypotheses — the top six fault lines
by current belief — since twenty-one hypotheses over twenty-five items is more arithmetic than six
over twenty-five.

That optimisation deadlocks, and the deadlock is not a performance problem.

A fault line outside the hypothesis set is never a live hypothesis. If it is never live, then no item
can be shown to distinguish it from anything else, because the information-gain calculation only has
the live set to measure against. Its gain is therefore identically zero. An item with zero gain is
never chosen. Its belief never rises. It never enters the set.

The consequence: **a student holding a fault that started outside the cut could answer every question
honestly, and never be diagnosed with it.** The engine would not be uncertain about that fault. It
would not know the fault existed as a possibility. Worse, the failure is silent — nothing errors,
nothing looks wrong, and the student simply receives a diagnosis of something else.

## Decision

The hypothesis space is every fault line, plus a "none of these" hypothesis. It is never narrowed.

The cost is real and accepted: information gain per item is smaller, because a single question
cannot collapse a twenty-one-way distribution the way it can a seven-way one. The information floor
is set low for the same reason — a high one would terminate sessions that still had something useful
to ask.

## Consequences

- `perpendicular-forces` is the only item that can detect one fault, and under the capped version it
  was unreachable. This is now covered by a test that simulates a student holding each fault in turn
  and asserts the engine names it. That test is the reason this defect cannot come back.
- Three faults were detectable by a single item each. Optional in a fixed-order quiz, unacceptably
  thin when one unlucky click is the entire evidence base, so three items were authored to cover
  them before this was considered done.
- The selector is slower. It is still microseconds against a network round trip, so this does not
  matter.
