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

No BEH/ADR numbers are allocated to the documents in **this folder**. Identifiers
are permanent (QADI-PROC-01), so allocation waits for the CCR that accepts them;
the withdrawn draft never received one and never will. The *implementation* is
specified normatively elsewhere — see
[behaviour 27](../behaviors/27-devtools-timeline.md) and
[ADR-QD-047](../decisions/047-a-headless-devtools-model.md) — and where these
documents and those disagree, those win.

**Built.** The data plane (ADR-QD-044), the transport (ADR-QD-045, ADR-QD-046),
and now the surface: `@qadi/devtools` ships a headless model — sources,
timeline, verdicts, pairing, the policy/trace zip, filters, selection — and
`@qadi/devtools/react` renders **screens 1 and 2**, the decision log and the
inspector, in a dock the host mounts.

**Not built.** Screens 3 to 6, each waiting on the gap named against it below.
Screen 7 needs rescoping rather than implementing. And the three topologies with
no browser page still have no rendered surface: their decisions are reachable at
`/__decisions` and the model that merges them is framework-free, so a served dev
UI or a CLI is a second shell over the same model — but it is not written.

The repository still has **no frontend build tooling** — no bundler, no CSS
pipeline, no dev server, no example app — and the dock is built to need none:
`tsc` only, styles as inline objects, and nothing that runs on import. That last
point is a constraint rather than a preference, because `@qadi/devtools`
declares `"sideEffects": false` and a bundler may drop a module whose only job
is a side effect.
