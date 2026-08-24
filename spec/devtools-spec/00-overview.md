# Devtools 00 — Overview

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-DVT-00                                    |
> | Revision       | 0.4 (draft)                                    |
> | Effective Date | 2026-08-24                                     |
> | Status         | Draft — pending CCR                            |
> | Author         | Qadi Engineering                               |
> | Classification | Design Specification (draft)                   |
> | Change History | 0.4 (2026-08-24): The transport now exists; the topology table and the transport prose corrected against it (CCR-QD-066)<br>0.3 (2026-08-24): Six gaps closed in code; the feature table re-marked against what now exists (CCR-QD-061)<br>0.2 (2026-08-24): Audited against the code; the transport claim withdrawn, the topology table added, the feature set marked by what its data plane can actually supply (CCR-QD-060)<br>0.1 (2026-08-22): Initial draft from devtools design session |

---

## Purpose

Qadi Devtools is a runtime inspector for authorization: why a decision came out
the way it did, what a policy means, what a subject can do, and whether the
wiring (services, cache, hydration) is healthy.

## Audiences

Both, equally:
- the **app developer** wiring Qadi and debugging denials;
- the **policy author** writing and verifying rules.

Every screen must be legible to both: explanation trees render the real ADT but
with the `explain()` English available; wiring screens name the port and state
its fail-closed consequence in prose.

## Where the data comes from

**One optional service, `DecisionSink`**
([ADR-QD-044](../decisions/044-an-optional-decision-sink.md),
[BEH-QD-181–186](../behaviors/24-decision-sink.md)). `evaluate` hands it every
completed evaluation as a `DecisionRecord` — the policy, resource, action, start
time, and either the `Decision` or the `EvaluationError`.

Revision 0.1 said the devtools would consume Effect's tracing stream instead and
that "mounting the devtools adds a consumer, changes nothing about evaluation".
**Both halves were wrong**, and the draft that decided it is
[withdrawn](./adr-draft-devtools-reads-sinks.md). A span carries flat primitives
and a `Trace` is a tree, so six of the seven screens were unreachable; and a
`Tracer` must be in the fiber's context *before* evaluation runs, so nothing can
attach at mount.

The consequence is a requirement on this document rather than a footnote:
**wiring is mandatory and must be documented as such.** The app author provides
a sink layer at runtime construction. There is no way to make a devtools appear
in an application that has not asked for one, and there should not be.

**Records also travel.** `decisionSinkForwarding` hands each record to a
caller-supplied `send`, `decisionSinkFeed` buffers without ever blocking the
evaluation, and `decisionStreamRoute` serves the result as Server-Sent Events at
`/__decisions` — guarded by a policy, with no unguarded variant and no
environment-variable gate
([ADR-QD-046](../decisions/046-a-decision-feed-is-sse-and-guarded.md)). A
`decisionSinkRing`'s `ingest` is the receiving half, so several processes can
merge into one timeline.

The client is a producer on the same terms: a `DecisionSink` provided in the
layer `makeQadiAtoms` is built from records browser-side decisions, which is what
makes the SRV/CLI pairing real rather than aspirational.

## Environments — one UI, several topologies

Qadi runs on the server (`@qadi/http` over Effect HTTP) and on the client
(`@qadi/react`). Revision 0.1 recognised one deployment shape — an in-page
overlay beside a client-side runtime — and assumed a server transport that did
not then exist. The real spread, and where each now stands:

| Topology | Decisions made | A page to host an overlay? | Data plane |
| -------- | -------------- | -------------------------- | ---------- |
| SPA, client-only | browser | yes | ✅ in-process ring |
| SSR / hydration (Next.js) | both | yes, after hydration | ✅ ring + seeded pairing |
| Backend-only service | server | **no** | ✅ SSE feed; still needs a surface to render it |
| SPA + separate API origin | both, two processes | yes | ✅ forward + ingest |
| Serverless / edge | server, ephemeral | no | ✅ forward before the process ends |
| Replicated server (n instances) | server, n processes | no | ✅ forward + ingest, merged by one aggregator |

**The data plane now reaches all six** ([ADR-QD-045](../decisions/045-the-topology-is-a-choice-of-sink.md)).
Three consequences the *presentation* still has to absorb:

