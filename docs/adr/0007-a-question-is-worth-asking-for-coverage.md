# 0007 — A question is worth asking for coverage, not only for information

**Status:** accepted
**Date:** 2026-09-23

## Context

[ADR 0001](0001-every-fault-is-a-live-hypothesis.md) fixed a deadlock in the question selector by
keeping every fault line live. It was necessary and it was not sufficient, and the remainder of the
same deadlock survived in a form nothing was watching.

Mutual information is biased against items that test few faults. An item that splits one hypothesis
off a twenty-one-way set reduces the entropy of that set less than an item that splits three, so the
single-fault items lose every contest. Two things then compound:

- Twelve questions are spent on the items that discriminate most hypotheses at once, and a fault whose
  only strong item is a single-fault item is never given a question.
- The session then closes on convergence, because a fault that was never offered a question sits at
  the base rate and looks exactly like a fault that has been ruled out.

The effect is not that the engine is unsure. It is that the engine is *confidently wrong*: a student
holding "a constant force produces a constant speed" answered every question correctly, was told there
was nothing wrong with their physics, and the test that was supposed to catch this
(`can reach every fault line it claims to know`) failed for five of the twenty faults.

Three of the five were faults detectable by a single item each — the same condition ADR 0001
identified as unacceptable, in a bank that has since grown to twenty-five items without anyone
rechecking that every fault had a route.

## Decision

Two changes, and they are two halves of one rule: **a fault that no question has been able to see is
not a fault the engine is entitled to rule out.**

1. **Selection credits coverage.** Every candidate is scored by its information gain *plus* what it
   would let the engine see that it currently cannot: for each fault, how much stronger a tell the
   student's answer could have shown than anything asked so far, weighted by how live that fault still
   is. Deliberately continuous rather than a threshold, so a fault seen only through a weak tell still
   counts as under-seen and an item that shows it properly is still preferred.

2. **Stopping checks that nothing could overturn the diagnosis.** Convergence used to end a session on
   its own. Now it ends one only if, for every fault behind the leader, no unasked item carries a tell
   strong enough — at full confidence — to lift that fault past the leader. This is an upper bound on
   what any single remaining question could do, so when it returns false the diagnosis is settled by
   arithmetic rather than by the engine's patience.

The response model was also corrected in the same pass. It scored an option by raw belief and handed
the true answer a bonus equal to the magnitude of its own evidence, which made the true answer the
model's most likely response for every student on almost every item — so no item could ever look like
it separated a student who holds a fault from one who does not, and the selector had no reason to ask
the questions that carry a fault's tell. Affinity is now measured against the base rate, with a small
standing preference for the true answer standing in for "most students, asked cold, get most items
right".

## Consequences

- All twenty faults are now reachable, and the session that most needs to ask the awkward single-fault
  item is the one where everything so far has looked fine. `leaves no fault invisible across a whole
  session` asserts that no fault is left without a question across a full session, and
  `can reach every fault line it claims to know` is the end-to-end version of the same claim.
- Sessions are longer where the evidence is thin and unchanged where it is decisive: the look-ahead
  returns false immediately for a fault that has been confirmed at 99%, so an obvious diagnosis still
  closes early. What no longer happens is closing early on a fault that merely happens to be ahead.
- Selection is no longer pure mutual information, and the honest description of it is "information
  gain plus coverage". `docs/architecture.md` says so; the README no longer describes the selector as
  entropy alone.
- The bank is still thin: three faults have exactly one item that can confirm them, which is why a
  twelve-question session can only just see all twenty. Adding items remains the fix for that, and
  it is now measurable rather than assumed — `leaves no fault invisible across a whole session` fails
  the moment a fault loses its last route.

## What this does not fix

Coverage decides *whether a fault gets a fair question*. It cannot make a thin item bank into a thick
one, and it does not make the weights any less authored. The student who holds a fault and answers
every one of its tells against it is still, correctly, not diagnosed with it.
