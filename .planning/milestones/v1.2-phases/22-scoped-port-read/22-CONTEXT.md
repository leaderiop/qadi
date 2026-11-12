# Phase 22: One resource-scoped port read - Context

**Gathered:** 2026-11-11 · **Revised:** 2026-11-11 (the human's answers in `_DECISIONS-v1.2.md`: D-02 = `A`; D-05 overridden to
`state once`)
**Status:** Ready for execution (no open human decision)
**Ticket:** ARCH-70 · 2026-11-11 review candidate 3 (SCOPE-01..05, WX-01..06)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE7-CONTEXT.md`, then
`.planning/phases/_DECISIONS-v1.2.md`, then `.planning/phases/21-port-request-derivation/21-CONTEXT.md` (this phase builds on the
tree Phase 21 leaves)

**Standing instruction (the human, 2026-11-11):** "the recommendation should be the cleanest solution, not the simplest one; we can
override any ADR if it causes us problems."

<domain>
## Phase Boundary

Two things become single statements.

1. **The request a policy leaf puts to a port** is stated once, on that port's description: a new `PortDescription.asks`, one
   function per policy tag the port reads, `(leaf, site) => request`. Every port read in `PortAccess.ts` builds its request through
   it, in both interpreters, and `servingFor` derives each served name from it (the request's `serving.asked`). The facet's own
   leaf→name map (`PortServingFacet.leaves`, typed `ServedLeaves`) is deleted, so the reads and the serving declaration can no
   longer disagree (SCOPE-04, D-05).
2. **The resource-scoped read** is one function, `readScoped`, owning the missing-id check, the early question annotation,
   `MissingResourceId` and `readPort` for every Resource-scoped question. A missing id leaves one trace shape on all three scoped
   ports: the port's own span, no nested span (D-02 = `A`, SCOPE-01, SCOPE-02).

Every read takes its policy leaf, so nothing positional is left to transpose (SCOPE-03). The span change is public behaviour
(ADR-QD-051), recorded in BEH-QD-227/445 (SCOPE-05).

Out of scope: `readPort`'s body, `servePortRead`, `answerRemotely`'s order of checks, the `PortServing` declaration type, the Shape
request types (`ActedQuery`, `RelationshipCheck`, `SignatureQuery`), the wire, `UNTRACED_BUDGET` and `SWITCH_BUDGET` (unchanged).

**Starting tree.** Phase 21 changes the port modules (descriptions built by `makePortDescription`, spans by `portSpan`,
`toQuestion` total) but not `PortAccess.ts`, `Walk.ts`, `Predicate.ts` or `PortRemote.ts`; the line numbers below hold on Phase 21's
end state apart from the five port modules, whose line numbers move (find the facet by its `PortServingFacet<` annotation). Phase 21's
`makePortDescription` takes `Omit<PortDescription<…>, "wire" | "key" | "defect">` plus a wire spec (21-03, amended so that this
stays an `Omit`), so the `asks` member this phase adds to `PortDescription` flows into the four derived ports' specs with no change
to the builder's spec type; only its generics gain this phase's type parameter. Phase 21's `PoseOf` keeps the relationship pose's
widened parameter (`resourceId: ResourceId | undefined`), which D-01 and D-05 rely on.
</domain>

<evidence>
## Evidence (re-verified on `965ff14c`, 2026-11-11, by reading and grepping the tree)

**The review's claims hold.**

- The raw-id conversion is written three times: `PortAccess.ts:316` (`askActedForResource`), `:394` (`askRelationship`), `:453`
  (`askSignature`), each `typeof rawResourceId === "string" ? makeResourceId(rawResourceId) : undefined`; `askSignature` converts
  again at `:461` (`makeResourceId(yield* requireResourceId(...))`).
- `requireResourceId` (`:264-272`) is `Effect.fn("qadi.requireScopedResourceId")` and so opens a nested span. `askActedForResource`
  (`:326`) and `askSignature` (`:461`) use it; `askRelationship` inlines the check (`:401-403`) to avoid that span (comment
  `:389-390`). The trace of a missing id therefore depends on the port.
- `askSignature(subject, meaning, signerRole, scope, rawResourceId)` (`:440-446`) takes two adjacent strings.
- The leaf→request mapping is stated by the reads' callers and by each port's `serving.leaves`, and only a property test keeps them
  in agreement (doc `PortRemote.ts:191-195`, test `packages/core/test/PortRemote.test.ts:563-603`).

**What "stated twice" is, exactly (verified for D-05).**

- Requests are built by hand from leaf fields at every port read, in both interpreters: `Walk.ts:178` (`policy.event`), `:179`
  (`askActedAny`, `policy.event`), `:203` (`policy.relation`, `policy.depth`), `:244` (`policy.name`, `policy.params`), `:264`
  (`policy.meaning`, `policy.signerRole`, `policy.scope`), `:345` (`policy.attribute`); `Predicate.ts:588` (`p.attribute` of the
  `AskAttribute` plan node, built from the `HasAttribute` leaf at `:416`) and `:592` (`p.event` of `AskActed`, built at `:382`).
  Plan nodes are declared at `Predicate.ts:304-305`.
- The facet states leaf → name separately: `leaves` in `AttributeResolver.ts` (`HasAttribute: (leaf) => leaf.attribute`),
  `RelationshipResolver.ts` (`HasRelationship: (leaf) => leaf.relation`), `DecisionHistory.ts` (`HasActed`/`HasNotActed:
  (leaf) => leaf.event`), `CustomPredicate.ts` (`HasCustom: (leaf) => leaf.name`), `SignatureHistory.ts` (`HasSignature: () =>
  "own-records"`, a pseudo-name: the port asks no name, and `servingFor` needs a non-empty list to declare an opt-in port).
- The facet's `asked: (args) => string | undefined` (request → name) is what `answerRemotely` admits with (`PortRemote.ts:69-81`).
  So the served name of a leaf *is* `asked` of the request that leaf's read builds; `leaves` restates it.
- `servingFor` (`PortRemote.ts:189-202`) folds every node past every port's `leaves` through `leafName` (`:178-182`), typed by a
  local `NodeOf` (`:170`) that duplicates `PortServing.ts`'s `LeafOf` (`:51`).

**Who reads `ServedLeaves` / `serving.leaves` (the blast radius of D-05).**

- `@qadi/core` only: `PortServing.ts:71,93` (declaration), `PortRemote.ts:36,180,195` (`servingFor`), `PortRemote.test.ts:629-635`
  ("names each port-reading leaf under exactly one port"), `PortServing.tst.ts:41-45` (compares the facet type).
- `@qadi/http`: `PortRoutes.ts` reads only the `PortServing` declaration and `answerRemotely` (`answersFor`, `:97-106`). No change.
- `@qadi/devtools`: no reference. No change.
- Spec and docs that name the facet's leaf map: `spec/overview.md:286` (the `PortServingFacet`, `ServedLeaves` row, gate 13),
  ADR-QD-114 (`:52`, `:64`, `:91`), ADR-QD-094 (`:303-306`), BEH-QD-331 (`spec/behaviors/34-remote-ports.md:88-91`),
  `spec/traceability.md:270`, `apps/website/src/content/docs/docs/reference/upgrading.md:147-149`, and the `PortDescription`
  listing in `spec/behaviors/06-services.md:388-393` (a ` ```ts ` fence, not compiled).
