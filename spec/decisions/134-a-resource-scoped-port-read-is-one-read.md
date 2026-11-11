# ADR-QD-134 — A resource-scoped port read is one read, and a leaf's request is stated once

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-134                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-11                                     |
> | Status         | Accepted — amends ADR-QD-077, ADR-QD-094, ADR-QD-109, ADR-QD-114; reads ADR-QD-051, ADR-QD-073 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-11): D-01 names the one scope test the acted and signature reads share with their asks (ARCH-70, CCR-QD-412)<br>1.0 (2026-11-11): Initial (ARCH-70, CCR-QD-412) |

---

## Context

Two things were stated more than once in `PortAccess.ts` and its neighbours, and each cost something a
reader could see.

**The resource-scoped read was written three times.** The three ports whose question is about one
resource (`DecisionHistory` at Resource scope, `RelationshipResolver`, `SignatureHistory`) each
converted a raw resource id and tested for its absence in their own read: `typeof rawResourceId ===
"string" ? makeResourceId(rawResourceId) : undefined` at `PortAccess.ts:316` (`askActedForResource`),
`:394` (`askRelationship`) and `:453` (`askSignature`, which converted again at `:461`). Two of the
three called `requireResourceId`, an `Effect.fn("qadi.requireScopedResourceId")` (`:264-272`) and so a
**nested span**; the third inlined the check to avoid it (`:401-403`, comment `:389-390`). The trace of
a missing resource id therefore depended on which port was asked: `qadi.acted` and `qadi.hasSignature`
had a child span, `qadi.hasRelationship` had none. A span is product observability
([ADR-QD-051](051-a-span-says-what-was-asked.md)), and nothing in the specification said the shapes
should differ. No in-repo reader of the nested span exists: no test, BDD step or document pinned
`qadi.requireScopedResourceId` (the only mentions were `PortAccess.ts`, a comment in `Walk.ts`,
AGENTS.md §5 and ADR-QD-073's history), and `@qadi/devtools` collects port spans by the description's
name, so it never saw it. `askSignature(subject, meaning, signerRole, scope, rawResourceId)` also took
two adjacent strings (`:440-446`).

**The request each policy leaf puts to a port was stated twice.** Every read built its request by hand
from leaf fields (`Walk.ts:178, 179, 203, 244, 264, 345`; `Predicate.ts:588, 592`), and each port's
serving facet restated, separately, which name each leaf asks (`PortServingFacet.leaves`, typed
`ServedLeaves`: `HasAttribute: (leaf) => leaf.attribute`, `HasActed` and `HasNotActed: (leaf) =>
leaf.event`, and for `SignatureHistory` a pseudo-name, `"own-records"`, because `servingFor` needs a
non-empty list to declare an opt-in port). The facet's own `asked` already maps a request to its name,
so the served name of a leaf *is* `asked` of the request that leaf's read builds, and `leaves`
restated it. Only a property test (`PortRemote.test.ts`, 150 generated policies run through the real
`evaluate`) kept the two in agreement, and `PortRemote.ts` carried a local `NodeOf` that duplicated
`PortServing.ts`'s `LeafOf`.

**One thing was a smaller worry, and is recorded so it is not mistaken for a defect.** The transposition
of two adjacent strings in `askSignature` was latent, not live: at its one production call site swapping
`policy.meaning` and `policy.signerRole` did not compile (`signerRole` is `string | undefined`). It
compiled for a caller passing two plain strings, which the tests did.

## Decision

### The answers the human gave

Both one-way questions were answered by the human on 2026-11-11, before execution, in
`.planning/phases/_DECISIONS-v1.2.md`, with this standing instruction, quoted verbatim: **"the
recommendation should be the cleanest solution, not the simplest one; we can override any ADR if it
causes us problems."**

- **D-02 = `A`.** Quoted: "No nested span: every scoped port read is one span that carries the question
  and the `MissingResourceId` failure; `requireResourceId` is deleted; AGENTS.md §5's sentence is
  rewritten".
- **D-05 = `state once`.** Quoted: "The leaf->request mapping is stated once, in each port description
  (built through Phase 21's `makePortDescription`); the scoped reads and `servingFor` both derive from
  it, so the two can no longer disagree. `ServedLeaves` changes (public, `@qadi/core` minor). The
  `servingFor` property test stays as a guard. ADR-QD-134 records the override".

**D-05 overrides the planner's earlier choice**, which was to leave the `servingFor` property test as
the one owner of the agreement between the reads and the facet and to state the leaf's name in both
places. The override was the human's, taken at their request and under the standing instruction above;
this record is the place it is on file.

### D-01. One scoped read, `readScoped`

`readScoped` in `PortAccess.ts` is a plain function, not an `Effect.fn` and not an
`Effect.fnUntraced`: like `readPort` it runs under the calling read's span and opens none, so it is
not in `UNTRACED_BUDGET`. It is generic over a closed, written-out
`ScopedPort = "DecisionHistory" | "RelationshipResolver" | "SignatureHistory"`, receives the request the
description's `asks` built (the request as far as the site supplies it) and the leaf's name, and owns:
the one missing-id test in the module; on a missing id, the question annotation (the description's
`pose` of that request, `scope: "Resource"` where the span has a `scope` member, and the interpreter)
followed by `MissingResourceId({ relation })`; on a present id, completing the request through a closed
`completeRequest` table keyed by `ScopedPort`, then `readPort`. `PortAccess.ts` no longer contains a
`typeof … === "string"` resource-id test or a `makeResourceId` call: the conversion is `resourceIdOf`
(`Resource.ts`), the writer's rule and now the reader's, called by the scoped ports' `asks`. A resource
that is absent, one with no `id` and one whose `id` is not a string all raise `MissingResourceId`, as
they did.

For `DecisionHistory` and `SignatureHistory`, whose request type leaves `resourceId` optional, a
`Resource`-scoped leaf is kept from reaching the port without an id by one test, not two: `asks` reads the id
through `scopedResourceIdOf` and the read routes on `isResourceScoped`, both in `ScopedLeaf.ts` and the second
the first's own test, so the request and the route cannot disagree on the leaf's `scope`.

### D-02. No nested span

A missing resource id leaves **the port's own span, carrying the question and ending in the failure, and
nothing else**: no other span opens, the port is not called and no call is counted. `requireResourceId`
is deleted. The span names and `UNTRACED_BUDGET` are unchanged. `MissingResourceId.relation` stays (it
is a field on the sink wire, so it is not renamed) and names the event, the relation or the meaning the
leaf asks.

### D-03. Every read takes its leaf

`PortAccess.ts` is package-private, so the interface of its reads changed freely. Each read takes the
policy node it answers, typed through `LeafOf`, plus the resource where the request needs one:
`readAttribute(interpreter, subject, leaf)`, `askActed(interpreter, subject, leaf, resource)`,
`askRelationship(subject, leaf, resource)`, `askCustom(subject, leaf, resource)` and
`askSignature(subject, leaf, resource)`. `askActed` replaces `askActedAny` and `askActedForResource`;
the leaf's `scope` decides which request it builds, as `askSignature` already did. It is overloaded so
that `toPredicate`'s public error type does not gain `MissingResourceId`: the any-scope overload cannot
fail that way. `Predicate.ts`'s `AskAttribute` and `AskActed` plan nodes carry their leaf instead of
copied fields, so a translated read builds its request through the same `asks`. Nothing positional is
left to transpose. Span names are unchanged; `askActed` opens `decisionHistoryPort.span`, as both acted
reads did.

### D-04. Annotate early only when the id is missing

The early annotation used to run on the success path too, and `readPort` annotated the same question
again; [ADR-QD-109](109-a-ports-span-is-projected-once-and-every-read-is-one-body.md) accepted that
duplicate to keep annotate-before-validate. It is retired: on a present id the scoped read annotates
once, through `readPort`, and the early annotation runs only when the id is missing. The final span
attributes are identical, which the local/served equality rows keep pinning.

### D-05. A leaf's request is stated once, on the description

`PortDescription` gains `asks: LeafRequests<P>` and a type parameter `P`:

```ts
export interface ReadSite {
  readonly subject: AuthSubject;
  readonly resource: Resource | undefined;
}
export type LeafOf = { readonly [T in Policy["_tag"]]: Extract<Policy, { readonly _tag: T }> };
export type LeafRequests<P extends ReadonlyArray<unknown>> = {
  readonly [T in Policy["_tag"]]?: (leaf: LeafOf[T], site: ReadSite) => P;
};
```

All three are declared in `PortDescription.ts` (the description's own types) and exported from the
barrel. `P` is the port's request **as far as the site supplies it**: the method's `Args` for four
ports, and for `RelationshipResolver` the request whose `resourceId` may still be absent. A port states
one entry per tag it reads (attribute: `HasAttribute`; relationship: `HasRelationship`, which also owns
the depth clamp, moved from `PortAccess.ts` as a module-private constant; history: `HasActed` and
`HasNotActed`; custom: `HasCustom`; signature: `HasSignature`). The scoped entries read the id with
`resourceIdOf(site.resource)` (history only when the leaf's `scope` is `"Resource"`).

- **What `ServedLeaves` becomes.** It is removed, and so are `PortServingFacet.leaves`, the local
  `NodeOf` and `leafName`. Its successor is `LeafRequests<P>`, which maps a leaf to a *request*, not to
  a *name*, and lives on the description (`asks`), not on the facet. `ReadSite` is new, and `LeafOf` is
  declared once beside them.
- **The facet.** `PortServingFacet` keeps `allowlist`, `asked`, `admitted` and `declare`. `asked` takes
  `Args | P` (admission passes `Args`, `servingFor` passes `P`). `declare` is told what `servingFor`
  heard: `{ names, asked }`, the names and whether any leaf asked the port at all, so the opt-in
  signature port is declared exactly when a leaf asks it and its `"own-records"` pseudo-name is gone. A
  required or open port is still declared whether or not a leaf asked it (an empty list admits
  nothing), as `servingFor` always did.
- **The type parameter.** `P` is covariant in `asks` and contravariant in `asked`, so
  `PortDescription` and `PortServingFacet` take it as an explicit parameter (default `Args`), threaded
  through `DescriptionOf` (with the extractor `AskedOf` beside `ArgsOf`, in `Ports.ts`),
  `makePortDescription` and every generic derivation and double. An exact `Asks` parameter (default
  `LeafRequests<P>`) lets a read call `d.asks[tag]` without a cast or a non-null assertion. No method
  bivariance trick, no `as`.
- **`servingFor`.** For each node and each port whose `asks` has the node's tag, it records that the port
  was asked and adds `d.serving.asked(ask(node, SERVING_SITE))`, where `ask` is `d.asks[tag]`, when that is defined.
  `SERVING_SITE` is `{ subject: anonymous, resource: undefined }`: `anonymous` is the library's existing
  meaning of "no particular subject", and a Resource-scoped leaf at a site with no resource yields
  exactly the request a read with a missing id annotates, so `servingFor` exercises no request shape
  evaluation does not.
- **Why one site suffices.** A name that depended on the site would make `servingFor` wrong. A law test
  asserts, per port and tag, that `asked(ask(leaf, s1)) === asked(ask(leaf, s2))`, where `ask` is `asks[tag]`, for
  generated leaves and sites, and that `servingFor([leaf])` admits it. The existing property test (the
  real `evaluate` over 150 generated policies with a resource present, recording every port call) stays
  as the guard the human asked for.
- **Serving work stays off the evaluation path.** `PortAccess.ts`, `Walk.ts` and `Predicate.ts` call
  `d.asks.<Tag>(leaf, site)`, request building they already did inline, and never `d.serving`. Only
  `servingFor` (start-up) and `answerRemotely` (admission) read the facet.

## Alternatives considered

- **The other shapes of the D-02 question.** The question was what trace a missing resource id should
  leave, and `A` (the port's span alone) was chosen. The two it was chosen over were the shapes the
  tree already had: the nested helper span on every scoped port (the relationship read would gain one),
  and the three traces left as they were, one per copy. The first keeps a named `Effect.fn` for a span
  nothing reads and makes every missing-id trace two spans deep; the second keeps the defect, a trace
  shape that depends on which port was asked, which nothing in the specification said should differ.
- **D-05, leave the property test as the owner (the planner's earlier choice).** Overridden by the
  human, above. It left two statements of one fact, kept honest by a test that has to be extended for
  each new leaf.
- **D-05, split a site-free "leaf part" from a site completion, so `servingFor` needs no site.**
  Rejected, and its cost is why. The attribute and custom requests are positional tuples
  (`[subjectId, attribute]`, `[name, subject, resource, params]`), so admission would need a per-port
  projection from the request back to the leaf part, and a round-trip law between the two: four
  functions per port and a new law, more statements rather than fewer. Deriving at one site, with the
  site-independence law, states each fact once.
- **Phase 21 takes `asks`.** Not done: the member is meaningless until the reads use it, which is this
  decision's work. `makePortDescription`'s spec type is an `Omit` of `PortDescription`, so the member
  reaches the four derived ports with no change to the builder beyond its generics.

## Consequences

- **One span per scoped read.** A missing resource id leaves exactly the port's span, on every scoped
  port ([BEH-QD-445](../behaviors/30-port-calls.md#beh-qd-445-a-missing-resource-id-fails-the-same-way-on-every-scoped-port)).
  A deployment that queried for `qadi.requireScopedResourceId` as a child of `qadi.acted` or
  `qadi.hasSignature` stops finding it; nothing in this repository did.
- **A named `Effect.fn` is gone**, the helper two reads called, and `readScoped` is a plain function, so
  `UNTRACED_BUDGET` and `SWITCH_BUDGET` are unchanged.
- **A hand-built `PortDescription` states `asks`** and takes the type parameter. **Breaking** for
  `@qadi/core`, because `PortDescription` shipped in 0.10.0; the registry is closed, so this is rare,
  and the release is a pre-1.0 minor. `PortServingFacet` and `ServedLeaves` were added after 0.11.0 and
  never released, so removing `leaves` and `ServedLeaves` is not a published break. `LeafOf`, `ReadSite`
  and `LeafRequests` are new public types (`spec/overview.md`, gate 13, `node scripts/check-api-surface.mjs`).
- **A new port-reading policy leaf is one `asks` entry** on the port that answers it. The reads and
  `servingFor` both derive from it, so they cannot disagree on which leaf asks which name
  ([BEH-QD-446](../behaviors/34-remote-ports.md#beh-qd-446-the-request-a-policy-leaf-asks-a-port-is-stated-once-and-servingfor-serves-exactly-the-names-those-requests-ask),
  [INV-QD-289](../invariants.md#inv-qd-289-the-name-servingfor-serves-for-a-leaf-is-asked-of-the-request-that-leafs-read-builds-at-any-site)).
- **The latent transposition is closed by type**: no read takes two adjacent strings, and the compile-time
  pins (`PortAccess.tst.ts`, `PortAsks.tst.ts`) fail if one does again.
- `@qadi/http` and `@qadi/devtools` have no change: `PortRoutes.ts` reads the `PortServing` declaration
  and `answerRemotely`, and devtools never referenced the facet's leaf map.

## Related

[ADR-QD-051](051-a-span-says-what-was-asked.md), [ADR-QD-073](073-the-fnuntraced-exception-is-measured.md),
[ADR-QD-077](077-both-interpreters-read-ports-through-one-module.md),
[ADR-QD-094](094-a-port-is-described-once.md),
[ADR-QD-109](109-a-ports-span-is-projected-once-and-every-read-is-one-body.md),
[ADR-QD-114](114-a-port-states-what-it-serves.md);
[BEH-QD-227](../behaviors/30-port-calls.md#beh-qd-227-a-port-span-says-what-it-asked),
[BEH-QD-331](../behaviors/34-remote-ports.md#beh-qd-331-a-served-question-outside-the-hosts-serving-declaration-must-be-refused),
[BEH-QD-445](../behaviors/30-port-calls.md#beh-qd-445-a-missing-resource-id-fails-the-same-way-on-every-scoped-port),
[BEH-QD-446](../behaviors/34-remote-ports.md#beh-qd-446-the-request-a-policy-leaf-asks-a-port-is-stated-once-and-servingfor-serves-exactly-the-names-those-requests-ask);
[INV-QD-288](../invariants.md#inv-qd-288-a-scoped-port-read-never-reaches-its-port-without-a-resource-id),
[INV-QD-289](../invariants.md#inv-qd-289-the-name-servingfor-serves-for-a-leaf-is-asked-of-the-request-that-leafs-read-builds-at-any-site).
