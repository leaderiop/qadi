# @qadi/testing

## 0.5.0

### Minor Changes

- Resolved all 202 findings from a full-codebase audit (2026-09-06), plus the two follow-up human-decision items it surfaced. Correctness fixes, spec-consistency corrections, and hardening spanning every package — no single public API change dominates; see the merged PRs (#28-#32) for the itemized findings.
- Resolved all 191 Low/Info findings from a second full-codebase audit (2026-09-07, issue #49), including several genuine correctness fixes surfaced along the way:
  - `Neq` now denies whenever either resolved operand is `undefined` (including the both-absent case), matching `Eq`'s existing fail-closed stance — previously matched on one side being absent (H2).
  - `projectAt` (`FieldPath.ts`) walks an explicit stack instead of the call stack, closing a stack-overflow on deeply-nested field specs.
  - The untrusted-decode depth guard is now shared between `Policy.ts` and `SinkCodec.ts` (H6), and the circuit breaker releases its probe claim on abnormal exit (H4).
  - `predicate-prisma`'s compiler constant-folds vacuous AND/OR identities so they never nest (C1); `predicate-sql`/`predicate-prisma` guard non-finite bounds so both interpreters agree.
  - `DecisionCache`'s coalesced-waiter interruption path was closed; its `maxDepth` key issue was confirmed already fixed.

  Also: spec-consistency sweeps across every behavior/invariant/traceability document, gate-blind-spot closures (dod-table, api-surface, doc-examples, mutation-upload), and house-style/BDD cleanup.

- Effect built-in adoption sweep (`packages/core` and downstream consumers), each replacing a hand-rolled equivalent: `EvaluationServicesNone` is now actually used at its ~37 call sites instead of being hand-retyped; `Effect.provideService` replaces `currentSubjectLayer` construction on the per-request path; `Schema.Finite`/`Schema.is` tighten `Predicate.ts`'s bounds and `isSecurityLabel`; `Array.dedupeWith`/`groupBy`, `Record.fromIterableWith`, `Struct.omit` replace hand-rolled equivalents in `Obligation.ts`/`Gates.ts`/`Pairing.ts`/`Permission.ts`/`Edits.ts`; `Metric.frequency`'s `preregisteredWords` option is now set on the frequencies that lacked it, and the circuit breaker's state is a tagged frequency instead of a 0/1/2 gauge; `resetTimeoutMs` is `Duration.Input`; `toWire`'s per-record encode uses `Schema.encodeSync` where the input is provably total.

  **Behavior change**: `decideSubjects`/`filterSubjects` (`SubjectSet.ts`) now use `Effect.partition` and never fail outright — a subject whose evaluation breaks is reported in a `failures` array instead of discarding every other subject's decision in the batch. `Qadi.filter`'s enforcement-path semantics are unchanged (still fail-fast, per `@qadi/promise`'s own contract and INV-QD-006).

### Patch Changes

- Smaller fixes and consolidation rounding out this release:
  - `@qadi/audit`'s `encodeAuditEntry` now guards the whole record (`isRecordJsonSafe`) instead of `resource` alone — a circular or `BigInt`-valued `HasCustom.params` previously sailed past the guard and threw uncaught at the store write.
  - `@qadi/react`'s `Hydration.ts` now decodes with `UNTRUSTED_DECODE_OPTIONS`, refusing an excess property on a dehydrated entry or its embedded policy instead of silently stripping it.
  - `SinkCodec.ts`'s `toWire`/`fromWire`/`isRecordJsonSafe` dispatch is now `Match.tagsExhaustive` instead of a ternary/`if` chain — a third `SinkRecord` tag is now a compile error instead of a silent fall-through.
  - Five hand-built one-shot test gates now use `Latch`; `TestClock.testClockWith` replaces a cast-requiring fixture pattern; five duplicated `CollectingTracer` test helpers are consolidated into one shared `@qadi/testing` implementation.
  - The docs' flagship error-handling example now uses `Effect.catchTag` instead of `_tag ===` narrowing.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @qadi/core@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @qadi/core@0.4.0

## 0.3.0

### Minor Changes

- 0363a5a: An unwired port now names its own absence.

  **Breaking.** `RelationshipResolverShape.check` returns `RelatedResult` instead
  of `boolean`:

  ```ts
  export type RelatedResult = "Related" | "Unrelated" | "Unknown";
  ```

  Every resolver implementation must change, and so must any `if (yield*
RelationshipResolver.check(...))`. All packages are 0.x, so this rides a `minor`.

  The reason: evaluated with nothing wired, `hasRelationship("owner")` denied with

  > `subject 'u1' has no 'owner' relation to 'doc-1'`

  which is a claim about the contents of a graph that had never been connected. A
  boolean cannot tell the evaluator "the store says no" from "there is no store",
  so an unwired resolver sent readers to audit their edges when the fix was in
  their layer wiring — and the unwired state is the one every ReBAC integration
  starts in. It now denies with

  > `no relationship resolver is wired, so no 'owner' relation to 'doc-1' can be confirmed`

  **The verdicts do not move.** Both new arms deny exactly where the boolean
  denied; `RelationshipResolverNever` keeps its name and every default still fails
  closed. What changes is the sentence.

  A three-value union rather than `boolean | "Unknown"`, and _because_ the union
  breaks. The widening would have kept every implementation assignable and every
  truthiness test compiling while `"Unknown"` is truthy — an unwired port silently
  reading as _related_. A compile error is the right failure mode for that.

  Also here: `HasAttribute` and `HasResourceAttribute` distinguish an absent
  attribute from one that compared wrong — `subject attribute 'level' has no
value` rather than `did not match`. Nothing was false before; the diagnosis was
  withheld, and a misconfigured `AttributeResolver` produces the absent case
  exclusively.

  `@qadi/testing`'s `edgeRelationshipResolver` answers `"Related"`/`"Unrelated"`,
  since a fixture edge list is the store and knows.

  See ADR-QD-040, BEH-QD-045, INV-QD-029.

- 1a0d767: The subject simulator — the seventh devtools screen, and the only one that
  **runs** an evaluation rather than reading records.

  Run a policy against a subject you describe, vary that description a grant at a
  time to find which grant the answer turns on, and — starting from a decision the
  application actually made — check whether your reconstruction reproduces it.

  **A simulation is sealed.** `Effect.provide` adds to a context and cannot remove
  from one, so supplying the five services `evaluate` requires does not stop it
  finding an optional one already in scope — and it reads two optionally. Left
  unshadowed, a what-if sweep of eight edits writes eight fabricated decisions into
  your real log and eight entries into your real cache, indistinguishable on screen
  from decisions somebody asked for. `simulationLayer` shadows `DecisionSink` and
  `DecisionCache` in every mode, `CurrentSubject` is excluded from a live layer by
  type, and both are asserted rather than assumed.

  **Three answer sources.** `Fixtures` (what you typed), `Snapshot` (real answers
  captured once and replayed) and `Live` (your own resolvers, opt-in by passing a
  `ports` layer to the dock). A sweep of N edits costs N in-memory folds on
  fixtures, N live sweeps on `Live`, and one live run plus N folds on a snapshot —
  which is why `Snapshot` exists and why the panel warns, with a count, before any
  sweep that performs lookups.

  **What-if runs in both directions.** Dropping each grant in turn answers the
  question a reviewer holding an _allow_ has; it is silent for one holding a
  _denial_, since no removal turns a denial into an allow. So the sweep also reads
  the policy for what it asks for and offers each of those, including attribute
  values read backwards out of the matcher that demands them — and says which
  requirements it could not build a remedy for, and why.

  **Replay says what it could not seed.** A `DecisionRecord` names the subject by
  id and carries what your ports answered only inside its trace, so the grants are
  your hypothesis. The panel names every field it left blank, and refuses to claim
  a match where the record cannot attest to one — a truncated payload or a failed
  row cannot vouch for agreement it never recorded.

  New in `@qadi/testing`: **`TestLayerOptions.clock`**. `qadiTestLayer(subject,
{ clock: "test" })` wires a `TestClock`, so `durationMillis` is reproducible
  outside a test runner that happens to supply one. The ids were already
  deterministic and the clock was not, which is half a determinism claim — and it
  survived unnoticed because `@effect/vitest` hands `it.effect` a `TestClock`
  anyway.

### Patch Changes

- f03d75c: The remaining gaps closed in code, and one open security default decided.

  **The obligation gate is recorded.** A binding obligation nobody discharges turns
  an allow into a refusal at the enforcement boundary, so a log of decisions alone
  showed such a request as `ALLOW` while the caller received
  `UndischargedObligation`. `ObligationRecord` now reports `Discharged`,
  `HandlerFailed`, `Refused` or `NotRequired`, paired to its decision by evaluation
  id.

  Per decision, not per obligation — `ObligationHandler` receives the whole array
  and returns `void`, so which individual duty was met is not knowable without
  changing that contract, and a handler reporting falsely would be unverifiable.
  Reporting cannot change the outcome: a failing handler reports `HandlerFailed`
  and then fails unchanged.

  **Breaking**: `DecisionSinkShape.record` takes `SinkRecord`, a tagged union of
  `DecisionRecord | ObligationRecord`, because discharge happens in `Qadi.ts` after
  `evaluate` has already emitted. `DecisionRecord` gains `_tag: "Decision"`.

  **Ports say which implementation they are.** A service value was an anonymous
  object literal, so the only way to tell a fail-closed default from a real store
  was to call it and infer from the answer — an operator seeing "everything denies"
  could not see that `AttributeResolverNone` was wired. Every port Shape gains an
  optional `name`; every shipped implementation sets it, wrappers compose it
  (`"attributeResolverFromRecord (retrying)"`), and nothing branches on it.

  **Port activity is counted.** `qadi_port_calls_total` and
  `qadi_port_retries_total`. An attribute already on the subject counts nothing,
  which is the short-circuit guarantee visible as an absence. Metrics rather than
  the sink, because `MetricRegistry`'s default is memoised and therefore readable
  with zero wiring, where per-decision correlation would mean threading a collector
  through `evaluateNode` and risking INV-QD-005 for a debug view.

  **`QadiAtoms.asked()`** records the distinct questions an atom set has been
  asked. `Atom.family` keys structurally, so several `<Can>` on one policy are one
  atom; a panel keyed by component instance would invent a distinction the
  architecture does not have, and DOM highlighting is dropped rather than bought
  with a registry [AGENTS.md §13](https://github.com/leaderiop/qadi/blob/main/AGENTS.md) forbids.

  **`/__permissions` is guarded by default.** It publishes every guarded path and
  the permission each requires — a map of what to attack and where — and shipped as
  a bare `PermissionRegistryRoute` constant with no guard of its own.

  **Breaking**: that constant is replaced by
  `permissionRegistryRoute(permission, policy)`.
  `permissionRegistryRouteUnguarded(reason)` is the explicit opt-out and logs a
  warning on every request, so a local choice that reaches production is visible in
  the logs of the environment it is wrong in.

  Two things were **refused** rather than built, and the reasons are recorded: a
  cache TTL, whose natural use ("cache for five minutes") is exactly the
  backend-revocation hazard `DecisionCache`'s own documentation warns about; and
  per-obligation discharge state, above.

  Finally, every package now has a **README** — all five npm pages would have
  rendered blank — plus `homepage`, `bugs`, `engines` and keywords.

  See BEH-QD-195–198, BEH-QD-180 rev 1.1.

- Updated dependencies [efa3435]
- Updated dependencies [dc767f2]
- Updated dependencies [d251db4]
- Updated dependencies [a61dadc]
- Updated dependencies [f1c6aa5]
- Updated dependencies [50bf38a]
- Updated dependencies [2227e5e]
- Updated dependencies [39b7cbe]
- Updated dependencies [0649129]
- Updated dependencies [f03d75c]
- Updated dependencies [0363a5a]
- Updated dependencies [e2a44d9]
- Updated dependencies [73508bb]
- Updated dependencies [0363a5a]
  - @qadi/core@0.3.0
