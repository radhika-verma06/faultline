## What this changes, and why

<!-- The why, not the what. The diff says what. -->

## Which part

- [ ] Engine — belief arithmetic, question choice, the session
- [ ] Domain — a fault line, an item, a lesson, the lexicon
- [ ] AI layer — evidence reading, the Neural Pulse client, degradation
- [ ] Interface — a screen or a component
- [ ] Documentation, CI or tooling

## Checks

- [ ] `npm run verify` passes (lint → typecheck → unit tests → build)
- [ ] If an item, weight or threshold changed: I say what it makes truer, and which check asserts it
- [ ] If a fault was added or moved: at least one item can confirm it, and
      `can reach every fault line it claims to know` still passes

## Anything the tests do not cover

<!-- If this change can only be checked by looking at the running app, say what you looked at. There is
     no browser flow suite yet; docs/verification.md lists that as the largest known gap. -->
