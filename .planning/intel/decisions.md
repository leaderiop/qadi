# Decisions

Synthesized from 50 classified ADRs in `spec/decisions/` (all `type: ADR`, `confidence: high`, `locked: true`, status: Accepted). Cross-reference cycle detection was run against the classification set's `cross_refs` graph — no cycles found (see `INGEST-CONFLICTS.md` for the re-run history on ADR-QD-005/009/013/016/026).

---

## ADR-QD-001: Effect v4 is the effect system
- source: spec/decisions/001-effect-v4-as-effect-system.md
- status: locked (Accepted)
- decision: Effect v4 (`>=4.0.0-beta.100`) is the effect system. `Result` is retired.
- scope: Effect v4, Result type, Context.Service, dependency injection, concurrency model, observability

## ADR-QD-002: The policy ADT is schema-derived
- source: spec/decisions/002-schema-derived-policy-adt.md
- status: locked (Accepted)
- decision: The policy union's recursive TypeScript type (`Policy`/`PolicyEncoded`) is hand-written first, because `Schema.suspend` needs a named type to close a self-referential loop. The `Schema.Union` of `Schema.TaggedStruct` variants is then built and type-asserted against that type (`Schema.Codec<Policy, PolicyEncoded>`), so the two cannot silently diverge. The JSON codec is derived from that schema (`Schema.fromJsonString(Policy)`).
- scope: Policy ADT, Schema.suspend, JSON codec, fieldStrategy, trust boundary

## ADR-QD-003: `_tag` is the discriminant
- source: spec/decisions/003-tag-discriminant.md
- status: locked (Accepted)
- decision: Every discriminated union in this library uses `_tag`.
- scope: discriminated unions, _tag, Schema.TaggedStruct, Effect.catchTag, Match

## ADR-QD-004: One Effect-returning evaluator
- source: spec/decisions/004-single-effect-evaluator.md
- status: locked (Accepted)
- decision: There is one evaluator. It returns `Effect<Decision, EvaluationError, CurrentSubject | AttributeResolver | RelationshipResolver | EvaluationId>`.
- scope: evaluator, Effect, short-circuiting, RelationshipResolver, AttributeResolver, ReBAC

## ADR-QD-005: Attribute resolution is lazy and per-node
- source: spec/decisions/005-lazy-attribute-resolution.md
- status: locked (Accepted)
- decision: Attributes are read at the node that needs them. The evaluator checks the subject's own `attributes` first and calls `AttributeResolver` only on a miss.
- scope: attribute resolution, AttributeResolver, policy evaluation, short-circuiting, concurrency

## ADR-QD-006: `fieldStrategy` is required and always encoded
- source: spec/decisions/006-field-strategy-always-encoded.md
- status: locked (Accepted)
- decision: `fieldStrategy` is a required field on `AllOf` and `AnyOf` in the schema, so it is always encoded and always decoded. The combinators supply a default at construction (`Intersection` for `allOf`, `First` for `anyOf`), so callers need not think about it, but the value is concrete from that point on.
- scope: fieldStrategy, AllOf, AnyOf, composite policies, schema serialization

## ADR-QD-007: Permission tokens and the reserved separator
- source: spec/decisions/007-permission-token-representation.md
- status: locked (Accepted)
- decision: `Permission` is a hand-written interface with literal type parameters, so `Permission<"doc", "read">` and `Permission<"doc", "write">` are incompatible at compile time.
- scope: Permission, permission tokens, wire format, trust boundary schema validation

## ADR-QD-008: `Data.TaggedError` with codes derived from tags
- source: spec/decisions/008-error-taxonomy.md
- status: locked (Accepted)
- decision: Every error is a `Data.TaggedError` with a stable, plain tag such as `"AccessDenied"`. The `_tag` is the identity.
- scope: Data.TaggedError, error codes, error taxonomy, Effect.catchTag