- Publication: `ServedLeaves`, `PortServingFacet` and `PortDescription.serving` were added after 0.11.0 (ARCH-53;
  `.changeset/port-serving.md` is pending), so no published consumer has them. `PortDescription` itself shipped in 0.10.0
  (`packages/core/CHANGELOG.md:58`), so a new required member is Breaking for a hand-built description (rare: the registry is closed).
  `.changeset/config.json` puts all nine packages in one `fixed` group with `updateInternalDependencies: "patch"`, so `@qadi/http`
  and `@qadi/devtools`, which have no API or behaviour change, need no changeset entry.

**Generic consumers of `PortDescription` (D-05's type parameter must be threaded through each).**
`PortDerivation.ts:142, 171, 197, 234, 272` (plus Phase 21's `makePortDescription`), `PortDoubles.ts:53, 112, 141`, `Ports.ts:101`
(`DescriptionOf`, with the extractors `ArgsOf` … `SpanOf` beside it), `test/PortConformance.test.ts:87, 109`,
`test/PortDescription.test.ts:68` (a concrete probe description, which gains `asks`).

**Where the tree differs from, or adds to, the review.**

- **The transposition is latent, not live.** At the only production call site (`Walk.ts:264`) swapping `policy.meaning` and
  `policy.signerRole` does **not** compile (`signerRole` is `string | undefined`, `Policy.ts:258`; the `meaning` parameter is
  `string`). It compiles for callers passing two plain strings, which the tests do (`PortAccess.test.ts:247, 403, 590`;
  `PortRemote.test.ts:447`). SCOPE-03 is still worth closing; it is not a live defect.
- **No test, BDD step or doc reader pins `qadi.requireScopedResourceId`.** `/usr/bin/grep -rn requireScopedResourceId` (excluding
  `node_modules`, `lib/`, `.planning/milestones`) finds only `PortAccess.ts:264,390`, a comment at `Walk.ts:542`, `AGENTS.md:275` and
  ADR-QD-073 (`:81, :154`, history). `@qadi/devtools` collects port spans by description name, so it never saw the nested span.
- **A parameterised test over the three reads already exists** (`PortAccess.test.ts:550-650`, "a missing resource id still leaves
  its question on the span (D-07)"), but it checks only the port span's attributes, never the list of spans. The phase extends it.
- **The early annotation runs on the success path too**, and `readPort` annotates the same question again (`:190`); ADR-QD-109
  (`109-…md:106`) accepted that duplicate. It is needed only when the id is missing.
- `askActedForResource` and `askSignature` override `scope: "Resource"` in the early annotation because `pose` derives `scope` from
  `resourceId === undefined` and would say `Any` for a missing id (`:318-324`, `:449-460`); the relationship span has no `scope`.
- `MissingResourceId`'s one field is `relation` (`Errors.ts:108-114`, a budgeted `Schema.TaggedError` on the sink wire, so not
  renamed); the reads pass the event, the relation and the meaning respectively.
- `resourceIdOf` (`Resource.ts:31`) is already the id rule's writer half (used by `SinkEmit.ts`). Its doc says `Walk.ts`'s reads
  "must tell 'no id' from 'a non-string id'"; they do not: an absent `resource`, an absent `id` and a non-string `id` all raise
  `MissingResourceId` (`PortAccess.ts:316/326`, `:394/401`, `:453/461`). So one function can be the reader's rule too.
- Only the relationship request cannot hold a missing id: `RelationshipCheck.resourceId` is `ResourceId` (required), while
  `ActedQuery.resourceId` and `SignatureQuery.resourceId` already admit `undefined`.
- `MISSING`-path call metrics: none of the three counts a call (the check precedes `readPort`); the existing test pins it.
- `AGENTS.md` §5 (`:268-277`) lists the traced port reads by name (`readAttribute`, `askActedAny`, `askActedForResource`,
  `askRelationship`, `askCustom`, `askSignature`) and names `requireResourceId` as a kept helper; §3 lists what a description states.
</evidence>

<decisions>
## Implementation Decisions

- **D-01 (one scoped read, SCOPE-01):** a plain function `readScoped` in `PortAccess.ts` (no `Effect.fn`, no `Effect.fnUntraced`:
  like `readPort` it runs under the calling read's span, so `UNTRACED_BUDGET` is unchanged), generic over a closed, written-out
  `ScopedPort = "DecisionHistory" | "RelationshipResolver" | "SignatureHistory"`. It receives the request the description's `asks`
  built (the request "as far as the site supplies it", D-05) and owns: the one missing-id test in the module; on a missing id, the
  question annotation (the description's `pose` of that request, `scope: "Resource"` where the span has a `scope` member, the
  interpreter) and `MissingResourceId({ relation: <the leaf's name> })`; on a present id, completing the request and `readPort`.
  `PortAccess.ts` then contains no `typeof … === "string"` resource-id test and no `makeResourceId` call: the conversion is
  `resourceIdOf` (`Resource.ts`), called by the scoped ports' `asks`. How a request with a known id is completed is the executor's (a
  closed per-port table keyed by `ScopedPort`, three typed one-liners, is acceptable; for two ports it is the identity); no `as`, no
  placeholder id.
- **D-02 (answered `A`, 2026-11-11, SCOPE-02):** no nested span. Every scoped read with a missing id leaves only its port span,
  which carries the question and ends with the `MissingResourceId` failure; `requireResourceId` is deleted; AGENTS.md §5's sentence
  is rewritten. Quoted from `_DECISIONS-v1.2.md`: "No nested span: every scoped port read is one span that carries the question and
  the `MissingResourceId` failure; `requireResourceId` is deleted; AGENTS.md §5's sentence is rewritten".
- **D-03 (every read takes its leaf, SCOPE-03):** `PortAccess.ts` is package-private, so the read interface is the planner's. Each
  read takes the policy node it answers, typed `Extract<Policy, { readonly _tag: … }>`, plus the resource where the request needs
  one: `readAttribute(interpreter, subject, leaf)`, `askActed(interpreter, subject, leaf, resource)` (replaces both `askActedAny`
  and `askActedForResource`: the leaf's `scope` decides, as `askSignature` already does), `askRelationship(subject, leaf, resource)`,
  `askCustom(subject, leaf, resource)`, `askSignature(subject, leaf, resource)`. `Predicate.ts`'s `AskAttribute` and `AskActed` plan
  nodes carry their leaf instead of copied fields, so `toPredicate`'s reads build their requests through the same `asks`. Span names
  are unchanged (`askActed` opens `decisionHistoryPort.span`, as both acted reads did). `readAttribute` reads the attribute it looks
  up on the subject from the request `asks` built, so the subject lookup and the port request cannot name different attributes.
- **D-04 (annotate early only when the id is missing):** on the success path the scoped read annotates once, through `readPort`.
  The final span attributes are identical (the local/served equality rows, `PortAccess.test.ts:360-410`, keep holding);
  ADR-QD-109's accepted duplicate annotation is retired and ADR-QD-134 says so.
- **D-05 (overridden by the human: `state once`, SCOPE-04):** the planner's earlier decision ("the `servingFor` property stays the
  owner") is replaced. Quoted from `_DECISIONS-v1.2.md`: "The leaf→request mapping is stated once, in each port description (built
  through Phase 21's `makePortDescription`); the scoped reads and `servingFor` both derive from it, so the two can no longer
  disagree. `ServedLeaves` changes (public, `@qadi/core` minor). The `servingFor` property test stays as a guard. ADR-QD-134 records
  the override". The design, verified against the tree:
  - **The one function.** `PortDescription` gains `asks: LeafRequests<P>`, where
    `LeafRequests<P> = { readonly [T in Policy["_tag"]]?: (leaf: LeafOf[T], site: ReadSite) => P }` and
    `ReadSite = { readonly subject: AuthSubject; readonly resource: Resource | undefined }`. `P` is the port's request **as far as the
    site supplies it**: equal to the method's `Args` for four ports, and for `RelationshipResolver` the pose's widened input (the
    request with `resourceId: ResourceId | undefined`). Each port states one entry per tag it reads (attribute: `HasAttribute`;
    relationship: `HasRelationship`, which also owns the depth clamp, moved from `PortAccess.ts` as a module-private const; history:
    `HasActed`, `HasNotActed`; custom: `HasCustom`; signature: `HasSignature`). The scoped entries read the id with
    `resourceIdOf(site.resource)` (history and signature only when `leaf.scope === "Resource"`).
  - **What `ServedLeaves` becomes.** It is removed. Its successor is `LeafRequests<P>` (leaf → request, not leaf → name), on the
    description (`asks`), not on the facet. `ReadSite` is new. Both are public (the `PortDescription` type names them, TS2883) and are
    exported from the barrel through the module that declares them; `LeafOf` is declared once beside them (`PortRemote.ts`'s `NodeOf`
    goes). Recommended home: `PortDescription.ts` (the description's own types), unless `pnpm circular` forces another leaf module.
  - **The facet.** `PortServingFacet` loses `leaves`. `asked` takes `Args | P` (admission passes `Args`, `servingFor` passes `P`);
    `declare` receives what `servingFor` heard: the names and whether any leaf asked the port at all, so the opt-in signature port is
    declared exactly when a leaf asks it and its `"own-records"` pseudo-name is gone. A required or open port is still declared
    whether or not a leaf asked it (an empty list admits nothing), as `servingFor` does today. The spelling of `declare`'s parameter
    is the executor's.
  - **The type parameter.** `P` appears covariantly (`asks`) and contravariantly (`asked`), so `PortDescription` and
    `PortServingFacet` gain it as an explicit type parameter (default `Args`), threaded through `DescriptionOf` (with an extractor
    beside `ArgsOf`), `makePortDescription` and every generic derivation and double listed in Evidence. No method-syntax bivariance
    trick, no `as`.
  - **`servingFor`.** For each node and each port whose `asks` has the node's tag, it records that the port was asked and adds
    `d.serving.asked(d.asks[tag](node, SERVING_SITE))` when defined. `SERVING_SITE` is `{ subject: anonymous, resource: undefined }`:
    `anonymous` (`AuthSubject.ts:124`) is the library's existing meaning of "no particular subject", and a Resource-scoped leaf at a
    site with no resource yields exactly the request a read with a missing id annotates (D-01), so `servingFor` exercises no request
    shape evaluation does not. Its output for every existing test is unchanged.
  - **Serving work stays off the evaluation path.** `PortAccess.ts`, `Walk.ts` and `Predicate.ts` call `d.asks.<Tag>(leaf, site)`,
    request building they already did inline, and never `d.serving`. Only `servingFor` (start-up) and `answerRemotely` (admission)
    read the facet. Checked statically in 22-03.
  - **Why the name is safe to derive at one site.** A name that depended on the site would make `servingFor` wrong; a new law test
    asserts, per port and tag, that `asked(asks[tag](leaf, s1)) === asked(asks[tag](leaf, s2))` for generated leaves and sites, and
    that `servingFor([leaf])` admits it. The existing property test (real `evaluate` over 150 generated policies with a resource
    present, recording every port call) stays as the guard the human asked for.
  - **Rejected alternative (recorded in ADR-QD-134):** splitting a site-free "leaf part" from a site completion, so `servingFor`
    needs no site. The attribute and custom requests are positional tuples (`[subjectId, attribute]`,
    `[name, subject, resource, params]`), so admission would need a per-port projection from the request back to the leaf part and a
    round-trip law between the two: four functions per port and a new law, more statements rather than fewer.
  - **Phase 21 is not asked to take `asks`.** The member is meaningless until the reads use it, which is this phase's work; Phase 21
    keeps `makePortDescription`'s spec type an `Omit` of `PortDescription` (21-03 amended to say so), so the member flows through.
- **D-06 (test first, WX-06):** 22-02 commits RED on the phase base: (a) the existing D-07 table, retyped as a closed
  `{ readonly [K in ScopedPort]: … }`, gains the span-name list for shape `A` (only the port span) and the
  `MissingResourceId.relation` value (RED on the acted and signature rows); (b) `PortAccess.tst.ts`: no read can be called with
  loose strings (RED); (c) `PortAsks.tst.ts`: the description has `asks` and the facet has no `leaves` (RED). The correlation pins
  (an `asks` entry's result is assignable to its port's `serving.asked` parameter) and the site-independence law cannot compile
  before `asks` exists (the repo's no-deliberate-compile-error rule, `PortWire.tst.ts:6-8`), so they land with the implementation in
  22-03, before any old test is deleted.
- **D-07 (records, WX-02, WX-03, SCOPE-05):** ADR-QD-134 (new: one scoped read; D-02's answer and D-05's override quoted with the
  standing instruction; D-01, D-03, D-04; the D-05 design and its rejected alternative; amends ADR-QD-077, ADR-QD-094, ADR-QD-109 and
  ADR-QD-114; reads ADR-QD-051 and ADR-QD-073); BEH-QD-227 and BEH-QD-331 amended; BEH-QD-445 (a missing resource id fails the same
  way on every scoped port, `30-port-calls.md`) and BEH-QD-446 (the request a leaf asks a port is stated once, and `servingFor` names
  what it asks, `34-remote-ports.md`) new; INV-QD-288 (a scoped read never reaches its port without a resource id) and INV-QD-289
  (the name `servingFor` serves for a leaf is `asked` of the request that leaf's read builds, at any site) new; the
  `spec/behaviors/06-services.md` `PortDescription` listing; traceability; CCR-QD-412; `spec/README.md` history;
  `spec/overview.md` (the `PortServingFacet`/`ServedLeaves` row becomes `PortServingFacet`, `LeafRequests`, `ReadSite`; gate 13);
  the website's upgrading note; AGENTS.md §3 (a description also states the request each leaf asks it) and §5 (the read list and the
  `requireResourceId` sentence); changesets amended in place per the standing rule (17-06): `.changeset/port-serving.md` (facet and
  `asks`, with **Breaking (`@qadi/core`)** for a hand-built description because `PortDescription` shipped in 0.10.0) and
  `.changeset/one-port-read.md` (the missing-id trace), a new `.changeset/scoped-port-read.md` (`"@qadi/core": minor`) only for a
  file no longer pending. No changeset entry for `@qadi/http` or `@qadi/devtools` (fixed group, no change of theirs). No
  `UNTRACED_BUDGET` or `SWITCH_BUDGET` change. Unused: BEH-QD-447..449.

### Claude's Discretion
- `readScoped`'s exact generic signature and how a request with a known id is completed (D-01's constraints hold).
- The spelling of `declare`'s new parameter and of the `P` extractor beside `ArgsOf`.
- Which module declares `ReadSite`, `LeafRequests` and `LeafOf` (D-05's recommendation, `pnpm circular` decides).
</decisions>

<canonical_refs>
## Canonical References
- `packages/core/src/PortAccess.ts`, `Walk.ts`, `Predicate.ts` (plan nodes), `PortRemote.ts` (`servingFor`, `answerRemotely`),
  `PortServing.ts`, `PortDescription.ts`, `PortDerivation.ts`, `PortDoubles.ts`, `Ports.ts`, `Resource.ts` (`resourceIdOf`),
  `AuthSubject.ts` (`anonymous`), `Errors.ts` (`MissingResourceId`), `Policy.ts` (leaf types), the five port modules
- `packages/core/test/PortAccess.test.ts`, `PortRemote.test.ts`, `PortServing.tst.ts`, `PortConformance.test.ts`,
  `PortDescription.test.ts`, `Evaluate.test.ts` (MissingResourceId rows :492-649, :1876, :3136), `Predicate.test.ts`
- ADR-QD-051, ADR-QD-073, ADR-QD-077, ADR-QD-094, ADR-QD-109, ADR-QD-114
- BEH-QD-227 (`spec/behaviors/30-port-calls.md:26-137`), BEH-QD-331 (`spec/behaviors/34-remote-ports.md:76-95`), INV-QD-244,
  AGENTS.md §3 and §5
</canonical_refs>

<deferred>
## Deferred Ideas
- Renaming `MissingResourceId.relation` (a sink-wire field; needs a wire version).
- Admission reading the name from the decoded wire question rather than the request (would let `asked` drop `Args`, but changes the
  public `DecodedQuestion`; no defect asks for it).
</deferred>

---
*Phase: 22-scoped-port-read · Context gathered: 2026-11-11 · revised for the 2026-11-11 answers*
