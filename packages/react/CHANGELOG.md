# @qadi/react

## 0.11.1

### Patch Changes

- Updated dependencies [e9c7afc]
  - @qadi/core@0.11.1

## 0.11.0

### Minor Changes

- 9d9f249: One wire format: this release reads and writes only the formats 0.10 writes — record wire version 2, `{ environment, record }` stream envelopes, and `version: 2` hydration payloads. Every older format is refused, and each refusal is reported with its own reason (ADR-QD-096, ADR-QD-097 and ADR-QD-078, amended 2026-10-06; INV-QD-099 retired).

  **Migration — read this first. Audit rows written before 0.10 (wire version 1, no `version` key) are no longer readable. Before upgrading anything that reads an audit store, re-encode every pre-0.10 row as version 2 with 0.10.x: read it with `decodeAuditEntry` and write it back with `encodeAuditEntry` from `@qadi/audit@0.10`, which reads version 1 and writes version 2. A row that is not migrated is refused by this release as `UnsupportedVersion` with `version: undefined`. It is reported, never skipped, never upgraded.** A peer on 0.9 or earlier, such as a forwarding sender or a `/__decisions` server, writes version-1 records and bare frames. **It must upgrade (0.10 or later is enough). There is no compatibility path.** A deployment that is entirely on 0.10 has nothing else to migrate. The website's "Upgrading to 0.11" page has the full guide.

  - **Breaking (`@qadi/core`):** `decodeSinkRecord`/`decodeSinkRecordString` read wire version 2 only. A record with no `version` (a pre-0.10, version-1 record), or with any version other than 2, is refused as `DecodeRefusal.UnsupportedVersion`. `version` is `undefined` when absent. The record is never upgraded and never given a sentinel subject or an outcome. The pre-0.5 `failed.code` tolerance went with the version-1 reader. A JSON value that is not an object is still `Malformed`. `SinkRecordJson` is now the version-2 encoded type alone, not a union of versions. `WireVersion` narrows to `2` and `WIRE_VERSIONS` to `[2]`; both stay exported, because `UnsupportedVersion.supported` reports them.
  - **Breaking (`@qadi/core`):** `DecodeStoredRecordOptions` is removed, along with its deprecated `legacyEnvironment` (scheduled for removal when it shipped). `decodeStoredRecord` and `decodeStoredRecordString` take no options, and a bare record (what a server older than 0.10 sends) is refused as `Malformed`.
  - **Breaking (`@qadi/audit`):** `AuditEntry.record` is version-2 bytes only. A store adapter no longer needs to narrow on `"version" in entry.record`. `decodeAuditEntry` refuses a pre-0.10 row as `UnsupportedVersion` (see the migration above). `AuditArchive`'s `archiveVersion` stays `"1"`, and an archive bundled before 0.10 is migrated entry by entry.
  - **Breaking (`@qadi/devtools`):** `sourceFromEventSource` loses `legacyEnvironment`. A bare frame is reported as `"not-a-record"`, and a version-1 record as `"unsupported-version"`. A `message` frame that arrives before `synced` no longer ends the prelude wait as a sign of an "older server". Every server since 0.10 sends the prelude first, so such a frame is delivered live. `syncTimeout` still bounds the wait for a server whose prelude has not arrived, which leaves the backlog absent.
  - **Breaking (`@qadi/react`):** `hydrateDecisions` reads `version: 2` payloads only, as scheduled when 0.10 deprecated the older reader. A payload with no `version` (the format 0.9 and earlier wrote) is dropped whole as `UnsupportedPayloadVersion`, counted and reported like any other unsupported version, and the client re-decides those questions. `DehydratedDecisionsV1`, `DehydratedEntryV1` and `DehydratedPayload` are removed. `hydrateDecisions` and `QadiAtoms.hydrate` take `DehydratedDecisions`.

### Patch Changes

- Updated dependencies [9d9f249]
  - @qadi/core@0.11.0

## 0.10.0

### Minor Changes

