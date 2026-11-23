# 06 — Services and Layers

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-06                                    |
> | Revision       | 1.18                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.18 (2026-11-23): BEH-QD-716 and BEH-QD-717: the fixture judgements and their one lookup; BEH-QD-410 names the history fixture and the judgements as consumers of the key and notes that the refusal is total (ARCH-123, ADR-QD-189, CCR-QD-468)<br>1.17 (2026-11-22): BEH-QD-681: the one rule covers every value a caller's code threw and every `Cause.pretty` call, and names its exceptions (code review IN-02, ADR-QD-182, CCR-QD-461)<br>1.16 (2026-11-22): BEH-QD-681 and BEH-QD-682: one total rule for a caught value or a cause, and the conversions stated as total; the custom predicate defect through causeMessage (ADR-QD-182, CCR-QD-461)<br>1.15 (2026-11-18): BEH-QD-609 (ARCH-101, CCR-QD-445)<br>1.14 (2026-11-18): BEH-QD-604 added: attributeResolverFromRecord answers undefined for a name its table does not own (ARCH-100, CCR-QD-444)<br>1.13 (2026-11-12): BEH-QD-501..503: one evaluation environment that states its shadowing (ARCH-81, ADR-QD-146, CCR-QD-424)<br>1.12 (2026-11-12): EvaluationServices is declared in EvaluationServices.ts (ARCH-80, CCR-QD-423)<br>1.11 (2026-11-11): the PortDescription listing gains asks and its request and asks type parameters (ARCH-70, ADR-QD-134, CCR-QD-412)<br>1.10 (2026-11-11): BEH-QD-409's key law reads over a derived port's wire question; BEH-QD-440 (a derived port states no key and no defect) and BEH-QD-441 (a port's question and span question name every member) (ARCH-69, CCR-QD-411)<br>1.9 (2026-11-10): BEH-QD-409 (a request key agrees with Equal over its domain) and BEH-QD-410 (a request the key refuses fails closed); BEH-QD-310's replyTable requirement matches by key text and fails a refused request with the port's typed error (ARCH-65, CCR-QD-407)<br>1.8 (2026-10-05): BEH-QD-043's listing gains `CustomPredicateNone` and `SignatureHistoryNone`, which it had omitted since both ports shipped, and states that each port's default is derived from its description's `none`; BEH-QD-308 (every port has the standard wrapper set), BEH-QD-309 (an environment names only what it overrides) and BEH-QD-310 (a port can be scripted) added (ADR-QD-094, CCR-QD-177)<br>1.7 (2026-10-05): BEH-QD-045's reason table is built from the matcher's `Verdict` — an `Eq` or `Dominates` against an unresolved reference reads "has no reference value to compare against" (only `Neq` did), and a value the matcher cannot compare reads "is not a value this matcher can compare" (ADR-QD-091, CCR-QD-173)<br>1.6 (2026-09-19): BEH-QD-044 gained a normative "Trust model" paragraph — `CurrentSubject`'s provenance and what the evaluator does and does not re-verify had no single stated answer anywhere in `spec/` (WD-05)<br>1.5 (2026-09-07): BEH-QD-045's denial reads corrected — "no relationship resolver is wired" claimed a fact only true of `RelationshipResolverNever`, when a wired resolver may answer `"Unknown"` too; the sentence no longer names wiring as the cause (issue 45, CCR-QD-114)<br>1.4 (2026-09-06): BEH-QD-042's table brought current — `CustomPredicate`, `SignatureHistory` and `DecisionSink` had been wired since ADR-QD-055/CCR-QD-087/ADR-QD-044 without ever reaching this table; "the six services, five required" corrected to nine and seven, matching `EvaluationServices` in `Evaluate.ts`. The website's `services-resolvers.md` had already said nine/seven and linked here for "the full service list", landing readers on a table that contradicted the page that sent them (CCR-QD-103)<br>1.3 (2026-08-23): `RelationshipResolver` is three-valued, for the sentence rather than the verdict; BEH-QD-045 added (ADR-QD-040, INV-QD-029, CCR-QD-055)<br>1.2 (2026-07-26): The sixth service, `DecisionCache`; the optionality that hid it recorded (CCR-QD-034)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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

`EvaluationServices` (`EvaluationServices.ts`) is the union of the seven required
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

## BEH-QD-604: `attributeResolverFromRecord` answers undefined for a name its table does not own

