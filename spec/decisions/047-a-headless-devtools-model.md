# ADR-QD-047 — The devtools is a headless model with a React shell over it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-047                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-10-07): amendment — the simulator's state is model, held by `SimulationSession` beside `TimelineStore`; "renders that model and computes nothing" was not true of screen 5 until now (CCR-QD-199)<br>1.1 (2026-10-05): `Source` is one scoped `read`; a `DecisionLog` is a source as is; `sourceFromFeed` removed (ADR-QD-097) (CCR-QD-181)<br>1.0 (2026-08-24): Initial release (CCR-QD-067) |

---

## Context

[ADR-QD-044](./044-an-optional-decision-sink.md) made a decision observable,
[ADR-QD-045](./045-the-topology-is-a-choice-of-sink.md) made the topology a
choice of sink, and [ADR-QD-046](./046-a-decision-feed-is-sse-and-guarded.md)
put a guarded feed on the wire. All six deployments can now reach their
decisions. Nothing renders them.

Rendering is the first work in this library whose output a person looks at
rather than a gate, and the risk profile inverts accordingly. The existing gates
prove behaviour; a devtools panel's defects are mostly in the **model behind the
pixels** — merging several processes' records into one ordered timeline, pairing
a decision with an outcome emitted after `evaluate` returned, and telling a
short-circuited node from a denied one. Those are as testable as the evaluator.

Two constraints came with the ground rather than with the design. The repository
had **no frontend build tooling at all** — no bundler, no CSS pipeline, no dev
server, no example app — and three of the six deployments have no browser page
to host an overlay in.

> **Amended in CCR-QD-076.** The first constraint no longer holds:
> `examples/nextjs-newsroom` is a Next.js application in the workspace. The
> decision stands unchanged, and the example is the reason it does — a dock that
> needed a bundler could not have been mounted in one written afterwards. The
> second constraint is untouched: those three deployments still have no page, and
> ADR-QD-049's CLI is still not written.

## Decision

**One package, `@qadi/devtools`, split at the React boundary.**

`@qadi/devtools` is the model: source adapters, the timeline fold, verdict
classification, pairing, the policy/trace zip, filters and selection. It imports
no React. `@qadi/devtools/react` renders that model and computes nothing.
`react` is an **optional** peer dependency, so a server-side aggregator consumes
the model without a UI and without a warning about a peer it does not want.

Three consequences follow, and each is checked rather than remembered:

**The model is held at core's bar** — 95% coverage on all four metrics, and in
the mutation gate through a second Stryker configuration
(`stryker.devtools.mjs`). A second configuration rather than a wider glob,
because the existing run pins its test runner to `packages/core`; widening the
glob would make every core mutant's initial run execute four other packages'
suites, on the gate that already has the longest history of being the slow one
(CCR-QD-065). The React shell stays at the 90% default, on exactly the reasoning
that already excludes `@qadi/react`: mutating JSX mostly measures the renderer.

**`tsc` and nothing else.** Styles are inline objects. A stylesheet needs a CSS
pipeline; an injected `<style>` needs a side effect at module scope, and the
package declares `"sideEffects": false` — so a bundler would be entitled to drop
it and the dock would lose its styling in the production build nobody tests. The
same reasoning is why the dock does not self-mount: the host renders
`<DevtoolsDock />`.

**The dock is one surface among several.** A backend-only service, a serverless
function and a replicated server have nowhere to put an overlay. Their decisions
are reachable at `/__decisions` and the model that merges them is
framework-free, so a served dev UI or a CLI is a second shell over the same
model rather than a second implementation. Building one is not this increment.

## Alternatives considered

**A served dev UI instead of a package** — `@qadi/http` serving a self-contained
HTML page at `/__devtools`. It reaches all six deployments, which the dock does
not, and it was rejected for this increment on cost rather than merit: it needs
a bundler, an embedding step in `pnpm build`, and therefore a second build graph
beside `tsconfig.build.json`. `@qadi/promise` was missing from that file for six
commits without anyone noticing (ADR-QD-033); adding a second graph before there
is a UI to serve would be inviting the same class of drift. The split above
keeps it available later at the cost of one shell, not one rewrite.

**Both at once.** Twice the work, and it pulls the bundler decision into the
increment that can least afford it.

**Screens 3 to 6 now.** The policy explorer has no source for its left rail,
the services card cannot obtain which implementation is wired, and screen 7 needs
rescoping rather than implementing — `Atom.family` keys structurally, so ten
`<Can>` on one policy are a single atom. Log and Inspector are the two the
design marks Ready, and they carry the pairing story the rest depends on.

