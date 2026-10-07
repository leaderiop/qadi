# Runtime Invariants

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-INV                                       |
> | Revision       | 1.59                                           |
> | Effective Date | 2026-10-07                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.59 (2026-10-07): INV-QD-103 added — a trace lines up with its policy's explanation, position by position; INV-QD-090 covers `Trace` (`renderTrace`, `diffTraces`, `foldTrace` are stack-safe) and its devtools twin is gone; INV-QD-040 cites INV-QD-103 and drops the stale `dehydrateDecisions` clause (ADR-QD-101, CCR-QD-191)<br>1.58 (2026-10-07): INV-QD-090's Source and Enforcement name `foldTreeBy` and the three case-wise folds (`foldPolicyCases`, `foldMatcherCases`, `foldExplanationCases`) (ADR-QD-090 amendment, CCR-QD-190)<br>1.57 (2026-10-07): INV-QD-102 added — a probe's verdict on port health is never served from a cache; INV-QD-030/033/035 Sources and Enforcement follow `Question`, `Walk.ts` and `SinkEmit.ts` (ADR-QD-100, CCR-QD-189)<br>1.56 (2026-10-07): INV-QD-101 added — retention never selects a row without a finite age past a valid limit; INV-QD-053's generators widened to non-finite and negative draws (CCR-QD-186)<br>1.55 (2026-10-06): INV-QD-021 — totality extends to `renderExplanation` over a `fieldStrategy` or `combining` outside its closed union, with the Source and Enforcement that pin it; INV-QD-031 — an empty `All` carrying such a strategy is not atomic, and the value is named verbatim (ADR-QD-092 amendment, CCR-QD-183)<br>1.54 (2026-10-06): INV-QD-099 retired — 0.11.0 reads one wire version, so there are no two to agree; INV-QD-098 restated for version 2 only, a pre-0.10 record refused as `UnsupportedVersion` before any outcome is read (ADR-QD-096 amendment, CCR-QD-182)<br>1.53 (2026-10-05): INV-QD-100 (a log reader sees every retained record exactly once); INV-QD-039's Source names `storedRecordOrder` as the one order (ADR-QD-097, CCR-QD-181)<br>1.52 (2026-10-05): INV-QD-098 (a decoded decision record has exactly the outcome its sender sent) and INV-QD-099 (a record decodes the same whichever wire version carried it) (ADR-QD-096, CCR-QD-180)<br>1.51 (2026-10-05): INV-QD-096 and INV-QD-097 added — whatever the record codec emits it accepts, and the codec is total (ADR-QD-095, CCR-QD-179)<br>1.50 (2026-10-05): INV-QD-095 added — every port is described once, and every derived layer agrees with its description; INV-QD-007 gains its Enforcement (the conformance suite's default cases) and names all five port defaults; INV-QD-043's Source and key paragraph follow the move of capture/replay keys and fail-closed answers into the port descriptions (ADR-QD-094, CCR-QD-177)<br>1.49 (2026-10-05): INV-QD-094 added (a decision being re-checked, or that failed, never reads as a verdict); INV-QD-028's note on a staleness invariant that speaks only of the flag is answered for `previousSuccess` (ADR-QD-093, CCR-QD-175)<br>1.48 (2026-10-05): INV-QD-093 added (a merge discloses nothing its inputs did not); INV-QD-004's Source moves to `FieldLattice.ts` and gains Enforcement; INV-QD-024's Source and Enforcement name the lattice laws and the empty-child generator arm, and its vacuity threshold is corrected from twenty to ten; INV-QD-003's Source no longer names the deleted `POLICY_TAGS_BY_TAG` or calls `mergeFields` a `_tag` switch (ADR-QD-092, CCR-QD-174)<br>1.47 (2026-10-05): INV-QD-018 violated a second time on the row operand — `toPredicate` admitted `±Infinity` rows `evaluate` denied, and the agreement properties now sample non-finite rows (CCR-QD-172); INV-QD-047/048 — the engines hold a float column, PostgreSQL's `NaN` ordering found, a range excludes or refuses non-finite rows; INV-QD-061's Source names `finiteGuardFor` and its Enforcement non-finite cells and R9; new INV-QD-091 (a primitive matcher and its predicate leaf are one function) and INV-QD-092 (an absent value never satisfies a matcher) (ADR-QD-091, CCR-QD-173)<br>1.46 (2026-10-04): INV-QD-047/048 — Enforcement now names real engines (PGlite, `node:sqlite`, Prisma Client over SQLite) in place of the JavaScript readers, which are retired, and the Implication that "there is no `Predicate` shape that renders to one target and not the other" is corrected to the declared reserved-column difference. INV-QD-048 gains the third-time-found paragraph (a three-valued `NOT` dropped NULL rows; CCR-QD-157). INV-QD-061 (`toRenderable` preserves `evaluatePredicate`) and INV-QD-062 (a wrong nullability declaration never over-admits) added (ADR-QD-079, CCR-QD-158)<br>1.45 (2026-10-04): ARCH-06 — new INV-QD-064, a guard is listed only by the registry its provider writes to; INV-QD-046's Source and Enforcement extended to the handle-based write side and a foreign `gates` registry (ADR-QD-080, CCR-QD-160)<br>1.44 (2026-10-04): ARCH-05 — INV-QD-022's Source is now `HydrationEngine.ts`'s v2 entry schema (derived from `DecisionWire`) plus a root-tag integrity check on a disclosed trace; INV-QD-028's Source moves from `QadiAtoms.ts` to `HydrationEngine.ts`'s `makeSeededQuestion`, the precedence expression unchanged; INV-QD-045's reason set is now seven and `hydrateDecisions` never throws; new INV-QD-059, a seeded decision never claims a trace it was not given (ADR-QD-078, CCR-QD-156)<br>1.43 (2026-10-04): INV-QD-037 corrected — exact in both directions, matcher nesting counts, depth judged on the policy first; INV-QD-090 — a pure walk over a caller-held tree never exhausts the call stack (ADR-QD-090, CCR-QD-170)<br>1.42 (2026-10-04): INV-QD-060 — an enforcement failure is reported with the same meaning on every route; INV-QD-006's Related gains it (ADR-QD-081, CCR-QD-155)<br>1.41 (2026-10-04): INV-QD-058 — translation fails only as evaluation would, with its three faulty-port properties; INV-QD-006's Source and INV-QD-057's Source now name `PortAccess.ts`, where every port read lives; INV-QD-018's Enforcement and INV-QD-050/056's Source updated for the compile/run split (ADR-QD-077, CCR-QD-153)<br>1.40 (2026-10-04): INV-QD-052's Source and Enforcement updated — the probe protocol moved behind `CircuitBreaker.withPermit`, generation-tagged permits, and the new over-threshold, release-on-interrupt and model-based property tests (CCR-QD-154)<br>1.39 (2026-09-19): Three Source citations corrected (100-lens audit, second batch). INV-QD-033's Source named `HashSet` for `AuthSubject.roles`/`.permissions`; the code is the built-in JS `Set`, and `DecisionCache.ts`'s own doc comment already corrects this after once making the same mistake — restated to match, citing `Equal`/`Hash`'s `instanceof Set` special-case rather than a `HashSet`. INV-QD-003's Source cited only the one-directional `Schema.Codec<Policy, PolicyEncoded>` type assertion, which alone cannot forbid a `Policy` variant added without a matching schema member (assignability checks one direction); restated to name the layered guard system that actually forecloses that gap (`POLICY_TAGS_BY_TAG`, `policyDepth`'s `Match.tagsExhaustive`, the two `_tag`-switch TS2366 checks). INV-QD-008's Source described `scripts/check-house-style.mjs`'s ambient-randomness regex as unqualified enforcement; restated as a line-level drift guard that an aliased or indexed `crypto["randomUUID"]()` call would pass silently, matching the house-style script's own doc comments' standard of precision about what a regex cannot see (.issues/high/domenic-denicola-DD-01.md's corroborators .issues/low/butler-lampson-BL-03.md, .issues/low/xavier-leroy-XL-03.md, .issues/low/bruce-schneier-BS-04.md)<br>1.38 (2026-09-19): INV-QD-057 — `hasSignature` consults no clock, promoting a limitation previously stated only in `Signature.ts`'s doc comment to a checkable, `TestClock`-pinned invariant (LL-04)<br>1.37 (2026-09-19): INV-QD-020 made literally true rather than true-except-for-failures — `AllOf`/`AnyOf`/`Rules`'s concurrent paths dispatched children through `Effect.forEach`'s fail-fast default, so a later-indexed child's failure could pre-empt an earlier-indexed child's already-decisive `Deny`/`Allow` (or, for `Rules`, its already-decisive applying row), a `Failure` where sequential evaluation would have produced a `Decision`. Children are now run through `Effect.exit` and folded in declaration order, the same fold the trace already used, so a failure is placed at the same index sequential evaluation would have reached it at (`Evaluate.ts`, INV-QD-020, CCR-QD-152)<br>1.36 (2026-09-09): INV-QD-006's Source extended — a failure this invariant covers now includes a port that dies rather than fails; `Evaluate.ts`'s five port call sites each catch that cause and convert it into the port's own typed error, so `Effect.orDie`'s absence was necessary but not sufficient on its own (BEH-QD-261, issue #100, CCR-QD-142)<br>1.35 (2026-09-08): INV-QD-013's Source corrected — `filter`/`filterStream` enforce the same obligation rule through a second path, `decideOne`, which independently reimplements evaluate → `isAllowed` → discharge per item rather than calling the shared `permitted`; a deliberate second implementation, tested on its own terms by `Qadi.test.ts`'s dedicated filter/filterStream obligation tests, not a gap. INV-QD-009's Source corrected — `enforce` is `Effect.flatMap(permitted(policy, options), () => self)`; it never calls `assert`, and both independently call `permitted`. INV-QD-052 extended — `claimProbe`/`releaseProbe` carry the same single-`Ref.modify` atomicity as `status`/`recordSuccess`/`recordFailure`, bounding a half-open window to exactly one concurrent probe (issue #72, CCR-QD-136)<br>1.34 (2026-09-08): INV-QD-018 violated in production code and INV-QD-047 with it — `Predicate.ts`'s `compare` carried only the `typeof` half of the `Number.isFinite` guard `Matcher.ts`'s `evaluateMatcher` has on a `Gte`/`Lt` bound, so `toPredicate` on `gte(-Infinity)` admitted every numeric row while `evaluate` on the same policy denied every one; and `@qadi/predicate-sql`'s `isSafeValue` admitted `NaN`, which PostgreSQL treats as equal to itself and `evaluatePredicate` does not. Both fixed, and both fuzz generators extended to sample the non-finite bounds they never drew (INV-QD-048 gained the matching property; issue #65, CCR-QD-120)<br>1.33 (2026-09-08): INV-QD-038's Enforcement corrected — `flattenPermissions` does not run inside `makeSubject` as stated; `makeSubject` takes an already-flattened `Iterable<PermissionKey>`, and `flattenPermissions` runs inside the sibling `fromRoles` constructor instead (issue 69, CCR-QD-117)<br>1.32 (2026-09-08): INV-QD-004 extended — projecting a record is stack-safe; `FieldPath.ts`'s `projectAt` recursed once per field-spec segment over an uncapped dot-path and raised a raw `RangeError` out of the enforcement path, and now walks with the explicit array-backed stack `DecodeDepthGuard.ts` and `SinkCodec.ts` already use (issue 66, BEH-QD-056, CCR-QD-115)<br>1.31 (2026-09-07): INV-QD-031 extended — `fieldStrategy` and `HasRelationship.depth` named as the same shape of gap the invariant already covered, `depth` having been dropped from the rendering entirely; INV-QD-029's `RelationshipResolver` denial no longer claims an unverifiable wiring state (issue 45, CCR-QD-114)<br>1.30 (2026-09-07): INV-QD-032 updated — "`neq` on `undefined` is `true`" was the wiring bug's mechanism, not just a description of it; the mechanism itself is now closed at the source, not only the resource-wiring path (CCR-QD-112)<br>1.29 (2026-09-07): INV-QD-048's Enforcement corrected — the test-only `matchesPrismaWhere` reader it named implements the same JS `.every`/`.some` semantics `evaluatePredicate` does, and so could not by itself catch `renderNode` nesting a vacuous identity where Prisma's real engine silently mishandles it (C1, issue 34); a second, engine-accurate reader now checks this invariant too (BEH-QD-239, BEH-QD-242, CCR-QD-111)<br>1.28 (2026-09-06): six in-page anchors repointed from pre-rename heading slugs to the current headings (INV-QD-004, INV-QD-006, INV-QD-007, INV-QD-018, INV-QD-029, plus the sibling references in traceability.md and behaviors/27-devtools-timeline.md); INV-QD-050 gained the Enforcement block and Related line its own text already implied, which the 1.26 edit had displaced onto INV-QD-056's section (CCR-QD-097)<br>1.27 (2026-09-06): INV-QD-054 renamed — `verifyChainIntegrity`/`ChainIntegrityError` read as cryptographic tamper-evidence to a compliance reviewer and are not; renamed to `verifySequenceIntegrity`/`SequenceIntegrityError` and the implication note made explicit about the gap this does not close (CCR-QD-094)<br>1.26 (2026-08-25): INV-QD-056 — a `HasSignature` node never appears in a compiled `Predicate`, one leaf after `HasCustom`'s own; INV-QD-055's Related line updated for ADR-QD-057's harmonization (ADR-QD-057, ADR-QD-058, CCR-QD-089)<br>1.25 (2026-08-25): INV-QD-051–055 — the family of properties `@qadi/audit`'s correctness rests on, formalized: staging non-observability, circuit-breaker atomicity, retention partition, chain-integrity gap detection, and the signature obligation handler's call-once/outcome-match guarantee (ADR-QD-056, CCR-QD-086)<br>1.24 (2026-08-25): INV-QD-003's Source corrected — `Policy`'s recursive type is hand-written first and the schema is type-asserted against it, not derived from a single `Schema.Union` (CCR-QD-084)<br>1.23 (2026-08-25): INV-QD-022 revised — every `DehydratedEntry` field is verified, not just `policy` (CCR-QD-083)<br>1.22 (2026-08-25): INV-QD-049, INV-QD-050 — a custom predicate's own failure and an unrecognised name are errors, never denials; a `HasCustom` node never appears in a compiled `Predicate` (ADR-QD-055, CCR-QD-082)<br>1.21 (2026-08-25): INV-QD-047, INV-QD-048 — the NULL-handling defect manual engine verification found, and how it was fixed and closed against the generators (BEH-QD-244, CCR-QD-081)<br>1.20 (2026-08-25): INV-QD-047, INV-QD-048 — a companion package's compiled SQL/Prisma output agrees with `evaluatePredicate` (ADR-QD-054, CCR-QD-079)<br>1.19 (2026-08-25): INV-QD-004 revised — a field spec may be a dot-path with a `*`/`**` wildcard, `undefined` stays the unchanged top of the lattice (BEH-QD-056, CCR-QD-078)<br>1.18 (2026-08-24): INV-QD-046, instrumentation never changes what a guard renders (CCR-QD-073)<br>1.17 (2026-08-24): INV-QD-045, hydration accounts for every entry (CCR-QD-072)<br>1.16 (2026-07-26): INV-QD-027, the published package (CCR-QD-038)<br>1.15 (2026-07-26): INV-QD-026, the Promise facade (CCR-QD-033)<br>1.14 (2026-07-26): INV-QD-025, the decision cache (CCR-QD-032)<br>1.13 (2026-07-26): INV-QD-024, simplification (CCR-QD-031)<br>1.12 (2026-07-26): INV-QD-023, the lattice bounds (CCR-QD-030)<br>1.11 (2026-07-26): INV-QD-022, hydration is subject-bound (CCR-QD-029)<br>1.10 (2026-07-26): INV-QD-021, explanation totality (CCR-QD-028)<br>1.9 (2026-07-26): INV-QD-020, concurrency; INV-QD-005 scoped to sequential evaluation (CCR-QD-027)<br>1.8 (2026-07-26): INV-QD-019, the order laws (CCR-QD-024)<br>1.7 (2026-07-26): INV-QD-018, predicate agreement (CCR-QD-020)<br>1.6 (2026-07-26): INV-QD-017, rule tables; INV-QD-005 defers to it (CCR-QD-019)<br>1.5 (2026-07-26): INV-QD-016, subject sets (CCR-QD-018)<br>1.4 (2026-07-26): INV-QD-015, label dominance (CCR-QD-017)<br>1.3 (2026-07-26): INV-QD-014, the history port; INV-QD-008 restated as "given the same history" (CCR-QD-016)<br>1.2 (2026-07-26): INV-QD-012 and INV-QD-013, obligations (CCR-QD-015)<br>1.1 (2026-07-26): INV-QD-011, the action dimension (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

Properties that hold for every execution. Each names the mechanism that enforces
it, because an invariant nobody enforces is a wish.

## INV-QD-001: Permission key uniqueness

Two distinct permissions never produce the same runtime lookup key.

**Source**: `packages/core/src/Permission.ts` — `PermissionSchema` constrains
both segments with `/^[^:]+$/`, which rejects empty segments and any segment
containing the reserved separator.

**Implication**: `{resource: "a:b", action: "c"}` cannot be decoded, so it can
never collide with `{resource: "a", action: "b:c"}`. In the predecessor both
formatted to `"a:b:c"` and each silently granted the other.

**Related**: [BEH-QD-002](behaviors/01-permissions.md), [ADR-QD-007](decisions/007-permission-token-representation.md).

---

## INV-QD-002: Role graph acyclicity

The role inheritance graph reachable from any `Role` value is acyclic.

**Source**: `packages/core/src/Role.ts` — `role()` takes parents **by value**, so
a cycle is unconstructible: a role cannot reference one that does not yet exist.
`resolveRoleGraph` is the only entry point where parents are named rather than
referenced, and it detects cycles explicitly.

**Implication**: `flattenPermissions` needs no cycle check and cannot diverge. A
visited set is still required, but only to keep a diamond linear rather than
exponential.

**Related**: [BEH-QD-009](behaviors/02-roles.md), [ADR-QD-015](decisions/015-role-dag-acyclic-by-construction.md).

---

## INV-QD-003: Codec/type identity

The JSON codec and the TypeScript type of a policy cannot disagree.

**Source**: `packages/core/src/Policy.ts` — the type is hand-written first and
the `Schema.Union` of `Schema.TaggedStruct` variants is type-asserted against
it (`Schema.Codec<Policy, PolicyEncoded>`); the JSON codec is then derived
from that schema (`Schema.fromJsonString(Policy)`). That assertion alone is
necessary, not sufficient: assignability checks one direction, so a `Policy`
union variant added without a matching `Schema.TaggedStruct` member would still
satisfy `Schema.Codec<Policy, PolicyEncoded>` (the narrower schema type remains
a subtype of the wider `Policy`). What actually forecloses that gap is the
layered guard system around the union: `Policy.ts`'s `POLICY_TAGS`, derived
from the schema union's own discriminants (ADR-QD-090), and its
`childrenOf`/`fieldsOf`/`policyDepth` dispatchers, each a `Match.tagsExhaustive`
where a missing tag is a compile error; TS2366 in the `_tag` dispatch switches
`evaluateNode` (`Walk.ts`) and `judgeMatcher` (`Matcher.ts`); and the
round-trip property test below. (Corrected by CCR-QD-174: this paragraph named a
tag registry in `Evaluate.ts` that ARCH-02 had already replaced with `POLICY_TAGS`,
and called `mergeFields` a `_tag` switch, which it never was — it dispatched on the
`FieldStrategy` literal union, and is a law table now.)

**Implication**: `fromJson(toJson(p))` is structurally equal to `p` for every
policy. The predecessor maintained three artefacts by hand and they drifted,
silently dropping `fieldStrategy` on encode.

**Enforcement**: a property test over generated policy trees, a unit test
pinning the original defect, and Gherkin scenario `@REQ-QD-008`.

**Related**: [BEH-QD-017](behaviors/03-policy-adt.md), [BEH-QD-058](behaviors/08-serialization.md), [ADR-QD-002](decisions/002-schema-derived-policy-adt.md).

---

## INV-QD-004: Field visibility is a lattice with `undefined` at the top

An absent field set means *all fields*, never *no fields*.

A field spec inside the set is a plain `string`, and may be a dot-path with a
`*`/`**` wildcard terminal. A literal terminal and `**` are containment-
equivalent — both denote the reached value whole, at any depth beneath it —
so the lattice's shape is unchanged by path syntax: two specs that denote the
same set (a bare name and its own `.**`) compare `Equal`, and a spec whose
denoted set is a proper subset of another's is the one an `Intersection`
merge keeps. `*` is the one case where the lattice's own ordering relation
declines to answer: whether a `*` at one depth discloses more or less than a
different spec at another depth depends on the reached value's actual runtime
shape, not on the specs alone, so that comparison is `Incomparable` rather
than guessed (see [BEH-QD-056](behaviors/07-enforcement.md)) — which, under
`Intersection`, means neither survives. `undefined` itself is untouched by
any of this: it is still the one value nothing can compare beneath.

**Source**: `packages/core/src/FieldLattice.ts` (moved from `Decision.ts`, which
re-exports it; ADR-QD-092) — `intersectFields` returns the other operand when
either is `undefined`, and on two specs of one shape keeps the lexicographically
smaller text, so its output does not depend on operand order; `unionFields`
returns `undefined` when either is, since a branch granting everything makes the
union everything; `mergeFields` and the strategy law table say what each
`FieldStrategy` merges to, with a fail-closed row for a value outside the union.
`packages/core/src/FieldPath.ts` — `compareFieldPaths` is what `intersectFields`
consults for two non-`undefined` sets, and `project` is what turns a field-spec
set into an actual projection of a record.

**Projecting is stack-safe (CCR-QD-120).** A lattice element is a `string`, and
neither its dot-segment count nor the depth of the record it is projected
against is bounded by anything: `parseFieldPath` splits with no length cap, and
both the spec and the resource arrive from outside — the former inside a
`Policy` that [ADR-QD-002](decisions/002-schema-derived-policy-adt.md) says is
persisted and re-parsed from untrusted JSON, invisible to `MAX_DECODE_DEPTH`,
which bounds a policy's *structural* nesting and never looks inside one long
string. `FieldPath.ts`'s `projectAt` walked that pairing with function-call
recursion, one frame per matching segment, so a crafted spec against a
correspondingly deep resource raised a raw `RangeError` out of the enforcement
path itself — on every field-restricted allow. It now walks with an explicit
array-backed stack, the same conversion `DecodeDepthGuard.ts`'s
`exceedsJsonDepth` and `SinkCodec.ts`'s record walk already carry. The
projection is identical node for node; only the mechanism moved.

**Implication**: intersecting an unrestricted policy with a restricted one yields
the restriction, and a denial projects to `{}`. Treating `undefined` as the empty
set would invert the meaning of every unrestricted policy. And a spec no record
could satisfy costs one decision, not the process:
[INV-QD-006](#inv-qd-006-failure-is-not-denial) keeps a failure from becoming a
denial, and this keeps it from becoming a crash.

**Enforcement**: `packages/core/test/FieldLattice.test.ts` — the lattice's
examples and laws (idempotence, `[]` absorbing, commutativity and associativity
in what `project` discloses, byte-level commutativity and order independence, no
widening), each strategy's law row asserted exactly, and the n-ary `mergeFields`
properties.

**Related**: [BEH-QD-018](behaviors/03-policy-adt.md), [BEH-QD-051](behaviors/07-enforcement.md), [BEH-QD-056](behaviors/07-enforcement.md), [ADR-QD-006](decisions/006-field-strategy-always-encoded.md), [ADR-QD-092](decisions/092-field-strategy-meaning-lives-beside-the-lattice.md), [INV-QD-093](#inv-qd-093-a-merge-discloses-nothing-its-inputs-did-not).

---

## INV-QD-005: Short-circuit preservation

A policy branch that is not evaluated performs no attribute or relationship
lookup.

**Scoped, not universal, since CCR-QD-027**: this holds under the default
sequential evaluation. `EvaluateOptions.concurrency` forfeits it deliberately and
by explicit request — see
[INV-QD-020](#inv-qd-020-concurrency-changes-lookups-never-decisions), which
carries the property that makes forfeiting it safe. The invariant is *scoped*
rather than repealed because a caller who does not ask for concurrency is
unaffected by its existence, and that is the whole safety argument
([ADR-QD-026](decisions/026-concurrent-evaluation.md)).

**Source**: `packages/core/src/Walk.ts` — resolution happens inside the leaf
evaluator, reached only when that leaf is visited. `AllOf` returns at its first
denial and `AnyOf` at its first allow, except under `Union`, which must observe
every child to merge field sets.

**Implication**: `anyOf(cheapRbacCheck, expensiveAttributeCheck)` costs one set
lookup when the first branch allows. The predecessor resolved the entire tree
before evaluating anything.

**`Rules` is governed by
[INV-QD-017](#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden)
instead**, and is not an exception to this one. Where stopping is a property of a
boolean operator here, a rule list stops according to its combining algorithm,
and two of the three cannot stop in the direction that is cheap everywhere else.
Enumerating a third node in this invariant would have made it true only by
listing; the property belongs to the algorithm.

**Enforcement**: tests count resolver invocations rather than measuring time.

**Related**: [BEH-QD-034](behaviors/05-evaluator.md), [BEH-QD-035](behaviors/05-evaluator.md), [ADR-QD-005](decisions/005-lazy-attribute-resolution.md).

---

## INV-QD-006: Failure is not denial

A broken lookup never presents as "not authorized".

**Source**: `packages/core/src/Walk.ts` — resolver failures propagate through
the Effect error channel. `Effect.orDie` is prohibited on evaluation paths, so a
denial and a fault remain distinguishable at every layer, including React's
`PolicyState.error`.

A well-behaved port failing typed is only half of "broken lookup" — a port
that *dies* instead (a throw, a rejected promise, an `Effect.die`) is not an
`Effect.orDie` call, but reaches the same place by omission if nothing catches
it: a bare defect is neither a denial nor a typed failure, and passes straight
through `Effect.retry` unretried. `PortAccess.ts` — every port read either
interpreter makes (`AttributeResolver.resolve`, `DecisionHistory.hasActed`,
`RelationshipResolver.check`, `CustomPredicate.evaluate`,
`SignatureHistory.signaturesFor`) — wraps the call in `catchPortDefect`
(`Effect.catchCause`), converting a defect into that port's own typed error and
leaving an already-typed failure or an interruption unchanged (BEH-QD-261,
BEH-QD-264, issue #100). It holds for `toPredicate` as well as `evaluate`: the
two read their ports through the same module, so there is no second place for the
conversion to be forgotten.

**Implication**: an attribute-store outage surfaces as an incident rather than
sending an engineer to audit permissions — whether the store fails cleanly or
dies, and whether or not a caller wraps `evaluate` in its own `Effect.retry`.

**Related**: [BEH-QD-036](behaviors/05-evaluator.md), [BEH-QD-261](behaviors/05-evaluator.md#beh-qd-261-a-defecting-port-fails-typed-not-dead), [BEH-QD-264](behaviors/16-predicates.md#beh-qd-264-a-defecting-port-fails-translation-typed-not-dead), [BEH-QD-066](behaviors/09-react.md), [INV-QD-060](#inv-qd-060-an-enforcement-failure-is-reported-with-the-same-meaning-on-every-route).

---

## INV-QD-007: Defaults fail closed

Every default layer denies rather than grants.

**Source**: `RelationshipResolverNever` returns `"Unknown"`, which matches
neither branch; `CurrentSubjectAnonymous` holds no roles or permissions;
`AttributeResolverNone` resolves to `undefined`, which satisfies no matcher;
`DecisionHistoryUnknown` answers `"Unknown"`, `CustomPredicateNone` `false`, and
`SignatureHistoryNone` no signatures. Each port default is `nonePort` of the port's
description, whose `none` is the one statement of its answer
([ADR-QD-094](decisions/094-a-port-is-described-once.md)).

**Implication**: forgetting to wire a resolver produces denials, which surface
immediately in testing. A default that granted would turn an omission into a
silent breach.

**Enforcement**: `packages/core/test/PortConformance.test.ts` ("default") asserts,
for every port in the registry, that the exported default is named and answers as
the description says and that a shared answer cannot be mutated;
`packages/core/test/Layers.test.ts` covers the non-port defaults.

**Related**: [BEH-QD-043](behaviors/06-services.md), [ADR-QD-010](decisions/010-context-service-and-layers.md), [INV-QD-095](#inv-qd-095-every-port-is-described-once-and-every-derived-layer-agrees-with-its-description).

---

## INV-QD-008: Evaluation is reproducible given the same history

Given the same subject, policy, services **and history**, an evaluation produces
the same decision, identifier and duration.

**Source**: durations come from Effect's `Clock`, identifiers from the
`EvaluationId` service. `scripts/check-house-style.mjs` fails the build on a
line-level, comment/string-stripped match of `Date.now()`, `performance.now()`
or `crypto.randomUUID()` anywhere except `EvaluationId.ts`, which is the one
recorded exemption. That is a drift guard against the ordinary, unobfuscated
form of ambient time/randomness, not a proof the property holds: it is a
regex, not an AST match, so `crypto["randomUUID"]()`, an aliased import, or a
hand-rolled id built from `crypto.getRandomValues` would pass it silently.
Nothing else in the toolchain checks this property.

**The qualifier was added when `DecisionHistory` shipped** and it is a genuine
weakening, recorded rather than absorbed. Before E5 the same inputs produced the
same decision forever; a history port means a second call may legitimately differ
from the first, because the world moved between them. Four model documents
insisted this be restated in the change that landed the port, on the grounds that
left alone it would not become false loudly — it would weaken silently, and
everything citing it would go on citing it.

What is *not* weakened: Qadi still writes nothing. Evaluation reads history and
never records it, so no evaluation changes the answer to the next one. The
non-determinism is entirely the caller's store moving, and under a fixed store —
`decisionHistoryFromEvents`, or the default — reproducibility is exactly what it
was.

**Implication**: traces can be asserted exactly. The predecessor built a trace
feature whose contents no test could predict.

**Related**: [BEH-QD-037](behaviors/05-evaluator.md), [ADR-QD-012](decisions/012-deterministic-time-and-ids.md).

---

## INV-QD-009: Guarded effects do not run when denied

`Qadi.enforce` never starts the effect it wraps unless the policy allows.

**Source**: `packages/core/src/Qadi.ts` — `enforce` is
`Effect.flatMap(permitted(policy, options), () => self)`, so `self` is only
constructed into the chain after the internal `permitted` helper evaluates,
refuses a denial and discharges. `enforce` never calls `assert`; both
independently call the shared `permitted`, which is where the refusal
actually happens ([INV-QD-013](#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation)).

**Implication**: guarding a mutation is safe. Discarding a result after the fact
would not be.

**Related**: [BEH-QD-049](behaviors/07-enforcement.md), [ADR-QD-011](decisions/011-enforce-as-aspect.md).

---

## INV-QD-010: Error codes are injective

No two error tags share a numeric code.

**Source**: `packages/core/src/Errors.ts` — `ERROR_CODES` is declared
`satisfies Record<QadiError["_tag"], ...>`, so an error without a code does not
compile, and every code is visible in one table.

**Implication**: log aggregation keyed on the code cannot conflate unrelated
failures, as the predecessor's duplicated `ACL007` did.

**Enforcement**: a test asserts the code set has no duplicates.

**Related**: [ADR-QD-008](decisions/008-error-taxonomy.md).

---

## INV-QD-011: A policy that reads the action cannot be evaluated without one

Reading the action while none was supplied fails; it never denies.

**Source**: `packages/core/src/Walk.ts` — `HasAction` fails with
`MissingAction` when the action is absent, and `HasAttribute` and
`HasResourceAttribute` ask `referencesAction` **before** running their matcher.

The pre-check is what makes this an invariant rather than a hope.
`evaluateMatcher` is total by design (BEH-QD-028): it cannot fail, so an
unguarded `action()` would resolve to `undefined`, satisfy nothing, and return
`false` — a denial indistinguishable from a real one.

**Implication**: forgetting `{ action }` at a call site produces an incident,
not a quiet refusal. This is [INV-QD-006](#inv-qd-006-failure-is-not-denial)
applied to caller input rather than to a resolver, and it is the opposite of
[INV-QD-007](#inv-qd-007-defaults-fail-closed) on purpose: an unwired resolver
denies because the *system* could not answer, whereas a missing action means the
*caller* never asked a complete question.

**Enforcement**: tests assert `MissingAction` for both paths — the leaf, and a
matcher whose `action()` is nested inside another matcher.

**Related**: [BEH-QD-076](behaviors/10-actions.md), [ADR-QD-018](decisions/018-action-dimension.md).

---

## INV-QD-012: Obligations are never narrowed

Combining two allowing branches never yields fewer duties than either required.

**Source**: `packages/core/src/Obligation.ts` — `unionObligations` is the only
combinator, and nothing selects an alternative. `FieldStrategy` governs field
sets and is not consulted here.

This is the mirror image of
[INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)
and the asymmetry is deliberate. An absent field set is the *top* of its
lattice, so narrowing discloses less and is safe. An absent obligation set is
the *bottom* of this one, so narrowing lets a caller discharge fewer duties than
an allowing branch demanded — a grant nobody authorised, arrived at by a merge
rule.

**Implication**: there is no strategy to configure. An option whose other
settings are unsafe is not an option.

**Enforcement**: tests assert the union across `AllOf` and `AnyOf`, that a
duplicate collapses and that two duties sharing an `id` do not.

**Related**: [BEH-QD-082](behaviors/11-obligations.md), [ADR-QD-019](decisions/019-obligations.md).

---

## INV-QD-013: Enforcement never proceeds on an undischarged obligation

An entry point that runs work or hands back data refuses an allow whose binding
obligation nobody has met.

**Source**: `packages/core/src/Qadi.ts` — `assert`, `enforce` and
`enforceProjected` all route through one internal `permitted`, which
evaluates, refuses a denial, and discharges. `filter` and `filterStream`
enforce the same rule through a second path instead: the shared `decideOne`
they both call independently reimplements evaluate → `isAllowed` → discharge
per item, rather than calling `permitted`. That is deliberate, not a gap —
`permitted` returns one decision and has nowhere to put a per-item loop, and
`decideOne` is exercised on its own terms by `Qadi.test.ts`'s dedicated
`filter`/`filterStream` obligation tests, not inherited from `permitted`'s.
None of the five entry points can implement half the rule, because each of
the two paths implements it in full, independently, on its own.

`decide` and `check` deliberately implement neither: they run nothing and hand
back nothing, so there is no protected work an undischarged duty could guard.

**Implication**: forgetting `onObligations` produces a failure rather than a
deployment that believes it holds an audit record and does not. `enforce`
returns the guarded effect's value, not the decision, so without this the
obligation would be computed and thrown away in silence.

**Enforcement**: tests assert the refusal for each enforcing entry point, that
the guarded effect never starts, that a handler runs *before* it, and that a
failing handler stops it.

**Related**: [BEH-QD-085](behaviors/11-obligations.md), [ADR-QD-019](decisions/019-obligations.md).

---

## INV-QD-014: An unwired history port denies both polarities

`hasActed` and `hasNotActed` both deny when no history store is wired.

**Source**: `packages/core/src/DecisionHistory.ts` — the port is three-valued,
and `DecisionHistoryUnknown` answers `"Unknown"`, which satisfies neither.

This is [INV-QD-007](#inv-qd-007-defaults-fail-closed) surviving contact with a
*negative* policy, and a boolean could not have managed it.
`RelationshipResolverNever` fails closed by answering `false` only because
`hasRelationship` has one polarity; a `false`-answering history default would
grant under `hasNotActed`, and a `true`-answering one would grant under
`hasActed`. There is no safe boolean, so there is a third value.

**Implication**: `hasNotActed(e)` is **not** `not(hasActed(e))`. `not` inverts a
decision, so under `"Unknown"` it turns the denial into an allow — from a port
nobody wired. The two are separate `Policy` variants precisely so that the
distinction is held by the schema rather than by a comment.

**Enforcement**: tests assert both polarities deny under the default layer, and
assert directly that `not(hasActed(e))` allows where `hasNotActed(e)` denies.

**Related**: [BEH-QD-090](behaviors/12-history.md), [BEH-QD-091](behaviors/12-history.md), [ADR-QD-020](decisions/020-decision-history-port.md).

---

## INV-QD-015: Incomparable labels deny in both directions

Two labels that neither dominate nor are dominated by each other reach nothing
of the other's.

**Source**: `packages/core/src/SecurityLabel.ts` — `compareLabels` returns
`"Incomparable"` when neither covers the other, and `labelDominates` admits only
`"Equal"` and `"Dominates"`.

**Implication**: `(Secret, {CRYPTO})` and `(Secret, {BIO})` cannot read one
another. This is the property a scalar comparison destroys rather than
approximates: read as numbers both labels are `2`, each reaches the other, and
the answer is *allow* exactly where dominance says *deny*. Shipping that under
the name Bell–LaPadula would be a security defect, not a simplification.

**Why a boolean matcher is nevertheless safe here**, unlike the history port
([INV-QD-014](#inv-qd-014-an-unwired-history-port-denies-both-polarities)): both
directions of the rule are asked by *swapping the operands*, never by negating
the answer, so `Incomparable` collapsing to `false` denies in both. The four
values exist for explanation, not for the decision.

**Enforcement**: tests assert incomparability in both directions at the matcher
level and end to end through a Bell–LaPadula policy, plus a Gherkin scenario
under `@REQ-QD-013`. A mutation that drops the compartment test kills five.

**Related**: [BEH-QD-098](behaviors/13-labels.md), [ADR-QD-021](decisions/021-label-lattice.md).

---

## INV-QD-016: A batch decision is the decision made alone

Evaluating a policy over a set of subjects gives each element exactly the
decision it would have received on its own.

**Source**: `packages/core/src/SubjectSet.ts` — each element is evaluated by
`Effect.provideService(evaluate(…), CurrentSubject, subject)`. Nothing is
memoised across elements and the batch holds no state of its own, so there is no
carrier for one subject's answer to reach the next.

**Implication**: the attribute resolver's `subjectId` parameter becomes
load-bearing here in a way it was not before. With one subject per environment, a
resolver that ignored that argument was merely redundant; over a batch it hands
one subject another's attributes, and the result is a grant nobody wrote. Qadi
cannot enforce a port implementation, but the signature makes a correct one
writable and this invariant says which one is correct.

**A stronger relative of [INV-QD-008](#inv-qd-008-evaluation-is-reproducible-given-the-same-history)**:
reproducibility says the same inputs give the same answer twice; this says
neighbouring evaluations are not inputs to each other.

**Enforcement**: a test evaluates a five-subject batch and compares each element
against the same policy run under `currentSubjectLayer` alone, trace tree
included; another asserts the resolver is asked about the subject in hand. A
mutation evaluating every element as the first subject kills eleven tests, and
dropping the `provideService` does not compile — `SubjectSetServices` excludes
`CurrentSubject`, so the ambient one is unreachable.

**Related**: [BEH-QD-106](behaviors/14-subject-sets.md), [ADR-QD-022](decisions/022-subject-set-evaluation.md).

---

## INV-QD-017: A rule list stops at the first rule that cannot be overridden

Every combining algorithm has a stated stopping condition, and evaluation
performs no work beyond it.

**Source**: `packages/core/src/Walk.ts` — `evaluateRules` breaks on the first
applying rule under `FirstApplicable`, and on the first applying rule whose
effect is the *decisive* one under the overrides. Nothing else ends the walk.

| Combining | Stops at | Must otherwise |
| --------- | -------- | -------------- |
| `FirstApplicable` | the first applying rule — nothing overrides anything | — |
| `DenyOverrides` | the first applying `Deny` | evaluate every rule to permit |
| `PermitOverrides` | the first applying `Permit` | evaluate every rule to deny |

**Implication**: the overrides **invert the cost profile of the rest of the
library**, where allowing is the cheap outcome. Under `DenyOverrides` a permit is
the expensive answer, because nothing-denied is knowable only by asking
everything. That is the algorithm's meaning rather than an implementation
shortfall, and a caller who wants the cheap profile back writes
`FirstApplicable`, which is the default.

**Why this exists rather than a third clause in
[INV-QD-005](#inv-qd-005-short-circuit-preservation)**: stopping is a property of
a boolean operator there and of the *algorithm* here. Enumerating `Rules` beside
`AllOf` and `AnyOf` would have left INV-QD-005 true by listing, which is how an
invariant stops constraining anything.

**Enforcement**: six tests count resolver invocations across the three
algorithms in both directions, and assert the child count of the trace — a walk
that stopped early has fewer children than the table has rows, so the claim is
made twice by independent means. A mutation running every rule under
`FirstApplicable` kills two; one that stops the overrides at the first applying
rule of either effect kills five.

**Related**: [BEH-QD-115](behaviors/15-rules.md), [ADR-QD-023](decisions/023-combining-algorithms.md).

---

## INV-QD-018: A predicate admits exactly the rows the evaluator allows

For every translatable policy and every row, the compiled predicate and the
evaluator give the same answer.

**Source**: `packages/core/src/Predicate.ts` — `toPredicate` and
`evaluatePredicate`. Nothing structural forces the agreement; the predicate being
**executable** is what makes it checkable, and the check is what holds it.

**Implication**: this is the only invariant in the library asserted by comparing
two independent implementations of the same semantics rather than by inspecting
one. A divergence is an authorisation defect that no round-trip or coverage test
could catch — the predicate would simply return the wrong rows, silently, from a
query Qadi never sees.

**It is also the caller's tool.** A predicate compiled to SQL by the caller has
nothing saying their SQL means what Qadi meant. `evaluatePredicate` is the
reference semantics they differential-test against, so this invariant extends past
the library boundary in a way no other one does.

**Enforcement**: a `FastCheck` property samples 120 generated policies across
twelve generated rows — 1,440 comparisons. Only translatable shapes are
generated, because an untranslatable one has nothing to compare; everything
outside the subset is covered by the failure tests instead
([BEH-QD-123](behaviors/16-predicates.md)).

**Faulty ports are sampled too** ([INV-QD-058](#inv-qd-058-translation-fails-only-as-evaluation-would)):
the same generator's trees run against ports that answer, fail typed, die, or
throw synchronously, with every call logged. Three properties in
`packages/core/test/Predicate.test.ts` — walk equality on resource-free trees,
success-implies-agreement and typed failure on full trees, and a death reading as
a failure — extend the agreement from "on well-behaved ports" to "on any port".

**The generators are the invariant's weak point, and mutation testing proved
it.** A row whose columns are all well-typed never reaches the place two
interpreters diverge. Ten mutations were run against the translator and nine died
immediately; the survivor **coerced** the ordered comparison —
`Number(value) >= Number(against)` instead of requiring both to be numbers. It
survived because every generated `level` was an integer and the one hand-written
non-number case was `"red"`, which is refused by coercion too. A **numeric
string** is the discriminator: a text column holding `"3"` is admitted by
coercion and refused by the matcher. The row generator now produces integers,
numeric strings and `null` for that column, and the property kills the mutant.
Rows missing a column entirely are generated for the same reason: `undefined`
must read identically on both sides.

**The generators were the weak point a second time, on the other operand, and
this one was a live violation rather than a surviving mutant.** `Matcher.ts`'s
`evaluateMatcher` guards its `Gte`/`Lt` **bound** with `Number.isFinite` —
deliberately, because a bound crosses the same untrusted-JSON boundary a policy
does and JSON has no literal `Infinity` but `1e400` decodes to one, so an
unguarded `Infinity` bound dominates every finite attribute value.
`Predicate.ts`'s `compare` implemented the same two operators with the `typeof`
half of that guard and not the `Number.isFinite` half. The consequence was the
worst shape this invariant can take: `toPredicate` on
`hasResourceAttribute("level", gte(-Infinity))` compiled a filter admitting
**every** row with a numeric column, while `evaluate` on the identical policy
denied **every** row — a filter that admits everything is a silent bypass, and
is exactly what [ADR-QD-024](decisions/024-predicate-output.md) warns would make
`toPredicate` worse than not having it. The property could not see it because
its `Gte`/`Lt` generator drew from `integer({min: 0, max: 5})`: the bound was
the one operand it never varied in kind. `compare` now carries the guard, the
generator samples `±Infinity` and `NaN` bounds for `Gte`/`Lt` (and `NaN` for
`Eq`/`Neq`, where the two interpreters already agreed and must keep agreeing),
and the named policy above is pinned as its own test as well, since a seeded
sample is not evidence a reader can check by eye. Both fail without the guard
(issue #65, CCR-QD-120).

**And a third time, on the row operand (2026-10-05, CCR-QD-172).** The
CCR-QD-120 fix guarded the bound and wrote down why the row side needed
nothing: that the two interpreters could not disagree about a non-finite *row*
value. They did: `evaluateMatcher` had guarded the
resolved value since CCR-QD-116, so it denied `Infinity >= 3` while
`evaluatePredicate` admitted it. `toPredicate` on
`hasResourceAttribute("level", gte(3))` admitted an `Infinity` row, and on
`lt(3)` a `-Infinity` row, that `evaluate` denied — the fail-open direction
again. The property could not see it for the reason it missed the bound: the
`level` generator drew integers, numeric strings and `null`, never a non-finite
number. It now draws `±Infinity` and `NaN` too, the failure message spells them
out (plain `JSON.stringify` printed them as `null`), and a named test pins
`gte(3)`, `lt(3)` and their negations on all three values. The structural fix
followed: both interpreters' leaves now read one module, `Compare.ts`, so the
rule cannot be in one and missing from the other
([INV-QD-091](#inv-qd-091-a-primitive-matcher-and-its-predicate-leaf-are-one-function)).

**Related**: [BEH-QD-127](behaviors/16-predicates.md), [ADR-QD-024](decisions/024-predicate-output.md), [ADR-QD-091](decisions/091-comparison-semantics-have-one-owner.md).

---

## INV-QD-019: Dominance is a partial order

`labelDominates` is reflexive, antisymmetric and transitive over every label.

**Source**: `packages/core/src/SecurityLabel.ts` — `compareLabels` composes `>=`
on `level` with containment on `compartments`, and both relations are themselves
partial orders.

**Implication**: this is what makes the ★-property a guarantee rather than a pair
of checks. A subject may read `source` when it dominates it and write `sink` when
`sink` dominates it; information then flows `source → sink`, and confidentiality
requires `sink` to dominate `source`. That conclusion follows **only** if
dominance composes. Bell–LaPadula's security property is therefore not an extra
rule the evaluator enforces — it is a consequence of the order being an order,
and it is the one thing about the model that no example-based test states.

[INV-QD-015](#inv-qd-015-incomparable-labels-deny-in-both-directions) covers
incomparability, which is one law of four. The other three had been asserted only
by example, and both [MOD-QD-027](models/27-bell-lapadula.md) and
[MOD-QD-029](models/29-mls.md) prescribed property tests for them.

**Enforcement**: `FastCheck` properties in `packages/core/test/Matcher.test.ts`
sample labels over four levels and three compartments — small deliberately, since
a wide alphabet makes overlapping-incomparable pairs rare, and those are the pairs
where a law can fail. Antisymmetry is asserted as the **implication** (mutual
dominance forces equal level and equal compartment set), not by comparing a pair
built to be equal. The flow property is stated separately in the terms the model
uses, and each property counts its witnesses and asserts the count, because an
antecedent that never fires makes the assertion vacuous — only about one triple in
sixteen forms a dominance chain.

**What this invariant is, honestly**: regression protection, not a bug found. The
laws hold *structurally*, and no mutation of `covers` or `compareLabels` broke one
without also breaking an example test. The change it guards against is a named
one: MOD-QD-029 asks for `join`, and a configurable lattice or a compartment
hierarchy is exactly where a structurally-emergent transitivity stops being
emergent. An invariant recorded before that change is cheap; recorded after, it
is archaeology.

**Related**: [BEH-QD-102](behaviors/13-labels.md), [ADR-QD-021](decisions/021-label-lattice.md).

---

## INV-QD-020: Concurrency changes lookups, never decisions

For every policy and every request, the `Decision` and its `Trace` are identical
whether or not `EvaluateOptions.concurrency` is supplied — **and so is which error
surfaces**, when the evaluation fails rather than deciding.

**Source**: `packages/core/src/Walk.ts` — the rules that combine child traces
live in one fold per composite (`stepAllOf`/`finishAllOf`, `stepAnyOf`/
`finishAnyOf`, and the `step` closure inside `evaluateRules`). Both paths drive
that same fold in declaration order; the sequential one stops evaluating when a
step yields a verdict, the concurrent one evaluates everything and then stops
*folding* at the same index.

All three composite dispatchers' concurrent branches — `AllOf`, `AnyOf`, and
`Rules`'s condition list — run each child through `Effect.exit` rather than
bare, and fold `Exit`s instead of `Trace`s: the first index that is either an
`Exit.Failure` (re-raised via `Effect.failCause`) or a decisive `Exit.Success`
trace wins, exactly where the sequential walk would have reached it. This
closed a real gap (CCR-QD-152): `Effect.forEach`'s default error mode is
fail-fast, so a later-indexed child failing could abort the whole dispatch
before an earlier-indexed child's already-decisive `Deny`/`Allow` (or, for
`Rules`, its already-decisive applying row) was folded — concurrent evaluation
raising an error where sequential evaluation would have reached a `Decision`
first. Exiting every child means every child still runs (no loss versus what
the concurrent path already evaluated speculatively), while letting the
declaration-order fold — not the scheduler — decide which outcome, decision or
failure, wins.

**Implication**: `Trace.children` is the half a naive implementation gets wrong.
`Effect.forEach` preserves input order, so the verdict would survive while the
trace grew — a concurrent `allOf` recording four children where the sequential one
records two. The trace is public, is what `filter` and the React bindings surface,
and is what a reviewer reads to answer "why". So the concurrent path **discards**
trace nodes for children evaluated after the decisive one: the work was speculative
by construction, and keeping it would make the trace depend on a performance switch.
The same discarding now applies to a failure past the decisive index: an `Exit`
for a child the sequential walk would never have reached is folded, never
inspected, and never surfaced.

**This is structural rather than asserted into place.** There is no second copy of
the decision rules to compare against — unlike
[INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows),
where a predicate has an independent reason to exist as a second interpreter. A
schedule has none, so duplicating the rules and testing agreement was rejected in
favour of sharing them.

**Enforcement**: a `FastCheck` property samples 150 generated trees — composites
under all three field strategies, negation, and rule tables under all three
combining algorithms — and compares the full trace across sequential, bounded and
unbounded evaluation. Plus explicit cases for the three interactions that made this
undesignable earlier: `First` field-set order, the deciding rule selected by index
rather than arrival, and a resolver failure in a branch a sequential walk would
have skipped. A second `FastCheck` property (CCR-QD-152) fault-injects: each
generated tree — composites of `AllOf`, `AnyOf`, `Not`, and `Rules` under all
three combining algorithms — has leaves that independently allow, deny, or
fail, and the property asserts sequential and concurrent evaluation reach the
same `Decision`, or — when either fails — the same error, by declaration-order
index.

**The property needs a vacuity guard, and this is the second time.** Equality of
decisions alone would hold for a `concurrency` option that did nothing at all, so
the property counts the trees where the concurrent run performed *more* lookups
than the sequential one and asserts that count is non-trivial. INV-QD-018 cost this
lesson once; it is cheaper to apply it than to relearn it.

**Related**: [BEH-QD-130](behaviors/17-concurrency.md), [INV-QD-005](#inv-qd-005-short-circuit-preservation), [ADR-QD-026](decisions/026-concurrent-evaluation.md).

---

## INV-QD-021: Every policy explains

`explain` returns a non-empty explanation for every policy, and the explanation
has exactly one node per policy node.

**Source**: `packages/core/src/Explanation.ts` — `explain`, `matcherText` and
`refText` are each a `Match.tagsExhaustive` over their union, so a variant added
without an arm fails to compile. `explain` has no error channel and no services in
its signature. Totality covers the rendering of a policy built in code as well:
a `fieldStrategy` or `combining` outside its closed union is tested for
membership first — `FieldLattice.ts`'s `isFieldStrategy` and `ShortCircuit.ts`'s
`isCombining`, the same own-property lookups the evaluator decides through — and
named verbatim with what it is evaluated as, so the `Match.exhaustive` over the
known values is reached only by a known value (ADR-QD-092 amendment,
CCR-QD-183).

**Implication**: an unexplained node would render as `undefined` inside an
otherwise fluent sentence — the worst failure mode available here, because it reads
as prose and a reviewer would not notice a requirement had gone missing. Totality
is what makes the output safe to put in front of someone making a decision.

**This is the one interpreter with no agreement property**, and that is a real
difference from [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows).
A predicate is a second way of *deciding*, so it can be compared against the
evaluator row by row. An explanation is prose *about* a policy: there is nothing to
compare it to, and no test can establish that a sentence means what a tree says.
So what is asserted instead is the structural correspondence — one explanation node
per policy node — because a composite that silently dropped a child would still
render fluently.

**Not symmetrical with `toPredicate`, deliberately.** That refuses what it cannot
translate ([BEH-QD-123](behaviors/16-predicates.md)); this refuses nothing. A
partial translation returns wrong rows, so refusing is safe; a partial explanation
is an incomplete description, and no description at all is worse.

**Enforcement**: a `FastCheck` property over 200 generated trees asserts every
rendering is non-empty and contains neither `"undefined"` nor `"[object"`. Every
matcher and every value reference has an explicit case, because a missing arm would
render as `undefined` in the middle of a sentence rather than throw. Node counts
are compared directly. `Explanation.test.ts`'s "outside its closed union" block
renders every composite shape — empty, one part, two parts, a rule table — under
an unknown string, each `Object.prototype` key, the empty string and three
non-strings, pins each sentence exactly, and checks each sentence's claim (no
fields; `DenyOverrides`) against a real `evaluate`; `explanation.feature` carries
two of each as scenarios.

**Related**: [BEH-QD-137](behaviors/18-explanation.md), [BEH-QD-141](behaviors/18-explanation.md), [ADR-QD-027](decisions/027-policy-explanation.md).

---

## INV-QD-022: A hydrated decision belongs to the subject that hydrates it

A server-rendered decision is seeded into a client registry only when the payload's
subject id is the hydrating subject's.

**Source**: `packages/react/src/HydrationEngine.ts` — `hydrateWith` (reached through
`Hydration.ts`'s `hydrateDecisions` and the atom set's `hydrate`) returns an empty
seed list on a mismatch, and drops any entry whose shape or policy it cannot
verify: `evaluationId`, `durationMillis`, `visibleFields`, `obligations` and the
`disclosure` are checked against `DehydratedEntryWire` — derived from `@qadi/core`'s
`DecisionWire`, not restated — and `policy` is checked separately against
`PolicySchema`. A `Disclosed` trace must also name the entry's own policy: its
root `policyTag` must equal the decoded `policy._tag`, or the entry is dropped as
`MalformedEntry`. Every field of the untrusted payload is validated, not just the
one this invariant used to name, and so is the envelope itself. `dehydrateDecisions`
drops entries whose decision belongs to a different subject than the payload
claims.

**Implication**: a hydration payload is **authorization state crossing a network**,
and the failure mode is a page cached or reused across users — one subject's allows
seeding another's registry. There is no lookup to catch that: the decision is
already made, and seeding it is asserting it. This is the only place in the library
where a decision enters the system without having been evaluated by it, which is
why it is the only place that needs to check whose decision it is.

**It fails closed by dropping, not by throwing.** A refused payload leaves every
atom `Initial`, so the client asks the question properly and the page flashes —
exactly what would have happened without hydration. Throwing would turn a cache
misconfiguration into a blank page; trusting would turn it into a breach. Dropping
is the only option that degrades to the pre-hydration behaviour.

**Disclosure is the second half.** A `Trace` names every node's tag, its label and
the sentence explaining why it refused, so shipping one describes the policy's
internal structure and which branch this subject failed. It is withheld by default
and disclosed only on request — [INV-QD-007](#inv-qd-007-defaults-fail-closed)'s
reasoning applied to information rather than to decisions.

**Enforcement**: `Hydration.test.ts` seeds one subject's payload into another
subject's registry and asserts the second subject is **denied** — the hydrating
subject deliberately holds no permissions, so a leak would surface as an `Allow`
carrying the other subject's evaluation id. A malformed policy entry, a
subject-mixing payload, and the absence of the denial reason in the serialized
payload are each asserted directly.

**Related**: [BEH-QD-146](behaviors/19-hydration.md), [BEH-QD-147](behaviors/19-hydration.md), [ADR-QD-028](decisions/028-decision-hydration.md).

---

## INV-QD-023: Every pair of labels has a least upper and a greatest lower bound

`join(a, b)` dominates both operands and is dominated by everything that dominates
both. `meet(a, b)` is dominated by both and dominates everything both dominate.

**Source**: `packages/core/src/SecurityLabel.ts` — `join` takes the maximum of the
levels and the union of the compartments; `meet` takes the minimum and the
intersection. Both are pure and neither is reachable from the evaluator.

**Implication**: this is what makes the structure a **lattice** rather than merely a
partial order, and it closes a contradiction the specification carried from E4 until
CCR-QD-030. [MOD-QD-029](models/29-mls.md) defines a lattice as "a partial order
with joins"; ADR-QD-021 shipped the order and declined the joins, so by that
document's own definition what shipped was not the thing it was named for. Two of
the seven laws in its Verification table were recorded as *Void — declined* rather
than unmet.

**The security reason it exists, which is not the algebra.** A caller labelling a
document derived from two sources has to compute the join, and the natural mistake —
take the higher level, carry *its* compartments — produces a label the correct one
**dominates**. So the derived object is labelled *lower* than its contents, and a
reader without the missing compartment reads material they have no clearance for
while every comparison in the system behaves correctly. The wrong label is compared
correctly, which is why no other invariant catches it and why a prose warning in a
model document could not.

**It does not move ADR-QD-021's boundary.** Deriving a label is still not a decision:
no policy variant computes one, no matcher constructs one, and `Walk.ts` does not
import either function. If it ever does, the line has been crossed and
[ADR-QD-029](decisions/029-lattice-join-and-meet.md) needs revisiting rather than
extending.

**Enforcement**: `FastCheck` properties over sampled triples assert both bound laws
in both directions, plus the two **absorption** laws — `join(a, meet(a, b)) = a` and
`meet(a, join(a, b)) = a`. Absorption is what distinguishes a lattice from any two
functions that happen to return bounds, and it is the law a compartment hierarchy
would break first. The under-classification mistake is asserted directly: the
correct join strictly dominates the mistaken one, and a reader who may read the
mistaken label may not read the correct one.

**Related**: [BEH-QD-103](behaviors/13-labels.md), [INV-QD-019](#inv-qd-019-dominance-is-a-partial-order), [ADR-QD-029](decisions/029-lattice-join-and-meet.md).

---

## INV-QD-024: Simplification changes the tree and nothing a caller can observe

For every policy and every subject, `simplify(p)` yields the same verdict, the same
`visibleFields` and the same obligations as `p`.

**Source**: `packages/core/src/Simplify.ts` — two rewrites, both conditional:
a single-child composite collapses to its child **only under a known strategy**,
and a composite nested in the same composite flattens **only when the field
strategies match** and, for an empty nested `allOf`, only where that strategy's
empty merge is its unit. Both conditions are `FieldLattice.ts`'s laws
(`singletonIsIdentity`, `emptyIsUnit`), read rather than restated (ADR-QD-092).
Without the second, `allOf([allOf([], { fieldStrategy: "Union" }), x], { fieldStrategy: "Union" })`
— every field — simplified to `x`; without the first, a one-child composite under
a strategy outside the union widened from no fields to its child's (CCR-QD-174).

**Implication**: the guarantee has to be about fields and duties, not only the
verdict. A rewrite that preserved allow-or-deny while changing `visibleFields` would
be a **disclosure** defect, and field visibility is the reason this library exists
([MOD-QD-007](models/07-field-level.md)). Every allow-or-deny test in the suite would
still have passed.

**It deliberately does *not* preserve the trace.** A simplified policy has fewer
nodes, so its trace has fewer nodes; that is what "smaller tree" means. `labeled`
nodes are never removed, so a denial's attribution survives, and nothing in the
library calls `simplify`, so no trace changes unless a caller asks
([ADR-QD-030](decisions/030-policy-simplification.md)).

**The property rejected a rewrite, which is the point of having it.** Double
negation elimination — `not(not(p))` → `p` — was written and is unsound here. `Not`
carries `visibleFields: undefined`, the top of the lattice, and no obligations,
because knowing a policy did *not* hold says nothing about which fields are safe. So
`not(not(hasPermission(read, { fields: ["id"] })))` allows with **every** field where
the inner policy allows with `["id"]`, and `not(not(obliged(audit, p)))` owes
**nothing** where the inner owes `audit`. Both differences run in the safe direction
for the rewrite, and both are differences.

That counterexample needs a policy which *allows* with a restricted field set beneath
two negations, and every intuition says the negations cancel — so it is not something
a hand-written test would have looked for. It is the second time a property has paid
for itself by contradicting something obvious; the first was
[INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows).

**Enforcement**: a `FastCheck` property over 120 generated trees × **four subjects**,
comparing verdict, visible fields and obligations. Four subjects rather than one
because a rewrite sound for a subject who is denied everything says nothing: the
field-strategy trap is invisible unless two branches *allow* with different field
sets. A vacuity guard asserts that more than forty trees actually shrank, since the
property holds trivially for a `simplify` that returns its argument. The generator
carries an arm building a same-strategy composite around an *empty* same-strategy
child, and a second vacuity guard counts the sampled trees holding a `Union`/`First`
`allOf` with such a child — the shape the property missed for want of generating it
(ARCH-12 T9). Idempotence is a second property over 200 trees.

**Related**: [BEH-QD-154](behaviors/20-simplification.md), [BEH-QD-155](behaviors/20-simplification.md), [INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top), [ADR-QD-030](decisions/030-policy-simplification.md).

---

## INV-QD-025: A cache hit differs from a miss only in speed and identity

A cached decision equals an uncached one in verdict, visible fields, obligations and
trace, and carries a **different** `evaluationId`.

**Source**: `packages/core/src/DecisionCache.ts` and `Evaluate.ts` — the cache stores
the `Trace`, and `evaluate` stamps `evaluationId` and `durationMillis` per call on a
hit as well as a miss.

**Implication**: caching the `Decision` whole is the obvious implementation and it
breaks correlation. Two evaluations would share one `evaluationId`, so two log lines,
two spans and two audit records would claim to be the same event — undoing
[ADR-QD-012](decisions/012-deterministic-time-and-ids.md), whose whole purpose is that
an identifier comes from a service so traces can be correlated and tested. So the
identity clause is asserted as an **inequality**: equality there is the defect, not
the guarantee.

**The key is a security boundary, and this is the second time.** The key is
`subjectId + policy + resource + action`. Keyed on the policy alone, a cache serves
one subject's allow to another — the same class of defect as an unbound hydration
payload ([INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it)).
A decision is *about* a subject, so any structure holding decisions holds the subject.
`concurrency` is deliberately **not** in the key: it cannot change the answer
([INV-QD-020](#inv-qd-020-concurrency-changes-lookups-never-decisions)), so including
it would split one entry in two for nothing.

**Freshness is the caller's, and the failure mode is not the key's.** A correct key
prevents the cross-subject leak; only the *lifetime* governs staleness, and Qadi has
no notion of a request boundary. `decisionCacheLayer` is therefore a function
returning a fresh cache, so a call site reads as "make a cache here".

**A silently-ineffective cache is worse than none**, which is why the trap has a test
rather than a note. `Effect.provide` builds a layer per execution, so piping the cache
onto a single `evaluate` yields a fresh empty cache every run: the same lookups, the
same cost, and code that reads as though it were caching.

**Enforcement**: `DecisionCache.test.ts` — the same question twice with and without a
cache, counting resolver calls; a hit compared field by field against its miss with
`evaluationId` asserted **unequal**; two subjects through one cache with a resolver
that answers differently, so a leak surfaces as the second subject being allowed; the
resource and the action each shown to split entries; a denial shown to cache; the
per-evaluation trap asserted directly; and `concurrency` shown not to split an entry.

**Related**: [BEH-QD-162](behaviors/21-decision-cache.md), [BEH-QD-163](behaviors/21-decision-cache.md), [ADR-QD-031](decisions/031-decision-cache.md).

---

## INV-QD-026: The facade answers what the core answers

For every subject and policy, `@qadi/promise` resolves the value `@qadi/core`
produces, and rejects exactly when the core fails.

**Source**: `packages/promise/src/index.ts` — every method is `runPromise` applied to
a core function. There is no branch in the package that decides an authorization
outcome, which is what makes "never a second evaluator" checkable by reading rather
than by trusting.

**Implication**: this is the invariant that stops the predecessor's defect
recurring. It shipped a synchronous `evaluate` beside an `evaluateAsync` that
pre-resolved the whole tree, destroying short-circuiting and leaving the asynchronous
relationship API unreachable — and the second path rotted because nothing exercised
it ([ADR-QD-004](decisions/004-single-effect-evaluator.md)). Two evaluators means two
sets of semantics, and the second is always the one nobody tests.

**A denial resolves; a failure rejects.** That is
[INV-QD-006](#inv-qd-006-failure-is-not-denial) crossing a boundary that invites
breaking it: `try { check() } catch { return false }` is the natural Promise idiom and
it turns an attribute-store outage into a silent lockout. A denial is an *answer*, so
it is a value; a broken lookup is not an answer, so it is a rejection. `assert` is the
deliberate exception, because there the caller has said "proceed only if permitted".

**Enforcement**: a test runs both paths over the same subjects and policies and
compares the boolean **and the whole trace** — the facade must not reshape an answer,
only re-package it. Separately, a failing resolver is asserted to *reject* rather than
resolve `false`, which is the assertion that would catch the idiom above.

**Related**: [BEH-QD-169](behaviors/22-promise-facade.md), [BEH-QD-170](behaviors/22-promise-facade.md), [ADR-QD-032](decisions/032-promise-facade.md).

---

## INV-QD-027: The published package decides what the sources decide

The package a consumer installs answers as the sources do. A permission the subject
holds allows, one it does not holds denies, and both entry points agree — through the
published `exports` map, against the shipped declarations, outside this repository.

**Source**: `tsconfig.build.json` emits every public package, and `pnpm pack` resolves
the workspace-time dependency protocols that `npm pack` copies through verbatim. Both
are conditions on the artifact rather than on the code, which is why neither could be
established by reading it.

**Implication**: the artifact cannot pass while the sources fail, nor the reverse. It
was the reverse that occurred: `@qadi/promise` type-checked, tested and mutation-tested
green for six commits while `pnpm build` emitted nothing for it, because a *different*
project graph — the typecheck one — included the package and left a `lib/` behind that
looked like a build product. Ten gates read the sources and agreed, and the tarball
would have shipped empty.

**Enforcement**: step 14 of `pnpm check`. `scripts/check-package-install.mjs` reads the
build graph, packs each public package with `pnpm`, extracts the tarballs into a sandbox
resolving `effect` and `react` from this workspace, and compiles and runs a TypeScript
consumer against the shipped `.d.ts`. Its first check is static because it is the only
one a stale `lib/` cannot fool. Verified against five deliberate breaks: packing with
`npm`, an `exports` path with no file behind it, a renamed declaration, an
allow-turned-deny in the built evaluator, and the promise package removed from the build
graph *with its stale output left in place*.

**Related**: [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-026](#inv-qd-026-the-facade-answers-what-the-core-answers), [ADR-QD-033](decisions/033-the-packed-artifact-is-the-product.md).

---

## INV-QD-028: A seed never outlives the client's own answer

A server-rendered decision covers only the frames before this client has decided
for itself. Once it has — allow, deny or failure — that answer is what every
consumer reads, and the seed is never read again.

**Source**: `packages/react/src/HydrationEngine.ts`'s `makeSeededQuestion` — the
seed is a separate atom from the decision, and the atom a consumer reads is a
derivation that consults the seed only while the computed result is `Initial`. `Initial` is the one state meaning
"this client has never answered", so the precedence is a property of the
expression rather than of when an effect settles.

**Implication**: the reverse is what occurred. Seeding the decision atom directly
put the seed under `AtomRegistry`'s `preserveInitialValueOnBuild`, which keeps a
seeded value over the one the node computes. An asynchronous evaluation escaped it
by publishing through `setSelf` on a later turn; a **synchronous** one published by
returning, and was discarded. Every policy needing no resolver evaluates
synchronously, so a subject held a server-issued allow they no longer qualified
for, for the life of the page.

Note the relationship to [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it)
and to [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md): the
bypassed value was bound to the right subject, and was not `waiting`, so
`currentDecision` returned it and every consumer was correct. **ADR-QD-017 guards
the `waiting` flag; this failure never set it.** An invariant about staleness that
speaks only of the flag does not reach a value that was never marked stale.
The same is true of a failed re-check, whose `previousSuccess` is the last allow
with no flag set; [INV-QD-094](#inv-qd-094-a-decision-being-re-checked-or-that-failed-never-reads-as-a-verdict)
closes that one at the read (ADR-QD-093).

**Enforcement**: `packages/react/test/Hydration.test.ts` seeds an allow for a
policy the subject fails and asserts the read is a denial, both immediately and
after every scheduled turn has run — the shape of assertion the suite previously
had none of, because every test read the registry on the tick it was built and so
could only observe that a seed was *present*.

**Related**: [BEH-QD-151](behaviors/19-hydration.md), [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it), [ADR-QD-039](decisions/039-a-seed-is-not-an-authority.md), [ADR-QD-028](decisions/028-decision-hydration.md).

---

## INV-QD-029: A denial names only what was consulted

A denial's reason never asserts a fact about a store that was not consulted.

**Source**: `packages/core/src/RelationshipResolver.ts` — the port is
three-valued, so `RelationshipResolverNever` answers `"Unknown"` rather than
`"Unrelated"` and `evaluateHasRelationship` has a distinct arm for it.
`packages/core/src/Walk.ts` — `attributeReason` says "has no value" for an
unresolved attribute and "did not match" only for one that was resolved and
compared.

**Implication**: the reverse is what shipped. An unwired relationship resolver
denied with `subject 'u1' has no 'owner' relation to 'doc-1'`, which is a claim
about the contents of a graph that had never been connected. That sentence
reaches an `AccessDenied` handler, a `renderTrace` line and a `Can` fallback, and
it sends the reader to audit their edges when the fix is in their layer wiring.
The unwired state is also the state every ReBAC integration starts in, so this
was the first sentence most readers ever saw.

Note what this invariant does **not** claim. The verdicts are identical either
way — both arms deny, [INV-QD-007](#inv-qd-007-defaults-fail-closed) is untouched,
and no decision anywhere moves. This is an invariant about diagnosis, and it is
worth stating precisely because nothing in a verdict-shaped test could have
caught its violation.

The attribute half is milder and is included for the same reason. `did not match`
is *true* of an unresolved attribute — every matcher fails `undefined` — so
nothing was false there; the diagnosis was merely withheld, and a misconfigured
`AttributeResolver` produces that case exclusively.

> **Corrected.** "`did not match` only for one that was resolved and compared" was
> true of every matcher but one: `Neq` denies exactly when the value **matches**
> the excluded reference (`evaluateMatcher`'s `Neq` arm is `value !==
> resolveRef(...)`, so a `false` there means the two were equal), and for that
> matcher "did not match" claimed the opposite of what happened — not a withheld
> diagnosis, an inverted one. `attributeReason` now takes the matcher and says
> `'<attribute>' matched an excluded value` for `Neq`'s resolved-and-compared
> case; every other matcher's denial is unchanged.

> **Corrected (CCR-QD-114).** The relationship sentence quoted above —
> `"no relationship resolver is wired, so no 'owner' relation to 'doc-1' can be
> confirmed"` — was itself an unverified claim: `RelationshipResolver.ts`'s
> `RelatedResult` doc already documented that a *wired* resolver may answer
> `"Unknown"` too, so a wired-but-uncertain resolver reaching this same arm was
> told it did not exist. This invariant's own rule caught its own violation.
> The sentence is now `"no relationship resolver could confirm the 'owner'
> relation to 'doc-1'"`, which asserts nothing about wiring — see
> [BEH-QD-045](behaviors/06-services.md#beh-qd-045-a-denials-reason-names-only-what-was-consulted).

**Enforcement**: `packages/core/test/Evaluate.test.ts` pins both sentences
against each other — an unwired resolver beside a wired store that looked and
found nothing, an absent attribute beside a present one that compares wrong —
and, separately, a `Neq` denial's sentence against a same-shaped non-`Neq` one,
and a wired resolver that itself answers `"Unknown"` against the unwired
default, to pin that both reach the identical sentence rather than one naming
a wiring state the other cannot have. A single sentence for both cases passes
any test asserting only the verdict, which is how the original gap survived to
be found by reading. `features/features/rebac/relationships.feature` carries
the unwired/wired pair.

**Related**: [BEH-QD-045](behaviors/06-services.md), [BEH-QD-043](behaviors/06-services.md), [ADR-QD-040](decisions/040-an-unwired-port-names-its-absence.md), [ADR-QD-020](decisions/020-decision-history-port.md), [INV-QD-014](#inv-qd-014-an-unwired-history-port-denies-both-polarities).

---

## INV-QD-030: Cache key uniqueness

Two distinct questions never produce the same cache entry.

**Source**: `packages/core/src/Question.ts`, `DecisionCache.ts` — the `Question` is used as
a `HashMap` key directly, with no serialization step. Effect's `Equal`/`Hash`
compare plain objects structurally, nested included, so equality of keys is
equality of questions.

**Implication**: the reverse held, and it was a serving defect rather than a
performance one. `keyOf` was `JSON.stringify`, which maps a `Date` onto its ISO
string, drops `undefined`-valued and function-valued properties, and renders
`NaN` as `null` — so `{d: new Date(0)}` and `{d: "1970-01-01T00:00:00.000Z"}`
were one key for two questions, and the second caller received the first's
verdict.

This is [INV-QD-001](#inv-qd-001-permission-key-uniqueness) one layer down, and
the wording deliberately matches it. A permission key and a cache key are the
same kind of object — a projection used as an identity — and the same rule has
to hold of both.

Note what this repairs rather than adds.
[INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)
says a hit differs from a miss only in speed and identity; under a colliding key
a hit differed in **verdict**, so that invariant was false and is now true. The
function's own doc comment had claimed the opposite property — that stringifying
was the option with "no chance of colliding" — which is why nothing looked.

A second consequence, not the point: two structurally equal resources whose
properties were written in a different order now **hit**. That was previously
documented as a deliberate miss, and it is safe to drop precisely because the
comparison is now real structural equality rather than a stringification that
happens to agree.

**Enforcement**: `packages/core/test/DecisionCache.test.ts` counts resolver
invocations for the two collision shapes — a `Date` beside its ISO string, an
`undefined`-valued property beside an absent one — and asserts two evaluations,
not one.

**Related**: [BEH-QD-167](behaviors/21-decision-cache.md), [INV-QD-001](#inv-qd-001-permission-key-uniqueness), [INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity), [ADR-QD-042](decisions/042-a-projection-is-not-an-identity.md).

---

## INV-QD-031: A rendered explanation denotes exactly one policy

Two policies that are not equivalent never render to the same sentence.

**Source**: `packages/core/src/Explanation.ts` — `renderExplanation` embeds every
child through one `embed` helper, which parenthesises anything that is not
atomic. Only a `Requirement` and the empty `All`/`Any`/`Table` render bare, the
latter because their fixed sentences have no loose end for a following word to
attach to — except an empty `All` whose `fieldStrategy` is outside the closed
union, which carries a trailing clause saying so and is therefore wrapped.
`fieldStrategyClause` and `HasRelationship`'s `explain` arm are the
two places a policy field can affect *what a node says* rather than how it
nests, and both are covered below.

**Implication**: the reverse shipped. `anyOf([a, allOf([b, c])])` and
`allOf([anyOf([a, b]), c])` produced a byte-identical sentence, and they are not
the same policy — the first admits a lone `a`. The rendering is the only thing an
administrative screen shows ([ADR-QD-027](decisions/027-policy-explanation.md)
made it the one place English is assembled), so a reviewer had no way to recover
which policy they were reading.

The same flattening left an obligation ambiguous: `allOf([x, obliged(o, y)])`
read as though the whole policy owed `o`, when only the second branch does.

An `All`/`Any` composite's `fieldStrategy` and a `HasRelationship` policy's
`depth` are the same shape of gap, found later (CCR-QD-114): neither field
reached the sentence at all, so `allOf(parts, { fieldStrategy: "Union" })` and
the same parts under `"Intersection"` — or `hasRelationship("owner")` against
`hasRelationship("owner", { depth: 1 })` — rendered identically though they are
not the same policy. `fieldStrategy` is now named whenever it departs from the
default a bare `allOf`/`anyOf` implies; `depth` is now named whenever the
policy carries one. A `fieldStrategy` or `combining` outside its closed union is
named verbatim, so it never renders like a known value, and two such strings
never render alike (CCR-QD-183). They are equivalent policies anyway — every
value outside the union is evaluated the same fail-closed way.

**The top level is deliberately never wrapped.** Nothing follows it, so there is
nothing to run into, and wrapping it would put brackets around every sentence in
the library for no gain.

**Enforcement**: `packages/core/test/Explanation.test.ts` pins the two policies
above and asserts their renderings differ, one case per embedding position so a
site that reverted to bare joining fails on its own shape, and the atomic cases
in the other direction so parentheses cannot spread to ordinary sentences.
`features/features/explanation/explanation.feature` carries the pair as scenarios.
The same file also pins a non-default `fieldStrategy` and a defined
`HasRelationship.depth` each appearing in the rendering, and two policies
differing only in one of those fields rendering to different sentences.

**Related**: [BEH-QD-137](behaviors/18-explanation.md), [ADR-QD-042](decisions/042-a-projection-is-not-an-identity.md), [ADR-QD-027](decisions/027-policy-explanation.md).

---

## INV-QD-032: A guarded resource is the evaluated resource

The resource `guard` is given is the resource the policy is evaluated against.

**Source**: `packages/core/src/Qadi.ts` — `guard` calls
`enforce(policy, { ...options, resource })`, so the positional resource reaches
evaluation and overrides any `options.resource`.

**Implication**: the reverse shipped, and it was fail-open rather than
fail-closed. The resource was passed only to the handler; the policy was
evaluated with `options.resource`, which no caller set. An absent resource does
**not** deny — `resolveRef` yields `undefined` for a `ResourceRef` with no
resource, and `neq` on `undefined` is `true` — so a policy written to refuse a
mismatched tenant allowed one, and the handler received an `Authorized<P>`
witness asserting a check that never ran.

`@qadi/http`'s `guardRoute` loads a resource per request and passes it here, so
its central parameter was authorization-inert. The defect survived because that
package's fixture uses a subject-only policy, against which an empty resource and
a correct one are indistinguishable.

A second consequence, now correct: an **empty** resource reaches the evaluator
and denies a resource-scoped policy, where no resource at all fails with
`MissingResource`. That is the difference between a 403 and a 500 in
`@qadi/http`, and `NO_RESOURCE`'s comment had described the former while the code
did the latter.

**Enforcement**: `packages/core/test/Qadi.test.ts` guards a resource that should
be refused and asserts `AccessDenied` with the handler never started, guards one
that should pass so the test cannot succeed by denying everything, pins the empty
resource as a denial rather than an error, and pins the positional resource
winning over `options.resource`.

**Update (CCR-QD-112):** "`neq` on `undefined` is `true`" described the
mechanism, not just this one wiring bug — the fix above ensured a resource
reached evaluation, but `Neq` itself still matched an absent operand
anywhere it occurred, ref or value side. That has since been closed at the
source: `Neq` (and `Eq`, for the symmetric both-absent case) now deny on any
absent operand, so the sentence above is historical rather than a
description of current behavior. See [BEH-QD-026](behaviors/04-matchers.md)
and issue [#36](https://github.com/leaderiop/qadi/issues/36).

**Related**: [BEH-QD-055](behaviors/07-enforcement.md), [ADR-QD-043](decisions/043-a-decision-is-computed-from-its-inputs.md), [ADR-QD-035](decisions/035-witness-guard-primitive.md), [INV-QD-006](#inv-qd-006-failure-is-not-denial).

---

## INV-QD-033: A cached decision belongs to the grants that earned it

Two subjects with different grants never share a cache entry, whatever their ids.

**Source**: `packages/core/src/Question.ts` — the `Question` carries the
whole `AuthSubject`, not `subject.id`. `AuthSubject.roles`/`.permissions` are
the built-in JS `Set`, not `effect/HashSet`; `packages/core/src/DecisionCache.ts`'s
`Question` doc comment (verified against the installed `effect` build,
after a prior version of that comment named `HashSet` and asserted the same
property for the wrong reason) records that `Equal`/`Hash` special-case
`self instanceof Set` and fold its elements order-independently, so two
subjects whose grants are equal in content but held in different `Set` objects
still compare equal as cache keys. `DecisionCache.test.ts`'s "equal grants,
different Set identity, still a hit" pins this mechanism.

**Implication**: the key was `subject.id`, and an id is a sound proxy for a
subject only if it determines that subject's grants. It does not.
`@qadi/http`'s `SubjectExtractor` rebuilds an `AuthSubject` per request from a
bearer token, so a scoped token and a full token for one user share an id and
hold different permissions. Under an application-scoped cache — which
`DecisionCache.ts` documents as a supported choice — the first verdict for a
given id won permanently, in both directions: a scoped token receiving a full
token's allow, and a full token receiving a scoped token's denial.

This narrows staleness rather than removing it, and the boundary is the useful
part. A grant revoked in the **subject** changes the key, so the next request
re-evaluates. A grant revoked only in a **store the evaluation consults** — an
attribute value, a relationship edge, a history event — is invisible to the key
and stays cached. Application scope is safe against token downgrade and unsafe
against backend revocation; per-request scope is safe against both.

**Enforcement**: `packages/core/test/DecisionCache.test.ts` runs two tokens for
one id through one application-scoped cache in both orders and asserts each gets
its own verdict; a control asserts that two structurally equal subjects still
hit, so the fix cannot pass by disabling the cache. Verified by falsification —
erasing the grants from the key reproduces `[true, true]` where `[true, false]`
is correct.

**Related**: [BEH-QD-168](behaviors/21-decision-cache.md), [INV-QD-030](#inv-qd-030-cache-key-uniqueness), [ADR-QD-043](decisions/043-a-decision-is-computed-from-its-inputs.md), [ADR-QD-031](decisions/031-decision-cache.md).

---

## INV-QD-034: An endpoint's authorization is declared, not inferred

An HTTP endpoint that declares neither a permission requirement nor an explicit
public marker is refused.

**Source**: `packages/http/src/RequirePermission.ts` — `RequirePermissionLive`
serves an endpoint only when it carries `RequiredPermission` (enforce) or
`PublicEndpoint` (pass through). Neither is a 500, logged with the endpoint's
identifier.

**Implication**: the reverse shipped, and
[ADR-QD-036](decisions/036-qadi-http-package-shape.md) had **already rejected
it by name** — "annotate-and-forget, where an unannotated route silently passes
through enforcement … Rejected: it inverts this library's fail-closed posture …
by making the *absence* of a permission requirement mean 'unguarded'". The code
implemented the rejected alternative, and a test asserted it was correct. Adding
an endpoint to a guarded group and forgetting one annotation published it, with
no signal at build time, layer-build time, or request time.

This is the only invariant in this document whose violation was **written down
as a rejected design before it was built**. The package had no behaviour
document ([23 — HTTP Enforcement](behaviors/23-http.md) was written after the
audit that found this), so nothing normative sat between the ADR's prose and the
code, and nothing checked that they agreed.

500 rather than 403 is part of the invariant. A missing declaration is a wiring
mistake in the service, and reporting it as a permissions decision sends an
operator to audit the wrong system — the same reasoning that puts `MissingAction`
and `MissingResource` in the 500 group
([BEH-QD-177](behaviors/23-http.md)).

**Enforcement**: `packages/http/test/http.test.ts` serves an endpoint declaring
neither and asserts 500, beside one declared public asserting 204 — so the fix
cannot pass by refusing everything.

**Related**: [BEH-QD-174](behaviors/23-http.md), [ADR-QD-036](decisions/036-qadi-http-package-shape.md), [INV-QD-007](#inv-qd-007-defaults-fail-closed).

---

## INV-QD-035: A sink cannot change a decision

An observer of an evaluation cannot alter its outcome. Neither a `DecisionSink`
that fails nor one that raises a defect may change the verdict, the trace, or the
error the caller receives.

**Source**: `packages/core/src/DecisionSink.ts` — `record` returns
`Effect<void>`, a `never` error channel. `packages/core/src/SinkEmit.ts` — the one
emitter (`sinkEmitter`, used by `evaluate` and by the obligation gate) wraps it in `Effect.catchCause`, so a defect is swallowed too.

**Implication**: enforced twice, because the type closes only part of the gap.
It closes more than expected — `Effect.fail` is not assignable to
`Effect<void>`, so a sink that *reports* failure cannot be written at all — but
a **defect** still is, both as `Effect.die` and as any body that throws inside
`Effect.sync`. That is exactly the subversion
[BEH-QD-175](behaviors/23-http.md) recorded on
`SubjectExtractorShape.extract`, where a `never` channel drove implementors to
`Effect.die` instead. The difference is direction, and it is why `never` is right
here and wrong there: an extractor that cannot reach its store *must* change the
answer; a sink must never be able to.

The `catchCause` at the call site is the **inverse** of the `Effect.orDie` that
[AGENTS.md §4](../AGENTS.md) forbids on evaluation paths, not an instance of it.
`orDie` turns a failure into a defect; this stops a bystander's defect from
becoming an authorization outcome. An observer must never be able to deny.

**Enforcement**: `scripts/check-house-style.mjs`'s `sink-read-once` rule refuses a second read of the sink, and `DecisionSink.test.ts`'s all-emit-sites test drives `decide`, `enforce` and an obligation discharge through one dying sink. `packages/core/test/DecisionSink.test.ts` runs a **throwing**
sink and a **dying** sink against a no-sink baseline and asserts the trace is
identical, and asserts that a sink dying on the *failure* path leaves the
original `EvaluationError` intact rather than replacing it.
`packages/core/test/DecisionSink.tst.ts` pins the half the type carries: a
failing sink is not assignable, a dying one is.

**Related**: [BEH-QD-182](behaviors/24-decision-sink.md), [ADR-QD-044](decisions/044-an-optional-decision-sink.md), [INV-QD-006](#inv-qd-006-failure-is-not-denial).

---

## INV-QD-036: A decision record is complete

A record identifies the policy, resource, action and start time of the
evaluation it describes. No consumer needs a side channel to interpret one.

**Source**: `packages/core/src/DecisionRecord.ts` — `DecisionRecord` carries
`policy`, `resource`, `action`, `at` and `evaluationId` beside the outcome.

**Implication**: a `Decision` alone cannot be interpreted, and the most damaging
gap was the policy. `explain` takes a `Policy`; a `Decision` carries
`trace.policyTag`, a string — so **the explanation of a denial was unreachable
from the denial**, which is the failure this library was rewritten to fix. The
action and resource were `EvaluateOptions` inputs consumed and dropped, so the
question asked could not be reconstructed; the start time was read from `Clock`,
used for one subtraction, and discarded, so records could not be ordered.

`at` comes from `Clock`, never `Date.now()`, so a record is reproducible under
`TestClock` ([ADR-QD-012](decisions/012-deterministic-time-and-ids.md)).

A record deliberately carries **no environment**. Core cannot know whether it
runs in a browser, on a server, or at an edge; the sink implementation stamps it.
A field the evaluator would have to guess at is a field that is wrong somewhere.

**Enforcement**: `packages/core/test/DecisionSink.test.ts` asserts a record's
policy round-trips through `explain`/`renderExplanation` to the same rendering as
the original, and asserts `at` is the `TestClock` start time across two ordered
evaluations.

**Related**: [BEH-QD-181](behaviors/24-decision-sink.md), [BEH-QD-183](behaviors/24-decision-sink.md), [ADR-QD-044](decisions/044-an-optional-decision-sink.md).

## INV-QD-037: A measured depth agrees with the evaluated bound

`policyDepth(p) <= n` holds exactly when `evaluate(p, { maxDepth: n })` does not
raise `PolicyTooDeep` — whichever subject asks and whatever evaluation would
short-circuit past — and the same bound is what `toPredicate` checks first.

**Source**: `packages/core/src/Policy.ts` — `policyDepth` counts a leaf as 0 and
adds one at each recursive position, plus `matcherDepth` for a leaf that carries a
matcher (`HasAttribute`, `HasResourceAttribute`), because `evaluateMatcher`
recurses through it too; `Walk.ts` and `Predicate.ts` reject
`policyDepth(policy) > maxDepth` before visiting any node, so the converse
direction holds by construction rather than by coincidence.

**Corrected in ADR-QD-090.** This invariant used to say "exactly when" while only
the forward direction held: `anyOf([hasRole("editor"), not(not(not(hasRole("x"))))])`
has `policyDepth` 4, yet `evaluate(…, { maxDepth: 1 })` succeeded for an editor,
because `First` short-circuits before descending. "Too deep" depended on who was
asking, and the test that asserted the agreement used only policies with no
short-circuit escape, so it could not see the gap. The depth is now judged on the
policy first.

**Implication**: a second walk of the policy tree is a second interpreter of the
same rule, and this document already treats interpreter disagreement as the
defect worth naming ([INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)). Here
the disagreement has a direction that matters: a depth **under**-reported by one
declares a policy safe that the evaluator then refuses, so a caller bounding
untrusted decoded input would admit exactly the input it meant to reject.

The function exists because `maxDepth` is an evaluation input, not a property of
a policy — nothing recorded how deep a policy actually was, so every caller
needing to know had to write this walk and guess at the convention.

**Enforcement**: `packages/core/test/RolesAndDepth.test.ts` asserts the agreement
against `evaluate` itself, in both directions, over eight shapes including
matcher-bearing leaves: at the reported depth it evaluates, and one below it
raises. A second test does the same over short-circuiting policies
(`anyOf([allowing, deep])`, `allOf([denying, deep])`, a rule table) for subjects
that allow and that deny, at five `maxDepth`s around the depth. A `FastCheck`
property pins a right-leaning spine of arbitrary length. `Evaluate.test.ts` pins
that `PolicyTooDeep` is identical for subjects holding different roles.

**Related**: [BEH-QD-191](behaviors/25-inspection.md), [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows).

---

## INV-QD-038: Provenance and flattening agree

The permissions `permissionProvenance` reports are exactly the set
`flattenPermissions` returns.

**Source**: `packages/core/src/Role.ts` — both walk depth-first with a
name-keyed visited set, so a diamond is walked once by each and the first path
wins in both.

**Implication**: two functions answering one question is the shape this codebase
has already been bitten by, so the agreement is stated rather than assumed. The
consequence of drift is specific: a screen showing "who granted this" built on
provenance would display a different permission set from the one that decides,
and a reviewer comparing them would trust the wrong one.

They are kept separate rather than one derived from the other because
`flattenPermissions` runs inside `makeSubject` — once per subject, so per request
on a server — and building a path array per permission there would charge every
caller for what only an explorer wants.

> **Corrected (CCR-QD-117).** `flattenPermissions` does not run inside
> `makeSubject`: `makeSubject` (`packages/core/src/AuthSubject.ts`) takes an
> already-flattened `Iterable<PermissionKey>` and never touches `Role` objects
> or `flattenAll`/`flattenPermissions` at all. `flattenPermissions` runs inside
> `fromRoles`, the sibling constructor that accepts `ReadonlyArray<Role>` —
> once per subject, so per request on a server — which is where the
> per-permission path-array cost this paragraph is explaining would land.

**Enforcement**: `packages/core/test/RolesAndDepth.test.ts` compares the two
sets directly over an inheritance chain, and asserts a diamond yields one grant
rather than two.

**Related**: [BEH-QD-192](behaviors/25-inspection.md), [ADR-QD-015](decisions/015-role-dag-acyclic-by-construction.md).

## INV-QD-039: The timeline is ordered, unique, and independent of arrival

The entries a `Timeline` holds are a function of the *set* of records folded
into it, not of the order they arrived in or how often each was delivered.

**Source**: `packages/devtools/src/model/Timeline.ts` — `ingest` places each
record by a total order over `at`, identifies it by
`(_tag, environment, evaluationId, at)`, and returns the identical timeline for
a repeat. The order is `storedRecordOrder` in
`packages/core/src/DecisionRecord.ts` — by `at`, an unknown (`NaN`) time after
every known one, two unknowns equal — and it is the **only** one: `mergeSources`
sorts a merged backlog by it and a decision log presents its backlog by it.

> **Amended in CCR-QD-181 (ARCH-11).** The order was written twice — devtools'
> `compareByAt` and `Timeline.ts`'s `isAfter` — and agreed only by a comment
> saying so. Both read `storedRecordOrder` now.

**Implication**: everything downstream — pairing, filters, both screens — reads
entries and may assume they are ordered, unique and joined, so exactly one
module absorbs a feed that promises none of that. It has to: `EventSource`
reconnects on its own and reads the server's backlog again, so a record arrives
twice; a
merge interleaves two processes' clocks, so records arrive out of order; and an
obligation outcome is emitted after `evaluate` returned, so the two halves of
one story can arrive backwards.

The identity is deliberately **not** the evaluation id alone. A server decision
and its client re-check share one — that is the whole pairing story
([BEH-QD-186](behaviors/24-decision-sink.md)) — and collapsing them would erase
what the tool exists to show.

*Identical* rather than merely equal is load-bearing rather than an
optimisation: `useSyncExternalStore` compares snapshots by identity, so a
rebuilt-but-equal timeline would re-render the panel on every replayed frame.

**Enforcement**: `packages/devtools/test/model/Timeline.test.ts` folds a closed
product of record shapes forward, reversed and twice over, and asserts the same
entries each time; `TimelineStore.test.ts` asserts the identity property
directly.

**Related**: [BEH-QD-205](behaviors/27-devtools-timeline.md), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

## INV-QD-040: The inspector never claims more than the trace does

Every node the inspector renders as decided has a trace node behind it, and
every node without one renders as unexamined.

**Source**: `packages/devtools/src/model/Inspect.ts` — `inspect` folds
`explain(policy)` against the `Trace` through core's `foldAligned`
([INV-QD-103](#inv-qd-103-a-trace-lines-up-with-its-policys-explanation-position-by-position)),
and a position with no trace node yields `NeverResolved`, recursively.

**Implication**: this is the one place where a *rendering* defect becomes a
security misreading, which is why it is an invariant rather than a style rule.
[INV-QD-005](#inv-qd-005-short-circuit-preservation) says a branch that is never
reached performs no lookup; a reviewer who reads such a node as "denied"
concludes their policy rejected something it never examined, and acts on it.

Two neighbouring cases fall out of the same rule. A `Failed` outcome has no
trace at all, so `inspectEntry` yields **nothing** rather than a tree of
unexamined nodes — an empty requirement tree reads as *no requirements*, which
reads as *allowed*, which is the inversion
[INV-QD-006](#inv-qd-006-failure-is-not-denial) exists to prevent. And a trace
truncated below the root — a hand-built or foreign trace, or a replay baseline
whose trace was not disclosed; no producer here cuts one short, a hydration trace the
server withholds is `Withheld` (ADR-QD-078) — is reported as *not disclosed* rather
than as unexamined, because a composite that short-circuits always evaluates its
first child, so the two shapes are distinguishable and blaming the evaluator for a
disclosure decision would mislead.

The alignment of the explanation with the trace is core's, and sound by
construction rather than by convention: it is stated and enforced as
[INV-QD-103](#inv-qd-103-a-trace-lines-up-with-its-policys-explanation-position-by-position).

**Enforcement**: `packages/devtools/test/model/Inspect.test.ts` drives every
tree from a real `evaluate` rather than a hand-built trace — a hand-built one
would prove only that the zip agrees with what the test author assumed — and
`test/react/DevtoolsDock.test.tsx` asserts the rendered wording.

**Related**: [BEH-QD-208](behaviors/27-devtools-timeline.md), [ADR-QD-027](decisions/027-policy-explanation.md), [INV-QD-103](#inv-qd-103-a-trace-lines-up-with-its-policys-explanation-position-by-position).

## INV-QD-041: A structural view states no verdict

A policy rendered without an evaluation carries no verdict mark, no status and
no reason.

**Source**: `packages/devtools/src/react/PolicyTree.tsx` — one component renders
the requirement tree for both the inspector and the policy explorer, and
`showStatus` is what separates them.

**Implication**: `inspect(policy, undefined)` marks every node `NeverResolved`,
and that value means two different things depending on why the trace is absent.
In the *inspector* it is truthful and load-bearing: the branch was
short-circuited, and saying so is
[INV-QD-040](#inv-qd-040-the-inspector-never-claims-more-than-the-trace-does).
In a screen describing a rule nobody has run, the same value would say a policy
was skipped when it was never evaluated at all — a claim about an evaluation
that did not happen.

So `showStatus` is not a display preference. It is the difference between
reporting an evaluation and describing a rule, and both screens go through one
component precisely so the difference cannot drift into two.

A field restriction is the exception, and deliberately: `hasPermission(read,
{ fields: [...] })` narrows what the *rule* grants, so it belongs in a
structural view. Describing a field-narrowed permission as a bare requirement
overstates the grant, which is the direction of error a reviewer acts on
([INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)).

**Enforcement**: `packages/devtools/test/react/PolicyExplorer.test.tsx` asserts
no `data-status` attribute, no `never resolved` text and none of the three
verdict marks anywhere on the screen; `DevtoolsDock.test.tsx` asserts the same
policy carries a status in the inspector and none in the explorer.

**Related**: [BEH-QD-212](behaviors/28-devtools-screens.md), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

## INV-QD-042: A simulation reaches no port it was not given, and records nothing

A simulated evaluation resolves every attribute, relationship and history
question through the source it was given, writes no `DecisionRecord`, and
neither reads from nor writes to the application's decision cache — in **all
three** source modes, `Live` included.

**Source**: `packages/devtools/src/model/Simulation.ts` — `simulationLayer`
supplies `CurrentSubject`, the three ports, `EvaluationId`, and shadows
`DecisionSink` and `DecisionCache`.

**Implication**: the seal is **shadowing, not omission**, and the distinction is
the whole property. `Effect.provide` adds to a context and cannot remove from
one, so providing the five services `evaluate` requires does not stop it finding
an optional one already in scope — and it reads two optionally. Left unshadowed,
a what-if sweep of eight edits writes **eight fabricated decisions into the real
log** and eight entries into the real cache, indistinguishable on screen from
decisions somebody actually asked for. Fabricating audit rows from a debug panel
is a defect rather than a trade-off, which is why the shadowing is unconditional
rather than a mode.

`CurrentSubject` is never taken from a supplied layer even in `Live` mode: the
subject is the thing being simulated, so a layer able to supply one could change
*what is being asked* rather than merely how it is answered. That exclusion lives
in the type — `LiveSource` carries
`Layer<Exclude<EvaluationServices, CurrentSubject | EvaluationId>>` — rather than
in a convention.

**Enforcement**: `packages/devtools/test/model/Simulation.test.ts` runs a
simulation beside a real `decisionSinkRing` and asserts the ring is empty, and
beside a layer whose every port dies and asserts the simulation still decides;
`SimulationSource.test.ts` repeats both for `Snapshot` and `Live`;
`WhatIf.test.ts` asserts the same of a sweep of more than twenty rows.

**Related**: [BEH-QD-219](behaviors/29-devtools-simulator.md), [ADR-QD-050](decisions/050-a-simulation-is-sealed.md).

## INV-QD-043: A snapshot answers what the live layer answered

Replaying a captured set of answers produces the same trace the run that
captured them produced, including its failures.

**Source**: `packages/devtools/src/model/Capture.ts` — `capturing` wraps a layer
and records each `(query → answer)`; `replayLayer` answers from that record. Both
are written once for every port, over `@qadi/core`'s registry: the key is each
port description's `key`, a replayed outage is built by its `failure`, and an
unseen query answers its `none` ([ADR-QD-094](decisions/094-a-port-is-described-once.md)).

**Implication**: this is an **agreement property** in the family of INV-QD-018
and INV-QD-038 — two paths answering one question — and it drifts the way those
do. Three things keep it from drifting:

A capture records **answers, not calls**. `@qadi/core`'s `recordingPort` records
each request, which answers "was this consulted" and cannot answer "with what".

A captured **failure replays as a failure**. Turning an outage into a miss would
make a snapshot disagree with the run that produced it in exactly the direction
that matters: fail-closed defaults deny, and so a replayed outage would look like
a correctly-denying policy rather than a broken port ([INV-QD-006](#inv-qd-006-failure-is-not-denial)).

The **keys are written once** — in each port's description — and called from both
sides. Two functions deriving one key would make this invariant fail in a way no
single test of either side could see. Every key includes the subject, because the subject is the axis a
what-if sweep varies: a capture taken for `alice` must not answer a question
asked about `bob` after her `editor` role was dropped.

A query the capture never saw answers the **fail-closed default** — `undefined`
for an attribute, `Unknown` for a relationship and for history, `false` for a
custom predicate, no signatures — the description's `none`, the same value the
named default answers, not a copy of it kept in step by hand. That is what a
real deployment gets from an unwired port ([INV-QD-007](#inv-qd-007-defaults-fail-closed)),
so a sweep that wanders outside the captured set denies for a reason a
deployment would rather than for one peculiar to this panel.

**Enforcement**: `packages/devtools/test/model/Capture.test.ts` captures against
a fixture layer, replays, and asserts `diffTraces` between the two runs is empty;
it asserts a captured failure replays as the same error class with the same
cause. The keys' distinctness — the subject in every key, a relationship keyed by
`(subject, relation, resource)` rather than the relation alone, an "ever, at all"
history question apart from a resource-scoped one — is pinned for every port by
`packages/core/test/PortConformance.test.ts` ("request keys").

**Related**: [BEH-QD-221](behaviors/29-devtools-simulator.md), [ADR-QD-050](decisions/050-a-simulation-is-sealed.md).

## INV-QD-044: A span never carries a resolved attribute's value

`qadi.attribute` records the attribute's **name**, the subject it was asked
about, and whether a value came back. It never records the value.

**Source**: `packages/core/src/PortAccess.ts` — `resolveAttribute` annotates
`qadi.resolved` with `value !== undefined`, a boolean.

**Implication**: a span attribute is not a debug print. It reaches whatever
tracing backend the host wired, is retained there on that backend's terms, and
is readable by anyone with access to it — which is a wider and longer-lived
audience than the code that asked for the attribute.

The other two ports are safe to report in full, and the contrast is the whole
reason this invariant names only one of them: `hasActed` and `hasRelationship`
answer with **closed three-valued enums** — `Acted`/`NotActed`/`Unknown` and
`Related`/`Unrelated`/`Unknown` — which disclose no more than a policy tag does.
An attribute resolves to arbitrary data: a clearance level, a department, a
security label, a patient identifier. The library cannot know which, so it
records none of them.

This is the line [BEH-QD-147](behaviors/19-hydration.md) already draws in the
other direction — `dehydrateDecisions` withholds a trace by default because it
"names every node's tag, its label and the sentence explaining why it refused".
Same reasoning, same default, opposite boundary.

**`qadi.resolved` is a boolean and not a presence check on the trace**, because
the distinction it draws is one a reviewer acts on: an attribute the store did
not have denies for a different reason than one it had and that compared wrong,
and only the first sends somebody to look at their wiring
([INV-QD-029](#inv-qd-029-a-denial-names-only-what-was-consulted)).

**Enforcement**: `packages/core/test/Evaluate.test.ts` resolves an attribute
whose value is a recognisable sentinel and asserts the sentinel appears in **no**
span the evaluation emitted — every span, not only the attribute's own, because
the question is where a value could leak rather than where it was meant to.
`packages/devtools/test/model/PortCalls.test.ts` asserts the decoded row carries
no value field.

**Related**: [BEH-QD-227](behaviors/30-port-calls.md), [ADR-QD-051](decisions/051-a-span-says-what-was-asked.md).

## INV-QD-045: No entry leaves hydration unaccounted for

Every entry offered to `dehydrateDecisions` is either counted as dehydrated or
counted as dropped, with a reason. Every entry in a payload handed to
`hydrateDecisions` is either counted as seeded or counted as dropped, with a
reason. Neither function loses one silently.

**Source**: `packages/react/src/Hydration.ts` and `HydrationEngine.ts`, through
`packages/react/src/HydrationCounts.ts` — the counts are conservation laws over
the two partitions each function performs.

**Implication**: this is an **availability** invariant rather than a security
one, and it is the only one in this document that is. Nothing here can leak a
decision or grant a subject something they lack; the failure it prevents is a
page that quietly re-decides everything from scratch while every signal says
hydration is working. That failure is invisible by construction — the correct
outcome of a dropped entry is *ask the question properly*, which is also what a
page with nothing to hydrate does.

Hydration had **four** exits by which an entry could be discarded and only one of
them was ever announced ([BEH-QD-230](behaviors/19-hydration.md)). The one that
was is the one somebody went looking for; the other three were found by
enumerating them, which is why this invariant is stated as a conservation law
over the whole partition rather than as a list of the cases known today. A fifth
exit added without a count is a failure of this invariant, not a gap in it.

> **Amended in CCR-QD-156.** The reason set is now seven (`ForeignSubject`,
> `PayloadSubjectMismatch`, `MalformedEntry`, `UndecodablePolicy`, `EntryTooDeep`,
> `UnsupportedPayloadVersion`, `MalformedPayload`): `UnregisteredAtoms` is gone
> because the atom set owns the seeding capability, and two whole-payload reasons
> joined it. And `hydrateDecisions` now **never throws** — a value that is not an
> envelope used to raise a `TypeError` out of a path that promised not to. A
> refused payload is counted at least once, and whenever entries are visible
> `seeded + Σ dropped` equals how many.

**The two ends are not one sum.** `dehydrated` and `seeded` are process-wide
aggregates over different populations — a server builds payloads for many
clients, a browser seeds payloads it did not build — so the invariant holds
*per call*, and subtracting one total from the other is a comparison
[BEH-QD-232](behaviors/19-hydration.md) explicitly refuses where it would go
negative.

**Enforcement**: `packages/react/test/HydrationCounts.test.ts` asserts the
partition for both functions, including that an empty payload lands in neither
bin — a working system must not report a fault on every request that happened to
ask no questions; `HydrationPayload.test.ts` asserts the accounting identity, and
that nothing throws, over arbitrary JSON.

**Related**: [BEH-QD-230](behaviors/19-hydration.md), [BEH-QD-231](behaviors/19-hydration.md), [ADR-QD-052](decisions/052-hydration-is-counted-where-both-ends-can-see-it.md).

## INV-QD-046: Instrumentation never changes what a guard renders

With `instrument` off, no guard registers and no marker element exists. With it
on, a guard renders the same node it rendered before, wrapped in an element that
generates no box.

**Source**: `packages/react/src/useGate.ts`, `GateWriter.ts` and `components.tsx` — the branching
that chooses what to render is untouched by the flag, and the marker's
`display: contents` generates no layout box.

**Implication**: an observability feature that changed the thing it observes is
worse than no observability, because the reader trusts what it shows. Two
different failures are prevented here and they are not the same one.

**A DOM that changes on upgrade.** Off has to mean *absent*, not inert. A wrapper
rendered unconditionally with a no-op style would still break a consumer's
snapshot tests, their `:first-child` selectors, and any query counting immediate
children — on a version bump, for a feature they never asked for.

**A layout that changes when the panel is opened.** `display: contents` is what
makes the marker affordable at all: it generates no box, so flex and grid
children, margin collapsing and adjacency selectors all behave exactly as they
did. A `<span>` with default styling would reflow a flex row the moment somebody
started debugging it — and the bug would move.

**The flag is not a feature switch on behaviour.** It gates *recording*, never
deciding. `useGate` reads its decision and branches identically either way, and
the hooks below the check run unconditionally, because the rules of hooks do not
bend for a debug feature.

A registry this package did not build (a hand-built `gates` prop) has no writer, so
its guards register nothing and render no marker either: off means absent extends
to it.

**Enforcement**: `packages/react/test/GateRegistry.test.tsx` asserts that an
uninstrumented tree registers nothing and renders no wrapper at all, that a
hand-built `gates` registers nothing and renders no marker, and that an
instrumented marker carries `display: contents`. The stronger evidence is
indirect and worth more: the **127 tests that existed before this feature pass
untouched**, none of them instrumented — and ARCH-06 (ADR-QD-080) left
`hooks.test.tsx`, `edges.test.tsx`, `ServerRender.test.tsx`, `QadiAtoms.test.ts`,
`QadiProvider.test.tsx`, `Hydration.test.ts`, `HydrationCounts.test.ts`,
`v4-reactivity-smoke.test.ts` and the devtools `Lens.test.ts` byte-identical.

**Related**: [BEH-QD-233](behaviors/28-devtools-screens.md), [BEH-QD-234](behaviors/28-devtools-screens.md), [ADR-QD-053](decisions/053-a-gate-can-be-found.md), [ADR-QD-080](decisions/080-a-gate-registry-belongs-to-its-atom-set.md).

## INV-QD-047: A compiled SQL fragment admits exactly the rows the predicate admits

For every `Predicate` `@qadi/predicate-sql`'s `compileSql` renders, and every
row, interpreting the rendered `SqlFragment` against that row gives the same
answer as `evaluatePredicate` does against the same `Predicate` and row.

**Source**: `packages/predicate-sql/src/index.ts` — `compileSql`, checked
against `@qadi/core`'s `evaluatePredicate`. Nothing structural forces the
agreement; a test-only reader that understands only the fixed grammar this
compiler ever emits is what makes the check possible.

**Implication**: this is [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
one interpreter further from the `Policy` tree. `toPredicate` already proved
its output means what `evaluate` meant; this invariant proves a caller's SQL
means what that `Predicate` meant, closing the gap ADR-QD-024 left open —
"a caller with only `toPredicate` compiles a predicate to SQL and has nothing
that says their SQL means what Qadi meant." A divergence here is a query that
silently returns rows an authorization decision never admitted.

**Enforcement**: a `FastCheck` property samples 300 generated `Predicate` trees
and compares the row set a **real engine** returns for the compiled fragment with
`evaluatePredicate`'s — PostgreSQL through PGlite and SQLite through `node:sqlite`,
over a 48-row table (`packages/predicate-sql/test/EngineAgreement.test.ts`, S1),
the same differential method `INV-QD-018` uses with the engine in place of an
interpreter. MySQL has no embeddable Node engine, so S2 checks its text is
SQLite's modulo identifier quote characters with identical `params`, and golden
fixture strings pin per-dialect syntax (quoting, placeholder numbering, `IN`
grammar) across all three dialects. The JavaScript reader this section used to
describe (`sqlInterpreter.ts`) is retired: it agreed with the NULL defect and the
`NaN` one below, which only a real engine found (ADR-QD-079).

**The generators shared INV-QD-018's own weak point, in a new place, and
manual verification against real engines is what found it, not the
generators.** `Eq`/`Neq`/`MemberOf` against a `NULL`-valued column diverged
from `evaluatePredicate`: `col = NULL`/`col != NULL` are never true in real
SQL for any row, and a plain `IN`/`NOT IN` silently excludes a NULL-valued
row `evaluatePredicate`'s `===`/`!==` would admit. The property test's own
differential reader re-implements `===`/`!==` in JS, so it agreed with the
original translation rather than catching it — the generators never produced
a `Neq` predicate on a column that could actually be NULL, and even if they
had, the test-only reader had no real SQL NULL semantics to disagree with.
Fixed ([BEH-QD-244](behaviors/31-predicate-compilation.md#beh-qd-244-a-compiled-fragment-handles-null-the-way-evaluatepredicate-does)),
confirmed by hand against real PostgreSQL, MySQL and SQLite, and the
generators and the differential reader both extended so the property covers
it going forward.

**And a third time, on `NaN`, where the differential reader again could not
have helped.** `compileSql`'s `isSafeValue` admitted every `typeof "number"`
value; its only exclusion of `NaN` was a `Gte`/`Lt`-specific guard, so a
`Compare` with op `Eq`/`Neq`, or a `MemberOf`, against `NaN` bound `NaN` as a
real query parameter. PostgreSQL documents `NaN = NaN` as **true**, unlike
IEEE 754 and unlike `evaluatePredicate`'s `===`, which is false for every row.
`interpretSqlFragment` re-derives `===` from the row, so it read the compiled
`"level" = ?` back exactly as `evaluatePredicate` did and the two agreed —
the same blindness the NULL defect above exposed, and the reason the new
property is **structural**: no non-finite value may reach `params` at all,
asserted over whole trees with non-finite operands mixed in at every depth,
and asserted in both directions so it cannot pass by refusing everything.
`@qadi/predicate-prisma`'s sibling `isSafeValue` was already correct and now
carries the matching property too. One caller-visible consequence is
deliberate: a `NaN`-valued `Gte`/`Lt` refuses where it used to render `FALSE`
— see [BEH-QD-238](behaviors/31-predicate-compilation.md#beh-qd-238-an-unsafe-value-refuses-rather-than-binds-blind)
(issue #65, CCR-QD-120).

**And a fourth time, on non-finite rows, which a real engine found again
(CCR-QD-172).** The table had no column that could hold a non-finite value — an
integer column cannot — so the property never sampled one. It now has `score`,
PostgreSQL `double precision` holding `±Infinity` and `NaN` and SQLite `REAL`
holding `±Infinity`, with each engine's reference computed from its own rows
(SQLite stores `NaN` as `NULL`). A plain `"score" >= $1` admitted `Infinity` on
both engines and `NaN` on PostgreSQL, which orders `NaN` above every number, and
`"score" < $1` admitted `-Infinity`. A `Range` now carries a finite guard derived
in core and rendered `(<range> AND col - col = 0)` on postgres and sqlite
([BEH-QD-306](behaviors/31-predicate-compilation.md#beh-qd-306-a-range-never-admits-a-non-finite-row-the-reference-denies));
`EngineAgreement.test.ts` S5 pins the four cases, and S2 compares MySQL's text
with SQLite's modulo that guard.

**Related**: [BEH-QD-238](behaviors/31-predicate-compilation.md#beh-qd-238-an-unsafe-value-refuses-rather-than-binds-blind), [BEH-QD-241](behaviors/31-predicate-compilation.md), [BEH-QD-306](behaviors/31-predicate-compilation.md#beh-qd-306-a-range-never-admits-a-non-finite-row-the-reference-denies), [BEH-QD-244](behaviors/31-predicate-compilation.md#beh-qd-244-a-compiled-fragment-handles-null-the-way-evaluatepredicate-does), [ADR-QD-054](decisions/054-a-companion-package-may-compile-a-dialect.md).

## INV-QD-048: A compiled Prisma `WhereInput` admits exactly the rows the predicate admits

For every `Predicate` `@qadi/predicate-prisma`'s `compilePrismaWhere` renders,
and every row, interpreting the rendered `WhereInput` against that row gives
the same answer as `evaluatePredicate` does against the same `Predicate` and
row.

**Source**: `packages/predicate-prisma/src/index.ts` — `compilePrismaWhere`,
checked against `@qadi/core`'s `evaluatePredicate`.

**Implication**: the same property as [INV-QD-047](#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits),
against the other grammar. Apart from `compilePrismaWhere`'s reserved columns
(Prisma's 13 operator keys, the one `RenderRules` field the two packages set
differently), no `Predicate` shape renders to one target and not the other — the
identifier rule and `maxInValues` are core's and shared — so the two invariants
differ only in which compiler and which engine they check. A stronger guarantee
than SQL's in one respect: there is no serialization step to separately verify,
since `WhereInput` is a plain object rather than text. (This paragraph used to say
no `Predicate` shape renders to one target and not the other, flatly; before
ADR-QD-079 that was false — `first name`, `a.b`, `gte`, `NOT` and a 1001-member
`MemberOf` each compiled in one package and not the other.)

**Enforcement**: the compiled `WhereInput` is run through **Prisma Client 7.10
over an in-memory SQLite database** (`@prisma/adapter-better-sqlite3`) and its row
set compared with `evaluatePredicate`'s over a 48-row table, 300 generated
predicates per property
(`packages/predicate-prisma/test/EngineAgreement.test.ts`): P1 exact agreement
under the true nullability declaration, P2/P3 lie-safety under a wrong one (a
subset, or a loud refusal, never an over-admission), P4 the vacuous-identity
shapes. The JavaScript readers are retired, `matchesPrismaWhereEngine` included,
after a measurement showed the real engine and the goldens kill every mutant it
killed (the identical 107 of 173). The history below describes what came before: a `FastCheck`
property, mirroring INV-QD-047's, using a test-only `matchesPrismaWhere` reader
(now retired) restricted to the `WhereInput` subset this compiler ever emits,
**and** a second FastCheck property over the same generated predicates checked
against `matchesPrismaWhereEngine`
(`packages/predicate-prisma/test/matchesPrismaWhereEngine.ts`), a reader
that models Prisma's real, documented nested-empty-array stripping behavior
rather than `evaluatePredicate`'s own `.every`/`.some` semantics. The first
reader alone cannot enforce this invariant on its own: it shares
`evaluatePredicate`'s semantics, which is exactly the wrong belief a
`renderNode` that nests a vacuous identity inside `AND`/`OR`/`NOT` also
holds — C1 (issue 34) was a real instance of `renderNode` doing so, and the
original single-reader property passed against it the whole time. See
[BEH-QD-239](behaviors/31-predicate-compilation.md#beh-qd-239-an-empty-memberof-is-false-never-in-)
and
[BEH-QD-242](behaviors/31-predicate-compilation.md#beh-qd-242-the-compiled-prisma-whereinput-agrees-with-the-reference-interpreter).

**The same NULL-handling defect INV-QD-047 found existed here too, one
grammar over, and manual verification against a real Prisma client found it
worse than SQL's version.** `{column: {not: value}}` alone excludes a
NULL-valued row `evaluatePredicate`'s `!==` would admit — but Prisma's `in`
filter does not merely mishandle a `null` member the way a bare SQL `IN`
does: it **refuses the query outright** with a client-side validation error,
found by running a compiled `WhereInput` against a real, SQLite-backed
`@prisma/client`. Fixed the same way
([BEH-QD-244](behaviors/31-predicate-compilation.md#beh-qd-244-a-compiled-fragment-handles-null-the-way-evaluatepredicate-does)):
`Neq` against a non-null value ORs in `{column: null}`, and a `null` member
of `MemberOf`'s `values` is split out of `in` into its own `{column: null}`.

**The non-finite-value refusal INV-QD-047 gained is now a property here too,
though this compiler never had the defect.** `isSafeValue` in this package has
excluded `NaN`/`±Infinity` since it was written, but only three hand-written
examples said so. The same structural property `@qadi/predicate-sql` gained —
non-finite operands mixed into the generated trees at every depth, a refusal
required to point at a value that earned it, and no non-finite number allowed
to reach the emitted `WhereInput` — now guards it here, so a future widening
of the allowlist fails in both packages rather than one (issue #65,
CCR-QD-120).

**A third time a test-only reader shared the compiler's belief, and a real
engine found it (CCR-QD-157).** `matchesPrismaWhere` and the first
`matchesPrismaWhereEngine` both read `NOT` as a two-valued `!`, so neither could
see that a plain `{NOT: {level: {gte: 3}}}` renders `WHERE (NOT level >= ?)` and
SQL's `NOT UNKNOWN` is `UNKNOWN`: a NULL-valued row `evaluatePredicate` admits
went missing under every `Negate`. Real Prisma 7.10 over SQLite, 3000 random
predicates against a 48-row table: **127 result-set mismatches, every one under
a `Negate`, and 0 over-admissions** — each mismatch is the engine returning a
strict subset, because Kleene's logic is monotone and the defect fails closed.
The converse hazard is Prisma's own validator, which refuses any filter that
mentions `null` on a required field (153 of 1500 queries). The reader was made
three-valued and made to throw what Prisma's validator throws — and then retired in
favour of the real engine — and `compilePrismaWhere` takes a declared `nullable` set: each leaf
under an odd number of `Negate`s on a nullable column carries `not: null`, and a
required column never mentions `null`. A wrong declaration can only under-admit
or fail loudly, never admit a row the predicate denies.

**A `Float` field can hold an infinity, and Prisma cannot keep one out of a
range (CCR-QD-172).** The fixture model gains `score Float?` holding `±Infinity`.
A plain `{score: {gte: 3}}` returns the `Infinity` rows `evaluatePredicate`
denies, and the bounded filter that would exclude them is unsound — Prisma binds
`lte: Number.MAX_VALUE` as a decimal string SQLite reads back as `Infinity`. So
`compilePrismaWhere` takes a required `floating` declaration and refuses a range
on those columns (`NonFiniteColumn`); P6 pins the refusal, the over-admission an
undeclared `Float` column would cause, and the engine fact behind it.

**Related**: [BEH-QD-238](behaviors/31-predicate-compilation.md#beh-qd-238-an-unsafe-value-refuses-rather-than-binds-blind), [BEH-QD-242](behaviors/31-predicate-compilation.md), [BEH-QD-306](behaviors/31-predicate-compilation.md#beh-qd-306-a-range-never-admits-a-non-finite-row-the-reference-denies), [BEH-QD-244](behaviors/31-predicate-compilation.md#beh-qd-244-a-compiled-fragment-handles-null-the-way-evaluatepredicate-does), [ADR-QD-054](decisions/054-a-companion-package-may-compile-a-dialect.md).

## INV-QD-049: An unregistered custom predicate name is an error, never a denial

A `HasCustom` node whose `name` has no entry in a **populated**
`CustomPredicate` registry fails with `CustomPredicateError`; it never
resolves to `Deny`.

**Source**: `packages/core/src/CustomPredicate.ts` — `customPredicateFromRecord`'s
`evaluate` fails on a table miss rather than answering `false`; `Walk.ts`'s
`HasCustom` case in `evaluateNode` never catches or converts
`CustomPredicateError`.

**Implication**: this is [INV-QD-006](#inv-qd-006-failure-is-not-denial) applied
to a misconfigured registry rather than a broken store. Only the *absence* of
any registry at all — `CustomPredicateNone`, [BEH-QD-246](behaviors/32-custom-predicates.md#beh-qd-246-an-unwired-custompredicate-denies-every-name)
— is a legitimate fail-closed default; a wired registry that does not
recognise a name is, overwhelmingly, a typo in `hasCustom`'s own argument, and
denying it would send whoever reads the decision to audit permissions rather
than the policy that named the wrong string.

**Related**: [BEH-QD-247](behaviors/32-custom-predicates.md#beh-qd-247-a-registered-predicates-own-failure-and-an-unrecognised-name-are-errors--never-denials), [ADR-QD-055](decisions/055-a-named-registered-custom-predicate.md).

## INV-QD-050: A `HasCustom` node never appears in a compiled `Predicate`

`toPredicate` fails `PolicyNotTranslatable` for every `HasCustom` node; no
`Predicate` `@qadi/predicate-sql` or `@qadi/predicate-prisma` ever compiles
contains one, whole or approximated.

**Source**: `packages/core/src/Predicate.ts` — `compile`'s `HasCustom`
arm refuses unconditionally, before any dialect-specific
compiler ever sees the tree.

**Implication**: opaque, externally-registered logic has no
resource-independent expression to fold to. Approximating it — folding to
`True` so a query runs, say — would be exactly the failure mode
[ADR-QD-024](decisions/024-predicate-output.md) refuses: rows a `HasCustom`-guarded
policy would have denied returned anyway. Because the refusal happens in
`toPredicate` itself, `@qadi/predicate-sql` and `@qadi/predicate-prisma` need
no `HasCustom`-specific logic of their own — the node never reaches either
package.

**Enforcement**: `packages/core/test/Predicate.test.ts` asserts
`toPredicate(hasCustom(...))` fails `PolicyNotTranslatable` naming
`"HasCustom"`.

**Related**: [BEH-QD-248](behaviors/32-custom-predicates.md#beh-qd-248-topredicate-refuses-a-hascustom-node), [ADR-QD-024](decisions/024-predicate-output.md), [ADR-QD-055](decisions/055-a-named-registered-custom-predicate.md).

## INV-QD-051: Staging presence or absence never changes the committed audit entries

The same sequence of `SinkRecord`s driven through `AuditDecisionSinkLive`,
with `AuditStagingPort` wired and unwired, produces identical **committed**
`AuditEntry` sequences.

**Source**: `packages/audit/src/AuditDecisionSinkLive.ts` — `stage`/`commit`
calls are best-effort side effects on the path to `AuditTrailPort.write`;
neither call's outcome changes whether `write` is attempted or what is
written.

**Implication**: `AuditStagingPort`'s whole value proposition
([BEH-QD-252](behaviors/33-audit-pipeline.md#beh-qd-252-staging-is-best-effort-and-provably-non-observable-in-the-happy-path))
is additive recoverability, never a second, divergent code path. A caller
who wires staging must never end up with a different — or less reliable —
set of committed rows than one who did not, or staging would be a liability
disguised as a safety net.

**Enforcement**: a `FastCheck` property drives the same generated sequence
of `SinkRecord`s through two configurations of the same pipeline — staging
wired, staging unwired — and asserts the committed `AuditEntry` sequences,
read back from a deterministic `AuditTrailPortTest`, are identical.

**Related**: [BEH-QD-252](behaviors/33-audit-pipeline.md#beh-qd-252-staging-is-best-effort-and-provably-non-observable-in-the-happy-path), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-052: Once a circuit breaker trips, `write` is never attempted again until reset

While the breaker built by `makeCircuitBreaker` is `Open`, `record()` never
calls `AuditTrailPort.write` — not even under concurrent `record()` calls
racing to trip or read it.

**Source**: `packages/audit/src/CircuitBreaker.ts` — the probe protocol is
module-local behind `withPermit`, and every state transition (`status`'s
observation, the module-local settle and release steps) is a single
`Ref.modify` call,
never a separate `Ref.get` followed by a later `Ref.set`, so two fibers
reading the same state before either writes back cannot lose an update or
double-count a transition. `claimProbe` and `releaseProbe` carry the same
atomicity, added to bound a half-open window to exactly one concurrent probe:
the claim reads `probeClaimed` and sets it in one `Ref.modify`, so two
fibers racing to trial a half-open breaker cannot both observe it unclaimed
and both proceed; the release reopens the breaker through the same
single-`Ref.modify` shape a failed settle uses. `withPermit` acquires the claim
uninterruptibly and releases it on any non-success exit of the caller's body,
so the claim's lifetime and its guard share one scope. Every state variant
carries a `generation`, incremented on each change of status, and a permit's
outcome is applied only while its generation is current, so a stale outcome
cannot move a newer window.

**Implication**: `Qadi.ts`'s `filter`/`filterStream` evaluate items
concurrently, so concurrent `record()` calls reaching one breaker are the
ordinary shape of a caller batch-authorizing a collection, not a hypothetical
edge case. A non-atomic transition would let the breaker take longer than
`failureThreshold` consecutive failures to trip, silently weakening the
guard it exists to provide.

**Enforcement**: scripted threshold-boundary tests — the exact
`failureThreshold`-th failure trips, `failureThreshold - 1` does not, a
success mid-`half-open` closes, a failure mid-`half-open` reopens — paired
with a concurrency stress test that fires `failureThreshold` `recordFailure`
calls at `"unbounded"` concurrency and asserts both the resulting status and
that `qadi_audit_circuit_breaker_transitions_total{to: "Open"}` counted
exactly one transition, not more; the same with `failureThreshold + 5`
failures, which a failure landing on an already-`Open` breaker used to
over-count; a release-on-interrupt test at the breaker and, through staging, at
the sink; and a model-based property that drives the real breaker and a pure
reference model through generated command sequences and compares status and
transition counts.

**Related**: [BEH-QD-251](behaviors/33-audit-pipeline.md#beh-qd-251-a-tripped-circuit-breaker-skips-the-write-not-the-stage-and-its-transitions-are-atomic-under-concurrency), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-053: Retained and purged partition entries

For any `entries`, `RetentionPolicy` and `now`,
`enforceRetention(entries, policy, now)` and
`getPurgeableEntries(entries, policy, now)` partition `entries`: their union
recovers `entries`, and their intersection is empty.

**Source**: `packages/audit/src/Retention.ts` — both exported functions
project `planRetention`, which evaluates the purgeability rule exactly once per
entry in a single pass.

**Implication**: retention is a caller-invoked, caller-scheduled surface
entirely outside the `DecisionSink` pipeline
([BEH-QD-253](behaviors/33-audit-pipeline.md#beh-qd-253-retention-partitions-entries-by-construction)).
A partition violated — an entry counted as both retained and purged, or as
neither — would mean either a compliance-relevant row silently vanishing
from both sets, or a row a caller believed purged still being retained.

**Enforcement**: a `FastCheck` property over generated timestamp arrays,
`maxAgeMs` values and `now` values — each drawn from integers, negative
integers, `NaN` and `±Infinity` — asserting the union/intersection identities
hold for every generated case.

**Related**: [BEH-QD-253](behaviors/33-audit-pipeline.md#beh-qd-253-retention-partitions-entries-by-construction), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-101: Retention never selects a row without a finite age past a valid limit

For any `entries`, `RetentionPolicy` and `now`, an entry is in
`getPurgeableEntries(entries, policy, now)` only if its `at` and `now` are
finite, `policy.maxAgeMs >= 0`, and `now - at > policy.maxAgeMs`. A row whose
age cannot be computed is retained, and `planRetention` lists it as `undated`.

**Source**: `packages/audit/src/Retention.ts` — `planRetention` is the one place
the rule is written; the older functions project it.

**Implication**: before this, `at = -Infinity` (a stored `-1e400`),
`now = +Infinity` and a negative `maxAgeMs` each purged every row they touched,
while `NaN` happened to retain. Retention feeds a deletion routine, so the safe
direction is retain: a wrong retain keeps a row too long, a wrong purge destroys
evidence that may never have been archived
([BEH-QD-253](behaviors/33-audit-pipeline.md#beh-qd-253-retention-partitions-entries-by-construction)).
The inbound wire refuses a non-finite `at` as well
([BEH-QD-312](behaviors/33-audit-pipeline.md#beh-qd-312-a-stored-row-is-read-back-through-a-guard)),
but a hand-built `AuditEntry` never passes through decode, so retention guards
itself.

**Enforcement**: `packages/audit/test/Retention.test.ts` — one example per
impossible input, and the partition property's "purged implies a provable age"
conjunct, over draws that include `NaN`, `±Infinity` and negatives.

**Related**: [BEH-QD-253](behaviors/33-audit-pipeline.md#beh-qd-253-retention-partitions-entries-by-construction), [INV-QD-053](#inv-qd-053-retained-and-purged-partition-entries), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-054: `verifySequenceIntegrity` detects every gap and duplicate sequence number

For any set of `AuditEntry` rows, `verifySequenceIntegrity` fails
`SequenceIntegrityError` if and only if the defined `sequenceNumber`s, sorted
ascending, contain a gap or a duplicate.

**Source**: `packages/audit/src/SequenceIntegrity.ts` — sorts the defined
sequence numbers and fails the moment one is not exactly one more than its
predecessor, which catches a gap (a jump past the expected value) and a
duplicate (the same value twice, which sorts to *less* than expected) with
the same single check.

**Implication**: sequence numbers are assigned entirely by the caller's own
store, never by `@qadi/audit`
([BEH-QD-254](behaviors/33-audit-pipeline.md#beh-qd-254-sequence-integrity-verification-detects-a-gap-or-a-duplicate-and-trusts-neither-write-order)) —
this is the one check standing between an audit trail a compliance reviewer
can trust and rows quietly missing or overwritten in the caller's own
storage. A false negative here — a real gap that verification misses — is
indistinguishable from tampering nobody caught.

This is gap-and-duplicate detection, not cryptographic tamper-evidence, and
the two are not interchangeable: nothing here hashes an entry or links it to
its neighbor, so an attacker able to modify already-stored rows can renumber
them and pass this check while defeating the property a reader would assume
"integrity" promises. `keyMaterial` on `AuditArchive` is carried, never used
to sign or verify anything — this invariant is the whole of what
`sequenceIntegrityVerified: true` actually attests to.

**Enforcement**: a `FastCheck` property over generated contiguous sequences
(always intact) and generated sequences with one deliberately removed
element (always caught), plus hand-written cases for a duplicate and for a
mix of sequenced and unsequenced entries.

**Related**: [BEH-QD-254](behaviors/33-audit-pipeline.md#beh-qd-254-sequence-integrity-verification-detects-a-gap-or-a-duplicate-and-trusts-neither-write-order), [ADR-QD-056](decisions/056-audit-companion-package.md).

## INV-QD-055: `signatureObligationHandler` calls `capture` exactly once, and the `ObligationRecord` matches

For one discharge, `signatureObligationHandler(port, meaning)` calls
`port.capture` exactly once, and the `ObligationRecord` outcome
`DecisionSink` observes for that discharge is `Discharged` exactly when that
call succeeded and `HandlerFailed` exactly when it failed.

**Source**: `packages/audit/src/SignatureCapturePort.ts` —
`signatureObligationHandler`'s returned `ObligationHandler` calls `capture`
once per invocation, with a request built from the whole obligations array
rather than once per obligation; `Qadi.ts`'s `discharge` maps the handler's
own success/failure to the `ObligationRecord` outcome unconditionally.

**Implication**: signature capture is wired through `ObligationHandler`, the
only mechanism this library has for enforcement-time custom logic, never
through `DecisionSink`
([BEH-QD-256](behaviors/33-audit-pipeline.md#beh-qd-256-a-signature-obligation-handler-calls-capture-exactly-once-and-the-discharge-record-matches-its-outcome)).
A handler calling `capture` more than once per discharge would let a
caller's signature service be asked to sign the same duty twice; a
mismatched `ObligationRecord` outcome would report a captured signature as
`HandlerFailed`, or a failed one as `Discharged` — silently misrecording
exactly the event a compliance reviewer reads this log for.

**Enforcement**: unit tests over `signatureObligationHandler` in isolation
(call count, request shape, failure propagation), plus integration tests
through `Qadi.assert`'s real `discharge` path asserting the recorded
`ObligationRecord.outcome` for both a successful and a failing `capture`.

**Related**: [BEH-QD-256](behaviors/33-audit-pipeline.md#beh-qd-256-a-signature-obligation-handler-calls-capture-exactly-once-and-the-discharge-record-matches-its-outcome), [ADR-QD-056](decisions/056-audit-companion-package.md), [ADR-QD-057](decisions/057-audit-signature-harmonization.md) (the property is unchanged; only the type `capture`/`validate` operate on moved from `ElectronicSignature` to `@qadi/core`'s `Signature`).

## INV-QD-056: A `HasSignature` node never appears in a compiled `Predicate`

`toPredicate` fails `PolicyNotTranslatable` for every `HasSignature` node; no
`Predicate` `@qadi/predicate-sql` or `@qadi/predicate-prisma` ever compiles
one, and no query built from a compiled predicate can silently omit rows a
policy carrying a signature check would have denied.

**Source**: `packages/core/src/Predicate.ts` — `compile`'s
`Match.tagsExhaustive` refuses `HasSignature` unconditionally, before
touching `SignatureHistory`; the reasoning mirrors `HasRelationship`'s arm
(looked up through an external port, keyed by subject/resource, cannot fold
into a resource-independent expression) rather than `HasCustom`'s (opaque,
externally-registered logic).

**Implication**: a `Policy` reaching for `hasSignature` cannot be pushed down
to SQL/Prisma — the same declared limitation `HasRelationship` and
`HasCustom` already carry, not a new one. Approximating the check instead of
refusing it would be exactly the "approximate rather than refuse" failure
mode [ADR-QD-024](decisions/024-predicate-output.md) rejects, one
interpreter further in.

**Enforcement**: `packages/core/test/Predicate.test.ts` asserts
`toPredicate(hasSignature(...))` fails with `PolicyNotTranslatable` naming
`"HasSignature"`.

**Related**: [ADR-QD-058](decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md), [INV-QD-050](#inv-qd-050-a-hascustom-node-never-appears-in-a-compiled-predicate) (the same property, one leaf earlier).

## INV-QD-057: `hasSignature` consults no clock

`evaluateHasSignature`'s match never depends on the current time, `signedAt`,
or how long ago a signature was made. A signature made a year ago matches a
`hasSignature` leaf exactly as well as one made a second ago; advancing the
clock between two otherwise-identical evaluations never changes the verdict
or the trace.

**Source**: `packages/core/src/PortAccess.ts` — `askSignature`'s
`matched` predicate (moved there from `Evaluate.ts`'s `evaluateHasSignature`, which
now only turns the answer into a verdict) tests only `s.meaning` and, when the leaf names one,
`s.signerRole`; it never reads `s.signedAt` or `Clock`. `Signature.ts`'s own
doc comment on `signedAt` states the same limitation at the type's
definition.

**Implication**: `hasSignature` is trust-on-presence, with no expiry or
freshness concept (LL-04). An approval signed under a since-revoked
delegation continues to satisfy `hasSignature("approved")` indefinitely;
revocation-by-time is not a recipe this library gives a deployment — freshness
must be enforced before a signature reaches `SignatureHistory`, or rejected at
capture time, if a deployment's domain requires periodic requalification
(ADR-QD-058 rejected a built-in expiry window as reintroducing the
live-crypto-verification concept that decision explicitly ruled out).
Numbered here, rather than left as prose only, so a future change that adds a
freshness comparison must renumber or retire this invariant loudly instead of
silently changing every deployment's behavior.

**Enforcement**: `packages/core/test/Evaluate.test.ts`'s "HasSignature never
compares signedAt to the clock" test evaluates the identical `hasSignature`
leaf against the identical on-file signature before and after advancing
`TestClock` by ten years, and asserts the verdict and trace are identical.

**Related**: [ADR-QD-058](decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md), [INV-QD-056](#inv-qd-056-a-hassignature-node-never-appears-in-a-compiled-predicate).

---

## INV-QD-058: Translation fails only as evaluation would

For every translatable policy *P* and every behaviour of the ports it reads: (1)
`toPredicate(P)` never ends in a defect; (2) if *P* references no resource,
`toPredicate(P)` and `evaluate(P)` make the same port calls in the same order and
end in the same outcome; (3) if `toPredicate(P)` succeeds, `evaluate(P, {
resource: R })` succeeds for every row *R* and agrees with `evaluatePredicate`.

**Source**: `packages/core/src/PortAccess.ts` — every port read either interpreter
makes goes through it, so a defecting port is converted into its typed error once
(`catchPortDefect`); `packages/core/src/ShortCircuit.ts` — the rules for which
child settles a composite, read by both interpreters; and `Predicate.ts`'s
`compile`/`run` split — refusals are decided from the tree alone before anything
runs, and `run` stops where `evaluate` stops.

**Implication**: INV-QD-018 says the two interpreters give the same *answer* when
every port behaves. This says they fail the same way when one does, and ask the
same stores. Without it a caller's `Effect.retry` around `toPredicate` could not
see a crashing adapter, and a policy decided by a role could still fail because of
a store the evaluator would never have consulted. Both divergences were fail-closed
— an error, never a widening — but they were liveness divergences, and an extra
port call [INV-QD-005](#inv-qd-005-short-circuit-preservation) forbids in the
evaluator.

**Enforcement**: three properties in `packages/core/test/Predicate.test.ts`, over a
port generator that answers, fails typed, dies, or throws synchronously, with every
call logged: walk equality on resource-free trees (same calls, same order, same
outcome — 200 samples); success implies row-by-row agreement, and a failure is
typed, on full trees; and replacing every death with the port's own typed failure
changes nothing either interpreter says. `PortAccess.test.ts` pins
`catchPortDefect`'s full cause matrix; `ShortCircuit.test.ts` pins each stop rule.

**Related**: [INV-QD-005](#inv-qd-005-short-circuit-preservation), [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-017](#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden), [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows), [BEH-QD-264](behaviors/16-predicates.md#beh-qd-264-a-defecting-port-fails-translation-typed-not-dead), [BEH-QD-265](behaviors/16-predicates.md#beh-qd-265-translation-asks-no-port-a-constant-has-already-decided), [BEH-QD-266](behaviors/16-predicates.md#beh-qd-266-a-refusal-depends-on-the-tree-alone), [ADR-QD-077](decisions/077-both-interpreters-read-ports-through-one-module.md).

---

## INV-QD-060: An enforcement failure is reported with the same meaning on every route

For every `EnforcementError` tag *T*, and for every adapter that reports it — the bare
`HttpRouter` route, the `HttpApiMiddleware` path, the decision stream's reauth label, an
application's own error handling — the meaning reported is `ENFORCEMENT_ERROR_CLASSES[T]`:
`denied`, `outage` or `wiringMistake`. Where that meaning becomes an HTTP status, both
HTTP routes read the same `HTTP_STATUS_BY_CLASS[class]`.

**Source**: `packages/core/src/Errors.ts` — `ENFORCEMENT_ERROR_CLASSES`, the total, tag-keyed
class table beside `ERROR_CODES`; `packages/http/src/QadiHttpError.ts` — `ENFORCEMENT_ERROR_WIRE`,
whose `wire` builder derives each entry's status from the class and is the package's only
`httpApiStatus` writer, and from which `toResponse`, `RequirePermission`'s `error:` and
`clientError`, and the denial-logging tags are derived.

**Implication**: [INV-QD-006](#inv-qd-006-failure-is-not-denial) held at the type level in one
place and by convention everywhere else. Before this, the two HTTP routes picked each tag's
status independently — a swapped choice compiled and passed every test — and the Next.js example
called an unmet obligation an outage and let two tags escape as a rejected Promise. A new tag
now has to be classified once, and every adapter inherits it.

**Enforcement**: `packages/core/test/Errors.test.ts` pins every class entry against a
hand-written map; `packages/http/test/QadiHttpError.test.ts` checks, for all twelve tags, that
the schema's `httpApiStatus`, the entry's status, the class's status and (for the eleven)
`toResponse`'s status agree; `packages/core/test/Errors.tst.ts` and
`packages/http/test/QadiHttpError.tst.ts` prove a tag added without a class or a wire entry
fails to type-check.

**Related**: [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-010](#inv-qd-010-error-codes-are-injective), [BEH-QD-177](behaviors/23-http.md), [BEH-QD-270](behaviors/07-enforcement.md#beh-qd-270-every-enforcement-failure-has-exactly-one-class), [ADR-QD-081](decisions/081-enforcement-error-classes-live-in-core.md)

## INV-QD-090: A pure walk over a caller-held tree never exhausts the call stack

For any `Policy`, `Explanation`, `Matcher` or `Trace` a caller holds — however deeply or
widely nested — every pure walk the library offers over it completes without
raising a `RangeError`, and no `maxDepth` a caller supplies turns a decision into a
defect.

**Source**: `packages/core/src/TreeFold.ts` — `foldTree`, the one post-order loop,
with `foldPolicy` (`Policy.ts`), `foldExplanation` (`Explanation.ts`) and
`foldMatcher` (`Matcher.ts`) as its thin adapters, and `foldTreeBy` — the same loop,
handing `combine` a named read of a child's result — behind `foldPolicyCases`,
`foldMatcherCases` and `foldExplanationCases`, the case-wise forms; `foldTrace`
(`Decision.ts`) and `foldAligned` (`Explanation.ts`) over a `Trace` and over an
explanation lined up with one; the explicit-stack loops in `renderTrace`
(`Decision.ts`) and `diffTraces` (`TraceDiff.ts`); and `Walk.ts`'s `Not`/`Obliged`/
`Labeled` arms and `Predicate.ts`'s `Negation`, which build their child under
`Effect.suspend`. There is no devtools copy of the loop any more: `inspect` is an
adapter over `foldAligned` (ADR-QD-101).

**Implication**: a policy assembled with the smart constructors has no
`MAX_DECODE_DEPTH` bound — a loop of `not()` builds a tree exactly as deep as the
loop runs — and a `RangeError` inside an `Effect` is a defect, not a typed failure,
so a walk that recurses natively turns a caller's policy into a crash. At
[AGENTS.md §4](../AGENTS.md)'s standard that is a decision becoming a defect. Six
walkers recursed natively before this and three more each carried their own copy
of the explicit-stack loop; one seam means one tested loop, and a cyclic tree
(only in-process mutation can build one) is a thrown, named defect rather than a
hang.

**Enforcement**: `packages/core/test/TreeFold.test.ts` pins
the loop — post-order, once per shared node, 100,000 deep, 250,000 wide, cycle
detection, no false positive on a diamond — once for `foldTree` and once for
`foldTreeBy`, which also pins that a read of a node the tree did not list as a child
throws. `Policy.test.ts`, `Matcher.test.ts` and `Explanation.test.ts` each add a
100k-deep / 250k-wide / cycle test on their case-wise fold and a lockstep property
that the dispatcher reads exactly what the ADT's `childrenOf` lists, by identity and
in order. A 100k-deep / 250k-wide test sits on each walker: `RolesAndDepth.test.ts` (`policyDepth`), `Simplify.test.ts`,
`Explanation.test.ts` (`explain`, `renderExplanation`, a deep matcher),
`Matcher.test.ts` (`referencesAction`, `referencesResource`, `matcherDepth`),
`Predicate.test.ts` (`toPredicate` with `maxDepth: 200_000`), `Evaluate.test.ts`
(`evaluate` with `maxDepth: Infinity`), and in `@qadi/devtools` `Remedies.test.ts`,
`WhatIf.test.ts` and `Inspect.test.ts`. A trace of any depth: `Decision.test.ts`
(`foldTrace` at 100k deep / 250k wide, a shared child combined once, a cycle),
`RenderTrace.test.ts` (`renderTrace` on a 100k-deep trace under the default
`indentLimit`, 3,000 deep at `Infinity`, and a differential property against the
recursive implementation it replaced, `TraceOracle.ts`), `TraceDiff.test.ts`
(`diffTraces`/`flippedAt` on 100k-deep evaluated chains of `not`, `labeled`, `allOf` and
`rules`, a 250k-wide `allOf`, and the same differential property) and
`TraceAlignment.test.ts` (`foldAligned` over a 100k-deep chain).

**Related**: [INV-QD-037](#inv-qd-037-a-measured-depth-agrees-with-the-evaluated-bound), [BEH-QD-300](behaviors/25-inspection.md), [BEH-QD-318](behaviors/25-inspection.md), [BEH-QD-303](behaviors/18-explanation.md), [BEH-QD-304](behaviors/04-matchers.md), [BEH-QD-144](behaviors/18-explanation.md), [BEH-QD-319](behaviors/18-explanation.md), [BEH-QD-194](behaviors/25-inspection.md), [ADR-QD-090](decisions/090-a-tree-is-folded-through-one-seam.md), [ADR-QD-101](decisions/101-the-alignment-of-an-explanation-with-a-trace-is-cores.md).

---

## INV-QD-059: A seeded decision never claims a trace it was not given

A decision rebuilt from a hydration payload carries a trace, or a denial's reason,
only when the server disclosed one. It is never given a trace root, a reason, or any
other piece of an evaluation that nobody made.

**Source**: `packages/react/src/SeededDecision.ts` — `SeededAllow` and `SeededDeny`
have no `trace` and no `reason` field; what the server withheld or shipped is a tagged
`disclosure` (`Withheld`, or `Disclosed` carrying the server's own trace and, for a
denial, its reason). `HydrationEngine.ts`'s rebuild constructs only those classes.

**Implication**: a hydrated decision was a core `Allow`/`Deny`, which require a
`Trace` and a deny `reason`, so both were fabricated whenever the server withheld
them — a single-node trace with the reason `"hydrated"` (which a `<Can fallback={(deny)
=> deny.reason}>` rendered), and a root of `"AllOf"` for a payload with no trace at all.
A consumer reading `decision.trace.policyTag` was reading something no evaluator
produced. The type now says what a seed is, and the compiler finds every reader that
treated one as an evaluation.

**Enforcement**: `Hydration.tst.ts` pins `ClientDecision` as the closed four-case
union and that `isAllowed` from `@qadi/core` rejects one;
`HydrationPayload.test.ts`'s differential test dehydrates the decision of every
`Policy` shape the evaluator produces, with and without `includeTrace`, hydrates it
through JSON, and asserts the seed carries the same verdict, visible fields,
obligations and evaluation id and a `Disclosed` trace deep-equal to the server's —
and a `Withheld` payload contains no `"trace"` key at all.

**Related**: [BEH-QD-147](behaviors/19-hydration.md), [BEH-QD-148](behaviors/19-hydration.md), [ADR-QD-078](decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md), [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it).

## INV-QD-064: A guard is listed only by the registry its provider writes to

A guard registers with exactly one gate registry: the `gates` its provider was
handed, else its atom set's `atoms.gates`. Two atom sets in one process do not see
each other's guards, and two live registrations in one registry never overwrite
each other, so the ids in one `instances()` snapshot are pairwise distinct.

**Source**: `packages/react/src/GateRegistry.ts` (`makeGateRegistry`: every piece
of state is inside the closure, and a colliding id is disambiguated) and
`packages/react/src/GateWriter.ts` (the handle closes over its own key, so a stale
cleanup can only end the registration it made).

**Implication**: the panel's two views, "asked" and "asking", must be about the same
thing. A process-wide registry listed tenant B's guards under tenant A's question,
and a hydrated root silently replaced a still-mounted guard of another root that
minted the same `useId`. Both were a panel telling the reader something false about
a guard they were debugging.

**Enforcement**: `packages/react/test/GateRegistry.store.test.ts` checks random
`register`/`update`/`unregister` sequences against a reference model and asserts the
ids stay distinct; `GateRegistry.test.tsx` ("scoped to its atom set") mounts two atom
sets and two hydrated roots over one; `gate-instances.feature` has a scenario for two
atom sets.

**Related**: [BEH-QD-233](behaviors/28-devtools-screens.md), [ADR-QD-080](decisions/080-a-gate-registry-belongs-to-its-atom-set.md), [INV-QD-046](#inv-qd-046-instrumentation-never-changes-what-a-guard-renders).

---

## INV-QD-061: `toRenderable` preserves `evaluatePredicate`'s meaning in two-valued logic

For every `Predicate` `toRenderable` accepts, and every row whose columns are all
present, interpreting the returned `RenderableNode` in two-valued logic — every
`NullGuard` applied literally — gives the same answer as `evaluatePredicate` does
against the same `Predicate` and row, including rows whose values have the wrong
type for the column.

**Source**: `packages/core/src/RenderablePredicate.ts` — `toRenderable`, whose
leaf classification reads what a leaf means on NULL from `evaluatePredicate`
itself (`nullGuardFor`: `evaluatePredicate(leaf, {[column]: null})`) and what it
means on a non-finite value the same way (`finiteGuardFor`: whether
`evaluatePredicate` denies `Infinity`, `-Infinity` or `NaN` on the leaf), and
whose `Gte`/`Lt` arm checks the bound with `isRangeBound`, which is `Compare.ts`'s
`isFiniteNumber` itself.

**Implication**: this is [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
one layer further, and it is what lets a dialect package be a renderer that
decides nothing. The rules a package used to re-derive (safe literals, `Compare`
against NULL and against a non-number, an empty `MemberOf`) are stated once, so a
semantic fix (CCR-QD-120) lands once. A `NullGuard` is a no-op here: it only
matters to a target whose comparisons can be UNKNOWN, which INV-QD-047/048 check
against real engines. Absent (`undefined`) columns are out of scope: a table has
none, and `Predicate.test.ts` keeps covering them.

**Enforcement**: `packages/core/test/RenderablePredicate.test.ts` — R1 (a leaf's
guard is `AdmitNull` exactly when the reference admits NULL on it), R2/R3 (a
test-only two-valued interpreter of the tree, guards applied literally, equals the
reference over 400 generated predicates x 25 rows, for both negations and with a
declaration — the cells include `±Infinity` and `NaN`, and the interpreter's
`Range` compares them the way a target's plain `>=`/`<` does, so only the finite
guard keeps them out), R9 (a `Range`'s `finiteGuard` is `ExcludeNonFinite` exactly
when the target may hold a non-finite value and the reference denies one, under
`Unrepresentable`, `Unknown` and `Declared`; a target that cannot express the
guard refuses exactly those ranges), and the bound-rule test that a `Gte`/`Lt`
bound is a `Range` exactly when the evaluator can compare against it.

**Related**: [BEH-QD-271](behaviors/31-predicate-compilation.md#beh-qd-271-a-predicate-is-classified-once-in-core-into-a-renderable-tree), [ADR-QD-079](decisions/079-renderability-is-a-core-rule.md).

## INV-QD-062: A wrong nullability declaration never admits a row the predicate denies

For every `Predicate`, every renderer and every row, if the caller's `nullable`
declaration is wrong, the compiled query returns a subset of the rows
`evaluatePredicate` admits, or the engine or the compiler refuses it loudly. It
never returns a row `evaluatePredicate` denies.

**Source**: `packages/core/src/RenderablePredicate.ts` — the null-guard table
(`NULL_GUARD`) and the `NullOnNonNullableColumn` refusal.

**Implication**: a declaration is the minimum schema fact a schema-blind renderer
needs, and it must be safe to get wrong. Three mechanisms make it so. Core never
folds anything on the strength of a declaration. A null comparison on a column
declared NOT NULL refuses rather than folding to a constant, which could over-admit
under a `Negate`. And the guard table is polarity-aware per target: a three-valued
`NOT` (Prisma) is monotone — replacing the reference's FALSE with UNKNOWN can only
lose rows — so a NOT NULL column gets no guard; a two-valued `NOT` (SQL's `CASE
WHEN`, which collapses UNKNOWN to FALSE) is **not** monotone, and an unguarded
`Neq`/null-member `MemberOf` under an odd number of `Negate`s on a column that does
hold NULL flips to TRUE where the reference says FALSE, so it keeps `AdmitNull` at
negative polarity even on a declared NOT NULL column. The two-valued case was found
by a real-engine property in implementation, not by the plan's monotonicity
argument, which held only for the three-valued one.

**Enforcement**: `packages/predicate-sql/test/EngineAgreement.test.ts` S3
(true declaration: exact agreement on PGlite and `node:sqlite`; everything
declared nullable: exact; nothing nullable: a subset, with a strict subset
observed so it cannot pass vacuously), `packages/predicate-prisma/test/EngineAgreement.test.ts`
P2/P3 (under-declared: a subset; over-declared: equal or refused by Prisma, with a
refusal observed), and `packages/core/test/RenderablePredicate.test.ts` R7 (the
table's rows, including the two-valued negative-polarity guard).

**Related**: [BEH-QD-272](behaviors/31-predicate-compilation.md#beh-qd-272-a-nullability-declaration-can-only-narrow-or-refuse), [INV-QD-047](#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits), [INV-QD-048](#inv-qd-048-a-compiled-prisma-whereinput-admits-exactly-the-rows-the-predicate-admits), [ADR-QD-079](decisions/079-renderability-is-a-core-rule.md).

---

## INV-QD-091: A primitive matcher and its predicate leaf are one function

For every primitive matcher (`Eq`, `Neq`, `Gte`, `Lt`, `In`) and every value, the
matcher holds against the value exactly when the predicate leaf `toPredicate`
maps it to (`Compare` or `MemberOf` on a column) admits a row holding that value.

**Source**: `packages/core/src/Compare.ts` — the verdict functions. `judgeMatcher`'s
leaf arms (`Matcher.ts`) and `evaluatePredicate`'s `Compare`/`MemberOf` arms
(`Predicate.ts`) both call them; neither interpreter keeps a comparison rule of
its own.

**Implication**: [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
at its leaves, by construction rather than by sampling. INV-QD-018 had been
violated three times at exactly this layer — the bound (CCR-QD-120), the row value
(CCR-QD-172), and in between a `typeof` half of a guard copied without its
`Number.isFinite` half — each time because a rule lived in two copies and one was
patched. With one function, a fix to what a comparison means is one edit that
both interpreters see.

**Enforcement**: `packages/core/test/Compare.test.ts`, "PROPERTY: every primitive
matcher and its predicate leaf agree on every operand class" — every
`eq`/`neq`/`gte`/`lt`/`inArray` built from a 14-class operand universe (absent,
`null`, finite numbers, a numeric string, a boolean, the three non-finite numbers,
an object, an array, a bigint, a security label), judged against every value in
the same universe: 644 pairs, the count asserted so a shrunken universe fails.
`PredicateLiteral.test.ts` pins that `isRangeBound` *is* `isFiniteNumber`.

**Related**: [BEH-QD-305](behaviors/04-matchers.md#beh-qd-305-comparison-semantics-have-one-owner), [BEH-QD-122](behaviors/16-predicates.md#beh-qd-122-the-reference-interpreter-ships-with-it), [ADR-QD-091](decisions/091-comparison-semantics-have-one-owner.md).

## INV-QD-092: An absent value never satisfies a matcher

For every matcher, of every tag and at any nesting, `judgeMatcher(matcher,
undefined, context)` is not `Held`.

**Source**: `packages/core/src/Compare.ts` — every verdict function reports
`ValueAbsent` for an `undefined` value before comparing — and `judgeMatcher`'s
structural arms (`Matcher.ts`), which report their own `ValueAbsent` for an
`undefined` value.

**Implication**: an attribute nobody set is never read as one that satisfies a
condition. `Exists`, the ranges, `Contains` and the composites always followed
this; `Eq`/`Neq` joined in CCR-QD-112. Membership was the exception:
`inArray([undefined])` held for an absent value, because
`[undefined].includes(undefined)` is true, and `evaluatePredicate`'s `MemberOf`
agreed. Both deny now (CCR-QD-173), so the rule is total and can be stated —
which is also what lets `@qadi/devtools` decline a remedy that would set an
attribute to `undefined` rather than offer one that cannot work.

**Enforcement**: `packages/core/test/Compare.test.ts`, "PROPERTY:
judgeMatcher(m, undefined) is never Held, for every tag, nested" — 400 matchers
from the shared generator plus `inArray` over lists that may hold `undefined`,
nested under every wrapper, with all twelve tags asserted reached; and
`Predicate.test.ts`'s `MemberOf`-on-an-absent-column test, which agrees with
`evaluate`.

**Related**: [BEH-QD-027](behaviors/04-matchers.md#beh-qd-027-constructors-and-semantics), [BEH-QD-305](behaviors/04-matchers.md#beh-qd-305-comparison-semantics-have-one-owner), [ADR-QD-091](decisions/091-comparison-semantics-have-one-owner.md).

---

## INV-QD-093: A merge discloses nothing its inputs did not

For every `FieldStrategy` and every non-empty list of field sets, what
`mergeFields(strategy, sets)` discloses of a record is a subset of what their
union discloses; and a strategy outside the union discloses nothing at all.

**Source**: `packages/core/src/FieldLattice.ts` — one law-table row per strategy,
read through `Object.hasOwn`, and a fail-closed row (`merge` gives `[]`, every law
`false`) for any other value, `Object.prototype`'s keys included. The evaluator's
`allOf`/`anyOf` merges, `ShortCircuit.ts`'s stop rule and `Simplify.ts`'s rewrites
all read it.

**Implication**: widening is the one direction a field-strategy bug must never take
([ADR-QD-034](decisions/034-the-switch-exception-is-measured.md)), and it had been
taken twice by modules that each restated part of a strategy's meaning — an `anyOf`
whose strategy was `"toString"` stopped at its first allow and granted every field,
and `simplify` unwrapped a one-child composite under an unknown strategy from no
fields to its child's (CCR-QD-174). With one owner, an unknown value means the same
thing everywhere: nothing.

**Enforcement**: `packages/core/test/FieldLattice.test.ts`, "PROPERTY: a merge never
discloses more than its inputs' union" (300 samples through `project`) and the
fail-closed row test over `"Xor"`, `"toString"`, `"constructor"`, `"__proto__"`,
`"hasOwnProperty"` and `""`; `Evaluate.test.ts`'s CM-07 and prototype-key tests at
the evaluator.

**Related**: [BEH-QD-018](behaviors/03-policy-adt.md), [BEH-QD-035](behaviors/05-evaluator.md), [BEH-QD-154](behaviors/20-simplification.md), [INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top), [INV-QD-024](#inv-qd-024-simplification-changes-the-tree-and-nothing-a-caller-can-observe), [ADR-QD-092](decisions/092-field-strategy-meaning-lives-beside-the-lattice.md).

---

## INV-QD-094: A decision being re-checked, or that failed, never reads as a verdict

For every `DecisionResult` — every `AsyncResult<ClientDecision, EvaluationError>`
shape, not only those a decision atom happens to reach — `outcomeOf` reads `Allowed`
or `Denied` only from a `Success` that is not `waiting`, and then carries that
success's own decision. A `waiting` result reads `Pending` (when `Initial`) or
`Rechecking`; a `Failure` that is not `waiting` reads `Failed`; and no outcome has a
field holding a previous answer.

**Source**: `packages/react/src/DecisionOutcome.ts` — `outcomeOf` checks `Initial`,
then `waiting`, before dispatching on the variant with a module-scope
`Match.tagsExhaustive`; `Failed` is built from the failure's `cause` alone.
`currentDecision`, `Can`/`Cannot`, `useCan`, `useProjected` and the gate registry
(`GateRenderState = DecisionOutcome["_tag"]`) are projections of it, and
`useDecisionSuspense` delegates the same partition to `@effect/atom-react`'s
`suspendOnWaiting: true` (ADR-QD-093).

**Implication**: [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md)'s
rule spoke only of the `waiting` flag, and a stale allow has a second carrier the
flag does not mark: `AsyncResult.Failure.previousSuccess`, which
`AsyncResult.value`, `getOrElse` and `getOrThrow` return — after a re-check of an
allow fails, they still say "allowed", with `waiting: false`. This is the gap
[INV-QD-028](#inv-qd-028-a-seed-never-outlives-the-clients-own-answer)'s note names
for seeds, "an invariant about staleness that speaks only of the flag does not reach a
value that was never marked stale," closed here for failures by giving consumers a
read with nowhere to put the value. It is also what the React guide's own example got
wrong while two compile gates passed it (CCR-QD-175).

**Enforcement**: `packages/react/test/DecisionOutcome.test.ts` — "reads every state a
decision atom reaches" (a real atom, a parked resolver, eight states in order) and the
seeded row; the fast-check properties "never reads a waiting result as an answer",
"never reads a failure's previous success" and "agrees with currentDecision and
permits" over every `AsyncResult` shape. `DecisionOutcome.tst.ts` pins that no
non-answer case has a `decision` and `Failed` has no `previousSuccess`.
`DECISION_READ_BUDGET` (`scripts/check-house-style.mjs`) refuses a second raw read in
`packages/*/src`; the doc-fence gates (`node scripts/check-doc-examples.mjs`,
`node scripts/check-website-doc-examples.mjs`) refuse one in a compiled fence that
imports `@qadi/react`. `stryker.react.mjs` mutates `DecisionOutcome.ts`.

**Related**: [BEH-QD-066](behaviors/09-react.md#beh-qd-066-decision-state), [BEH-QD-068](behaviors/09-react.md#beh-qd-068-hooks-and-components), [BEH-QD-307](behaviors/09-react.md#beh-qd-307-a-decision-result-reads-as-one-of-five-outcomes), [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-028](#inv-qd-028-a-seed-never-outlives-the-clients-own-answer), [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md), [ADR-QD-093](decisions/093-a-decision-is-read-once.md).

## INV-QD-095: Every port is described once, and every derived layer agrees with its description

For every member of the port registry, the named fail-closed default answers the
description's `none`; every wrapper, double and replay fails only with an error
built by the description's `failure` (or, for a defect, its `defect`); a scripted
double's unscripted request answers `none`; and a request is keyed only by the
description's `key`.

**Source**: `packages/core/src/PortDescription.ts` (the description type),
`packages/core/src/PortDerivation.ts` (wrappers and defaults),
`packages/core/src/PortDoubles.ts` (scripted and recording doubles),
`packages/core/src/Ports.ts` (the closed registry and the environments), and the
five port modules, each declaring its description beside its service.

**Implication**: a port's facts — its error, its key, its fail-closed answer, its
span — had been restated wherever something wrapped, replayed, defaulted, doubled
or enumerated the port, and the restatements drifted: two of three retrying
wrappers hid their retries, two ports had no deadline, devtools copied every
default by hand. Stated once, a fact cannot disagree with itself, and the registry
being a mapped type over `PortName` means a port without a description, a
registry entry or a conformance case does not compile.

**Enforcement**: `packages/core/test/PortConformance.test.ts` runs the same
assertions over every port in the registry — default, retrying, bounded,
timing-out, names, scripted double, recording decorator, defect constructor,
request keys — with a case table typed over `PortName`;
`packages/core/test/PortDescription.test.ts` pins the generic derivations against
a test-local port; `packages/core/test/Ports.tst.ts` pins the registry's
type-level derivations; `PORT_DOUBLE_BUDGET` in `scripts/check-house-style.mjs`
keeps tests from re-stating a port's error by hand.

**Related**: [ADR-QD-094](decisions/094-a-port-is-described-once.md), [BEH-QD-308](behaviors/06-services.md#beh-qd-308-every-port-has-the-standard-wrapper-set), [BEH-QD-310](behaviors/06-services.md#beh-qd-310-a-port-can-be-scripted), [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-007](#inv-qd-007-defaults-fail-closed), [INV-QD-043](#inv-qd-043-a-snapshot-answers-what-the-live-layer-answered).

## INV-QD-096: Whatever the record codec emits, it accepts

For every `SinkRecord` `r`, `encodeSinkRecordString(r)` is either a refusal or a
string that `decodeSinkRecordString` accepts and rebuilds equal to `r` up to the
named normalisations: a resolver error's `cause` through `Schema.Defect()` (an
`Error` keeps `name`/`message`/`cause`; a cycle is dropped, a `bigint` becomes
`"10n"`, a non-finite number `null`), a `Date` in `resource` or `params` as its ISO
string, and an `undefined`-valued property as absent. The value form
(`encodeSinkRecord`/`decodeSinkRecord`) agrees with the text form.

**Source**: `packages/core/src/SinkCodec.ts` — the outbound walk refuses exactly
what the inbound depth guard and schema would refuse, its depth count matching
`DecodeDepthGuard.ts`'s `exceedsJsonDepth`.

**Implication**: a sender can no longer emit what every receiver refuses. Before
ADR-QD-095 a successful evaluation under a raised `maxDepth` produced a record the
devtools showed as "not-a-record" and an aggregator answered with a 400, while the
sender saw nothing wrong; and the same record crossed with three different `cause`
shapes depending on which sink carried it.

**Enforcement**: `packages/core/test/SinkCodec.test.ts` — the round-trip property
over generated policies, resources, params and causes (JSON and hostile values),
the agreement property between the outbound `TooDeep` refusal and
`exceedsJsonDepth`, and the golden bytes for `Decided` records;
`packages/audit/test/AuditEntry.test.ts` — an audit row, a frame's data and
forwarding's `send` value are the same bytes for one record.

**Related**: [ADR-QD-095](decisions/095-sinkcodec-owns-both-directions.md), [BEH-QD-199](behaviors/25-inspection.md), [BEH-QD-200](behaviors/25-inspection.md), [BEH-QD-250](behaviors/33-audit-pipeline.md), [INV-QD-097](#inv-qd-097-the-record-codec-is-total).

## INV-QD-097: The record codec is total

`encodeSinkRecord`, `encodeSinkRecordString`, `decodeSinkRecord` and
`decodeSinkRecordString` never throw, and never die, whatever they are given: a
record that cannot cross is a `SinkRecordNotEncodable`, input that is not a record
is a `SinkRecordNotDecodable`, and a refusal affects only its own record. No
adapter — forwarding, the decision stream, the audit encoder, the devtools source
— lets one record end a feed, fail a decision, or count as a store failure.

**Source**: `packages/core/src/SinkCodec.ts`; the adapters
`packages/core/src/DecisionSinkForwarding.ts`,
`packages/http/src/DecisionStreamRoute.ts`, `packages/audit/src/AuditEntry.ts`,
`packages/devtools/src/model/Source.ts`.

**Implication**: before ADR-QD-095 a resolver `cause` with a reference cycle — the
shape an HTTP client's error has — threw out of the decision stream's framing and
ended every subscriber, and the same throw at an audit store's `JSON.stringify`
counted as a write failure, so an attribute-store outage tripped the breaker and
dropped the healthy rows after it. The encode of a policy about 5,000 levels deep
threw too, and forwarding reported it as a delivery failure.

**Enforcement**: `packages/core/test/SinkCodec.test.ts` — totality properties over
hostile resources, params and causes (cycles, functions, symbols, bigints, `NaN`,
`Map`/`Set`, throwing getters and `toString`) and over arbitrary strings and JSON
values; `packages/http/test/decisionStream.test.ts` — two subscribers of one feed
both receive the record after a poisoned one;
`packages/audit/test/AuditDecisionSinkLive.test.ts` — five poisoned `Failed`
records do not trip the breaker for a JSON-text store;
`packages/core/test/DecisionSinkForwarding.test.ts` — a refusal reaches
`onFailure`, never `send`.

**Related**: [ADR-QD-095](decisions/095-sinkcodec-owns-both-directions.md), [BEH-QD-187](behaviors/24-decision-sink.md), [BEH-QD-311](behaviors/26-decision-stream.md#beh-qd-311-one-record-never-ends-the-feed-and-a-refused-one-is-reported), [BEH-QD-312](behaviors/33-audit-pipeline.md#beh-qd-312-a-stored-row-is-read-back-through-a-guard), [INV-QD-035](#inv-qd-035-a-sink-cannot-change-a-decision).

## INV-QD-098: A decoded decision record has exactly the outcome its sender sent

A `SinkRecord` that `decodeSinkRecord` (or `decodeAuditEntry`) returns carries the
outcome its sender wrote, and only that one: a decision record naming neither
outcome, or both, is refused and never decoded. No outcome is invented and none
is chosen. Wire version 2 — the only version read since 0.11.0 — carries the
outcome as one tagged value, so neither case can be written down: a version-2
record with no `outcome`, or an outcome carrying a second one, is `Malformed`.
The bytes that could say "both" or "neither" are version 1's, written before
0.10, and they are refused as `UnsupportedVersion` before any outcome is read.

**Source**: `packages/core/src/SinkCodec.ts` (`OutcomeWire`, `decodeSinkRecord`'s
version check, `rebuild`).

**Implication**: before ADR-QD-096 a record naming neither outcome decoded to an
invented `MissingResource`, indistinguishable by code (`ACL004`) from a real
resolver-wiring failure, so a devtools row or a metric bucketed by code could not
tell a missing attribute from a malformed record (ticket 96); a record naming both
silently kept `decided` (ticket 155).

**Enforcement**: `packages/core/test/SinkCodec.test.ts` — "a record naming no
outcome is refused", "a pre-0.10 record naming both outcomes is refused", the
malformed-v2-outcome cases, and the property "a v2 record naming no outcome, a
malformed one, or an unknown nested key never decodes, and never throws";
`packages/audit/test/AuditEntry.test.ts` — `decodeAuditEntry` refuses a row naming
no outcome and one carrying a stray second; `packages/devtools/test/model/Source.test.ts`
— a frame with no outcome is dropped as `not-a-record`;
`features/features/wire-versions/wire-versions.feature`.

**Related**: [ADR-QD-096](decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md), [BEH-QD-200](behaviors/25-inspection.md), [INV-QD-096](#inv-qd-096-whatever-the-record-codec-emits-it-accepts).

## INV-QD-099: A record decodes the same whichever wire version carried it

> **Retired in 0.11.0 (CCR-QD-182).** 0.11.0 reads one wire version, version 2
> ([ADR-QD-096](decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)'s
> 2026-10-06 amendment), so there are no two versions for a record's decoding to
> agree across. A record with no `version` — version 1, written before 0.10 — or
> any other `version` is refused as `UnsupportedVersion` and never decoded, so no
> reader sees one decision two ways; an audit store holding version-1 rows is
> migrated with 0.10.x before its readers upgrade, and a row that is not is
> reported, never misread. The id is kept, and not reused.
>
> What replaced it is a refusal, enforced where this invariant was:
> `packages/core/test/SinkCodec.test.ts` — the property "one version: any record's
> pre-0.10 bytes are UnsupportedVersion, never upgraded into a record" and the
> pre-0.10 refusal cases; `packages/audit/test/AuditEntry.test.ts` — a pre-0.10 row
> is `UnsupportedVersion`; `packages/devtools/test/model/Source.test.ts` — a pre-0.10
> frame is dropped as `unsupported-version`;
> `features/features/wire-versions/wire-versions.feature`.
>
> The invariant as it read through 0.10.x, kept for the record: "For every
> `SinkRecord` `r` that both versions can carry, decoding its version-1 bytes and
> decoding its version-2 bytes give equal records. Version 1 is read for good — it
> is upgraded into the version-2 wire type and rebuilt by the one rebuild — so a
> reader never needs to know which version a sender wrote, and an audit row
> written before the wire was versioned reads as the record it recorded."

**Related**: [ADR-QD-096](decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md), [BEH-QD-199](behaviors/25-inspection.md), [BEH-QD-312](behaviors/33-audit-pipeline.md#beh-qd-312-a-stored-row-is-read-back-through-a-guard), [INV-QD-096](#inv-qd-096-whatever-the-record-codec-emits-it-accepts).

## INV-QD-100: A log reader sees every retained record exactly once

For every `read` of a decision log, every record the log retained when the read
was taken is in its `backlog`, every record appended after is delivered on its
`live` stream (bar a reader slower than `capacity`, which loses its oldest
unread, never its newest), and no record is in both or delivered twice —
whatever other fibers record, ingest or read concurrently.

**Source**: `packages/core/src/DecisionLog.ts` — `accept` appends (numbering
and retaining in one `Effect.sync`) **then** publishes; `readEntries` subscribes
**then** snapshots, and filters the live half to sequence numbers above the
snapshot's high-water mark.

**Implication**: the handoff between a reader's past and its future is the log's
to get right, not each reader's. The ring + feed pairing it replaced lost every
record made between reading the ring and subscribing to the feed (ARCH-11 C9)
under the feed's default `replay: 0`, and duplicated the replay window
otherwise. A reader over SSE inherits the guarantee: `/__decisions` makes one
`read` per connection and sends its backlog as the prelude
([BEH-QD-314](behaviors/26-decision-stream.md#beh-qd-314-the-backlog-travels-on-the-stream-and-every-frame-names-its-producer)).
Across sources and reconnects, the timeline's identity rule
([INV-QD-039](#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival))
still absorbs repeats; exactly-once is per read.

**Enforcement**: `packages/core/test/DecisionLog.test.ts` — "each reader sees
every record exactly once, under concurrent writers and readers": 80 generated
interleavings of 1–40 writer fibers and 1–3 readers opened at random points,
with the scheduler's `MaxOpsBeforeYield` set low enough to switch fibers inside
an append-then-publish and a subscribe-then-snapshot, asserting each reader's
`backlog ++ live` equals the records written as a multiset; the targeted "a
record made between `read`'s snapshot and the first live pull arrives live,
once"; `features/features/decision-log/decision-log.feature` (the same log read
in process and over SSE holds the same records).

**Related**: [ADR-QD-097](decisions/097-a-decision-log-is-a-sink-and-its-own-history.md), [BEH-QD-313](behaviors/24-decision-sink.md#beh-qd-313-a-reader-sees-each-retained-record-once-across-backlog-and-live), [INV-QD-035](#inv-qd-035-a-sink-cannot-change-a-decision).

---

## INV-QD-102: A probe's verdict on port health is never served from a cache

A readiness probe reports whether the wired ports answered on this call, whatever
`DecisionCache` is wired. It is not a decision: it leaves no record, counts no decision metric and
fills no cache entry.

**Source**: `packages/core/src/GuardHealthCheck.ts` walks the policy through `walk` (`Walk.ts`)
and never calls `evaluate`, so it never reaches `DecisionCache.getOrCompute`.

**Implication**: through `decide`, a cache that keeps successes and has no TTL (ADR-QD-031)
served every probe after the first, so a probe reported healthy while the store was down.

**Enforcement**: `packages/core/test/GuardHealthCheck.test.ts` (a port that answers once then
fails; second probe unhealthy with a cache wired; a recording sink, the cache and
`qadi_decisions_total` untouched), `GuardHealthCheck.tst.ts` (requires only `CurrentSubject` and
`PortServices`).

**Related**: [BEH-QD-317](behaviors/05-evaluator.md#beh-qd-317-a-readiness-probe-asks-the-ports-every-time), [ADR-QD-100](decisions/100-a-question-is-asked-once.md), [INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity).

---

## INV-QD-103: A trace lines up with its policy's explanation, position by position

For every policy and every evaluation of it that produced a decision, the `i`th child of a trace
node is the node `evaluateNode` made for the `i`th part of the corresponding explanation node. A
composite's trace children are a prefix of its parts; a wrapper has exactly one child; a leaf has
none; and a part with no trace child was never reached, as is everything beneath it.

**Source**: `packages/core/src/Walk.ts` (`evaluateNode` and the composites, where `step` pushes
one child per evaluated row in row order), `packages/core/src/Explanation.ts` (`explain`, which
mirrors the policy, and `foldAligned`, which reads the pairing), `packages/core/src/TraceKey.ts`
(the key of each position).

**Implication**: this is what lets a display show a branch as *unexamined* rather than as
*denied* ([INV-QD-040](#inv-qd-040-the-inspector-never-claims-more-than-the-trace-does)). It was a
guarantee of core that only a devtools test enforced, restated in a docstring there. A subtree
shared by identity is **several positions**: `foldAligned` combines once per position, never once
per node, so the second occurrence has its own trace and its own key and not the first one's.

**Enforcement**: `packages/core/test/TraceAlignment.test.ts` — over `policyArbitrary()` and
`sharedPolicyArbitrary`, against varied subjects, with and without `concurrency`, every trace
node sits at a position whose explanation tag is the counterpart of its `policyTag`, the position
count equals the number of paths in the explanation (which is what fails a fold memoised by node),
keys are distinct and equal `tracePathKey` of their path, a rule table that stops early leaves
later rows unreached and carries each row's `effect`, and a 100,000-deep chain folds with
alternating verdicts.

**Related**: [BEH-QD-319](behaviors/18-explanation.md), [INV-QD-005](#inv-qd-005-short-circuit-preservation), [INV-QD-020](#inv-qd-020-concurrency-changes-lookups-not-answers), [INV-QD-090](#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack), [ADR-QD-101](decisions/101-the-alignment-of-an-explanation-with-a-trace-is-cores.md).