- **The overlay is not the only surface.** A backend-only service is a
  first-class Qadi deployment and an in-page dock cannot serve it. Its decisions
  are reachable at `/__decisions`; what renders them is not built.
- **An in-memory record log is per-process.** `decisionSinkRing` is exactly that,
  so under replicas or serverless a reader must go to an aggregator rather than
  to whichever instance answered — `decisionSinkForwarding` plus `ingest` is that
  path, and choosing it is a choice of sink, not a change to the evaluator.
- **A cross-origin BFF needs an explicit dev origin.** The transport exists now,
  but nothing in it decides CORS; that is the deployment's call and this document
  does not invent one.

Merging the streams is a property of the **data** — the pair
([draft](./adr-draft-unified-stream.md)) — not of the layout, which is why the
dock survived and the dual-lane shell did not.

## Data modes

Live streaming plus replay: any logged record can be replayed in the subject
simulator, seeded from its entry, and what-if edits re-evaluate against
`@qadi/testing` layers.

One correction to revision 0.1, which claimed "clock and evaluation ids
reproducible, per ADR-QD-012". Ids are: `evaluationIdSequential` is wired by
`qadiReviewLayer`. **The clock is not** — nothing in `@qadi/testing` provides a
`TestClock`, and while `@effect/vitest`'s `it.effect` supplies one to *tests*, a
simulator running in a browser has no such ambient help. A simulator that wants
reproducible durations must wire `TestClock` itself.

## Feature set (v1), by what its data plane can supply

`DecisionSink` unblocks the first two outright and the rest partially. The
remaining gaps are listed here rather than discovered during implementation.

| # | Screen | Data status |
| - | ------ | ----------- |
| 1 | Decision log | **Ready.** A record carries every column, including the `resource` and timestamp a `Decision` never had. |
| 2 | Decision inspector | **Ready**, including per-decision cache outcome. Remaining: obligation *discharged/pending* state is unobservable, and resolver calls are not recorded. |
| 3 | Policy explorer | **Partial.** The ADT, codec, `simplify` and now `policyDepth` all exist. Nothing enumerates "all named policies" — a policy is a value the app holds — so the left rail still has no source. |
| 4 | Role DAG viewer | **Ready.** `permissionProvenance` supplies the granting role and path, in agreement with `flattenPermissions`; an unknown parent is now reported rather than silently dropped. |
| 5 | Subject simulator | **Ready.** `flippedAt` names the outermost node whose verdict changed; `diffTraces` gives every difference by path. |
| 6 | Services & cache | **Partial.** `size`, per-decision hit/miss and `clear` now exist. Remaining: which *implementation* is wired is not obtainable from inside the program, there are no per-port call counts or retry stats, and there is **no TTL** — the cache is bounded by capacity, evicted FIFO. |
| 7 | React panel | **Rescope required.** `Atom.family` keys structurally, so ten `<Can>` on one policy are **one atom**. Per-instance enumeration and DOM highlighting are not merely unimplemented; the current architecture makes them unobtainable without an instance registry. Hydration counts other than mismatches are likewise not retained. |

## Vocabulary rules the UI must respect

- **ERROR is not DENY** ([ADR-QD-008](../decisions/008-error-taxonomy.md)): a
  broken lookup renders as an outline `ERROR` tag, never as a denial. This is now
  *representable* — `DecisionOutcome` is `Decided | Failed`
  ([BEH-QD-184](../behaviors/24-decision-sink.md)). Before it, an
  `EvaluationError` reached no observer at all, so the rule the tool most needed
  to honour could not be honoured by anyone.
- **A stale decision is not a decision**
  ([ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)): a
  re-checking value renders as `stale — re-checking`, never as its previous
  verdict.
- **Fail-closed defaults are warnings, not errors**
  ([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)): an unwired
  port is shown dark with the consequence spelled out ("every hasRelationship
  check denies"). Note "unwired" means *wired with a fail-closed default* — five
  of the seven services are required, so a program cannot run without them.
- **Short-circuited nodes are shown**
  ([ADR-QD-013](../decisions/013-short-circuit-default.md)): explanation trees
  render unevaluated nodes dotted, labeled "short-circuited — never resolved".
  This needs the `Policy` **alongside** the trace — `renderTrace` says so
  outright — and a record now carries both.