> **Invariant:** [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed), [INV-QD-352](../invariants.md#inv-qd-352-an-inherited-member-reads-as-absent)
> **See:** [ADR-QD-166](../decisions/166-one-module-owns-the-value-a-leaf-compares.md)

`attributeResolverFromRecord` is the fixture builder the docs call "useful for tests and fixed configuration", and it
feeds `PORT_FIXTURES`. It reads its table through `Operand.ts`, so a name the table does not own is absent, an
inherited member included. Before ARCH-100 `hasAttribute("constructor", neq(literal("x")))` allowed under
`attributeResolverFromRecord({ dept: "eng" })` and denied under `AttributeResolverNone`.

```
REQUIREMENT: `attributeResolverFromRecord`'s `resolve` MUST answer `undefined` for a name
             the table does not own, `constructor`, `toString` and `__proto__` included.
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

## BEH-QD-609: A denial's sentence is chosen by its row's denial kind

> **Invariant:** [INV-QD-029](../invariants.md#inv-qd-029-a-denial-names-only-what-was-consulted)
> **See:** [ADR-QD-167](../decisions/167-each-leafs-answer-becomes-a-verdict-in-one-row.md), [ADR-QD-040](../decisions/040-an-unwired-port-names-its-absence.md)

```
REQUIREMENT: A denial's sentence MUST follow the outcome kind its row returned: `Unrelated` and
             `Unknown`, no signature on file and none matching, and the performed and
             not-performed acted answers MUST each keep their own sentence. An `Unknown`'s
             sentence MUST NOT claim that no resolver or port is wired.
```

The walk holds a table of sentences per outcome kind, read by the outcome, so a sentence cannot be attached to the wrong
answer; every sentence is byte-identical to the one before ARCH-101. This is BEH-QD-045's rule (a denial names only what
was consulted) applied to the row's kinds. Pinned by `LeafVerdict.test.ts`, which asserts the exact reason for each.

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
export interface PortDescription<N, Self, Shape, Args, A, E, P = Args, Span = …, Asks = LeafRequests<P>> {
  readonly key: (args: Args) => Result.Result<string, KeyRefusal>;
  // The request each policy leaf puts to this port, as far as a read site supplies it (BEH-QD-446).
  readonly asks: Asks;
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

REQUIREMENT: Every consumer of a key MUST fail closed on a refusal: `replyTable`,
             the signature fixture (`signatureHistoryFromSignatures`), the
             history fixture (`decisionHistoryFromEvents`) and the two fixture
             judgements (`signatureAnswerFromSignatures`,
             `actedAnswerFromEvents`) MUST fail the request with the port's own
             typed error, whose cause is `describeKeyRefusal`'s sentence;
             devtools' capture MUST pass the request to the live port
             unrecorded, and a replay MUST fail it with the port's own typed
             error (BEH-QD-221).
```

A refusal is a fact about the request, not an outage of the port, but answering
it from a table or a capture would hand one request another's answer, and a
`none` would grant under `not(...)` ([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)).
From typed input the signature fixture never sees a refusal, since its key is two
strings and a requirement; its branch is kept for an untyped caller.

> **Note (2026-11-23, ADR-QD-189):** the refusal is total. Every value a request
> member or a fixture row field holds that reaches one of these consumers fails
> typed, never a throw and never an answer. The port's error leaves absent the
> member a refused request could not fill (`SignatureHistoryUnavailable.subjectId`,
> `DecisionHistoryUnavailable.event`), because its schema refuses the value and the
> cause already names it. The history fixture keys its rows and its requests
> through the port's key, where it had matched them structurally, so a refused one
> fails rather than answering `"NotActed"`, which `hasNotActed` reads as an allow.
> A record whose own property read throws is outside the domain, as for every
> reader of a plain record. Pinned by `packages/core/test/SignatureHistory.test.ts`
> ("fails as SignatureHistoryUnavailable with no subject id and the refusal as its cause, never dying"),
> `packages/core/test/DecisionHistory.test.ts` ("a subject whose id is a symbol fails as DecisionHistoryUnavailable, never answering NotActed",
> "an event that is a symbol fails with no event and the refusal as its cause, never answering NotActed",
> "a fixture row whose subject id is a symbol fails every read, never answering NotActed",
> "a fixture row whose event cannot be read fails every read, never throwing")
> and `packages/core/test/SinkCodec.test.ts` ("a SignatureHistoryUnavailable with no subject id round-trips without one",
> "a DecisionHistoryUnavailable with no event round-trips without one").

## BEH-QD-716: A fixture judgement answers what the port read answers

> **Invariant:** [INV-QD-398](../invariants.md#inv-qd-398-core-states-once-which-signature-or-event-on-file-meets-a-leaf-at-a-site)
> **See:** [ADR-QD-189](../decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md)

```ts
export const signatureAnswerFromSignatures: (
  signatures: ReadonlyArray<SignatureInput>,
  leaf: LeafOf["HasSignature"],
  site: ReadSite,
) => Result.Result<SignatureAnswer, MissingResourceId | SignatureHistoryUnavailable>;

export const actedAnswerFromEvents: (
  events: ReadonlyArray<ActedEventInput>,
  leaf: LeafOf["HasActed"],
  site: ReadSite,
) => Result.Result<"Acted" | "NotActed", MissingResourceId | DecisionHistoryUnavailable>;
```

```
REQUIREMENT: `signatureAnswerFromSignatures(signatures, leaf, site)` MUST answer
             what `askSignature` answers over
             `signatureHistoryFromSignatures(signatures)` for that leaf at that
             site, with no Effect: `{ matched, onFile }` by the rule `askSignature`
             uses. A resource-scoped leaf at a site with no usable resource id MUST
             fail with `MissingResourceId` before any row is read. A row or a
             request the key refuses MUST fail with `SignatureHistoryUnavailable`
             carrying `describeKeyRefusal`'s sentence, with no subject id when the
             query's own was refused, and MUST NOT answer `matched: false`.

REQUIREMENT: `actedAnswerFromEvents(events, leaf, site)` MUST answer what
             `askActed` answers over `decisionHistoryFromEvents(events)` for that
             leaf at that site, with no Effect: `"Acted"` or `"NotActed"`, never
             `"Unknown"`, because the fixture is a closed world. It MUST ask the
             description's own request, so an `Any`-scoped leaf asks about no
             resource even where the site has one, and a resource-scoped leaf at a
             site with no usable resource id MUST fail with `MissingResourceId`
             before any event is read. A row or a request the key refuses MUST fail
             with `DecisionHistoryUnavailable` carrying `describeKeyRefusal`'s
             sentence, and MUST NOT answer `"NotActed"`.
```

`matched: false` would deny `hasSignature` and grant `not(hasSignature(...))`, and
`"NotActed"` would grant `hasNotActed`, so a refusal is a typed failure
([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)). Only an untyped
caller reaches one, since a typed row or request always has a key, and every
refusal fails typed for any value the rows or the site hold, never a throw,
because each error's member a refused request could not fill is absent
([BEH-QD-410](#beh-qd-410-a-request-the-key-refuses-fails-closed)).

Pinned by `packages/core/test/SignatureHistory.test.ts`
("answers as askSignature over the fixture layer does, on every case of the product",
"a refused fixture row fails as the read does, with the refusal and never matched: false",
"at a Resource site with no id, the missing id is answered before any row is read",
"a refused query key fails as the read does, with no subject id and never matched: false",
"fails as SignatureHistoryUnavailable with no subject id and the refusal as its cause, never dying"),
`packages/core/test/DecisionHistory.test.ts`
("answers as askActed over the fixture layer does, on every case of the product",
"a refused subject or event row fails as the read does, with the refusal and never NotActed",
"a refused event fails as the read does, with no event and never NotActed",
"a subject whose id is a symbol fails as DecisionHistoryUnavailable, never answering NotActed",
"an event that is a symbol fails with no event and the refusal as its cause, never answering NotActed",
"a fixture row whose subject id is a symbol fails every read, never answering NotActed",
"a fixture row whose event cannot be read fails every read, never throwing")
and the two type tests, `packages/core/test/SignatureHistory.tst.ts`
("signatureAnswerFromSignatures answers a SignatureAnswer or exactly its two failures") and
`packages/core/test/DecisionHistory.tst.ts`
("actedAnswerFromEvents answers Acted or NotActed, or fails as the history read fails").
The compiler holds the result types through the type tests; the tests hold the
agreement and the refusals.

## BEH-QD-717: A fixture layer and its judgement read one lookup

> **Invariant:** [INV-QD-398](../invariants.md#inv-qd-398-core-states-once-which-signature-or-event-on-file-meets-a-leaf-at-a-site)
> **See:** [ADR-QD-189](../decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md)

```
REQUIREMENT: Each fixture's layer and its judgement MUST read one module-private
             lookup, keyed by its port's `key`, and `askSignature` and
             `signatureAnswerFromSignatures` MUST build `{ matched, onFile }` with
             one rule, `signatureAnswerOf` in `SignatureMatch.ts`, which stays out
             of the barrel.
```

A change to scoping or matching reaches both sides. The conformance rows compare
the judgement with the read on every case of a closed product, so a copy that
drifts fails them. That the pieces are read and not restated is kept by review,
since no script counts the reads. Pinned by `packages/core/test/SignatureHistory.test.ts`
("answers as askSignature over the fixture layer does, on every case of the product") and
`packages/core/test/DecisionHistory.test.ts`
("answers as askActed over the fixture layer does, on every case of the product").

## BEH-QD-440: A derived port states no key and no defect

> **Invariant:** [INV-QD-286](../invariants.md#inv-qd-286-a-derived-ports-key-names-exactly-its-wire-questions-members)

```ts
// PortDerivation.ts, package-private: the spec has no `key` or `defect` member.
export const makePortDescription: <N, Self, Shape, Args, A, E, P, Span, Asks, Q, QE, W, WE>(
  spec: Omit<PortDescription<N, Self, Shape, Args, A, E, P, Span, Asks>, "wire" | "key" | "defect"> & {
    readonly wire: DerivedWireSpec<Args, A, Q, QE, W, WE>;
  },
) => PortDescription<N, Self, Shape, Args, A, E, P, Span, Asks>;
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
             and its defect renders the cause with `causeMessage` (its `Cause.pretty` text
             whenever that renders).
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

## BEH-QD-501: An evaluation environment is built in one place and states its shadowing

> **Invariant:** [INV-QD-312](../invariants.md#inv-qd-312-every-evaluation-environment-states-its-shadowing-and-the-choice-is-one-of-two)

```ts
export type EvaluationShadowing = "none" | "sinkAndCache";
export type EvaluationClock = "live" | "deterministic";
export interface EvaluationEnvironmentOptions {
  readonly ports: Layer.Layer<PortServices>;
  readonly idPrefix: string;
  readonly clock: Layer.Layer<never>;
  readonly shadow: EvaluationShadowing;
}
export const evaluationEnvironment: (
  options: EvaluationEnvironmentOptions,
) => Layer.Layer<StandingEvaluationServices>;
```

```
REQUIREMENT: Every option of `evaluationEnvironment` MUST be required. A call
             that leaves out `shadow`, or passes anything but "none" or
             "sinkAndCache", MUST be a compile error.

REQUIREMENT: `ports` MUST arrive built, as a `Layer<PortServices>`, so that no
             package's fixture vocabulary crosses into `@qadi/core`.

REQUIREMENT: The clock MUST arrive as a layer, and `@qadi/core` MUST import no
             Effect testing module. `EvaluationClock` is the type-only word each
             package maps to a layer in one place.
```

The review layer and a simulation are the same environment, a ports layer, a
sequential id layer and a clock, and they used to assemble it twice, one sealing
and one not, with nothing saying the difference was chosen. `shadow` has no
default, because either default would make one of the two choices silent
([ADR-QD-146](../decisions/146-one-evaluation-environment-states-its-shadowing.md)).

```typescript
import { evaluationEnvironment, portsLayer } from "@qadi/core";
import * as Layer from "effect/Layer";

// Every port at its fail-closed default, ids `run-1`, `run-2`, …, the runtime's
// own clock, and no shadowing: an outer sink and cache stay in effect.
export const environment = evaluationEnvironment({
  ports: portsLayer(),
  idPrefix: "run",
  clock: Layer.empty,
  shadow: "none",
});
```

## BEH-QD-502: An unshadowed environment leaves an outer sink and cache in effect

> **Invariant:** [INV-QD-311](../invariants.md#inv-qd-311-the-review-layer-never-shadows-the-decision-sink-or-the-decision-cache)

```
REQUIREMENT: Under `shadow: "none"` an outer `DecisionSink` MUST receive every
             record an evaluation makes, and an outer `DecisionCache` MUST be
             the one that is filled and read.
```

`qadiReviewLayer` and core's own test helpers are built this way. A test that
asserts on the records an evaluation made, or on what a cache holds, would pass
vacuously under an environment that swallowed them.

## BEH-QD-503: A shadowed environment records nothing outward and caches privately, per build

> **Invariant:** [INV-QD-042](../invariants.md#inv-qd-042-a-simulation-reaches-no-port-it-was-not-given-and-records-nothing)

```
REQUIREMENT: Under `shadow: "sinkAndCache"` no outer `DecisionSink` MUST receive
             a record and no outer `DecisionCache` MUST be read or written.

REQUIREMENT: The sink the environment installs MUST discard what it is handed.

REQUIREMENT: Each build of the environment MUST get a cache of its own, so two
             builds do not share an entry.
```

The shadowing is a sink that discards and a cache that is private, not an absence:
`Effect.provide` adds to a context and cannot remove from one, so there is no way
to guarantee a simulation writes nothing except to put something in the way.

```typescript
import { evaluationEnvironment, portsLayer } from "@qadi/core";
import * as Layer from "effect/Layer";

// The simulator's choice: imagined decisions reach neither the application's
// sink nor its cache.
export const sealed = evaluationEnvironment({
  ports: portsLayer(),
  idPrefix: "sim",
  clock: Layer.empty,
  shadow: "sinkAndCache",
});
```

## BEH-QD-681: One total rule turns a caught value or a cause into text

> **Invariant:** [INV-QD-383](../invariants.md#inv-qd-383-a-function-stated-as-total-stays-total-whatever-value-it-caught) ·
> [INV-QD-384](../invariants.md#inv-qd-384-no-shipped-code-renders-a-cause-to-text-through-a-call-that-can-throw)

```ts
export const thrownMessage: (thrown: unknown) => string;
export const causeMessage: (cause: Cause.Cause<unknown>) => string;
```

```
REQUIREMENT: `thrownMessage` MUST return a string for every value and MUST NOT
             throw. It MUST read an `Error`'s `message` when that is a string,
             otherwise the value's `String` form, otherwise the fixed words
             `a value that could not be described`. A string MUST come back
             unchanged.

REQUIREMENT: `causeMessage` MUST return `Cause.pretty` of the cause when that does
             not throw, otherwise `thrownMessage` of the squashed cause, and MUST
             NOT throw.

REQUIREMENT: Every place in Qadi that turns a value a caller's code threw into text
             MUST read it through `thrownMessage`, and every place that renders a
             cause with `Cause.pretty` MUST read it through `causeMessage`. The
             reads ADR-QD-182 names as safe for their own reason (a `JSON.parse`
             catch, a thrown value's name alone, `String` of an Effect `Cause`)
             are the only exceptions.
```

```typescript
import { causeMessage, thrownMessage } from "@qadi/core";
import * as Cause from "effect/Cause";

// The message alone, without the error's name.
export const plain = thrownMessage(new Error("boom")); // "boom"

// An object whose `toString` throws has no text to read.
export const unreadable = thrownMessage({
  toString: () => {
    throw new Error("no text");
  },
}); // "a value that could not be described"

// `Cause.pretty` throws for this one, so the text is the value's own: here, the placeholder.
export const hostile = causeMessage(
  Cause.die({
    get message(): string {
      throw new Error("message threw");
    },
    toString: () => {
      throw new Error("toString threw");
    },
  }),
); // "a value that could not be described"
```

A caller's own code decides what it throws, so a rule that reads it cannot assume it
reads. Six places in core, and three above it, each turned a caught value into text
with a copy of the rule, and only one copy was total: the others went through
`Result.try`, which rethrows when its `catch` arm throws. One module now holds the
rule, public because the packages above core need it, and the sibling of `valueText`
([ADR-QD-182](../decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md),
[ADR-QD-154](../decisions/154-one-value-to-text-function-exported-by-core.md)).

## BEH-QD-682: A conversion stated as total refuses a hostile thrown value and never throws

> **Invariant:** [INV-QD-383](../invariants.md#inv-qd-383-a-function-stated-as-total-stays-total-whatever-value-it-caught)

```
REQUIREMENT: A port's request key MUST refuse with `Unreadable` and the caught
             value's text, and the JSON walk under a wire answer and under a sink
             record MUST refuse with `EncodeFailed` and that text, when a getter or
             a proxy trap throws any value. None of them MUST throw.
```

`Result.try` rethrows when its `catch` arm throws, so a getter that threw a value whose
`toString` threw escaped the key, the wire encodes and `toJson`, each documented as a
refusal. [BEH-QD-410](#beh-qd-410-a-request-the-key-refuses-fails-closed)'s refusal
now holds for every thrown value, and the refusal's text is `thrownMessage`'s.

---

_Previous: [05 — Evaluator](./05-evaluator.md) | Next: [07 — Enforcement](./07-enforcement.md)_