## ADR-QD-009: Observability comes from Effect
- source: spec/decisions/009-observability-via-effect.md
- status: locked (Accepted)
- decision: Authorization decisions are reported through Effect's built-in tracing, logging and metrics. `evaluate` runs inside a `qadi.evaluate` span annotated with the decision, subject id, evaluation id and policy tag.
- scope: observability, tracing, AuditTrailPort, QadiEventSink, QadiSpanSink, QadiInspector, ClockSource, evaluate span

## ADR-QD-010: Context.Service with standalone layer constants
- source: spec/decisions/010-context-service-and-layers.md
- status: locked (Accepted)
- decision: Services follow the `Context.Service` form with separately exported `…Shape` interfaces. Layers are exported constants; there are no `static layer` members and no auto-generated `.Default`.
- scope: Context.Service, layers, Effect v4, service shape, Effect.Service

## ADR-QD-011: Qadi.enforce is an Effect aspect
- source: spec/decisions/011-enforce-as-aspect.md
- status: locked (Accepted)
- decision: `Qadi.enforce(policy)` is a combinator that wraps an Effect — enforcement is an Effect aspect, not a separate call path.
- scope: Qadi.enforce, Qadi.enforceProjected, AccessDenied, Effect aspect, enforcement

## ADR-QD-012: Time and identifiers come from services
- source: spec/decisions/012-deterministic-time-and-ids.md
- status: locked (Accepted)
- decision: Durations come from Effect's `Clock`. Evaluation identifiers come from an `EvaluationId` service.
- scope: Clock, EvaluationId service, evaluation traces, determinism, TestClock

## ADR-QD-013: Sequential short-circuit by default
- source: spec/decisions/013-short-circuit-default.md
- status: locked (Accepted)
- decision: Children are evaluated sequentially, stopping at the first denying child of an `allOf` and the first allowing child of an `anyOf`.
- scope: composite policies, allOf, anyOf, short-circuit evaluation, fieldStrategy Union, concurrent evaluation, EvaluateOptions.concurrency

## ADR-QD-014: React integrates through Effect atoms
- source: spec/decisions/014-react-via-atoms.md
- status: locked (Accepted)
- decision: `@qadi/react` is a binding over `effect/unstable/reactivity`. No additional dependency: the React glue is one `useSyncExternalStore` call in `QadiProvider.tsx`, so the package depends on `effect` and `react` and nothing else. (Revision 1.0 of this ADR superseded a `ManagedRuntime`-based integration.)
- scope: @qadi/react, effect/unstable/reactivity, Atom, AtomRegistry, useSyncExternalStore, QadiProvider, decision caching, invalidation

## ADR-QD-015: The role DAG is acyclic by construction
- source: spec/decisions/015-role-dag-acyclic-by-construction.md
- status: locked (Accepted)
- decision: `role()` is total. It takes parents by value, so the graph is a DAG by construction and `flattenPermissions` needs no cycle check — only a visited set, so a diamond is walked once rather than exponentially.
- scope: role graph, role inheritance, flattenPermissions, resolveRoleGraph, CircularRoleInheritance

## ADR-QD-016: GxP compliance is out of scope
- source: spec/decisions/016-gxp-out-of-scope.md
- status: locked (Accepted)
- decision: Regulated-environment support is out of scope. This library provides authorization: tokens, policies, evaluation, enforcement, field-level visibility.
- scope: GxP compliance, audit trail, write-ahead log, circuit breaker, IQ/OQ/PQ validation, electronic signatures, authorization

## ADR-QD-017: A decision being re-checked is not a decision
- source: spec/decisions/017-stale-decisions-are-not-decisions.md
- status: locked (Accepted)
- decision: Every consumer in `@qadi/react` treats a `waiting` result as *not decided*. `currentDecision` is the single place that rule lives.
- scope: AsyncResult, waiting flag, currentDecision, @qadi/react, useCan, useDecisionSuspense, Can, Cannot

