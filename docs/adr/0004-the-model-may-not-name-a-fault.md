# 0004 — The model may not name a fault, and may not reach certainty

**Status:** accepted
**Date:** 2026-09-23

## Context

The AI layer reads a student's free-text reasoning and decides what it implies. The obvious design is
to have it return a diagnosis: "this student holds *the throw is stored in the ball*". It is one call,
it is simpler than returning weights, and models are quite good at that judgement in isolation.

Two things make it a bad design here.

**It cannot be combined with anything.** A diagnosis is a conclusion. If the model returns one, the
engine has no way to weigh it against six answers that might say something different, and no way to
express "the wording suggested this, but the choices contradict it". The strongest signal in the
system would also be the least accountable one.

**It is unverifiable, and it fails silently.** A model that names a fault that does not exist in the
knowledge base produces a map entry for something nobody authored. There is no spelling mistake to
notice, no error to catch — just a fault on a student's map with a name that came from nowhere.

## Decision

The model returns **evidence**: a map from fault id to signed weight, plus one short clause to show
the student. It never returns a diagnosis.

The engine clamps everything crossing that boundary:

- an id that is not in the knowledge base is dropped, so a hallucinated fault cannot appear;
- each weight is clamped to ±2, so one confident sentence cannot saturate a belief;
- beliefs are clamped strictly inside `(0, 1)` after every update, so no amount of stacked evidence
  makes a belief unrevisable.

These live in `applyEvidence` and `sanitiseEvidence`, in code, on the path the data takes. They are
not instructions in a prompt. A prompt is a request; this is a guarantee.

## Consequences

- The model's opinion is one input among many, and the engine arbitrates. This is why an ambiguous
  sentence can raise two faults at once and let the answer pattern separate them.
- The prompt has to be more specific about format, and the parser has to be tolerant. `parseEnvelope`
  pulls an object out of prose or a code fence, and an unparsable response is treated as a miss rather
  than as an answer — an empty read must not silently mean "this wording shows nothing".
- The interface can honestly label what came from where, because every read carries its source.
