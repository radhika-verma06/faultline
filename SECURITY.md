# Security

## Reporting

Open a [private security advisory](https://github.com/radhika-verma06/faultline/security/advisories/new)
rather than a public issue. Please include what you did, what happened, and what you expected instead.
This is a small project maintained by one person, so the honest commitment is a reply within a few
days rather than a service-level agreement.

## What this application handles

It asks teenagers to explain their physics reasoning **in their own words**, and it stores a named
fault profile so a student can come back to their map. That is the whole of the sensitive surface, and
it has two consequences worth stating plainly.

- **Student-written text may contain personal detail.** It is the richest signal in the system, so it
  cannot be removed, only handled carefully. When a key is configured, that text is sent to the Neural
  Pulse kernel, whose `AISecurityModule` redacts PII at `CRITICAL_SECURITY` before any prompt reaches a
  language model. Redaction is a requirement of the product, not a feature bolted on — see the header
  of `src/lib/ai/evorozen.ts`.
- **With no key, nothing leaves the device.** The deployed demo ships without one on purpose. The
  built-in phrase reader, the authored lessons and `localStorage` are the entire pipeline, so a
  thirteen-year-old using the public site is not sending their writing to anybody.

## The one rule that must not be broken

**No API key in the public bundle.** A key present at build time is inlined by Next into static files
and is readable by anyone who opens the page. The key is therefore supplied at runtime by the person
using the app and kept in their browser. This is enforced by how the build is configured, not by
convention, and the reasoning is in [ADR 0006](docs/adr/0006-no-key-in-the-public-bundle.md). A change
that inlines a key — including one committed to `.env.local` and built into a published artifact — is a
security bug, not a convenience.

## What the AI layer is not allowed to do

Enforced in code rather than requested in a prompt, because a prompt is a request and this is a
guarantee. None of these should be relaxed without saying so in an ADR:

- It cannot name a fault. It returns signed evidence weights; an id that is not in the knowledge base
  is dropped on the way in, so a hallucinated fault cannot appear on a student's map.
- It cannot reach certainty. Every weight is clamped and every belief is held strictly inside `(0, 1)`,
  so no single confident sentence can saturate a belief or make it unrevisable.
- It cannot invent the teaching. The cue, the settling question and the experiment are passed through
  verbatim from the authored bank.
- It cannot fail a session. Every call is wrapped; a timeout, a rate limit or an unparsable response
  degrades one answer to the built-in reader.

## Out of scope

Denial of service and volumetric attacks; anything requiring a compromised device or browser; and
reports produced only by an automated scanner with no demonstrated impact. Student data is not
hosted by this project — there is no backend, no database, and no server-side session.
