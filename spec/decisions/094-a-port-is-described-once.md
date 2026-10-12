# ADR-QD-094 — A port is described once; its wrappers, default, environment and double are derived

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-094                                   |
> | Revision       | 1.4                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.4 (2026-10-08): amendment — a description also states its wire, `PortDescription.wire`, and the registry makes a missing wire a compile error (ARCH-31, ADR-QD-107, CCR-QD-382)<br>1.3 (2026-10-08): amendment — each port's fixture builder is listed in `PORT_FIXTURES`, closed over `PortName`, beside its description (ARCH-42, CCR-QD-270)<br>1.2 (2026-10-08): amended: a request key is injective over every argument the port receives; the relationship and custom-predicate keys are corrected (ARCH-45 I1, CCR-QD-263)<br>1.1 (2026-10-07): amendment — a description also states its span's attributes (`attributes`: question, answer, `disclose`), so the row decoder stays per-port in its *fields* and is no longer restated in `@qadi/devtools`; `wiringReport` derives its port rows from the registry and says which are defaulted; the Document ID corrected from `QADI-ADR-901` (ARCH-21, CCR-QD-198)<br>1.0 (2026-10-05): Initial release (CCR-QD-177) |

---

## Context

Qadi has five evaluation ports — `AttributeResolver`, `RelationshipResolver`,
`CustomPredicate`, `DecisionHistory`, `SignatureHistory` — each a real seam with at
least two adapters in this repository. [ADR-QD-077](./077-both-interpreters-read-ports-through-one-module.md)
made the *call* side of a port deep: `PortAccess.ts` owns the question, the span,
the call metric and the defect mapping for every read. The *layer* side was still
described piecemeal. A port's error constructor, request key and fail-closed answer
were restated wherever something wrapped, replayed, defaulted, doubled or
enumerated that port. ARCH-10 verified, at `e0ee958`:

- **E1.** The wrapper set was ragged: three ports had `…Retrying` and `…Bounded`,
  two had `…TimingOut`, and `DecisionHistory`/`SignatureHistory` had none. A hung
  history store held an evaluation open with no library-provided deadline.
- **E2.** Only `attributeResolverRetrying` annotated `qadi.attempts` (KH-01);
  `customPredicateRetrying`'s doc said it mirrored it exactly. Two of three
  retrying wrappers hid their retries from traces.
- **E3.** `RetryingLayer.ts` said one generic wrapper was impossible because the
  port methods differ in arity. A probe showed a per-port lens makes it possible
  with no `as` and no `any`.
- **E4–E6.** `PortMetrics.ts` carried four hand-written port-name lists; the
  five-port service set had three names in core and one in `@qadi/devtools`; and
  every environment builder — core's test helpers, `@qadi/testing`, devtools'
  fixtures, capture and replay, `EvaluationServicesNone` — listed the ports by
  hand. A sixth port edited every list, and almost none failed to compile if
  forgotten. Adding `HasSignature` (`f86f028`) touched about 19 files of port
  plumbing.
- **E8.** 65 hand-written failing port layers in 27 test files, plus 19 dying ones.
  The blocker was dependency direction: core's tests cannot import `@qadi/testing`.
- **E9.** Overriding one port by merging a layer after `EvaluationServicesNone`
  worked only when the override came last; the other order silently kept the
  default and denied.
- **E13–E15.** The timeout metric was read by nothing and the deadline message
  pinned by nothing; devtools re-declared every fail-closed answer by hand; no
  behaviour document specified the wrappers.

## Decision

**Each port module declares one description beside its service. Every wrapper, the
named fail-closed default, the scriptable doubles, the five-port environment type
and the environment builders are derived from the descriptions.** The Shapes
([ADR-QD-010](./010-context-service-and-layers.md)) do not change.

