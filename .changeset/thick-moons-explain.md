---
"@qadi/core": minor
---

A denial now explains itself where it surfaces.

`renderTrace(trace, options?)` renders an evaluation tree as plain text — the
decision-side counterpart to `renderExplanation`. An explanation says what a
*rule* requires and takes no subject; a trace says what *happened* to one
subject. Both renderings now live in the library, and neither derives from the
other.

`AccessDenied` gained a `trace` field. Its doc comment had claimed to carry one
since it was written; it did not. Enforcement is where most callers meet a
denial — `assert`, `enforce`, `enforceProjected`, `guard`, the `@qadi/promise`
rejection, the `@qadi/http` status mapping — and it was the one path that built
the whole tree and then dropped it, keeping only the root sentence.

**Breaking**: `AccessDenied` now requires `trace`. Code constructing one
directly must pass it; code catching one is unaffected.

Unchanged on purpose: `toResponse` still returns an empty body for every
enforcement tag, and hydration still withholds the trace by default. A trace
names every node's tag, its label and why it refused — it belongs in a log, an
error or a test failure, not a response body.

See ADR-QD-039, BEH-QD-054, BEH-QD-144.