- 1fd8700: `@qadi/audit`: the circuit breaker's half-open probe protocol now lives inside `CircuitBreaker.withPermit`, and three defects found while moving it are fixed.

  **Fixes.** A probe interrupted while `stage()` was in flight used to hold its claim until the half-open age-out, doubling recovery time to twice `resetTimeoutMs`; the claim is now released on every exit from the moment it is taken. A write failure settling on an already-`Open` breaker no longer re-announces an `Open` transition (over-counting `qadi_audit_circuit_breaker_transitions_total`) or restarts the open window. A write's outcome now counts only toward the window that admitted it, so a late failure from before a trip cannot reopen a newer half-open window. Comments and BEH-QD-251 no longer claim that a caller's interruption of a write reaches the breaker; it is not a store failure.

  **Breaking, for `@qadi/audit/CircuitBreaker` subpath imports only.** The `CircuitBreaker` interface is now `status` plus `withPermit`; `recordSuccess`, `recordFailure`, `claimProbe` and `releaseProbe` are no longer members. `Permit`, `Admitted` and `Refused` are new exports. `@qadi/audit`'s barrel and `AuditDecisionSinkLive` behave as before.

- 1fd8700: Read a decision result once, with the new `outcomeOf`, and fix the documented example that rendered a stale allow.

  - New exports `outcomeOf(result)` and `DecisionOutcome`: a `DecisionResult` read into one of five cases — `Pending`, `Rechecking`, `Allowed { decision }`, `Denied { decision }`, `Failed { cause }`. Only `Allowed` carries an allow. A re-check carries no verdict, and a failure carries only its `Cause`, never the `previousSuccess` an `AsyncResult.Failure` keeps (which `AsyncResult.value`/`getOrElse` return). Write `outcomeOf(useDecision(policy))` and `DecisionOutcome.$match` it.
  - `Can`, `Cannot`, `useCan`, `useProjected` and the gate registry now all read through `outcomeOf`; what each renders is unchanged.
  - `currentDecision` is now a projection of `outcomeOf` (same signature and answers). `DecisionResult` and `currentDecision` move from `QadiAtoms.ts` to `DecisionOutcome.ts`; their public names from `@qadi/react` are unchanged.
  - `GateRenderState` is now `DecisionOutcome["_tag"]`, the same five strings.
  - Docs: the React guide's "read the whole decision" example checked `isInitial`, then `isFailure`, then read `result.value`, which renders the editor while an allow is being re-checked (`Success` with `waiting: true`). If you copied it, replace the ladder with `outcomeOf`.

- 1fd8700: **Breaking (`@qadi/react`).** The gate registry is owned by the atom set, not the process.

  Every instrumented `QadiProvider` used to write its guards into one module-scope map, so two atom sets listed each other's guards, and two hydrated React roots (which derive `useId` from tree position and so mint the same id) silently replaced a still-mounted guard of the other. Each atom set now owns a registry, `atoms.gates`, beside `atoms.asked()`, and registration is a handle only `@qadi/react` can reach. A colliding id is kept, disambiguated as `<id>~<n>`, and reported once (`onGateIdCollision`, or a development warning naming `identifierPrefix`); `data-qadi-gate` still carries React's own id.

  Removed, with no shim: `gateInstances`, `subscribeGates`, `registerGate`, `updateGateState` and `clearGatesUnsafe`. Added: `makeGateRegistry`, `GateRegistry`, `GateRegistryOptions`, `useGateInstances`, `QadiAtoms.gates`, `QadiAtomsOptions.onGateIdCollision` and `QadiProviderProps.gates` (hand one registry to several atom sets; it must come from `makeGateRegistry()`). `QadiContextValue` gains `gates`. `QadiAtoms` gains a required `gates` member, so a hand-written `QadiAtoms` test double stops compiling.

  Migration:

  ```ts
  // before
  useSyncExternalStore(subscribeGates, gateInstances, gateInstances);
  // after, inside the provider
  const gates = useGateInstances();
  // after, outside it
  useSyncExternalStore(atoms.gates.subscribe, atoms.gates.instances, atoms.gates.instances);
  ```

  `clearGatesUnsafe()` in a test becomes "build a fresh atom set per test".

  `@qadi/devtools` is unchanged in behaviour; its empty-state text now names `useGateInstances()`.