| Decision | Chosen |
| -------- | ------ |
| D-10-a — arity | A lens: each description carries `invoke: (shape) => (...args) => Effect` and `make: (name, call) => Shape`, with the request as a labelled tuple. No Shape changes |
| D-10-b — where | The description beside its service (`attributeResolverPort` in `AttributeResolver.ts`, …); generic derivations in `PortDerivation.ts` (absorbing `RetryingLayer.ts`) and `PortDoubles.ts`; the closed registry in `Ports.ts` |
| D-10-c — what is public | Descriptions, `PortDescription`/`PortShape`/`PortReply`/`PortScript`, the doubles (`scriptedPort`, `recordingPort`, `replyTable`), the registry types and environment functions. The generic wrapper derivations (`retryingPort`, `boundedPort`, `timingOutPort`, `nonePort`, `wrapPort`) stay internal: callers use the fifteen named wrappers and five named defaults |
| D-10-d — defaults | Derived: `AttributeResolverNone = nonePort(attributeResolverPort)`. The description's `none` is the only statement of each answer; devtools' replay reads the same field |
| D-10-e — defect constructors | From the description, through a dedicated `defect` beside `failure`, so `CustomPredicateError.reason` stays `Cause.pretty(cause)`. Results are byte-identical; `PortAccess.ts` names no port error class |
| D-10-f — `@qadi/testing`'s per-port doubles | Deleted (eleven modules); `TestLayerOptions` gains `ports?: PortOverrides`. Breaking, 0.x |
| D-10-g — core test-helper keys | Keyed by port name (`{ AttributeResolver: … }`), migrated by an AST codemod |
| D-10-h — wrapper metric domains | `RetryingPortName` and `TimingOutPortName` deleted; both metrics preregister all five `PortName`s. No `description` changed, so no registry key moved ([ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md)) |
| D-10-i — devtools timeouts | `PortActivity` gains `timeouts`, read from `qadi_port_timeouts_total`, shown on the Services screen |
| D-10-j — a ratchet | `PORT_DOUBLE_BUDGET`, the only test-scope house-style budget: test files that construct a port's error by hand, by exact count and reason |
| D-10-k — span names | In the description (`span: PortSpanName`); `PortAccess.ts` and devtools' collector read them there |
| D-10-l — reply kinds | `PortReply = Answer \| Fail \| Die \| Throw`, closed and tagged; `undefined` from a script falls through to the fail-closed answer |

### The description

```ts
interface PortDescription<N extends PortName, Self, Shape extends PortShape, Args, A, E> {
  readonly port: N;            // the metric word
  readonly method: string;     // "resolve" — named in the deadline message
  readonly span: PortSpanName; // the span PortAccess.ts opens
  readonly service: Context.Key<Self, Shape>;
  readonly invoke: (shape: Shape) => (...args: Args) => Effect.Effect<A, E>;
  readonly make: (name: string, call: (...args: Args) => Effect.Effect<A, E>) => Shape;
  readonly failure: (args: Args, cause: unknown) => E;
  readonly defect: (args: Args, cause: Cause.Cause<unknown>) => E;
  readonly key: (args: Args) => string;
  readonly none: { readonly name: string; readonly answer: A };
}
```

`key` is `JSON.stringify` of a tuple that always includes the subject — the axis a
what-if sweep varies — so a capture taken for one subject never answers a question
about another ([INV-QD-043](../invariants.md)). `invoke` calls the method through the
shape, never hands it back unbound.

### The registry and correlated visitors

`Ports.ts` declares `PortTypes`, an interface from each `PortName` to its
description's exact type, and `PORTS`. Every derived type indexes `PortTypes[K]` for
`K in PortName`, so a name without an entry is a compile error wherever a derived
type is used: `PortServices` (the five services), `PortLayers`, `PortOverrides`.
`EvaluationServices` is `CurrentSubject | EvaluationId | PortServices`.

Visitors (`PortVisitor`, `PortLayerVisitor`, `PortDecorator`) are generic in the
port's *name* `K` over `DescriptionOf<K>` — the description spelled through the
registry — rather than in the description's six parameters. Only that form lets a
function written once for every port keep the port's name, service and answer
correlated: `answers[d.port]` and `d.none.answer` then have types the compiler
knows agree, which is what makes devtools' capture and replay generic without a
cast. Each per-port table is spelled out once, in `Ports.ts` (`PORTS`,
`tabulatePorts`, `mapPorts`, `mergePorts`, `decoratePorts`).

### Environments

