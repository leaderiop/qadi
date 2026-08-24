# Qadi Devtools — design documentation

Drafted 2026-08-22 from the devtools design session; **audited against the code
on 2026-08-24 and substantially corrected** (CCR-QD-060).

## Read this first

The original drafts were a well-researched UI design written against a data
model that did not exist. Every one of their fourteen ADR cross-references
resolved and their vocabulary rules were right — the design session understood
Qadi's semantics. What it never checked was whether the data was reachable.

Three findings, from three parallel audits:

1. **`@qadi/core` had no observer channel of any kind.** No `PubSub`, no queue,
   no callback, no sink — ADR-QD-009 had deleted all four that once existed, and
   `DecisionHistory` is a *read* port whose header rejects writing.
2. **A span cannot carry what six of the seven screens need.** Attributes are
   flat primitives; a `Trace` is a tree. And a `Tracer` must be in the fiber's
   context *before* evaluation, so "mounting the devtools adds a consumer" was
   false — layering does, at runtime construction, by the app author.
3. **The pairing story was designed out of the evaluator.** `evaluate` minted a
   fresh id per call with no way to supply one, and the client half recorded
   nothing when server and client agreed — the common case.

[ADR-QD-044](../decisions/044-an-optional-decision-sink.md) and
[behaviour 24](../behaviors/24-decision-sink.md) closed (1), (2) and half of (3).
The documents here now describe what exists, and mark every remaining gap
**Gap** rather than leaving it to be found during implementation.

## Contents

- [`00-overview.md`](./00-overview.md) — scope, audiences, the six topologies,
  where the data comes from, and the feature set marked by what its data plane
  can supply
- [`01-shell.md`](./01-shell.md) — dock overlay + element-picking lens, and the
  deployments a dock cannot serve
- [`02-screens.md`](./02-screens.md) — all seven screens, with the gaps named
- [`adr-draft-devtools-reads-sinks.md`](./adr-draft-devtools-reads-sinks.md) —
  **withdrawn**, superseded by ADR-QD-044; kept because what it got wrong is
  worth knowing
- [`adr-draft-unified-stream.md`](./adr-draft-unified-stream.md) — one timeline
  paired by evaluation id; partly implementable now, with the remainder named
- [`index.yaml`](./index.yaml)

`Qadi Devtools UI Mock.html` is a self-contained hi-fi mock in a templating
dialect — a design artifact, not runnable code and not part of any build.

## Status

No BEH/ADR numbers are allocated to the documents in this folder. Identifiers
are permanent (QADI-PROC-01), so allocation waits for the CCR that accepts them;
the withdrawn draft never received one and never will.

**The data plane and the transport are built.** Records carry a wire form, a
sink can forward, a feed buffers without blocking evaluation, and
`/__decisions` serves the result as guarded Server-Sent Events — so all six
topologies are reachable (ADR-QD-045, ADR-QD-046).

**Next increment is the surface**: something that renders a merged timeline. That
is where this repository's total absence of frontend tooling has to be
confronted, and it is a set of decisions rather than a task.

The repository has **no frontend build tooling at all** — no bundler, no CSS
pipeline, no dev server, no example app — and `@qadi/react` declares
`"sideEffects": false` with no `react-dom` peer, so a bundler could legally
tree-shake away an overlay that self-mounts on import. A UI increment must
confront all of that before it confronts a screen.
