# Go to market

## What is actually being sold

Not a quiz. A quiz gives a mark, and a mark is a dead end: the student learns they are a 70%, and the
70% does not tell anyone what to do on Monday.

Faultline gives a **specific, teachable fault** — and a lesson for it. The unit of value is one
sentence a teacher can act on: *nine of your thirty students believe a constant force produces a
constant speed, and here is the demonstration that fixes it.*

That sentence is worth more than a mark to a teacher, because it is the difference between knowing
the class is struggling and knowing what they are struggling *with*.

## The wedge: a shareable artifact

The **misconception map** is the growth loop, and it is deliberately the reward rather than a feature.

Students already screenshot and send each other results. What they send is scores, and the reason is
that a score is a status signal. A map is a different signal: it says *here is exactly what I have
wrong*. That is more interesting, more specific, and — unlike a score — it invites comparison rather
than ranking, because two maps with different faults on them are not ordered against each other.

That is the whole acquisition theory. No referral credit, no streak, no leaderboard. The artifact is
worth sending on its own merits, and anything added to force it would make it worth less.

## The three stages

### 0 → 20 users: one class, one lesson

A single teacher introduces it at the start of a mechanics unit. Twelve minutes, on phones, no
accounts and no install: the deployed build runs the built-in reader with no key, so the first
experience is a working product rather than a signup.

**What this proves:** that the diagnosis is worth the twelve minutes. If a teacher does not use the
result, nothing after this stage matters.

**How it fails:** students treat it as a test and rush. The mitigation is already built in — there is
no score anywhere in the interface, the wording asks them to explain rather than perform, and the
report leads with their own sentence rather than a mark.

### 20 → 200: the cohort view

The teacher's screen answers *which faults are common in my class this week?* — a distribution over
twenty named faults instead of an average over thirty students. This is the moment the product stops
being a student tool and becomes a teaching tool, and it is the moment someone would pay for it.

**What this proves:** it saves a teacher time. Adoption that depends on a student remembering to use
something does not survive a busy term; adoption that replaces a marking task does.

**Dependency:** this is the only part of the roadmap that needs the memory layer. Per-device maps
cannot answer a question about a class, which is precisely why the Neural Pulse integration is
product architecture rather than a bonus point.

### 200 → 2,000: departments, at the start of a unit

The natural slot is not "a test you take" but "the thing that opens a topic". Twenty-five items,
twelve minutes, and it outputs a lesson per student instead of a mark. A department adopting it for
one unit at a time is a smaller ask than adopting a platform.

**What it proves:** it fits a ritual that already exists. The failure mode for education tools is
asking a school to adopt a new habit; the failure mode here is avoided by attaching to a habit schools
already have.

## Why mechanics first

- The misconception research is deepest there. The faults are documented, named and studied, so the
  content can be authored against a real literature rather than invented.
- Every student in the world studies it, so the item bank is reusable at scale.
- The foundational faults sit underneath everything downstream, which is what makes a diagnosis feel
  consequential rather than cosmetic. A student who learns that gravity acts the whole time has
  unlocked every projectile problem in the rest of the course.

Adding a topic is authoring, not engineering: a fault set, an item bank, a lesson per fault. The
engine does not change.

## What we are deliberately not doing

- **No district or institution sales.** It changes the product into an administration tool and the
  buyer into someone who is not the user.
- **No content library.** A library is measured by volume, and this is measured by whether one fault
  was correctly identified. Those pull in opposite directions.
- **No gamification.** Points and streaks would convert a diagnostic instrument into a game, and
  students would optimise for the game — answering for speed, the exact behaviour that destroys the
  signal.
- **No free tier that withholds the map.** The map is the acquisition channel. Paywalling it removes
  the only thing that spreads.

## How we would know it is working

| Signal | Target | What it would mean |
|---|---|---|
| Repeat use within a unit | > 40% | The map is worth coming back for, not just interesting once |
| Time on a question | > 25 seconds | Students are reading, not clicking through |
| Free-text answers given | > 50% | The strongest signal is being used, and the diagnosis is not running on choices alone |
| Teacher acts on a fault | > 1 per class | The output is usable, which is the only claim that matters |

The last one is the real metric. Everything above it is a proxy for whether a teacher read the map and
changed what they did next.