`portsLayer(overrides)` places each override in its own slot and every other port at
its fail-closed default, so **order cannot change the result** (E9).
`EvaluationServicesNone` is `Layer.merge(portsLayer(), EvaluationIdLive)`.
`decoratePorts` builds an environment once and rebuilds every port through one
decorator — the shape devtools' capture needs, previously five hand blocks.

### Doubles

`scriptedPort(d, script)` answers, fails with the port's own error (built by
`failure`), dies, or throws synchronously per request; logs every request in order
as its typed tuple; and answers `none.answer` for a request the script leaves
undefined. The script is consulted at the call, so a retrying wrapper — which
re-invokes the method on every attempt — consults it once per attempt.
`recordingPort(d, layer, observe?)` wraps a real port, logs its requests, and
reports each settled exit without absorbing it. `replyTable(d, entries)` keys a
script by `d.key`.

## Consequences

**Positive.**

- The wrapper matrix is closed by construction: fifteen wrappers, one line each.
  Every retrying wrapper annotates `qadi.attempts`; every port can carry a deadline.
- One conformance suite (`PortConformance.test.ts`) runs the same assertions over
  every member of the registry, and a port without a case is a compile error.
- One name for the five-port set; no hand-listed port override object remains in
  core, `@qadi/testing`, devtools or the examples.
- The next port is a description, a `PortName` member and its registry lines; the
  compiler asks for the rest (each port's span *fields* stay per-port on purpose —
  each port asks a different question — but are stated once, in the description;
  see the amendment below).
- Devtools' replay defaults are the real defaults, not copies.

**Negative.**

- Three new modules and a six-parameter generic type to read.
- Breaking changes in three packages, all 0.x: `@qadi/core` removes
  `RetryingPortName`/`TimingOutPortName`; `@qadi/testing` removes eleven per-port
  modules and its five per-port layer options; `@qadi/devtools` re-keys
  `CapturedAnswers` by port name and removes its five key functions.
- `@qadi/testing`'s data options now build core's fixtures, so the implementation
  names a wiring panel shows for them change.

## Alternatives considered

- **Normalise every Shape to one request-object method.** Breaks every implementer
  of the two positional Shapes, and since the method names still differ a generic
  wrapper still needs `make`. Only a rename of every method to one name removes the
  lens, which reads worse at every call site. Rejected: the full migration cost for
  nothing the lens does not already give.
- **Status quo with the seven missing wrappers written by hand.** Fixes E1/E2 and
  leaves E4–E9 and E14; the next port restates every fact again.
- **All five descriptions in `Ports.ts`.** One file to read, but a port's facts move
  away from its Shape and service (AGENTS.md §3), and every port module would import
  the registry to derive its exports — a cycle.

## Related

