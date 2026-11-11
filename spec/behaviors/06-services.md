# 06 — Services and Layers

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-06                                    |
> | Revision       | 1.10                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.10 (2026-11-11): BEH-QD-409's key law reads over a derived port's wire question; BEH-QD-440 (a derived port states no key and no defect) and BEH-QD-441 (a port's question and span question name every member) (ARCH-69, CCR-QD-411)<br>1.9 (2026-11-10): BEH-QD-409 (a request key agrees with Equal over its domain) and BEH-QD-410 (a request the key refuses fails closed); BEH-QD-310's replyTable requirement matches by key text and fails a refused request with the port's typed error (ARCH-65, CCR-QD-407)<br>1.8 (2026-10-05): BEH-QD-043's listing gains `CustomPredicateNone` and `SignatureHistoryNone`, which it had omitted since both ports shipped, and states that each port's default is derived from its description's `none`; BEH-QD-308 (every port has the standard wrapper set), BEH-QD-309 (an environment names only what it overrides) and BEH-QD-310 (a port can be scripted) added (ADR-QD-094, CCR-QD-177)<br>1.7 (2026-10-05): BEH-QD-045's reason table is built from the matcher's `Verdict` — an `Eq` or `Dominates` against an unresolved reference reads "has no reference value to compare against" (only `Neq` did), and a value the matcher cannot compare reads "is not a value this matcher can compare" (ADR-QD-091, CCR-QD-173)<br>1.6 (2026-09-19): BEH-QD-044 gained a normative "Trust model" paragraph — `CurrentSubject`'s provenance and what the evaluator does and does not re-verify had no single stated answer anywhere in `spec/` (WD-05)<br>1.5 (2026-09-07): BEH-QD-045's denial reads corrected — "no relationship resolver is wired" claimed a fact only true of `RelationshipResolverNever`, when a wired resolver may answer `"Unknown"` too; the sentence no longer names wiring as the cause (issue 45, CCR-QD-114)<br>1.4 (2026-09-06): BEH-QD-042's table brought current — `CustomPredicate`, `SignatureHistory` and `DecisionSink` had been wired since ADR-QD-055/CCR-QD-087/ADR-QD-044 without ever reaching this table; "the six services, five required" corrected to nine and seven, matching `EvaluationServices` in `Evaluate.ts`. The website's `services-resolvers.md` had already said nine/seven and linked here for "the full service list", landing readers on a table that contradicted the page that sent them (CCR-QD-103)<br>1.3 (2026-08-23): `RelationshipResolver` is three-valued, for the sentence rather than the verdict; BEH-QD-045 added (ADR-QD-040, INV-QD-029, CCR-QD-055)<br>1.2 (2026-07-26): The sixth service, `DecisionCache`; the optionality that hid it recorded (CCR-QD-034)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-041: Service declaration form

> **See:** [ADR-QD-010](../decisions/010-context-service-and-layers.md)

```ts
export class AttributeResolver extends Context.Service<
  AttributeResolver,
  AttributeResolverShape
>()("qadi/AttributeResolver") {}
```

```
REQUIREMENT: Services MUST be declared with `Context.Service<Self, Shape>()("ns/Id")`.
             `Effect.Service`, `Context.Tag` and `Context.GenericTag` MUST NOT
             be used.
```

```
REQUIREMENT: Layers MUST be exported top-level constants, not static members.
```

Note that `use` requires its callback to **return an Effect**, so it is a
one-step method accessor. The identity form `static current = X.use((x) => x)`
typechecks only when the Shape is itself an `Effect`, which ours are not.

## BEH-QD-042: The nine services, seven of them required

| Service | Tag | Purpose |
| ------- | --- | ------- |
| `CurrentSubject` | `qadi/CurrentSubject` | The subject being authorized |
| `AttributeResolver` | `qadi/AttributeResolver` | Attributes not already on the subject |
| `RelationshipResolver` | `qadi/RelationshipResolver` | ReBAC graph questions |
| `DecisionHistory` | `qadi/DecisionHistory` | What this subject has already done |
| `EvaluationId` | `qadi/EvaluationId` | Correlating identifier |
| `CustomPredicate` | `qadi/CustomPredicate` | A named, registered escape hatch for logic the built-in matchers cannot express |
| `SignatureHistory` | `qadi/SignatureHistory` | Electronic-signature lookups for `hasSignature` |
| `DecisionCache` | `qadi/DecisionCache` | **Optional.** What has already been asked, within a scope the caller chooses |
| `DecisionSink` | `qadi/DecisionSink` | **Optional.** Where a decision is forwarded for observation, once made |

`EvaluationServices` (`Evaluate.ts`) is the union of the seven required
services; `DecisionCache` and `DecisionSink` are read through
`Effect.serviceOption` instead, precisely so an application that never wires
one is unaffected (`INV-QD-025`, `INV-QD-035`). `DecisionHistory` arrived with
E5, `CustomPredicate` and `SignatureHistory` considerably later — each is a
**port**, not a store: the record (or the registry, or the signature history)
lives in the caller's system and Qadi never writes to it
([ADR-QD-020](../decisions/020-decision-history-port.md)).

```
REQUIREMENT: `DecisionCache` MUST NOT be a member of `EvaluationServices`, and MUST
             be read through `Effect.serviceOption`, so an application that never
             provides it is unaffected.
```

That optionality is why it is the sixth service and not the sixth *required* one — and
why it went unlisted here for two commits. It is the one service that does not appear
in the type every other service appears in, so nothing about adding it forced this
table to change ([ADR-QD-031](../decisions/031-decision-cache.md)).

*This heading said "four" until CCR-QD-025 and "five" until CCR-QD-034, while
[05 — Evaluator](./05-evaluator.md) had listed five since E5 shipped. Two behaviour
documents disagreeing about how many services exist is the kind of drift a normative
set cannot carry, and the first time it had propagated into §1 of the traceability
matrix. Twice is a pattern, not an oversight, and it is the reason
`scripts/check-api-surface.mjs`, step 13 of the merge gate, now exists — though note what that gate does and does not cover: it checks that
`spec/overview.md` names every **export**, and `DecisionCache` being missing from
**this** table is a different miss that the gate would not have caught.*

## BEH-QD-043: Defaults fail closed

> **Invariant:** [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)

```ts
export const AttributeResolverNone: Layer.Layer<AttributeResolver>;       // answers undefined
export const RelationshipResolverNever: Layer.Layer<RelationshipResolver>; // answers "Unknown"
export const DecisionHistoryUnknown: Layer.Layer<DecisionHistory>;        // answers "Unknown"
export const CustomPredicateNone: Layer.Layer<CustomPredicate>;           // answers false
export const SignatureHistoryNone: Layer.Layer<SignatureHistory>;         // answers [] (frozen)
export const CurrentSubjectAnonymous: Layer.Layer<CurrentSubject>;
export const EvaluationIdLive: Layer.Layer<EvaluationId>;
```

The five port defaults are each derived from the port's description —
`AttributeResolverNone = nonePort(attributeResolverPort)` — whose `none` field is the
only statement of the name and the answer; `@qadi/devtools`' replay reads the same
field for a request its capture never saw
([ADR-QD-094](../decisions/094-a-port-is-described-once.md)).

```
REQUIREMENT: Every default layer MUST fail closed. An unwired relationship
             resolver MUST deny; an unwired subject MUST hold nothing. A default
             that grants would turn a wiring omission into a silent breach.
```

`DecisionHistoryUnknown` is the hardest case in that list and the reason that port
is three-valued. A boolean has a **polarity**: whichever way an unwired default
answers, it grants under one of `hasActed`/`hasNotActed`. `"Unknown"` denies under
both, which is what makes "fail closed" achievable at all here
([INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities)).

`RelationshipResolverNever` is three-valued too, and for a different reason —
worth separating, because the shapes are identical and the arguments are not:

```ts
export type ActedResult = "Acted" | "NotActed" | "Unknown";
export type RelatedResult = "Related" | "Unrelated" | "Unknown";
```

`hasRelationship` has no negative counterpart, so `false` was always fail-closed
and safety was never at stake. What a boolean could not do was tell the
*evaluator* which of two answers it held, so an unwired resolver denied by
describing a graph that had never been connected. Its third value buys the
sentence, not the verdict
([BEH-QD-045](#beh-qd-045-a-denials-reason-names-only-what-was-consulted), [ADR-QD-040](../decisions/040-an-unwired-port-names-its-absence.md)).

```
REQUIREMENT: `RelationshipResolverNever` MUST answer `"Unknown"`, and
             `relationshipResolverFromEdges` MUST answer `"Unrelated"` for an
             edge it does not hold. A static edge list is the store, and knows.
```

## BEH-QD-045: A denial's reason names only what was consulted

> **Invariant:** [INV-QD-029](../invariants.md#inv-qd-029-a-denial-names-only-what-was-consulted)
> **See:** [ADR-QD-040](../decisions/040-an-unwired-port-names-its-absence.md)

```
REQUIREMENT: A denial's reason MUST NOT assert a fact about a store that was not
             consulted. A relationship denial reached only because the port
             answered `"Unknown"` MUST NOT assert that no resolver is wired —
             a wired resolver may answer `"Unknown"` too, and the port gives
             the evaluator no way to tell the two apart.
```

| Situation | Denial reads |
| --------- | ------------ |
| a wired relationship store holds no such edge | `subject 'u1' has no 'owner' relation to 'doc-1'` |
| the port answers `"Unknown"` (unwired, or a wired resolver with no answer for this relation) | `no relationship resolver could confirm the 'owner' relation to 'doc-1'` |
| a non-`Neq` attribute is present and compares wrong (`NotHeld`), or a composite matcher does not hold | `subject attribute 'level' did not match` |
| a `Neq` attribute is present and equals the excluded value (`NotHeld`) | `subject attribute 'homeTenant' matched an excluded value` |
| an attribute is absent or unresolved (`ValueAbsent`) | `subject attribute 'level' has no value` |
| an `Eq`, `Neq` or `Dominates` reference resolves to nothing (`ReferenceAbsent`) | `subject attribute 'tenant' has no reference value to compare against` |
| the value is not one the matcher can compare — `Infinity` or `"5"` under `gte(3)`, a non-label under `dominates`, a non-array under `someMatch` (`Incomparable`) | `resource attribute 'level' is not a value this matcher can compare` |

The rows are read from `judgeMatcher`'s `Verdict`
([BEH-QD-305](./04-matchers.md#beh-qd-305-comparison-semantics-have-one-owner)),
so which operand was absent, or whether the value was comparable at all, is
what the comparison itself reported rather than a second guess made afterwards.

> **Corrected (CCR-QD-173).** The unresolved-reference row named `Neq` alone,
> because the reason was re-derived after the fact from the boolean
> `evaluateMatcher` returned, and only for `Neq`. So `eq(subject("missing"))`
> against a present attribute, and `dominates(resource("label"))` against an
> absent label, read "did not match" — a comparison that never ran, which is
> what this behavior forbids. And `gte(3)` against `Infinity` or `"5"` read
> "did not match" too: true, but it hid that the value was not comparable at
> all.

> **Corrected.** `Neq` denies exactly when the value **matches** the excluded
> reference, so the general "did not match" row was backwards for it — it
> claimed the opposite of what happened rather than merely withholding a
> diagnosis, the way the absent-attribute case does. `attributeReason` now
> takes the matcher and gives `Neq`'s resolved-and-compared denial its own row.

> **Corrected (CCR-QD-114).** The second row read "no relationship resolver is
> wired, so no 'owner' relation to 'doc-1' can be confirmed" — a claim that was
> only ever true under `RelationshipResolverNever`, and this table's own
> heading conflates that default with any resolver answering `"Unknown"`.
> `RelationshipResolver.ts`'s own `RelatedResult` doc already said a *wired*
> resolver may answer `"Unknown"` too — a graph store with no namespace for a
> given relation, say — so a resolver that **is** wired and named could reach
> this exact arm and get told nothing was wired. That is precisely what
> INV-QD-029 forbids: a denial asserting a fact about a store the evaluator
> never actually checked. The sentence no longer claims a wiring state it
> cannot verify; it says only what every "Unknown" answer has in common — that
> nothing confirmed the relation.

Both relationship rows **deny**, and so do all five attribute rows. Nothing here
changes a verdict — [BEH-QD-043](#beh-qd-043-defaults-fail-closed) and
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) are untouched —
which is exactly why it needs stating: no assertion about a verdict can observe
whether this holds.

The first row's sentence used to cover the second, and that was a claim about the
contents of a graph nobody had connected. It reaches an `AccessDenied` handler
([BEH-QD-054](./07-enforcement.md)), a `renderTrace` line
([BEH-QD-144](./18-explanation.md)) and a `Can` fallback
([BEH-QD-072](./09-react.md)). Worse, the unwired state is the one every ReBAC
integration begins in, so it was the first sentence most readers ever saw.

The attribute rows are milder and belong here for the same reason. `did not
match` is *true* of an unresolved attribute — every matcher fails `undefined` —
so nothing was false; the diagnosis was withheld, and `AttributeResolverNone`
produces that case exclusively.

```
REQUIREMENT: The reason MUST NOT contain a resolved attribute's value.
```

The attribute's *name* is already disclosed; its contents are the subject's data,
and a reason travels to logs and into error handlers. "has no value" is chosen
over "is not set" with the same care: an attribute present on the record holding
`undefined` reaches that branch too, and the shorter claim about the record's
shape has not been checked.

## BEH-QD-044: Request scoping

```ts
export const currentSubjectLayer: (subject: AuthSubject) => Layer.Layer<CurrentSubject>;
```

Named `currentSubjectLayer` rather than exposed as a static `of`, because
`Context.Service` already defines `of` as the service constructor.

**Trust model.** `CurrentSubject` is a trusted input, not a claim Qadi
verifies. Everything the evaluator reads off `AuthSubject` — `id`, `roles`,
`permissions`, `attributes` — is taken as already authenticated by whoever
built the layer; the evaluator answers "does this subject, as described, pass
this policy," never "is this really who it says it is." Establishing identity
— checking a password, validating a session cookie, verifying a token's
signature — is outside this library's competence entirely, and nothing in
`CurrentSubject.ts` or `Evaluate.ts` re-checks it. A caller that wires
`currentSubjectLayer(userFromUnverifiedCookie)` is vouching for that subject
exactly as if it had called `currentSubjectLayer` with a value it trusts; the
one thing Qadi does for an untrusted or absent identity is fail closed if
nothing is provided at all ([`CurrentSubjectAnonymous`](#beh-qd-043-defaults-fail-closed)
holds nothing, so every policy denies), not detect that the provided subject
was never actually verified. This was previously implicit — spread across
`CurrentSubject.ts`'s "Build this per request" comment, ADR-QD-032's aside
about a long-lived runtime holding one subject, and ADR-QD-058's capture-side
scoping — with no single normative statement of it (WD-05).

## BEH-QD-308: Every port has the standard wrapper set

> **Invariant:** [INV-QD-095](../invariants.md#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description)

```ts
export const attributeResolverRetrying:  (schedule) => (layer) => Layer<AttributeResolver>;
export const attributeResolverBounded:   (permits: number) => (layer) => Layer<AttributeResolver, InvalidBoundedPermits>;
export const attributeResolverTimingOut: (duration: Duration.Input) => (layer) => Layer<AttributeResolver>;
// …and the same three for relationshipResolver, customPredicate, decisionHistory, signatureHistory
```

Each wrapper is derived from its port's description (`PortDerivation.ts`), so the
fifteen are one rule applied five times rather than fifteen hand-written bodies — two
of which had drifted (only one of three retrying wrappers annotated its attempts, and
two ports had no deadline at all).

```
REQUIREMENT: Each of the five ports MUST export `…Retrying`, `…Bounded` and
             `…TimingOut`.

REQUIREMENT: A retrying wrapper MUST annotate `qadi.attempts` on the caller's
             current span with the number of times the port was actually invoked
             (1 when the first attempt succeeds), whichever way the retried call
             settles, and MUST count each failed attempt in
             `qadi_port_retries_total` under the port's name. It MUST surface the
             port's own error once the schedule is exhausted.

REQUIREMENT: A bounded wrapper MUST run no more than `permits` calls at once, and
             MUST reject a permit count that is not a positive integer at
             construction with `InvalidBoundedPermits` rather than build a layer
             that deadlocks.

REQUIREMENT: A timing-out wrapper MUST fail a call that does not settle within
             its deadline with the port's own typed error — its cause an `Error`
             reading "<port>.<method> did not settle within the configured
             deadline" — and MUST count it in `qadi_port_timeouts_total`. A call
             that settles in time MUST pass through unchanged.

REQUIREMENT: Each wrapper MUST name itself around the implementation it wraps
             ("<inner> (retrying)", "(bounded N)", "(timing out)"), reading "?"
             for an unnamed inner ([BEH-QD-196](./25-inspection.md)).
```

## BEH-QD-309: An environment names only what it overrides

> **Invariant:** [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)

```ts
export const portsLayer: (overrides?: PortOverrides) => Layer.Layer<PortServices>;
export type PortOverrides = { readonly [K in PortName]?: Layer.Layer</* K's service */> | undefined };
```

```
REQUIREMENT: `portsLayer(overrides)` MUST place each override in its own port's
             slot and every other port at its fail-closed default (BEH-QD-043).
             An `undefined` override MUST mean the default. The order in which
             overrides are written MUST NOT change the result.

REQUIREMENT: An override MUST provide the service of the slot it names; a layer
             for another port in that slot MUST be a compile error.
```

Merging a layer *after* `EvaluationServicesNone` used to override one port only
when the override came last; written first, the default silently won and every
policy reaching that port denied. A slot per port removes the order. A host wires
`portsLayer({ AttributeResolver: directory, DecisionHistory: auditLog })` and the
ports it does not use need no mention.

```typescript
import { attributeResolverFromRecord, EvaluationIdLive, portsLayer } from "@qadi/core";
import * as Layer from "effect/Layer";

// Every other port sits at its fail-closed default.
const services = Layer.merge(
  portsLayer({ AttributeResolver: attributeResolverFromRecord({ clearance: 5 }) }),
  EvaluationIdLive,
);
```

## BEH-QD-310: A port can be scripted

> **Invariant:** [INV-QD-095](../invariants.md#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description)

```ts
export const scriptedPort: (port, script: (...request) => PortReply<A> | undefined, name?) => PortDouble;
export const recordingPort: (port, layer, observe?: (request, exit) => void) => PortDouble;
export const replyTable: (port, entries: ReadonlyArray<readonly [request, PortReply<A>]>) => PortScript;
export type PortReply<A> = Answer(value) | Fail(cause) | Die(defect) | Throw(error);
```

```
REQUIREMENT: `scriptedPort` MUST, per request, answer the scripted value, fail
             with the port's own error built by its description's `failure` from
             the request and the scripted cause, die with the scripted defect, or
             throw the scripted error synchronously from the method body; a
             request the script leaves `undefined` MUST answer the description's
             fail-closed `none` answer. It MUST log every request, in order, as
             the port method's parameters.

REQUIREMENT: `recordingPort` MUST pass every exit of the port it wraps through
             unchanged — a recording observes a failure without absorbing it —
             and MUST report each settled exit to `observe`.

REQUIREMENT: `replyTable` MUST match a request by the text of the description's
             `key`, so two requests the capture/replay key treats as one share a
             reply. A request whose key is refused MUST fail with the port's own
             typed error and MUST NOT be answered from the table; an entry whose
             key is refused MUST be left out of it (BEH-QD-410).
```

```typescript
import {
  PortReply,
  attributeResolverPort,
  makeSubjectId,
  replyTable,
  scriptedPort,
} from "@qadi/core";

// One subject's store is down; every other request answers the default.
const flaky = scriptedPort(attributeResolverPort, (subjectId) =>
  subjectId === "bob" ? PortReply.fail("store down") : undefined,
);

// A table keyed exactly as a capture keys it: alice's clearance is 5,
// anything else is the fail-closed default.
const table = scriptedPort(
  attributeResolverPort,
  replyTable(attributeResolverPort, [[[makeSubjectId("alice"), "clearance"], PortReply.answer(5)]]),
);

// `flaky.calls` and `table.calls` list every request, in order.
export { flaky, table };
```

## BEH-QD-409: A request key agrees with Equal over its domain

> **Invariant:** [INV-QD-280](../invariants.md#inv-qd-280-a-request-key-is-equals-text)

```ts
export interface PortDescription<N, Self, Shape, Args, A, E> {
  readonly key: (args: Args) => Result.Result<string, KeyRefusal>;
  // …
}
```

```
REQUIREMENT: For every port, two requests MUST share a key exactly when every
             argument is `Equal.equals` (an absent field and an `undefined` one
             alike), over the key's domain: `undefined`, `null`, booleans,
             numbers (`-0` as `0`, `NaN` as itself), strings, bigints, `Date`,
             `RegExp`, arrays, plain and null-prototype objects, `Set` and `Map`.
             A subclass of `Date`, `RegExp`, `Array`, `Set` or `Map` MUST key as
             its base class, as `Equal.equals` compares it. For a port whose
             description is derived (`AttributeResolver`, `RelationshipResolver`,
             `DecisionHistory`, `SignatureHistory`), "every argument" is the
             members of its wire question (BEH-QD-440); `CustomPredicate` states
             its own key over every argument.

REQUIREMENT: A key MUST be deterministic text: the same request keys to the same
             string in every process, whatever the order its objects', `Set`s'
             and `Map`s' members were inserted in, and a value nested 100,000
             deep MUST key without a stack overflow.
```

Every port description keys through one package-private encoding
(`PortKey.ts`), so a request has one identity across `Question`, `DecisionCache`,
devtools capture and replay, and `replyTable`. The JSON text this replaced keyed a
`Date` like its ISO string, `NaN` like `null`, `{ a: undefined }` like `{}` and a
`Set` like an array (ARCH-65). One limit is stated rather than hidden: an object
marked `Equal.byReference` keys by its structure, because a replay cannot preserve
identity ([ADR-QD-094](../decisions/094-a-port-is-described-once.md)).

## BEH-QD-410: A request the key refuses fails closed

> **Invariant:** [INV-QD-280](../invariants.md#inv-qd-280-a-request-key-is-equals-text)

```ts
export type UnkeyableKind = "function" | "symbol" | "symbol-key" | "instance";
export type KeyRefusal =
  | { readonly _tag: "Circular"; readonly path: WirePath }
  | { readonly _tag: "Unkeyable"; readonly path: WirePath; readonly kind: UnkeyableKind; readonly brand: string }
  | { readonly _tag: "Unreadable"; readonly path: WirePath; readonly message: string };
export const describeKeyRefusal: (self: KeyRefusal) => string;
```

```
REQUIREMENT: A request holding a value outside the key's domain — a cycle, a
             function, a symbol or symbol key, a getter or proxy trap that throws,
             a value implementing `Equal` itself, or any other class instance —
             MUST get a typed `KeyRefusal` naming where it sits, never a throw and
             never a key it shares with another request.

REQUIREMENT: Every consumer of a key MUST fail closed on a refusal: `replyTable`
             and the signature fixture (`signatureHistoryFromSignatures`) MUST
             fail the request with the port's own typed error, whose cause is
             `describeKeyRefusal`'s sentence; devtools' capture MUST pass the
             request to the live port unrecorded, and a replay MUST fail it with
             the port's own typed error (BEH-QD-221).
```

A refusal is a fact about the request, not an outage of the port, but answering
it from a table or a capture would hand one request another's answer, and a
`none` would grant under `not(...)` ([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)).
From typed input the signature fixture never sees a refusal, since its key is two
strings and a requirement; its branch is kept for an untyped caller.

## BEH-QD-440: A derived port states no key and no defect

> **Invariant:** [INV-QD-286](../invariants.md#inv-qd-286-a-derived-ports-key-names-exactly-its-wire-questions-members)

```ts
// PortDerivation.ts, package-private: the spec has no `key` or `defect` member.
export const makePortDescription: <N, Self, Shape, Args, A, E, Span, Q, QE, W, WE>(
  spec: Omit<PortDescription<N, Self, Shape, Args, A, E, Span>, "wire" | "key" | "defect"> & {
    readonly wire: DerivedWireSpec<Args, A, Q, QE, W, WE>;
  },
) => PortDescription<N, Self, Shape, Args, A, E, Span>;
```

```
REQUIREMENT: For `AttributeResolver`, `RelationshipResolver`, `DecisionHistory`
             and `SignatureHistory`, `key(args)` MUST succeed with `canonicalKey`
             of the wire question `wire.toQuestion(args)` builds, its `undefined`
             members dropped, and MUST equal `canonicalKey` of the question
             `wire.encodeQuestion(args)` encodes, for every request the wire
             encodes.

REQUIREMENT: `defect(args, cause)` MUST be `failure(args, Cause.squash(cause))`
             for those four ports, so a defect and a failure of the same
             squashed cause carry the same tag and fields.

REQUIREMENT: `CustomPredicate` MUST state its own `key` and `defect`: its key
             covers the whole subject (roles, permissions, attributes), the
             resource and its `params`, which its wire question does not carry,
             and its defect renders the cause with `Cause.pretty`.
```

Before ARCH-69 each of the four listed its request fields as a tuple for `key` and
restated `failure(args, Cause.squash(cause))` for `defect`; a tuple that forgot a field
compiled, and only `PortConformance.test.ts`'s rows saw it. Evaluation never reads a
port key, so a dropped field was a wrong devtools replay or a wrong `replyTable`
answer, not a production grant ([ADR-QD-133](../decisions/133-a-port-request-is-derived-from-its-wire-question.md)).
The law is checked once, as a property at `PortDescription`'s interface
(`PortDescription.test.ts`); the per-port rows in `PortConformance.test.ts` keep only
that every argument reaches the key (BEH-QD-409).

---

## BEH-QD-441: A port's question and span question name every member

> **Invariant:** [INV-QD-286](../invariants.md#inv-qd-286-a-derived-ports-key-names-exactly-its-wire-questions-members)

```ts
// PortWireEncode.ts, package-private: an optional member is a required key typed `| undefined`.
export type QuestionOf<Q> = { readonly [K in keyof Q]-?: /* Q[K], or Q[K] | undefined when optional */ unknown };
// PortSpanEncode.ts, package-private: every question member but `interpreter`.
export type PoseOf<S> = { readonly [K in Exclude<keyof S, "interpreter">]: /* the member's SpanValue | undefined */ unknown };
```

```
REQUIREMENT: A port's `toQuestion` MUST state every member of its wire question
             (an absent optional member as `undefined`), and its span's `pose`
             MUST state every member of its span question but `interpreter`.
             Leaving a member out MUST be a compile error where it is written.

REQUIREMENT: `portWire` MUST drop an `undefined` member before encoding, so the
             wire bytes of a question are those of a question that never
             stated it.

REQUIREMENT: `fromQuestion` is not made total by type: a forgotten required member
             is TS2741, and `SignatureQuery`'s two optional members, `meaning`
             and `signerRole`, are covered by the wire round-trip row in
             `PortConformance.test.ts`.
```

The question and the span question are not one struct and are not derived from one:
a span field is a `SpanValue` under a `qadi.*` key and never the value a wire must
carry ([INV-QD-044](../invariants.md#inv-qd-044-a-span-never-carries-a-resolved-attributes-value)),
and deriving the Shape request types from the wire struct would turn
`resourceId: ResourceId | undefined` into an optional key, which is Breaking under
`exactOptionalPropertyTypes` ([ADR-QD-133](../decisions/133-a-port-request-is-derived-from-its-wire-question.md)).
`PortRequest.tst.ts` pins both slots; `PortSpan.test.ts` pins every port's encoded span
attributes for a full and a sparse request.

---

_Previous: [05 — Evaluator](./05-evaluator.md) | Next: [07 — Enforcement](./07-enforcement.md)_