- 1fd8700: **Breaking (`@qadi/react`).** A server-rendered decision is now its own type, not a fabricated `Allow`/`Deny`.

  Hydration used to rebuild a seed into a core `Allow`/`Deny`, which needs a trace and a deny reason, so both were made up whenever the server withheld them: a single-node trace with the reason `"hydrated"` (which `<Can fallback={(deny) => deny.reason}>` rendered), and a root of `"AllOf"` for a payload with no trace. A seed is now a `SeededAllow` or `SeededDeny` carrying a tagged `disclosure` (`Withheld`, or `Disclosed` with the server's own trace and reason), and a decision atom holds a `ClientDecision = Allow | Deny | SeededAllow | SeededDeny`.

  What changes for you:

  - `DecisionResult`, `currentDecision`'s return type and `useDecisionSuspense` now name a `ClientDecision`. `isAllowed` from `@qadi/core` rejects one on purpose; read the verdict with the new `permits`, and tell a seed from this client's own evaluation with `isSeeded`.
  - `DeniedNode`'s function receives `Deny | SeededDeny`. A `SeededDeny` has no `reason` or `trace` of its own, so narrow with `isSeeded` before reading either.
  - **Fail-closed note.** Code comparing `decision._tag === "Allow"` keeps compiling and now treats a seeded allow as not allowed. That is never a grant — the page may flash again — but it is a behaviour change; move to `permits`.
  - `HydrationMismatch.seeded` is a `SeededDecision`.
  - The dehydrated payload is `version: 2`, and each entry nests a `decision` derived from `@qadi/core`'s new `DecisionWire`. `hydrateDecisions` still reads the format that predates `version` (typed `DehydratedDecisionsV1`, deprecated, removed in the next minor release), always seeding it `Withheld`. Any other version is dropped as `UnsupportedPayloadVersion`.
  - `hydrateDecisions` never throws: a value that is not an envelope is dropped as `MalformedPayload`. A disclosed trace whose root is not the entry's own policy is dropped as `MalformedEntry`.
  - `UnregisteredAtoms` is removed from the closed drop-reason union (`ClientHydrationDropReason`, `hydrationDropReasons`), and `UnsupportedPayloadVersion` and `MalformedPayload` are added. An exhaustive `Match` over the reasons stops compiling until it handles them.
  - `QadiAtoms` gains `hydrate`, the seeding capability `hydrateDecisions` delegates to. A spread copy or wrapper of an atom set now seeds the same questions its original does, instead of being refused whole.
  - `HydrateOptions.onDropped` receives `HydrationDrop<unknown>`: the entries are what failed to decode.

  `@qadi/core` gains `DecisionWire`/`DecisionWireAllow`/`DecisionWireDeny`, `encodeDecision`/`decodeDecision` (the decision's wire form, moved out of `SinkCodec` — `SinkRecordWire`'s bytes are unchanged, but a `Deny` without a `reason`, or an `Allow` with one, is now refused on decode instead of being given an invented `"denied"`), `projectVisible` (the body of `project` after its verdict check) and `subjectEquivalence` (the structural subject equality `DecisionCache` already used). `@qadi/react`'s `subject` atom now uses it, so a nested attribute object that is equal by structure no longer re-runs every mounted decision.

  `@qadi/devtools` reads the same five hydration metrics unchanged; its drop-reason table follows the new set.

### Patch Changes

- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
  - @qadi/core@0.10.0

## 0.9.0

### Minor Changes

- ab38290: `effect` is now a peer dependency (`^4.0.0`, stable Effect v4) instead of an
  exactly pinned runtime dependency, and `@qadi/react` declares `@effect/atom-react` as a peer too.
  Install them yourself: `pnpm add @qadi/core effect`. The public API is made of Effect classes, so the peer
  guarantees a single copy in your dependency tree.

  The minimum Effect version is now stable `4.0.0`. Since rc.118 the modules Qadi imports live outside
  `unstable/` (`effect/http`, `effect/http-api`, `effect/reactivity`, `effect/encoding`,
  `effect/persistence`, `effect/devtools`), and a single build cannot import both spellings. Stable
  `4.0.0` also changed `Effect.partition` to return `[passes, fails]` (it was `[fails, passes]`) and tightened
  `Schema.brand`'s tag type; `decideSubjects`/`filterSubjects` and the `@qadi/core` brands are adapted.
  Projects on a release candidate must upgrade to `4.0.0`.

### Patch Changes

- Updated dependencies [ab38290]
  - @qadi/core@0.9.0

## 0.8.0

### Minor Changes

- be76b5b: Fixed a real leak in `GateRegistry`: its unmount cleanup compared the closed-over `GateInstance` by reference, but `updateGateState` replaces the stored instance with a new object on every render-state change — so a gate leaked (including its DOM element reference) after its very first state transition. Cleanup now tracks a stable per-registration token instead.

  `QadiAtoms` gained bounded-count eviction for its long-lived question/decision bookkeeping (`maxTrackedQuestions`, `sweepEvictions`, run periodically by `QadiProvider`), replacing unbounded growth. A related desync — an evicted-then-re-asked question could silently vanish from `asked()`/devtools forever because `Atom.family` handed back its still-cached atom without re-registering — is also fixed.

  `useProjected` now registers under its own name instead of being mislabeled `useDecision` in the devtools panel.

### Patch Changes

- 2ac15c3: Declare the internal `@qadi/core` (and, for `@qadi/devtools`, `@qadi/testing`) dependency as `workspace:^` instead of `workspace:*`. `pnpm publish` converts `workspace:*` into an exact version pin in the published tarball, so a consumer that already has an older `@qadi/core` on a compatible version gets a second, separately-resolved copy installed alongside it the moment any of these packages bump — two nominally-different instances of the same package, which TypeScript cannot always reconcile when a value's inferred type spans both (surfaced downstream as `TS2883: The inferred type ... cannot be named without a reference to ...`). `workspace:^` still gets fully resolved by `pnpm publish` (verified via `scripts/check-package-install.mjs`, no `workspace:`/`catalog:` protocol reaches the packed manifest) — it just publishes a caret range instead of an exact pin, so a consumer's own compatible `@qadi/core` continues to satisfy it in place.
- Updated dependencies [be76b5b]
  - @qadi/core@0.8.0

## 0.7.0

### Patch Changes

- c7aecf1: Bump `effect` to `4.0.0-rc.116` (and its lockstep catalog siblings `@effect/atom-react`, `@effect/platform-node`, `@effect/vitest`). No public API or runtime behavior changes for any `@qadi/*` package — confirmed by diffing the published `4.0.0-rc.115`/`4.0.0-rc.116` tarballs directly and grepping every changed symbol against this codebase's own source.
- **Correction to the 0.6.3 entry below.** It said `settled.ts` "is retained as a test helper ... rather than deleted." That was wrong even at the time: ADR-QD-014's reversal deleted it entirely, and `Hydration.test.ts` was given a local, generic-purpose replacement helper instead of calling it. There is no `src/settled.ts` or `test/settled.ts` on disk; test-only, no public API to change.
- Updated dependencies [c7aecf1]
  - @qadi/core@0.7.0

## 0.6.3

### Patch Changes

- Reverse ADR-QD-014: `@qadi/react` now depends on the official `@effect/atom-react` (same `Effect-TS/effect` monorepo, same `effect` version) instead of a hand-rolled `useSyncExternalStore` binding.

  `QadiProvider.tsx` wires a `RegistryContext.Provider` and `useAtomValue` delegates to the library's context-based hook. `useDecisionSuspense` swaps from the hand-rolled `settled.ts` race fix to `useAtomSuspense` with `suspendOnWaiting: true`, closing the Suspense zero-listener race (COMPAT-01, gap G-01-1) that `settled.ts` had patched three separate times. No public API change — `QadiProvider`, `useGate`, `Can`/`Cannot` keep their existing signatures.

  `settled.ts` is retained as a test helper (`Hydration.test.ts` still calls it directly) rather than deleted.

  > **Corrected in 0.7.0.** This was wrong: `settled.ts` was deleted entirely as part of this same change, and `Hydration.test.ts` was given a local, generic-purpose replacement helper instead of calling it. There is no `src/settled.ts` or `test/settled.ts` on disk.

- @qadi/core@0.6.3

## 0.6.2

### Patch Changes

- @qadi/core@0.6.2

## 0.6.1

### Patch Changes

- `0.6.0` was published from a checkout where `pnpm build` had never been run, so all 9 tarballs shipped `src/` and `package.json` only — no `lib/`, no `.d.ts`, no `index.js`. `0.6.0` could not be unpublished (no OTP access at the time), so it stays on the registry as a known-broken release; `npm deprecate` points installers at `0.6.1` instead. This release ships the intended build output, no source changes otherwise.

  Root cause fixed: each public package now has a `prepack` script (`pnpm -w run build`, not a package-local `tsc -b` — `@qadi/testing`, `@qadi/audit`, etc. depend on other workspace packages and a local-only build would not rebuild them) that runs automatically before `npm pack`/`npm publish`/`pnpm pack`/`pnpm publish`, so this can no longer happen regardless of which checkout the publish step runs from.

- Updated dependencies
  - @qadi/core@0.6.1

## 0.6.0

### Minor Changes

- 47e5683: `effect` bumped from `4.0.0-rc.112` to `4.0.0-rc.115` (`4.0.0-rc.113` shipped a broken `.d.ts` bundle — missing `Match`/`Schema` type exports — fixed in `rc.115`).

  **Breaking: the minimum supported Node version is now `>=22.12.0`, up from `>=20.19.0`.** This is forced by the bump: `@effect/vitest@4.0.0-rc.115` requires `vitest@^5.0.0`, and `vitest` 5 does not run on Node 20 at any patch level. There is no path that keeps both effect's newest rc and Node 20 support — see ADR-QD-074. If you run these packages on Node 20, stay on `effect@4.0.0-rc.112` and the previous published version until you can move to Node 22.12+.

  No public API changed. Internal-only: `effect/testing/FastCheck` was removed upstream, so this repo's own tests depend on `fast-check` directly now; `vitest`'s benchmark API moved to a `test`-context fixture, so `packages/core/bench/*.bench.ts` were ported to the new shape; `@stryker-mutator/vitest-runner` doesn't yet support `vitest` 5's `testNamePattern` change ([stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)), so it's patched via `pnpm patch` to backport the pending upstream fix (dev-only, not part of the published packages).

### Patch Changes

- Updated dependencies [47e5683]
  - @qadi/core@0.6.0

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

- **`@qadi/devtools`**: deduped the waiting/failure ladder in `components.tsx`
  — a decision panel could render conflicting waiting and failure states for
  the same question at once; the ladder now reflects exactly one state per
  question.

  **`@qadi/react`**: a decision atom's suspense promise is now resolved
  exactly once, when the decision actually settles. Previously a
  time-of-check-to-time-of-use gap could leave a suspended component waiting
  on a promise that had already settled, or resolve one twice.

- Updated dependencies
- Updated dependencies
  - @qadi/core@0.4.0

## 0.3.0

### Minor Changes

- dc767f2: Six questions the library could pose and could not answer.

  Each was data it already computed and threw away, or a comparison nothing
  implemented. All six were found by auditing a devtools design against the code;
  none of them are devtools features, which is why they live in `@qadi/core`.

  **`policyDepth(policy)`** — `maxDepth` is an evaluation input, so nothing on a
  policy recorded how deep it was, and a caller bounding untrusted decoded input
  had to re-walk the tree and guess at the convention. It counts the way the
  evaluator counts, so `policyDepth(p) <= n` holds exactly when
  `evaluate(p, { maxDepth: n })` does not raise — asserted against `evaluate` in
  both directions, because a depth under-reported by one would declare safe
  precisely the input a caller meant to reject.

  **`permissionProvenance(role)`** — `flattenPermissions` holds the granting
  role's name in its own closure and calls `keys.add` without it, so "inherited via
  viewer" was unanswerable. Kept a separate function because the flatten runs
  inside `makeSubject`, once per subject; the two are held in agreement instead, so
  a screen cannot show a different permission set from the one that decides.

  **`diffTraces` / `flippedAt`** — "which node flipped the verdict" had no
  implementation at all; `isMismatch` compares verdicts and names nothing.
  Differences are addressed by path, ordered parents-first, and a shape divergence
  from short-circuiting is reported rather than descended past.

  **`getOrCompute` reports its outcome**, and a `DecisionRecord` carries it. Cache
  hit/miss was a process-global frequency shared by every cache in the process, so
  an operator could see a rate and never learn about the decision in front of them.
  Absence and `"miss"` are kept distinct: one says nothing was consulted, the other
  says the cache was asked and did not have it. This does not weaken INV-QD-025 —
  a hit still decides identically; only what an observer is told changed.

  **Breaking**: `DecisionCacheShape.getOrCompute` returns `CacheLookup`
  (`{ trace, outcome }`) rather than a bare `Trace`. Only custom `DecisionCache`
  implementations are affected.

  **`DecisionCacheShape.clear`** — a cache could be emptied only by discarding its
  layer scope, which a tool running inside that scope cannot do. In-flight work is
  left alone: those fibers are answering questions asked before the flush.

  **`resolveRoleGraph` reports unknown parents.** The lenient drop is right and
  stays — a partial catalogue is a normal deployment state, and failing closed
  would deny everything rather than granting less. The silence was the defect: a
  typo in one parent name granted fewer permissions than its author wrote, with
  nothing said at any level. Reported once per resolve with every missing name, at
  warning level or through `onUnknownParent`.

  **`@qadi/react` threads the seeded evaluation id into its re-check.** The
  mechanism shipped alongside `DecisionSink` and nothing used it, so a hydrated
  decision and its client re-check still could not be joined. Read with `get.once`,
  so the re-evaluation does not gain a dependency on the seed — the id is
  correlation metadata, not an input to the decision.

  See BEH-QD-189–194, INV-QD-037, INV-QD-038.

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

- 0363a5a: Fix a client-side authorization bypass in decision hydration.

  A server-rendered decision was seeded directly into the decision atom, where
  `AtomRegistry` preserves a seeded value over the one the node computes. An
  asynchronous evaluation escaped that by publishing on a later turn; a
  **synchronous** one publishes by returning, and was discarded. Every policy that
  needs no resolver evaluates synchronously, so a subject could keep a
  server-issued allow they no longer qualified for, for the life of the page.

  A seed now lives in its own atom, and the decision a consumer reads consults it
  only while this client has never answered. Once it has — allow, deny or failure —
  that answer is authoritative, including while a later re-check is in flight.

  Behaviour change: for a synchronously-evaluated policy the client answers on the
  first read, so the seed is not observed and the `evaluationId` reported is the
  client's own rather than the server's. The correlation guarantee of BEH-QD-148
  still holds of the payload and of the seeded decision, and remains observable
  wherever the seed is what is being read.

  See ADR-QD-039, INV-QD-028, BEH-QD-151.

- 39b7cbe: The package declares its client boundary, and server rendering is now tested.

  `QadiProvider`, `Can`/`Cannot`, the hooks and the atom graph carry
  `"use client"`. `Hydration.ts` and the barrel deliberately do **not**:
  `dehydrateDecisions` exists to be called during server rendering, and a blanket
  directive would turn it into a client reference a Server Component cannot
  invoke. Per-file directives keep both halves reachable through one entry point.

  To be clear about what this does and does not change: `"use client"` marks a
  bundler boundary, it does not disable SSR. A Client Component is still rendered
  to HTML on the first request and hydrated afterwards.

  **There was no server-rendering test of any kind.** There is one now, through
  `renderToString`, covering the `getServerSnapshot` path React throws without,
  and the claim hydration exists for — a seeded decision present in the _first_
  HTML rather than after a pending frame.

  One thing that test made clear, and which is worth stating: a policy needing no
  resolver answers during the server pass and never observes its seed. Hydration
  covers policies that reach a resolver, which cannot settle inside a single
  synchronous render however fast the resolver is.

  **`dehydrateDecisions` now says what it dropped.** It discards every entry not
  belonging to the payload's subject — correct, and unchanged — but did so in
  silence, so a server that accidentally mixed subjects shipped one row where it
  meant to ship a thousand and saw nothing wrong. `DehydrateOptions.onDropped`
  takes the same shape as `onHydrationMismatch`: a development-mode warning by
  default, replaced by a supplied callback which then runs in production too.

  The default message carries a count and nothing else — no subject, no policy. A
  dropped decision belongs to another user, and printing it would be the
  disclosure the drop exists to prevent.

  See BEH-QD-067, BEH-QD-146.

- ab7301b: A guard can say that it exists, and the devtools can point at it.

  `QadiProvider` takes `instrument`, off by default. With it on, every `<Can>`,
  `<Cannot>`, `useCan`, `useDecision` and `useDecisionSuspense` records its policy,
  its resource and what it rendered, and the two component guards wrap their output
  in a `display: contents` span — which generates no box, so no layout changes.

  The React panel lists those under each question and offers two directions:
  **highlight**, which draws over every guard asking a question, and **pick**, which
  outlines the guard under the pointer and selects its row. A guard that rendered
  nothing is still pointed at, which is the answer to "why is this button missing".

  This reverses a documented conclusion. The panel previously said a per-instance
  view was unobtainable, on the grounds that `Atom.family` keys structurally and so
  ten gates on one policy are one atom. That is true of the _atom layer_ and does
  not follow for components; the panel is still keyed by question, with the guards
  listed underneath.

  Nothing is a breaking change. `instrument` defaults to `false`, and off means no
  registration and no wrapper element — the DOM is byte for byte what it was.

- f1c6aa5: Hydration is counted at both ends, and every refusal names its reason.

  `dehydrateDecisions` and `hydrateDecisions` returned their entries and forgot
  them, so the only hydration number a panel could show was the mismatch count —
  and the host had to accumulate that itself. Five metrics now count what crosses
  the network, readable with no wiring through `hydrationActivity`.

  `hydrateDecisions` had three silent exits: a payload naming another subject, an
  atom set `makeQadiAtoms` did not build, and an entry whose policy would not
  decode. All three returned quietly, which is indistinguishable from a page with
  nothing to hydrate. It gains an optional `onDropped` carrying the reason, with a
  development-mode warning by default — the shape `dehydrateDecisions` and
  `onHydrationMismatch` already use.

  The metric declarations are exported from `@qadi/core` rather than restated in
  each package, because `Metric`'s registry key includes the description string: a
  reader re-declaring one with a description that differs by a word gets its own
  registry entry and reads zero, with no error raised.

  Nothing is a breaking change. `hydrateDecisions`'s new parameter is optional, and
  the devtools dock's `hydrationMismatches` prop still works and is shown when the
  new `hydration` prop is absent.

- 0363a5a: A hydration mismatch now says so.

  When a server seed and this client's own answer disagree, the disagreement is
  reported. `makeQadiAtoms` takes an optional second argument:

  ```ts
  makeQadiAtoms(layer); // warns, in development
  makeQadiAtoms(layer, { onHydrationMismatch: report }); // routed, always
  ```

  The previous release made the client's answer supersede the seed, which is
  correct and was silent. Seen from outside, a mismatch is a guarded control that
  renders on first paint and vanishes on hydration — on every page, with no
  explanation. The usual cause is not a grant that changed in the last two hundred
  milliseconds; it is a client wired differently from the server, most often one
  with no `RelationshipResolver` where the server has one. A configuration error
  presenting as a rendering glitch is close to the worst available presentation
  for it.

  ```
  [qadi] hydration mismatch for HasRelationship: the server allowed, this client
  denied — no relationship resolver is wired, so no 'owner' relation to 'doc-1'
  can be confirmed. This client's answer is the one in effect.
  ```

  Nothing about precedence changes. The reporter is handed two decisions and
  returns `void`; by the time it runs, the client's answer is already the one in
  effect.

  Three scoping rules come with it. A mismatch is a difference of **verdict** —
  two allows differing in visible fields are not one. A client-side **failure** is
  not a disagreement, because there was no answer for the server's to disagree
  with. And it reports **once per question**, not once per re-evaluation.

  The callback replaces the console warning rather than adding to it, and runs in
  production: a server and a client disagreeing about an authorization question is
  signal worth reporting, and can indicate a page cached and served to the wrong
  user as readily as a wiring error.

  `console` and `process.env` are new to this package and confined to one file
  that is not exported. A bundler folds `process.env.NODE_ENV` and eliminates the
  warning from a production build.

  See ADR-QD-041, BEH-QD-152.

- 0363a5a: `Can` and `Cannot` now hand their denial to the node that replaces it.

  `Can`'s `fallback` and `Cannot`'s `children` accept `DeniedNode` — a
  `ReactNode`, or a function of the `Deny` that produced it:

  ```tsx
  <Can policy={canEdit} fallback={(denial) => <Hint reason={denial.reason} />}>
    <EditButton />
  </Can>
  ```

  The guard was already holding the denial, with its reason and its whole trace,
  at the moment it decided to render nothing — and discarded it. "Why is this
  control not here?" was the one question the declarative API could not answer.

  A plain node stays the common case, so this is a union rather than a required
  function and every existing `fallback` keeps working.

  One rule comes with it: **a function `fallback` is not reused for the failure
  branch.** `failure` still defaults to a node fallback, but a function fallback
  is written to explain a refusal, and during an outage no refusal happened — so
  it renders nothing instead, which is still closed. Failure is not denial.

  See BEH-QD-072.

### Patch Changes

- 2cbf9e3: A test now pins that a `DecisionSink` provided in the layer `makeQadiAtoms` is
  built from reaches the atom runtime, so browser-side decisions are recorded.

  It always did — `DecisionSink` is optional, so it is absent from
  `QadiRuntimeServices` and nothing in the types said a layer may carry one — but
  that was verified with a throwaway probe rather than a test. It is the client
  half of the server/client pairing a merged devtools timeline depends on, so it is
  asserted rather than assumed.

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