## ADR-QD-018: The action is an evaluation input, not a permission segment
- source: spec/decisions/018-action-dimension.md
- status: locked (Accepted)
- decision: A permission is a grant the subject holds. An action is a property of the request. They are different things that happen to share a word, and Qadi keeps them separate.
- scope: action, EvaluateOptions, MatcherContext, permission tokens, policy evaluation

## ADR-QD-019: An obligation is a condition on permission, carried by the allow that granted it
- source: spec/decisions/019-obligations.md
- status: locked (Accepted)
- decision: An obligation is a condition attached to permission. The obligations on a decision are those contributed by the allow that was actually returned. Obligations union across `AllOf`/`AnyOf` children that allow; they never intersect, and a denying node contributes none. `Not` never has an obligation set to decide about.
- scope: obligations, Policy ADT, Decision, Not, AllOf, AnyOf, XACML, UCON, purpose limitation

## ADR-QD-020: History is a three-valued port, because a boolean cannot fail closed under negation
- source: spec/decisions/020-decision-history-port.md
- status: locked (Accepted)
- decision: History is a three-valued port (`ActedResult = "Acted" | "NotActed" | "Unknown"`), not a boolean — no boolean default is fail-closed for both polarities of `hasActed`/`hasNotActed`. `"Unknown"` means no store is wired, and both `hasActed`/`hasNotActed` deny on it via one default layer, `DecisionHistoryUnknown`.
- scope: DecisionHistory, ActedQuery, ActedResult, separation of duty, Chinese Wall, history-based control, task-based control, fail-closed defaults

## ADR-QD-021: Dominance is a four-valued comparison, and the label never enters the policy
- source: spec/decisions/021-label-lattice.md
- status: locked (Accepted)
- decision: `SecurityLabel` is `{ level: number; compartments: ReadonlyArray<string> }`, computed structurally with no lattice service to provide. Dominance is `≥` on level and `⊇` on compartments. `compartments` is an array, not a `ReadonlySet`, for stable structural equality. The label never enters the policy and needs no codec.
- scope: security labels, dominance, lattice, SecurityLabel, matchers, Bell-LaPadula, MLS

## ADR-QD-022: A subject set is asked by nobody, and the answer reports rather than enforces
- source: spec/decisions/022-subject-set-evaluation.md
- status: locked (Accepted)
- decision: `decideSubjects` evaluates a policy against a list of subjects without requiring an ambient `CurrentSubject` (`SubjectSetServices = Exclude<EvaluationServices, CurrentSubject>`); each subject is evaluated via `Effect.provideService`. Subject-set evaluation reports; it does not enforce.
- scope: decideSubjects, SubjectSetServices, CurrentSubject, batch evaluation, review queries, NGAC

## ADR-QD-023: A rule list stops at the first rule that cannot be overridden
- source: spec/decisions/023-combining-algorithms.md
- status: locked (Accepted)
- decision: Combining algorithms are a new policy variant, `Rules` (`combining: "FirstApplicable" | "DenyOverrides" | "PermitOverrides"`, rules with `Permit`/`Deny` effect), not a field added to the existing `AllOf`/`AnyOf` combinators.
- scope: Rules variant, Combining algorithms, AllOf, AnyOf, FieldStrategy, RuBAC, XACML, Policy ADT

## ADR-QD-024: A predicate is a second interpreter, and it ships with the reference that proves it agrees
- source: spec/decisions/024-predicate-output.md
- status: locked (Accepted) — narrowed by ADR-QD-054 (not in this ingest batch; see INGEST-CONFLICTS.md)
- decision: The predicate output is an abstract `Predicate` union (`True | False | Compare | MemberOf | And | Or | Negate`) with no `Schema` — Qadi acquires no database dependency; the caller compiles the predicate. It ships with a reference interpreter (`evaluatePredicate`) that is what makes it trustworthy. Narrowed by ADR-QD-054: a companion package (`@qadi/predicate-sql`, `@qadi/predicate-prisma`) may now compile a dialect, though `@qadi/core` itself still acquires no database dependency.
- scope: predicate, row-level security, SQL compilation, reference interpreter, Qadi core