[ADR-QD-010](./010-context-service-and-layers.md),
[ADR-QD-040](./040-an-unwired-port-names-its-absence.md),
[ADR-QD-051](./051-a-span-says-what-was-asked.md),
[ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md),
[ADR-QD-077](./077-both-interpreters-read-ports-through-one-module.md);
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed),
[INV-QD-043](../invariants.md),
[INV-QD-095](../invariants.md#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description);
[BEH-QD-308](../behaviors/06-services.md#beh-qd-308-every-port-has-the-standard-wrapper-set),
[BEH-QD-309](../behaviors/06-services.md#beh-qd-309-an-environment-names-only-what-it-overrides),
[BEH-QD-310](../behaviors/06-services.md#beh-qd-310-a-port-can-be-scripted).

## Amendment (2026-10-07, CCR-QD-198)

The decision above said "devtools' row decoder stays per-port on purpose — each
port asks a different question". The per-port *fields* are genuine and stay
per-port. What was not genuine was restating their spelling and types: the writer
(`PortAccess.ts`) and the reader (`@qadi/devtools`' `rowOf`) each spelled thirteen
`qadi.*` keys, with prose in two spec documents as a third and fourth copy, and
the seam between them was string equality — which drifted twice (a signature
span's `qadi.scope`/`qadi.resource_id`, and every retried call's `qadi.attempts`,
were written and never read, ARCH-21 C4/C5).

A description therefore also states its span's attributes: `attributes` is a
**question** struct annotated before the call, an **answer** struct annotated
after it, and `disclose`, a projection from the port's outcome to the answer
(`PortSpan.ts`, a seventh `PortDescription` type parameter defaulted to a
structural bound so `PortDerivation.ts` and `PortDoubles.ts` are unchanged).
`PortAccess.ts` encodes through it; devtools decodes through it
(`decodePortSpan`), so a key is renamed in one place and a new field reaches the
trace and the panel with one edit. The span *name* stays `span`.

Each struct is a table of Schema leaves and the key each is written under
(`PortSpanEncode.ts`, internal). A whole `Schema.Struct` with `encodeKeys` was
measured and rejected: ≈1.1 µs per encode, twice per read, on ADR-QD-051's
resolver-miss path, and a whole-struct decode fails on one wrong-typed attribute,
contradicting BEH-QD-228. Encoding is a walk over the value's own entries;
decoding takes each field alone. The wiring report's five port rows are likewise
derived from the registry (`forEveryPort`), each reporting whether its name is the
description's fail-closed default or a wrapper around it (`none.name`) — a
reader's label, never an input to a decision. `EvaluationId`, `CurrentSubject`,
`DecisionCache` and `DecisionSink` stay hand-listed: they are not ports.

> **Amended (ARCH-45 I1, 2026-10-08): a request key is injective over every argument
> the port receives.** `PortDescription.key` was documented as "a collision-safe key
> ... that always includes the subject", and two descriptions dropped an argument the
> port receives: the relationship key ignored `depth` ("traversal fuel, not part of the
> question", although the resolver contract on the same page requires a traversing
> resolver to honour it), and the custom-predicate key ignored the resource and
> everything in the subject but its id. Devtools' capture and replay, keyed by them,
> answered a depth-1 ask with a depth-3 capture, one resource with another's answer,
> and a what-if that dropped a role with the original subject's answer (a stale allow).
> The law is now stated on `key` and checked for all five ports in
> `PortConformance.test.ts`: two requests share a key only if every argument is
> structurally equal. The custom-predicate key is canonical (`PortKey.ts`'s
> `canonicalKey`, package-private: a `Set` as its sorted members, an object with sorted
> keys), because `JSON.stringify` writes a `Set` as `{}`. Observable change: two key
> strings, and `CapturedAnswers` (exported) keys with them; no type changes.

## Amendment (2026-10-08, CCR-QD-270)

Each port's fixture builder is listed in `PORT_FIXTURES` (`Ports.ts`), closed over
`PortName`, beside its description; the description itself gains no field. The
data a fixture takes is `PortFixtureData[K]`, and `fixturePortsLayer(data, overrides?)`
is the one place a set of fixture data becomes an environment: `@qadi/testing`'s
`qadiReviewLayer` and `@qadi/devtools`' Fixtures simulation both call it. Before
it the data-to-layer map was written twice, once in each, and devtools cannot depend
on `@qadi/testing` (no test fixtures in a production bundle), so only core could
hold it. A `fixture` field on `PortDescription` was rejected: it would put a
test-data shape into every production description and break every literal. A new
port is therefore a description, a `PortName` member, its registry lines **and one
`PORT_FIXTURES` row**; omitting the row is TS2741. `CustomPredicate`'s fixture is
fixed verdicts by name (`Readonly<Record<string, boolean>>`), not functions, so
`PortFixtureData` stays serializable and devtools' sealed input (ADR-QD-050) stays
data-only.

## Amendment (2026-10-08, ADR-QD-107, CCR-QD-382)

A description also states its **wire**: `PortDescription.wire` (`PortWire<Args, A>`), a required member
written in each port module beside `attributes` through the package-private `portWire`
(`PortWireEncode.ts`). It is the only statement of what a port's question and answer look like off-process,
and `answerRemotely` / `askRemotely` (`PortRemote.ts`) derive both halves of a remote port from it. It is
separate from `attributes` because a span field cannot hold an attribute's value (INV-QD-044) and a wire
must. The ARCH-42 amendment's sentence that the description "gains no field" was about fixtures and still
holds for them. A new port is therefore a description, a `PortName` member, its registry lines, one
`PORT_FIXTURES` row **and its wire**; a description without one is a compile error
(`PortWire.tst.ts`). **Breaking** for anything that builds a `PortDescription` by hand; in this repository
that is the five port modules and one test probe.