**A `_tag` on every model type.** Rejected where the type is not a union:
`PairedEntry` is one shape, and a tag on it is a field nothing reads. The
mutation gate found it — the tag's own literal was the only mutant in the
package no test covered.

## Consequences

- (+) The interesting properties are provable without rendering anything, which
  is the same division AGENTS.md §13 already draws for `@qadi/react`.
- (+) No new dependency reaches the repository. `@testing-library/react` and
  `happy-dom` were already devDependencies of `@qadi/react`.
- (+) A second shell — served page, CLI, exporter — is additive.
- (−) Three deployments still have no rendered surface, and the tool says so
  rather than pretending otherwise.
- (−) Two entry points mean two API surfaces to document. `check-api-surface.mjs`
  had to learn to read a package's `exports` map; before that it assumed
  `src/index.ts` was the only one, and the dock's exports would have been
  invisible to `scripts/check-api-surface.mjs`, gate 13.

## Amendment (2026-10-05, CCR-QD-181)

**`Source` is one scoped `read`.** It was `{ backlog?: Effect<…>; live: Stream<…> }`,
two fields a consumer ran one after the other — and a record made between them was
lost. It is `{ read: Effect<SourceRead, never, Scope> }` now, `SourceRead` keeping
the absent-versus-empty `backlog?` this ADR's model relies on. A `DecisionLog`
satisfies it as is, so `sourceFromFeed` is removed rather than replaced, and
`sourceFromEventSource` reads the server's prelude as its backlog and each
record's environment off the wire. The headless/React split is unchanged
([ADR-QD-097](./097-a-decision-log-is-a-sink-and-its-own-history.md)).

## Amendment (2026-10-07, CCR-QD-199)

**The simulator's state is model.** "`@qadi/devtools/react` renders that model and
computes nothing" was not true of screen 5: `Simulator.tsx` held its form, its
chosen source, its capture, its run and the supersede token in component state,
and four defects sat there where no model test and no mutation run could see
them. That state is `SimulationSession`, a store of the shape `TimelineStore`
already is (`subscribe`, `getSnapshot`, synchronous commands) with `run`, `reap`
and `dispose` as Effects the hook forks; the form's text is `SimulationForm`'s
codec. `useSimulationSession` is the adapter, as `useTimeline` is for the
timeline, and `DevtoolsDock` owns the session so it outlives a tab. The two
stores each kept their own small listener closure at the time; extracting the
shared one was deferred until a third store existed to extract it from, which
the amendment below did (ARCH-24).

## Amendment (2026-10-07, CCR-QD-200)

**Sampling is the model's.** "The model computes, the shell renders" was not true
of the one loop a host needs most: keeping the Services and React panels
current. Each host wrote it itself — four pull-based reads, two timers, an
`Effect.runSync` and a layer provided by hand — and the only host that did wrote
it twice and read a throwaway cache (CCR-QD-200). `runDiagnostics` is that loop,
beside `runSource` and written the same way: a named `Effect.fn`, scheduled with
`Schedule.spaced`, testable under `TestClock`, feeding a `DiagnosticsStore` the
shell reads with `useSyncExternalStore`. `useDiagnostics` is the adapter, and
`DevtoolsDock` takes a `diagnostics` prop so a host hands over what it already
owns (its layer, its collector, its question list) and knows no Effects.

Three things the model now owns. A handed layer is **built once per run** and
released on interruption; it is still its own build, so stateful services are
shared with the application by value, not by being the same layer. A snapshot
**keeps its identity** field by field while `Equal.equals` says it is
unchanged. A layer that fails to build is a stated `WiringRead.Failed`, not a
dead fiber. The explicit snapshot props stay and win field by field, because
they carry what sampling this process cannot: another process's report.

The shared mechanics of the three stores (`TimelineStore`, `SimulationSession`,
`DiagnosticsStore`) are `model/ExternalStore.ts` and `react/useRunningStore.ts`,
internal and out of both barrels. What stays in each store is its identity
policy. Sampling stays pull-based
([BEH-QD-216](../behaviors/28-devtools-screens.md), [ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md));
the headless/React split and the hydration counts are unchanged, and gates stay
a prop fed by the host's subscription ([ADR-QD-080](./080-a-gate-registry-belongs-to-its-atom-set.md)).