## ADR-QD-025: Mutation testing as a merge gate
- source: spec/decisions/025-mutation-testing.md
- status: locked (Accepted)
- decision: Stryker runs on `packages/core` as the last step of `pnpm check`, breaking below 80%.
- scope: mutation testing, Stryker, packages/core, pnpm check, merge gate

## ADR-QD-026: Concurrency changes what is looked up, never what is decided
- source: spec/decisions/026-concurrent-evaluation.md
- status: locked (Accepted)
- decision: `EvaluateOptions.concurrency` is opt-in, and turning it on changes only which lookups happen and how long they take. The decision and its trace are identical.
- scope: EvaluateOptions.concurrency, evaluation, short-circuiting, trace, AllOf, AnyOf, Rules, INV-QD-005, INV-QD-020

## ADR-QD-027: An explanation is a tree, and English is one rendering of it
- source: spec/decisions/027-policy-explanation.md
- status: locked (Accepted)
- decision: `explain(policy)` returns an `Explanation` tree. `renderExplanation` turns one into English.
- scope: policy explanation, explain, renderExplanation, Explanation tree

## ADR-QD-028: A hydrated decision is bound to a subject and carries no trace
- source: spec/decisions/028-decision-hydration.md
- status: locked (Accepted)
- decision: Two pure functions: `dehydrateDecisions` on the server, `hydrateDecisions` on the client. The payload is bound to a subject id, and it carries no trace.
- scope: decision hydration, QadiProvider, dehydrateDecisions, hydrateDecisions, React, subject binding, trace disclosure

## ADR-QD-029: `join` and `meet` ship as utilities, and the evaluator still never derives a label
- source: spec/decisions/029-lattice-join-and-meet.md
- status: locked (Accepted)
- decision: `join` and `meet` are exported as pure functions on `SecurityLabel`. Nothing in the evaluator changes.
- scope: SecurityLabel, label lattice, join, meet, evaluator

## ADR-QD-030: Simplification preserves the verdict, not the trace, and is never automatic
- source: spec/decisions/030-policy-simplification.md
- status: locked (Accepted)
- decision: `simplify(policy)` is an explicit, opt-in transform. It preserves the verdict and the field set. It does not preserve the trace, and that is stated rather than mitigated.
- scope: simplify, Policy ADT, explain, toPredicate, field visibility, double negation

## ADR-QD-031: A cache stores the trace, not the decision, and the key is the security boundary
- source: spec/decisions/031-decision-cache.md
- status: locked (Accepted) — cache key shape later widened by ADR-QD-043 (see INGEST-CONFLICTS.md)
- decision: An optional `DecisionCache` service. Absent by default. It stores the `Trace`, and its key includes the subject.
- scope: DecisionCache, Trace, EvaluationId, server-side caching, evaluate

## ADR-QD-032: A Promise facade with no evaluator in it
- source: spec/decisions/032-promise-facade.md
- status: locked (Accepted)
- decision: `@qadi/promise`: a separate package, one file, no evaluation logic.
- scope: @qadi/promise, Promise facade, ManagedRuntime, evaluator, denial vs failure semantics

## ADR-QD-033: The packed artifact is the product, so a gate installs it
- source: spec/decisions/033-the-packed-artifact-is-the-product.md
- status: locked (Accepted)
- decision: `scripts/check-package-install.mjs`, gate 14, packs each public package, installs it into a throwaway sandbox, and makes a TypeScript consumer authorize through it — wired into `pnpm check` before `stryker`.
- scope: merge gates, package publishing, pnpm pack, tsconfig.build.json, exports map, @qadi/promise, authorization

