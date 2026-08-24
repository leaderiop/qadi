# ADR-QD-047 — The devtools is a headless model with a React shell over it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-047                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-067) |

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
has **no frontend build tooling at all** — no bundler, no CSS pipeline, no dev
server, no example app — and three of the six deployments have no browser page
to host an overlay in.

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
  invisible to gate 9.
