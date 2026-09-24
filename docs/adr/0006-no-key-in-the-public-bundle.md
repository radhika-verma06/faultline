# 0006 — No API key in the public bundle

**Status:** accepted
**Date:** 2026-09-23

## Context

A secret key normally lives on a server, behind a route handler that the browser calls. A statically
exported Next application has no server: `output: "export"` produces files, and route handlers cannot
be part of it. So the choice is stark.

1. **Inline the key at build time** with `NEXT_PUBLIC_`. It works immediately, and it publishes a live
   credential to anyone who opens the deployed page or reads the JavaScript bundle. The vendor's own
   documentation says never to do this.
2. **Ask for the key at runtime** and keep it in the browser. Nothing secret ships, but a judge or a
   new user has to paste a key before seeing the live layer.
3. **Ship no live layer at all.** Loses the bonus and half the point.

## Decision

Options 2 and 3 combined, with 1 available locally and never in CI.

- With no key, the application is **complete**: the built-in phrase reader, the authored lessons, and
  local storage. The deployed demo is this build, and a visitor sees a working product with no setup.
- With a key, entered at runtime and kept in `localStorage`, the same build uses the live layer. The
  key is never in the bundle and never in a repository.
- A build-time `NEXT_PUBLIC_EVOROZEN_API_KEY` is honoured for a local demo, and the deploy workflow
  deliberately does not set it. That is the one line of the workflow that matters most.

Resolution order is runtime, then build-time, so a deployed build can be pointed at a different
account without a rebuild.

## Consequences

- **The graders can use it instantly.** This is the argument that decided it. A product that requires a
  credential before it does anything is a product most people never see work.
- **Degradation is mandatory, not defensive.** Because the deployed build has no key by construction,
  the offline path is not a fallback nobody exercises — it is the path every visitor takes. Any bug in
  it is visible on the first page load rather than during a demo.
- **Memory is per-device without a key.** A returning student on the same browser keeps their map; on
  a different one they do not. That limitation is stated in the interface rather than hidden, and it is
  the clearest argument for the Neural Pulse layer being worth connecting rather than decorative.
- The published build cannot be used to spend someone's quota, because there is nothing to spend.