## ADR-QD-034: The switch exception is measured, and two of the four were unguarded
- source: spec/decisions/034-the-switch-exception-is-measured.md
- status: locked (Accepted)
- decision: The four switches stay, and both dispatchers that lacked an exhaustiveness net now carry one.
- scope: switch dispatch exception, Match, resolveRef, mergeFields, evaluation performance, exhaustiveness

## ADR-QD-035: A witness travels as a value, because `Context` cannot prove which permission it's for
- source: spec/decisions/035-witness-guard-primitive.md
- status: locked (Accepted)
- decision: A witness is a branded value, not a service, produced by one combinator in `@qadi/core`.
- scope: witness, guard, Authorized, Context.Service, @qadi/http, @qadi/core, enforce

## ADR-QD-036: `@qadi/http`: two framework adapters, one enforcement path, one registry
- source: spec/decisions/036-qadi-http-package-shape.md
- status: locked (Accepted)
- decision: Endpoint permission requirements are a plain curried function, not a `dual`-based combinator — `@qadi/http` ships two framework adapters, one enforcement path, one registry.
- scope: @qadi/http, HttpApiEndpoint, HttpRouter, requiresPermission, guard, SubjectExtractorShape

## ADR-QD-037: Two new merge gates: no circular imports, and type-level tests that outlive a comment
- source: spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md
- status: locked (Accepted)
- decision: Two new merge gates, `pnpm check` steps 5 and 6 — no circular imports, and type-level tests that outlive a comment — run between the lint family and the runtime test suite.
- scope: madge, tstyche, circular imports, type-level tests, pnpm check, merge gates

## ADR-QD-038: Changesets track versioned releases; publishing itself still doesn't run anywhere
- source: spec/decisions/038-changesets-for-versioned-releases.md
- status: locked (Accepted)
- decision: `@changesets/cli` records what changed and computes version bumps; nothing wires it into CI or `pnpm check`.
- scope: changesets, versioning, monorepo releases, CI, pnpm workspace, changelog

## ADR-QD-039: A seed is not an authority, so it lives in its own atom
- source: spec/decisions/039-a-seed-is-not-an-authority.md
- status: locked (Accepted)
- decision: The seed lives in its own atom, and the decision a consumer reads is a derivation over both — a seed is not an authority.
- scope: AtomRegistry, decision hydration, seeded decisions, currentDecision, QadiProviderProps.initialValues

## ADR-QD-040: An unwired port names its own absence, because a denial that guesses sends the reader to the wrong system
- source: spec/decisions/040-an-unwired-port-names-its-absence.md
- status: locked (Accepted)
- decision: The relationship port answers three ways, as the history port does: `RelatedResult = "Related" | "Unrelated" | "Unknown"`. `"Unknown"` means no resolver is wired (a wired-but-unreachable resolver is a `RelationshipResolveError`, not an answer). Verdicts are unchanged from the boolean version — only the diagnosis differs. Breaking: every `RelationshipResolverShape` implementation must return the new three-valued type.
- scope: RelationshipResolver, hasRelationship, ReBAC, AccessDenied, RelatedResult

## ADR-QD-041: A hydration mismatch is announced, not resolved
- source: spec/decisions/041-a-mismatch-is-announced.md
- status: locked (Accepted)
- decision: The client's answer still wins; a hydration mismatch is reported alongside, not resolved. A mismatch is `isAllowed(seeded) !== isAllowed(decided)` (verdict only); a failure is not a disagreement; reported once per question. Delivered via `console.warn` in development by default, or routed to a supplied `onHydrationMismatch` callback (which replaces rather than adds to the warning) in any environment.
- scope: hydration mismatch, RelationshipResolver, seed, client decision, reporting

