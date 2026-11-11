# ADR-QD-094 — A port is described once; its wrappers, default, environment and double are derived

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-094                                   |
> | Revision       | 1.11                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.11 (2026-11-12): amendment — a port's name and span are stated once, in PortName.ts; a description's span is its own port's (ARCH-77, CCR-QD-419)<br>1.10 (2026-11-11): amendment — ARCH-70: a description also states the request each policy leaf asks (asks), and the facet loses leaves (ADR-QD-134, CCR-QD-412)<br>1.9 (2026-11-11): amendment — a derived port's key is canonicalKey over its wire question and its defect is failure of the squashed cause, built by makePortDescription; CustomPredicate states its own (ARCH-69, ADR-QD-133, CCR-QD-411)<br>1.8 (2026-11-10): amendment — the key law's equality is Equal.equals over PortKey's domain; a value outside it is a typed KeyRefusal and key returns a Result (ARCH-65, CCR-QD-407)<br>1.7 (2026-11-08): amendment — one per-port table builder; fixture setups pass through to a registry-derived fixturePortsLayer (ARCH-53, CCR-QD-392)<br>1.6 (2026-11-08): amendment — a description also states what it serves, PortDescription.serving (ARCH-53, ADR-QD-114, CCR-QD-392)<br>1.5 (2026-11-08): amendment — a description's span attributes state the question projection, pose, beside disclose; the signature key covers the requirement (ARCH-47, ADR-QD-109, CCR-QD-386)<br>1.4 (2026-10-08): amendment — a description also states its wire, `PortDescription.wire`, and the registry makes a missing wire a compile error (ARCH-31, ADR-QD-107, CCR-QD-382)<br>1.3 (2026-10-08): amendment — each port's fixture builder is listed in `PORT_FIXTURES`, closed over `PortName`, beside its description (ARCH-42, CCR-QD-270)<br>1.2 (2026-10-08): amended: a request key is injective over every argument the port receives; the relationship and custom-predicate keys are corrected (ARCH-45 I1, CCR-QD-263)<br>1.1 (2026-10-07): amendment — a description also states its span's attributes (`attributes`: question, answer, `disclose`), so the row decoder stays per-port in its *fields* and is no longer restated in `@qadi/devtools`; `wiringReport` derives its port rows from the registry and says which are defaulted; the Document ID corrected from `QADI-ADR-901` (ARCH-21, CCR-QD-198)<br>1.0 (2026-10-05): Initial release (CCR-QD-177) |

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
  readonly defect: (args: Args, cause: Cause.Cause<unknown>) => E; // derived: failure(args, Cause.squash(cause))
  readonly key: (args: Args) => Result.Result<string, KeyRefusal>;  // derived: canonicalKey over the wire question
  readonly none: { readonly name: string; readonly answer: A };
}
```

`key` is `canonicalKey` (`PortKey.ts`) of the request's wire question, which always includes
the subject — the axis a what-if sweep varies — so a capture taken for one subject never
answers a question about another ([INV-QD-043](../invariants.md)). A derived port does not
state it (see the ARCH-69 amendment below). `invoke` calls the method through the
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

> **Amended (ARCH-65, 2026-11-10, CCR-QD-407): the key law's equality is `Equal.equals`.**
> "Structurally equal" above was never pinned down, and the JSON text behind it collided
> requests the evaluator tells apart: a `Date` and its ISO string, `NaN`/`±Infinity` and
> `null`, `{ a: undefined }` and `{}`, a `Set` and the array of its members, a `Map` and
> its entry pairs. Bigints and cycles threw. Two requests now share a key **exactly when
> every argument is `Equal.equals`** (an absent field and an `undefined` one alike), the
> same identity `Question` and `DecisionCache` already use, over the domain `PortKey.ts`
> states: primitives, `Date`, `RegExp`, arrays, plain and null-prototype objects, `Set`
> and `Map`. A subclass of `Date`, `RegExp`, `Array`, `Set` or `Map` keys as its base
> class, because `Equal.equals` compares it as one. A value outside the domain (a cycle,
> a function, a symbol or symbol key, a throwing getter, a value that implements `Equal`
> itself, any other class instance) is refused with a typed `KeyRefusal`, so `key` returns
> `Result<string, KeyRefusal>` (**Breaking**). Every consumer fails closed on a refusal:
> `replyTable` and the signature fixture fail the request with the port's typed error, and
> devtools' capture passes it to the live port unrecorded, so its replay fails. One limit
> the key cannot see: an object marked `Equal.byReference` keys by its structure, because
> the mark lives inside `effect` and a replay cannot preserve identity anyway. Two such
> objects with the same fields share a key although `Equal.equals` tells them apart. The
> law is tested once, as a property at `PortKey`'s interface (`PortKey.test.ts`), and the
> per-port rows in `PortConformance.test.ts` test only that every argument reaches the key.
> This keeps ARCH-45's choice of a text key (D-45-b): the collisions were the "something"
> the rejected `Equal`-valued key could do that the text could not, and fixing the text in
> place removes it. See [ADR-QD-129](129-a-replay-miss-is-an-outage-on-every-port.md) for
> what a replay answers when a key finds nothing.

> **Amended (ARCH-69, 2026-11-11, CCR-QD-411): a derived port's key is `canonicalKey` over its
> wire question.** `AttributeResolver`, `RelationshipResolver`, `DecisionHistory` and
> `SignatureHistory` each listed their request's fields as a tuple for `key` and restated
> `failure(args, Cause.squash(cause))` for `defect`; a tuple that forgot a field compiled.
> `makePortDescription` (`PortDerivation.ts`, package-private) now builds both from the facts the
> description states: `key` is `canonicalKey` over the value `wire.toQuestion` builds with its
> `undefined` members dropped, and `defect` is `failure(args, Cause.squash(cause))`. Its spec has no
> `key` or `defect` field, so a derived port cannot state one; `CustomPredicate` states its own
> (its key covers the whole subject, which its question does not carry, and its defect renders with
> `Cause.pretty`). The interface above is unchanged. Evaluation never read the key, so the defect this
> closes was a wrong replay or test-double answer, not a production grant. Observable change: four
> ports' key texts, in-process only. See [ADR-QD-133](133-a-port-request-is-derived-from-its-wire-question.md).

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

## Amendment (2026-11-08, ADR-QD-109, CCR-QD-386)

A description's span attributes state the projection too, not only the struct tables: `pose(request)`
projects the question beside `disclose(answer, request)` for the answer, both typed by the
description's own request and answer. The ARCH-31 amendment above gave the wire a copy of both
(`spanQuestion`, `spanAnswer`); that copy is gone, and the wire states only JSON. The signature
port's request key now covers the asker's requirement, `meaning` and `signerRole`, so it stays
injective over every argument the port receives (the ARCH-45 I1 law above, whose equality the
ARCH-65 amendment fixes as `Equal.equals`). See
[ADR-QD-109](109-a-ports-span-is-projected-once-and-every-read-is-one-body.md).

## Amendment (2026-11-08, ADR-QD-114, CCR-QD-392)

A description also states what it **serves**: `PortDescription.serving` (`PortServingFacet<N, Args>`), a
required member written in each port module beside `wire`. It holds the port's allowlist word
(`"required"`, `"open"` or `"opt-in"`, checked against the port's `PortServing` slot by type), `leaves`
(the policy leaf tags that read the port, each with the name it asks), `asked` (the one name an
allowlist admits or refuses for a request), `admitted` (the names a declaration admits) and `declare`
(the declaration that serves a list of names). `answerRemotely` admits through it and `servingFor`
collects and declares through it, where the same facts were stated six times in `PortRemote.ts` and
the wires.

The CCR-QD-270 amendment's sentence rejecting a `fixture` field still holds for fixtures: a fixture is
test data that every production description would carry for nothing, while a serving facet is behaviour
a server runs on every remote question (ADR-QD-114 gives the reasoning). A new port is therefore a
description including its wire and its serving facet, a `PortName` member, its registry lines, one
`PORT_FIXTURES` row **and one `PortServing` row**; a description without a facet, or a facet whose
allowlist word disagrees with its slot, is a compile error (`PortServing.tst.ts`). **Breaking** for
anything that builds a `PortDescription` by hand, and unreleased, since it ships with `wire`. See
[ADR-QD-114](114-a-port-states-what-it-serves.md).

## Amendment (2026-11-08, CCR-QD-392)

`tabulatePorts` is the one per-port table builder. Its layer form (`PortLayerVisitor` to
`PortLayers`) replaces `mapPorts`, whose body was identical to `tabulatePorts`'; this supersedes
the registry section's list of tables (`tabulatePorts`, `mapPorts`, `mergePorts`, `decoratePorts`)
and its naming of the visitor types and what takes them. There are two signatures over one
five-row body because TypeScript reads `F[K]` as a return target to be the intersection of every
slot (TS #30769), so a value typed per port cannot be checked through `F`; that is the
`createPermissionGroup` shape. `PortLayerVisitor` stays as the layer form's parameter.
**Breaking** for `@qadi/core` consumers of `mapPorts` (published in 0.10.0): `tabulatePorts(f)`
takes the same visitor and returns the same `PortLayers`.

`fixturePortsLayer` takes per-port setups, `PortFixtures`: for each port `answers` (fixture
data), a `layer`, both with the layer winning, or neither, meaning the port's fail-closed
default. It derives every slot from the registry (`tabulatePorts`, `PORT_FIXTURES`, `NONE`)
with no hand-written row and no `as`, which supersedes the CCR-QD-270 amendment's
`fixturePortsLayer(data, overrides?)`. Both `fixturePortsLayer` and `PortFixtures` came with
ARCH-42 after 0.11.0, so the change is unreleased. `@qadi/testing` passes
`TestLayerOptions.ports` through to it unchanged, so its public shape is unchanged, and
devtools' Fixtures simulation calls the same function.

A new port is therefore a description (including its wire and its serving facet), a `PortName`
member, its registry lines and one `PORT_FIXTURES` row; there is no layer-builder line left to
write. See [ADR-QD-114](114-a-port-states-what-it-serves.md) for the serving facet.

> **Amended (ARCH-70, 2026-11-11, CCR-QD-412): a description also states the request each policy leaf
> asks.** `PortDescription.asks` (`LeafRequests<P>`) is one `(leaf, site) => request` per policy tag the
> port reads, where `site` is the subject asking and the resource asked about (`ReadSite`). Every read in
> `PortAccess.ts` builds its request through it and `servingFor` reads the served name from the same
> request, so the facet keeps no leaf map of its own: `PortServingFacet.leaves` and `ServedLeaves`,
> listed in the CCR-QD-392 amendment above, are gone. `PortDescription` takes the request as far as a
> site supplies it, `P`, and an exact `Asks`, as type parameters. **Breaking** for anything that builds a
> `PortDescription` by hand, because the interface shipped in 0.10.0. See
> [ADR-QD-134](134-a-resource-scoped-port-read-is-one-read.md).

## Amendment (2026-11-12, CCR-QD-419)

A port's name and the span its read opens are stated once, in `packages/core/src/PortName.ts`, a leaf
with no imports. They were declared in `PortMetrics.ts`, so every port module took what a port *is*
from the module that counts what it *did* (ARCH-77). `PortName` is the key set of one module-private
table, and `PortSpanName` is that table's value union; a sixth port is one row there, and its name and
its span cannot be added separately and drift apart. The leaf declares no metric, so a metric's registry
key (ADR-QD-052) cannot move with a port's identity.

`PortDescription.span` is `PortSpanOf<N>`, so a description can name only its own port's span:
`attributeResolverPort` claiming `"qadi.acted"` is a compile error, and `PortName.tst.ts` pins it. Before
this the field was the whole `PortSpanName` union. Deriving the span union from the five descriptions
instead was weighed and rejected: each description is annotated, so its `span` type is the whole union,
and the only module that sees every description (`Ports.ts`) sits above `PortDescription.ts`. `PortSpanOf`
is a new type export of `@qadi/core`; nothing at runtime changed. No new ADR: this moves where a fact is
stated and narrows what a description may state, which is this decision's own subject.
