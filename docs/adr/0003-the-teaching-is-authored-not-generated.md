# 0003 — The teaching is authored, never generated

**Status:** accepted
**Date:** 2026-09-23

## Context

The obvious use of a language model here is to write the lesson. Given a diagnosed fault, generate a
correction: what the student believes, why it is wrong, what is true instead, a demonstration they can
do at home. It is the kind of task models are good at, and it would mean no authoring work at all.

The problem is that the output goes to a thirteen-year-old who has no way to tell a correct physics
correction from a confident, plausible, wrong one. A model that can generate a physics lesson from
scratch is a model that can generate a *wrong* physics lesson from scratch, and it will be shaped
exactly like a right one: fluent, structured, appropriately hedged, and specific.

There is also a subtler failure. Generated explanations tend to be too good. A model asked why a
student believed something will produce a neat, rational reconstruction of an intuition that was
never rational in that way. The student does not recognise themselves in it, and an explanation that
does not describe the student's actual belief cannot dislodge it.

## Decision

Every fault has an authored entry: one line to remember, one question that settles it, one experiment
that takes two minutes with what is in the room. These are written by hand, reviewed as physics, and
are what the student receives.

A language model may **re-frame** them: it puts the opening and the correction into the student's own
words, using the words they actually wrote. It may not add, remove, soften or replace any physics, and
it may not invent an experiment or a question.

`remediation()` throws for a fault with no authored entry, and the live layer checks for that before
calling a model — so a fault cannot reach a generative path by accident.

## Consequences

- The correction a student receives is one a physicist has read, regardless of which layer is active.
  The offline and live paths differ in phrasing, not in substance.
- Authoring is now the bottleneck on adding a fault line. Accepted: a fault that cannot be taught is
  not much use to diagnose, and the authored bank is the product.
- The `whyItSeduces` field exists for this reason too. It is the honest account of why the belief is
  reasonable, written by someone who has watched students hold it, and it is the part a model would
  most reliably get wrong by making it sound smarter than it is.