## ADR-QD-042: A lossy projection is not an identity, in prose or in a cache key
- source: spec/decisions/042-a-projection-is-not-an-identity.md
- status: locked (Accepted)
- decision: Composite explanation children are parenthesised via one `embed` helper at every child position; only atomic explanations render bare. The cache key is the question itself — `keyOf` is deleted; `HashMap`/`Chunk` hold `DecisionCacheKey` directly and compare via Effect's structural `Equal`/`Hash`.
- scope: Explanation.ts, renderExplanation, DecisionCache, keyOf, INV-QD-025, INV-QD-030

## ADR-QD-043: A decision is computed from the inputs it claims, not from a proxy for them
- source: spec/decisions/043-a-decision-is-computed-from-its-inputs.md
- status: locked (Accepted)
- decision: The guarded resource is the evaluated resource: an explicit `options.resource` passed to `enforce` overrides rather than merges with the handler's resource, so the handler, witness and evaluation cannot disagree about which resource was checked. The decision cache key now carries the whole subject (`AuthSubject`, not `subjectId`) — a breaking change to the public `DecisionCacheKey` shape, explicitly widening ADR-QD-031's key definition.
- scope: guard, Qadi.ts, resource evaluation, DecisionCache, Evaluate.ts, @qadi/http, SubjectExtractor

## ADR-QD-044: An optional decision sink: what ADR-QD-009 deleted, and what it did not
- source: spec/decisions/044-an-optional-decision-sink.md
- status: locked (Accepted)
- decision: Add `DecisionSink`: one optional, write-only port, read through `Effect.serviceOption` exactly as `DecisionCache` is (ADR-QD-031).
- scope: DecisionSink, EvaluationServices, DecisionCache, observability, ADR-QD-009, ADR-QD-008, devtools

## ADR-QD-045: The topology is a choice of sink, and core ships only the seam
- source: spec/decisions/045-the-topology-is-a-choice-of-sink.md
- status: locked (Accepted)
- decision: Core ships the seam, not the transport — the topology is a choice of sink.
- scope: decisionSinkRing, decisionSinkForwarding, decisionSinkAll, devtools, @qadi/core, transports

## ADR-QD-046: A decision feed is Server-Sent Events, and it is guarded like any other route
- source: spec/decisions/046-a-decision-feed-is-sse-and-guarded.md
- status: locked (Accepted)
- decision: A decision feed is delivered as Server-Sent Events, guarded by a policy, with no unguarded variant.
- scope: decision feed, SSE, guardRoute, HttpRouter, authorization, decisionStreamRoute

## ADR-QD-047: The devtools is a headless model with a React shell over it
- source: spec/decisions/047-a-headless-devtools-model.md
- status: locked (Accepted)
- decision: One package, `@qadi/devtools`, split at the React boundary — a headless model with a React shell over it.
- scope: @qadi/devtools, devtools model, React shell, decision timeline, verdict classification

## ADR-QD-048: The catalogue is observed, not registered
- source: spec/decisions/048-an-observed-catalogue.md
- status: locked (Accepted)
- decision: The catalogue is derived from the timeline, and declaration is additive — the catalogue is observed, not registered.
- scope: devtools, policy catalogue, DecisionRecord, policiesSeen, Catalogue, role viewer, policy explorer

## ADR-QD-049: The second shell is a CLI, not a served page
- source: spec/decisions/049-the-second-shell-is-a-cli.md
- status: locked (Accepted)
- decision: A CLI, reading `/__decisions` and rendering the merged timeline to a terminal — not a page served by `@qadi/http`.
- scope: devtools CLI, second shell, /__decisions, build graph, @qadi/promise, check-package-install.mjs

## ADR-QD-050: A simulation is sealed, and it answers from one of three sources
- source: spec/decisions/050-a-simulation-is-sealed.md
- status: locked (Accepted)
- decision: Every simulation runs in a sealed layer, in every mode.
- scope: subject simulator, devtools, simulationLayer, DecisionSink, DecisionCache, CurrentSubject, Fixtures, Snapshot, Live
